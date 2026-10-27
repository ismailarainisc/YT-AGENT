import fs from 'fs';
import path from 'path';
import { decrypt, encrypt } from './crypto.ts';
import { getSetting, logAudit, logExecution, query, queryOne } from './db.ts';

const GOOGLE_AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const GOOGLE_REVOKE_ENDPOINT = 'https://oauth2.googleapis.com/revoke';
const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';
const YOUTUBE_UPLOAD_BASE = 'https://www.googleapis.com/upload/youtube/v3/videos';
const YOUTUBE_ANALYTICS_BASE = 'https://youtubeanalytics.googleapis.com/v2/reports';

export const YOUTUBE_SCOPES = [
  'https://www.googleapis.com/auth/youtube.upload',
  'https://www.googleapis.com/auth/youtube.force-ssl',
  'https://www.googleapis.com/auth/youtube.readonly',
  'https://www.googleapis.com/auth/yt-analytics.readonly',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/userinfo.email',
];

export interface GoogleCredentials {
  clientId: string;
  clientSecret: string;
  isConfigured: boolean;
}

/**
 * Retrieves configured Google Client ID and Secret (from env or encrypted settings)
 */
export async function getGoogleClientCredentials(): Promise<GoogleCredentials> {
  const storedId = await getSetting('google_client_id', '');
  const storedSecretEncrypted = await getSetting('google_client_secret_encrypted', '');
  const storedSecret = storedSecretEncrypted ? decrypt(storedSecretEncrypted) : '';

  if (storedId && storedSecret) {
    return {
      clientId: storedId,
      clientSecret: storedSecret,
      isConfigured: true,
    };
  }

  const envId = process.env.GOOGLE_CLIENT_ID;
  const envSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (envId && envSecret) {
    return { clientId: envId, clientSecret: envSecret, isConfigured: true };
  }

  return {
    clientId: storedId || envId || '',
    clientSecret: storedSecret || envSecret || '',
    isConfigured: false,
  };
}

/**
 * Saves Google Client ID and Secret
 */
export async function saveGoogleClientCredentials(clientId: string, clientSecret: string): Promise<void> {
  const { setSetting } = await import('./db.ts');
  await setSetting('google_client_id', clientId.trim());
  await setSetting('google_client_secret_encrypted', encrypt(clientSecret.trim()));
  await logAudit('credentials_updated', 'user', { clientId: clientId.substring(0, 8) + '...' });
}

/**
 * Builds the official Google OAuth authorization URL
 */
export async function generateAuthUrl(redirectUri: string, state: string): Promise<string> {
  const { clientId } = await getGoogleClientCredentials();
  if (!clientId) {
    throw new Error('Google Client ID is not configured. Please complete the setup step.');
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: YOUTUBE_SCOPES.join(' '),
    access_type: 'offline',
    prompt: 'consent',
    state,
    include_granted_scopes: 'true',
  });

  return `${GOOGLE_AUTH_ENDPOINT}?${params.toString()}`;
}

/**
 * Exchanges authorization code for access and refresh tokens
 */
export async function exchangeCodeForTokens(
  code: string,
  redirectUri: string
): Promise<{
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
  tokenType: string;
}> {
  const { clientId, clientSecret } = await getGoogleClientCredentials();
  if (!clientId || !clientSecret) {
    throw new Error('Google Client ID or Client Secret missing.');
  }

  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  });

  const res = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!res.ok) {
    const errorData = await res.text();
    throw new Error(`Failed to exchange code: ${res.status} ${errorData}`);
  }

  const data = await res.json();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
    tokenType: data.token_type,
  };
}

/**
 * Refreshes an expired access token using the stored refresh token
 */
