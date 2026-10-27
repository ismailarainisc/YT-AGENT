export interface YouTubeChannel {
  id: string;
  channel_id: string;
  account_id: string;
  title: string;
  custom_url?: string;
  description?: string;
  subscriber_count: number;
  video_count: number;
  view_count: number;
  avatar_url?: string;
  banner_url?: string;
  default_privacy: 'private' | 'unlisted' | 'public';
  is_active: number;
  last_synced_at: string;
}

export interface ConnectedAccount {
  id: string;
  email: string;
  name?: string;
  picture?: string;
  created_at: string;
}

export interface ExecutionPlan {
  title: string;
  suggestedTitles: string[];
  description: string;
  hashtags: string[];
  tags: string[];
  categoryId: string;
  categoryName: string;
  visibility: 'private' | 'unlisted' | 'public';
  madeForKids: boolean;
  isShort: boolean;
  scheduledTime: string | null;
  confidence: number;
  detectedLanguage: string;
  conflicts: string[];
  ambiguities: string[];
  explanation: string;
}

export interface PolicyResult {
  allowed: boolean;
  sanitizedPrivacy: 'private' | 'unlisted' | 'public';
  reasons: string[];
  warnings: string[];
  requiresExplicitOverride: boolean;
}

export interface UploadJob {
  id: string;
  channel_id: string;
  title: string;
  description: string;
  tags: string;
  hashtags: string;
  category_id: string;
  privacy_status: 'private' | 'unlisted' | 'public';
  publish_at: string | null;
  made_for_kids: number;
  file_path: string;
  original_filename: string;
  file_size: number;
  duration: number;
  is_short: number;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  youtube_video_id: string | null;
  verified_status: string | null;
  error_message: string | null;
  retry_count: number;
  autonomous_mode: number;
  created_at: string;
  updated_at: string;
}

export interface UploadedVideo {
  id: string;
  channel_id: string;
  youtube_video_id: string;
  title: string;
  description: string;
  privacy_status: string;
  is_short: number;
  view_count: number;
  like_count: number;
  comment_count: number;
  published_at?: string;
  verified_at?: string;
  upload_job_id?: string;
  created_at: string;
}

export interface CommentThread {
  id: string;
  channel_id: string;
  youtube_comment_id: string;
  video_id?: string;
  author_name: string;
  author_avatar?: string;
  text_display: string;
  published_at: string;
  category: 'question' | 'feedback' | 'complaint' | 'spam' | 'general';
  sentiment: 'positive' | 'negative' | 'neutral';
  detected_intent?: string;
  reply_status: 'unanswered' | 'replied';
  is_spam: number;
  reply_text?: string;
  reply_send_status?: string;
  posted_at?: string;
}

export interface PendingDmAction {
  id: string;
  comment_thread_id?: string;
  youtube_comment_id: string;
  video_id?: string;
  author_name: string;
  comment_text: string;
  requested_resource?: string;
  detected_intent: string;
  suggested_reply?: string;
  matched_link_id?: string;
  status: 'pending' | 'auto_fulfilled' | 'approved' | 'dismissed';
  email_sent: number;
  provided_link?: string;
  created_at: string;
  resolved_at?: string;
}

export interface LearnedLink {
  id: string;
  channel_id: string;
  video_id?: string;
  keyword_trigger: string;
  title: string;
  resource_url: string;
  description?: string;
  times_shared: number;
  created_at: string;
  updated_at: string;
}

export interface AiProviderConfig {
  id: string;
  provider_id: 'gemini' | 'openrouter' | 'nvidia' | 'mistral';
  provider_name: string;
  api_key_masked?: string;
  base_url?: string;
  model_name: string;
  is_enabled: number;
  priority_order: number;
  is_free_tier: number;
  consecutive_failures: number;
  last_used_at?: string;
}

export interface AiChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  provider?: string;
  model?: string;
  timestamp: string;
}


export interface TestResult {
  id: string;
  name: string;
  category: 'policy' | 'oauth' | 'ai' | 'queue' | 'comments' | 'database' | 'live_integration';
  status: 'passed' | 'failed' | 'skipped';
  durationMs: number;
  message: string;
  details?: any;
}

export type ConnectionState =
  | 'not_connected'
  | 'connecting'
  | 'connected_authorized'
  | 'connected_missing_channel'
  | 'connected_missing_permissions'
  | 'session_expired'
  | 'reauthorization_required'
  | 'connection_failed'
  | 'api_enablement_required';

export interface DailyAnalyticsPoint {
  date: string;
  label: string;
  views: number;
  watchTimeHours: number;
  likes: number;
  comments: number;
  subscribersGained: number;
}

export interface ContentItem {
  id: string;
  videoId: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  publishedAt: string;
  durationFormatted: string;
  isShort: boolean;
  privacyStatus: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  source: 'youtube_live' | 'local_agent';
}

export interface DashboardData {
  connected: boolean;
  channel: {
    id: string;
    title: string;
    customUrl?: string;
    description?: string;
    avatarUrl?: string;
    bannerUrl?: string;
    subscriberCount: number;
    videoCount: number;
    viewCount: number;
    publishedAt?: string;
    country?: string;
    lastSyncedAt?: string;
  };
  performance: {
    views: number;
    periodViews: number;
    estimatedWatchTimeHours: number;
    periodWatchTimeHours: number;
    averageViewDuration: string;
    averageViewDurationSeconds: number;
    totalLikes: number;
    totalComments: number;
    netSubscribers: number;
    estimatedRevenue: number;
    revenueDisclaimer: string;
    comparison: {
      viewsChangePercent: number;
      watchTimeChangePercent: number;
      subscribersChangePercent: number;
      likesChangePercent: number;
    };
  };
  dateRange: {
    selectedDays: number;
    startDate: string;
    endDate: string;
  };
  dailyAnalytics: DailyAnalyticsPoint[];
  recentContent: ContentItem[];
  recentShorts: ContentItem[];
  recentVideos: ContentItem[];
  lastRefreshedAt: string;
}