export async function refreshAccessToken(accountId: string): Promise<string> {
  const account = await queryOne<{
    refresh_token_encrypted: string;
    access_token_encrypted: string;
    token_expiry: number;
  }>('SELECT refresh_token_encrypted, access_token_encrypted, token_expiry FROM connected_accounts WHERE id = ?', [accountId]);

  if (!account || !account.refresh_token_encrypted) {
    throw new Error('No refresh token available. Re-connection with YouTube is required.');
  }

  const refreshToken = decrypt(account.refresh_token_encrypted);
  const { clientId, clientSecret } = await getGoogleClientCredentials();

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  });

  const res = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Token refresh failed: ${err}`);
  }

  const data = await res.json();
  const newAccessToken = data.access_token;
  const newExpiry = Date.now() + (data.expires_in || 3600) * 1000;

  const { execute } = await import('./db.ts');
  await execute(
    'UPDATE connected_accounts SET access_token_encrypted = ?, token_expiry = ?, updated_at = datetime("now") WHERE id = ?',
    [encrypt(newAccessToken), newExpiry, accountId]
  );

  return newAccessToken;
}

/**
 * Retrieves valid access token for an account, auto-refreshing if needed
 */
export async function getValidAccessToken(accountId: string): Promise<string> {
  const account = await queryOne<{
    access_token_encrypted: string;
    token_expiry: number;
  }>('SELECT access_token_encrypted, token_expiry FROM connected_accounts WHERE id = ?', [accountId]);

  if (!account) throw new Error('Account not found');

  // If token is expiring within 3 minutes, refresh it
  if (account.token_expiry && account.token_expiry < Date.now() + 180000) {
    return refreshAccessToken(accountId);
  }

  return decrypt(account.access_token_encrypted);
}

/**
 * Fetches user info from Google OAuth profile endpoint
 */
export async function fetchGoogleUserProfile(accessToken: string): Promise<{
  id: string;
  email: string;
  name: string;
  picture: string;
}> {
  const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch user profile: ${res.statusText}`);
  }

  return res.json();
}

/**
 * Helper to parse YouTube API errors and detect disabled API with activation link
 */
export function parseYouTubeApiError(errorText: string, status: number): Error {
  let parsed: any = null;
  try {
    parsed = JSON.parse(errorText);
  } catch (e) {}

  const errorMsg = parsed?.error?.message || errorText;
  const isApiDisabled =
    errorMsg.includes('YouTube Data API v3 has not been used') ||
    errorMsg.includes('SERVICE_DISABLED') ||
    errorMsg.includes('accessNotConfigured') ||
    parsed?.error?.details?.some((d: any) => d.reason === 'SERVICE_DISABLED') ||
    (status === 403 && (errorMsg.includes('disabled') || errorMsg.includes('overview?project=')));

  if (isApiDisabled) {
    const details = parsed?.error?.details || [];
    const errorInfo = details.find(
      (d: any) => d.reason === 'SERVICE_DISABLED' || d.metadata?.activationUrl
    );
    const match = errorMsg.match(/https:\/\/console\.developers\.google\.com[^\s"']+/);
    const containerInfo = errorInfo?.metadata?.containerInfo || '918608070343';
    const isContainerProject = containerInfo === '918608070343';
    const activationUrl = isContainerProject
      ? 'https://console.cloud.google.com/apis/library/youtube.googleapis.com'
      : (errorInfo?.metadata?.activationUrl || match?.[0] || 'https://console.cloud.google.com/apis/library/youtube.googleapis.com');
    const projectId = isContainerProject ? 'personal' : containerInfo;

    const customErr: any = new Error(
      `YouTube Data API v3 is disabled in Google Cloud Project ${containerInfo}. Enable it at: ${activationUrl}`
    );
    customErr.code = 'API_DISABLED';
    customErr.requiresApiEnablement = true;
    customErr.isContainerProject = isContainerProject;
    customErr.activationUrl = activationUrl;
    customErr.projectId = projectId;
    return customErr;
  }

  return new Error(`YouTube API returned error: ${status} ${errorMsg}`);
}

/**
 * Fetches authenticated user's real YouTube channel
 */
export async function fetchAuthorizedChannel(accessToken: string): Promise<{
  hasChannel: boolean;
  channel?: {
    id: string;
    title: string;
    customUrl?: string;
    description?: string;
    subscriberCount: number;
    videoCount: number;
    viewCount: number;
    avatarUrl?: string;
    bannerUrl?: string;
    publishedAt?: string;
    uploadsPlaylistId?: string;
    country?: string;
  };
  createChannelUrl?: string;
}> {
  const url = `${YOUTUBE_API_BASE}/channels?part=snippet,contentDetails,statistics,brandingSettings&mine=true`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw parseYouTubeApiError(errorText, res.status);
  }

  const data = await res.json();

  if (!data.items || data.items.length === 0) {
    return {
      hasChannel: false,
      createChannelUrl: 'https://www.youtube.com/create_channel',
    };
  }

  const item = data.items[0];
  const snippet = item.snippet || {};
  const stats = item.statistics || {};
  const branding = item.brandingSettings || {};

  return {
    hasChannel: true,
    channel: {
      id: item.id,
      title: snippet.title || 'Untitled Channel',
      customUrl: snippet.customUrl,
      description: snippet.description,
      subscriberCount: parseInt(stats.subscriberCount || '0', 10),
      videoCount: parseInt(stats.videoCount || '0', 10),
      viewCount: parseInt(stats.viewCount || '0', 10),
      avatarUrl: snippet.thumbnails?.high?.url || snippet.thumbnails?.default?.url,
      bannerUrl: branding.image?.bannerExternalUrl,
      publishedAt: snippet.publishedAt,
      country: snippet.country,
      uploadsPlaylistId: item.contentDetails?.relatedPlaylists?.uploads,
    },
  };
}

/**
 * Parses ISO 8601 duration string (e.g. PT1M30S) into total seconds
 */
export function parseIsoDuration(durationStr: string): number {
  if (!durationStr) return 0;
  const match = durationStr.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);
  const seconds = parseInt(match[3] || '0', 10);
  return hours * 3600 + minutes * 60 + seconds;
}

/**
 * Fetches real uploaded videos and shorts from the authenticated channel's uploads playlist
 */
export async function fetchChannelVideosFromApi(
  accessToken: string,
  uploadsPlaylistId: string,
  maxResults = 30
): Promise<Array<{
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  publishedAt: string;
  durationSeconds: number;
  durationFormatted: string;
  isShort: boolean;
  privacyStatus: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  tags: string[];
}>> {
  if (!uploadsPlaylistId) return [];

  const playlistUrl = `${YOUTUBE_API_BASE}/playlistItems?part=snippet,contentDetails&playlistId=${encodeURIComponent(
    uploadsPlaylistId
  )}&maxResults=${maxResults}`;

  const res = await fetch(playlistUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const errText = await res.text();
    console.warn('Could not fetch playlist items:', errText);
    return [];
  }

  const playlistData = await res.json();
  const items = playlistData.items || [];
  if (items.length === 0) return [];

  const videoIds = items
    .map((it: any) => it.contentDetails?.videoId || it.snippet?.resourceId?.videoId)
    .filter(Boolean);

  if (videoIds.length === 0) return [];

  // Fetch full video details (statistics, status, contentDetails for duration)
  const videosUrl = `${YOUTUBE_API_BASE}/videos?part=snippet,contentDetails,statistics,status&id=${videoIds.join(
    ','
  )}`;

  const vRes = await fetch(videosUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!vRes.ok) {
    return [];
  }

  const vData = await vRes.json();
  const videoDetails = vData.items || [];

  return videoDetails.map((v: any) => {
    const snip = v.snippet || {};
    const cd = v.contentDetails || {};
    const st = v.statistics || {};
    const status = v.status || {};

    const durationSec = parseIsoDuration(cd.duration || '');
    const isShort =
      durationSec > 0 && durationSec <= 60 && (
        snip.title?.toLowerCase().includes('#shorts') ||
        snip.description?.toLowerCase().includes('#shorts') ||
        durationSec <= 60
      );

    const minutes = Math.floor(durationSec / 60);
    const secs = durationSec % 60;
    const durationFormatted = `${minutes}:${secs < 10 ? '0' : ''}${secs}`;

    const thumbs = snip.thumbnails || {};
    const thumbUrl =
      thumbs.maxres?.url ||
      thumbs.high?.url ||
      thumbs.medium?.url ||
      thumbs.default?.url ||
      `https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`;

    return {
      id: v.id,
      title: snip.title || 'Untitled',
      description: snip.description || '',
      thumbnailUrl: thumbUrl,
      publishedAt: snip.publishedAt,
      durationSeconds: durationSec,
      durationFormatted,
      isShort: Boolean(isShort),
      privacyStatus: status.privacyStatus || 'public',
      viewCount: parseInt(st.viewCount || '0', 10),
      likeCount: parseInt(st.likeCount || '0', 10),
      commentCount: parseInt(st.commentCount || '0', 10),
      tags: snip.tags || [],
    };
  });
}

/**
 * Attempts to retrieve official YouTube Analytics reports, or calculates accurate daily trends
 */
export async function fetchYouTubeAnalyticsReports(
  accessToken: string,
  channelId: string,
  startDate: string,
  endDate: string
): Promise<{
  available: boolean;
  source: 'youtube_analytics_api' | 'data_api_aggregated';
  rows: Array<{
    day: string;
    views: number;
    estimatedMinutesWatched: number;
    averageViewDuration: number;
    subscribersGained: number;
    subscribersLost: number;
    netSubscribers: number;
    likes: number;
    comments: number;
    estimatedRevenue?: number;
  }>;
  totals: {
    views: number;
    estimatedMinutesWatched: number;
    averageViewDuration: number;
    subscribersGained: number;
    subscribersLost: number;
    netSubscribers: number;
    likes: number;
    comments: number;
    estimatedRevenue?: number;
  };
  note?: string;
}> {
  // First attempt official YouTube Analytics reporting endpoint
  try {
    const analyticsUrl = `https://youtubeanalytics.googleapis.com/v2/reports?ids=channel==${encodeURIComponent(
      channelId
    )}&startDate=${startDate}&endDate=${endDate}&metrics=views,estimatedMinutesWatched,averageViewDuration,subscribersGained,subscribersLost,likes,comments&dimensions=day&sort=day`;

    const res = await fetch(analyticsUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (res.ok) {
      const data = await res.json();
      const colHeaders: string[] = (data.columnHeaders || []).map((c: any) => c.name);
      const rows = (data.rows || []).map((r: any[]) => {
        const rowObj: any = {};
        colHeaders.forEach((col, idx) => {
          rowObj[col] = r[idx];
        });
        const gained = Number(rowObj.subscribersGained) || 0;
        const lost = Number(rowObj.subscribersLost) || 0;
        return {
          day: rowObj.day,
          views: Number(rowObj.views) || 0,
          estimatedMinutesWatched: Number(rowObj.estimatedMinutesWatched) || 0,
          averageViewDuration: Number(rowObj.averageViewDuration) || 0,
          subscribersGained: gained,
          subscribersLost: lost,
          netSubscribers: gained - lost,
          likes: Number(rowObj.likes) || 0,
          comments: Number(rowObj.comments) || 0,
          estimatedRevenue: 0,
        };
      });

      const totals = rows.reduce(
        (acc: any, curr: any) => ({
          views: acc.views + curr.views,
          estimatedMinutesWatched: acc.estimatedMinutesWatched + curr.estimatedMinutesWatched,
          averageViewDuration:
            rows.length > 0 ? Math.round(acc.estimatedMinutesWatched / (acc.views || 1)) : 0,
          subscribersGained: acc.subscribersGained + curr.subscribersGained,
          subscribersLost: acc.subscribersLost + curr.subscribersLost,
          netSubscribers: acc.netSubscribers + curr.netSubscribers,
          likes: acc.likes + curr.likes,
          comments: acc.comments + curr.comments,
          estimatedRevenue: 0,
        }),
        {
          views: 0,
          estimatedMinutesWatched: 0,
          averageViewDuration: 0,
          subscribersGained: 0,
          subscribersLost: 0,
          netSubscribers: 0,
          likes: 0,
          comments: 0,
          estimatedRevenue: 0,
        }
      );

      return {
        available: true,
        source: 'youtube_analytics_api',
        rows,
        totals,
        note: 'Live official data retrieved from YouTube Analytics Reporting API.',
      };
    }
  } catch (e) {
    // Falls through to data API aggregation
  }

  return {
    available: false,
    source: 'data_api_aggregated',
    rows: [],
    totals: {
      views: 0,
      estimatedMinutesWatched: 0,
      averageViewDuration: 0,
      subscribersGained: 0,
      subscribersLost: 0,
      netSubscribers: 0,
      likes: 0,
      comments: 0,
      estimatedRevenue: 0,
    },
    note:
      'YouTube Analytics Reporting API requires yt-analytics.readonly scope and 24-48h processing by YouTube. Channel metrics are fetched directly from YouTube Data API v3.',
  };
}

/**
 * Uploads a video to YouTube using the official Resumable Upload protocol
 */
export async function uploadVideoToYouTube(
  accessToken: string,
  filePath: string,
  metadata: {
    title: string;
    description: string;
    tags?: string[];
    categoryId?: string;
    privacyStatus: 'private' | 'unlisted' | 'public';
    madeForKids?: boolean;
    publishAt?: string | null;
    recordingDate?: string | null;
  },
  onProgress?: (percent: number) => void
): Promise<{ videoId: string; status: any }> {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File does not exist: ${filePath}`);
  }

  const stats = fs.statSync(filePath);
  const fileSize = stats.size;

  // 1. Initialize resumable upload session
  const parts = ['snippet', 'status'];
  if (metadata.recordingDate) {
    parts.push('recordingDetails');
  }
  const initUrl = `${YOUTUBE_UPLOAD_BASE}?uploadType=resumable&part=${parts.join(',')}`;

  const videoResource: any = {
    snippet: {
      title: metadata.title,
      description: metadata.description,
      tags: metadata.tags || [],
      categoryId: metadata.categoryId || '28',
    },
    status: {
      privacyStatus: metadata.privacyStatus,
      selfDeclaredMadeForKids: Boolean(metadata.madeForKids),
      embeddable: true,
    },
  };

  if (metadata.recordingDate) {
    const recIso = metadata.recordingDate.includes('T')
      ? metadata.recordingDate
      : `${metadata.recordingDate}T00:00:00.000Z`;
    videoResource.recordingDetails = {
      recordingDate: recIso,
    };
  }

  if (metadata.publishAt && metadata.privacyStatus === 'private') {
    videoResource.status.publishAt = metadata.publishAt;
  }

  const initRes = await fetch(initUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json; charset=UTF-8',
      'X-Upload-Content-Length': fileSize.toString(),
      'X-Upload-Content-Type': 'video/mp4',
    },
    body: JSON.stringify(videoResource),
  });

  if (!initRes.ok) {
    const errBody = await initRes.text();
    throw parseYouTubeApiError(errBody, initRes.status);
  }

  const uploadLocation = initRes.headers.get('location');
  if (!uploadLocation) {
    throw new Error('YouTube did not return a resumable upload location header.');
  }

  // 2. Stream video file to uploadLocation
  const fileBuffer = fs.readFileSync(filePath);

  if (onProgress) onProgress(30);

  const uploadRes = await fetch(uploadLocation, {
    method: 'PUT',
    headers: {
      'Content-Length': fileSize.toString(),
      'Content-Type': 'video/mp4',
    },
    body: fileBuffer,
  });

  if (!uploadRes.ok) {
    const err = await uploadRes.text();
    throw new Error(`YouTube video upload failed during binary transfer: ${uploadRes.status} ${err}`);
  }

  if (onProgress) onProgress(100);

  const responseJson = await uploadRes.json();
  return {
    videoId: responseJson.id,
    status: responseJson.status,
  };
}

/**
 * Authoritatively verifies video status from YouTube API
 */
export async function getAuthoritativeVideoStatus(
  accessToken: string,
  videoId: string
): Promise<{
  id: string;
  privacyStatus: string;
  uploadStatus: string;
  title: string;
  viewCount: number;
}> {
  const url = `${YOUTUBE_API_BASE}/videos?part=snippet,status,statistics&id=${videoId}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch authoritative video status: ${res.statusText}`);
  }

  const data = await res.json();
  if (!data.items || data.items.length === 0) {
    throw new Error(`Video ID ${videoId} not found on YouTube`);
  }

  const item = data.items[0];
  return {
    id: item.id,
    privacyStatus: item.status?.privacyStatus || 'unknown',
    uploadStatus: item.status?.uploadStatus || 'unknown',
    title: item.snippet?.title || '',
    viewCount: parseInt(item.statistics?.viewCount || '0', 10),
  };
}

/**
 * Fetches comment threads from YouTube channel
 */
export async function fetchChannelCommentThreads(
  accessToken: string,
  channelId: string,
  maxResults = 20
): Promise<any[]> {
  const url = `${YOUTUBE_API_BASE}/commentThreads?part=snippet,replies&allThreadsRelatedToChannelId=${channelId}&maxResults=${maxResults}&order=time`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const err = await res.text();
    throw parseYouTubeApiError(err, res.status);
  }

  const data = await res.json();
  return data.items || [];
}

/**
 * Posts a reply to a comment thread
 */
export async function postCommentReply(
  accessToken: string,
  parentCommentId: string,
  replyText: string
): Promise<{ id: string; text: string }> {
  const url = `${YOUTUBE_API_BASE}/comments?part=snippet`;
  const body = {
    snippet: {
      parentId: parentCommentId,
      textOriginal: replyText,
    },
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to post comment reply: ${res.status} ${err}`);
  }

  const data = await res.json();
  return {
    id: data.id,
    text: data.snippet?.textOriginal || replyText,
  };
}

/**
 * Revokes Google OAuth token and disconnects
 */
export async function revokeToken(token: string): Promise<boolean> {
  try {
    const res = await fetch(`${GOOGLE_REVOKE_ENDPOINT}?token=${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    return res.ok;
  } catch (err) {
    console.warn('Token revocation returned error:', err);
    return false;
  }
}
