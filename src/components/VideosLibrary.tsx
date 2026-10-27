import React, { useState, useEffect } from 'react';
import {
  Video,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  Lock,
  Eye,
  CheckCircle2,
  AlertCircle,
  Play,
  Film,
  Flame,
  ThumbsUp,
  MessageCircle,
  UploadCloud,
} from 'lucide-react';
import { UploadedVideo, YouTubeChannel, ContentItem } from '../types.ts';
import { ErrorNotice } from './ErrorNotice.tsx';
import { AppError } from '../utils/errorDiagnostics.ts';

interface VideosLibraryProps {
  channel?: YouTubeChannel | null;
  onNavigateUpload?: () => void;
}

export const VideosLibrary: React.FC<VideosLibraryProps> = ({
  channel,
  onNavigateUpload,
}) => {
  const [videos, setVideos] = useState<UploadedVideo[]>([]);
  const [liveVideos, setLiveVideos] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'shorts' | 'longform'>('all');
  const [source, setSource] = useState<'all_youtube' | 'agent_only'>('all_youtube');
  const [error, setError] = useState<AppError | null>(null);

  const fetchVideos = async () => {
    setLoading(true);
    setError(null);
    try {
      const [agentRes, liveRes] = await Promise.all([
        fetch('/api/videos/list'),
        fetch('/api/channel/live-videos'),
      ]);

      if (agentRes.ok) {
        const data = await agentRes.json();
        setVideos(data.videos || []);
      }

      if (liveRes.ok) {
        const liveData = await liveRes.json();
        setLiveVideos(liveData.videos || []);
      }
    } catch (err: any) {
      console.warn('Notice fetching videos:', err);
      setError({
        title: 'Failed to Load Content Library',
        operation: 'Fetch Videos from YouTube and Local Database',
        message: err.message || 'Unable to load videos.',
        code: 'VIDEOS_FETCH_FAILED',
        timestamp: new Date().toISOString(),
        requestId: `vid_req_${Date.now().toString(36)}`,
        suggestedFix: 'Ensure your YouTube channel is connected and retry.',
        page: 'Videos',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVideos();
  }, [channel]);

  const handleVerify = async (videoId: string) => {
    setVerifyingId(videoId);
    try {
      const res = await fetch(`/api/videos/verify/${videoId}`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        await fetchVideos();
      }
    } catch (err) {
      console.warn('Verification notice:', err);
    } finally {
      setVerifyingId(null);
    }
  };

  // Combine items according to selected source
  const displayItems = () => {
    if (source === 'agent_only') {
      return videos.map((v) => ({
        id: v.youtube_video_id,
        title: v.title,
        description: v.description,
        thumbnailUrl: `https://img.youtube.com/vi/${v.youtube_video_id}/mqdefault.jpg`,
        isShort: Boolean(v.is_short),
        privacyStatus: v.privacy_status,
        viewCount: v.view_count || 0,
        publishedAt: v.created_at,
        isAgent: true,
      }));
    }

    // Merge liveVideos with agent videos (de-duping by ID)
    const map = new Map<string, any>();
    for (const v of liveVideos) {
      map.set(v.id, {
        id: v.id,
        title: v.title,
        description: v.description,
        thumbnailUrl: v.thumbnailUrl,
        isShort: Boolean(v.isShort),
        privacyStatus: v.privacyStatus || 'public',
        viewCount: v.viewCount || 0,
        likeCount: v.likeCount || 0,
        commentCount: v.commentCount || 0,
        publishedAt: v.publishedAt,
        durationFormatted: v.durationFormatted,
        isAgent: false,
      });
    }
    for (const v of videos) {
      const existing = map.get(v.youtube_video_id);
      if (existing) {
        existing.isAgent = true;
      } else {
        map.set(v.youtube_video_id, {
          id: v.youtube_video_id,
          title: v.title,
          description: v.description,
          thumbnailUrl: `https://img.youtube.com/vi/${v.youtube_video_id}/mqdefault.jpg`,
          isShort: Boolean(v.is_short),
          privacyStatus: v.privacy_status,
          viewCount: v.view_count || 0,
          publishedAt: v.created_at,
          isAgent: true,
        });
      }
    }

    return Array.from(map.values());
  };

  const allItems = displayItems();
  const filteredItems = allItems.filter((item) => {
    if (filter === 'shorts') return item.isShort;
    if (filter === 'longform') return !item.isShort;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Error Notice */}
      {error && (
        <ErrorNotice
          error={error}
          onRetry={fetchVideos}
          onDismiss={() => setError(null)}
          isRetrying={loading}
        />
      )}

      {/* Top Filter Bar */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-4 rounded-2xl bg-zinc-900 border border-zinc-800">
        <div>
          <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
            <Video className="w-5 h-5 text-red-500" />
            <span>Channel Videos & Content Library</span>
          </h3>
          <p className="text-xs text-zinc-400">
            {channel ? `Showing uploads for ${channel.title}` : 'Official YouTube channel uploads and verified AI posts'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          {/* Source Toggle */}
          <div className="flex items-center p-1 bg-zinc-950 border border-zinc-800 rounded-xl text-xs">
            <button
              onClick={() => setSource('all_youtube')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                source === 'all_youtube' ? 'bg-zinc-800 text-white shadow-xs' : 'text-zinc-400 hover:text-white'
              }`}
            >
              All YouTube ({allItems.length})
            </button>
            <button
              onClick={() => setSource('agent_only')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                source === 'agent_only' ? 'bg-zinc-800 text-white shadow-xs' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Agent Uploads ({videos.length})
            </button>
          </div>

          {/* Type Filter */}
          <div className="flex items-center p-1 bg-zinc-950 border border-zinc-800 rounded-xl text-xs">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                filter === 'all' ? 'bg-zinc-800 text-white shadow-xs' : 'text-zinc-400 hover:text-white'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('shorts')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                filter === 'shorts' ? 'bg-zinc-800 text-white shadow-xs' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Shorts
            </button>
            <button
              onClick={() => setFilter('longform')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                filter === 'longform' ? 'bg-zinc-800 text-white shadow-xs' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Long-Form
            </button>
          </div>

          <button
            onClick={fetchVideos}
            disabled={loading}
            className="p-2 bg-zinc-950 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-xl border border-zinc-800 transition-colors disabled:opacity-50"
            title="Refresh videos from YouTube"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {onNavigateUpload && (
            <button
              onClick={onNavigateUpload}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold transition-all shadow-sm shadow-red-600/30"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>Upload New</span>
            </button>
          )}
        </div>
      </div>

      {/* Videos Grid */}
      {loading ? (
        <div className="p-16 text-center space-y-3 rounded-2xl bg-zinc-900/40 border border-zinc-800">
          <RefreshCw className="w-6 h-6 text-red-500 animate-spin mx-auto" />
          <p className="text-xs text-zinc-400">Loading videos directly from YouTube API...</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="p-16 rounded-2xl bg-zinc-900/40 border border-zinc-800 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-zinc-800/80 flex items-center justify-center text-zinc-500 mx-auto">
            <Film className="w-7 h-7" />
          </div>
          <div className="space-y-1.5">
            <p className="text-sm font-bold text-white">No videos found</p>
            <p className="text-xs text-zinc-400 max-w-sm mx-auto">
              {channel
                ? 'Your YouTube channel has no videos matching this filter yet.'
                : 'Connect your YouTube account to view all live videos and Shorts.'}
            </p>
          </div>
          {onNavigateUpload && (
            <button
              onClick={onNavigateUpload}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-red-600/30"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>Upload Your First Video</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((video) => (
            <div
              key={video.id}
              className="rounded-2xl bg-zinc-900 border border-zinc-800 overflow-hidden flex flex-col justify-between hover:border-zinc-700 transition-all shadow-md group"
            >
              <div>
                {/* Thumbnail Preview Area */}
                <div className="relative aspect-video bg-black flex items-center justify-center border-b border-zinc-800 overflow-hidden">
                  <img
                    src={video.thumbnailUrl}
                    alt={video.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-80" />

                  {/* Badges on thumbnail */}
                  <div className="absolute top-2 left-2 flex items-center gap-1.5 flex-wrap">
                    {video.isShort ? (
                      <span className="text-[10px] font-bold text-white bg-red-600 px-2 py-0.5 rounded shadow-sm flex items-center gap-1">
                        <Flame className="w-2.5 h-2.5" />
                        SHORT
                      </span>
                    ) : (
                      <span className="text-[10px] font-medium text-zinc-300 bg-zinc-900/80 px-2 py-0.5 rounded backdrop-blur-xs">
                        VIDEO
                      </span>
                    )}

                    <span
                      className={`text-[10px] font-medium px-2 py-0.5 rounded capitalize ${
                        video.privacyStatus === 'private'
                          ? 'bg-zinc-900/90 text-zinc-300'
                          : video.privacyStatus === 'unlisted'
                          ? 'bg-amber-950/80 text-amber-300'
                          : 'bg-emerald-950/80 text-emerald-300'
                      }`}
                    >
                      {video.privacyStatus}
                    </span>

                    {video.isAgent && (
                      <span className="text-[10px] font-bold text-purple-300 bg-purple-950/80 border border-purple-800/40 px-2 py-0.5 rounded">
                        AI Agent
                      </span>
                    )}
                  </div>

                  {video.durationFormatted && (
                    <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/80 text-[10px] font-mono text-zinc-300">
                      {video.durationFormatted}
                    </span>
                  )}

                  <a
                    href={`https://youtube.com/watch?v=${video.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40"
                    title="Play on YouTube"
                  >
                    <div className="w-10 h-10 rounded-full bg-red-600 text-white flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
                      <Play className="w-5 h-5 fill-white ml-0.5" />
                    </div>
                  </a>
                </div>

                {/* Details */}
                <div className="p-4 space-y-2">
                  <h4 className="text-sm font-bold text-white line-clamp-2 leading-snug">
                    {video.title}
                  </h4>
                  <p className="text-xs text-zinc-400 line-clamp-2 font-mono">
                    {video.description || 'No description provided'}
                  </p>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="px-4 py-3 bg-zinc-950 border-t border-zinc-800 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3 text-zinc-400 text-[11px]">
                  <span className="flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5" />
                    {new Intl.NumberFormat('en-US', { notation: 'compact' }).format(video.viewCount || 0)}
                  </span>
                  {video.likeCount !== undefined && video.likeCount > 0 && (
                    <span className="flex items-center gap-1">
                      <ThumbsUp className="w-3 h-3" />
                      {video.likeCount}
                    </span>
                  )}
                  {video.commentCount !== undefined && video.commentCount > 0 && (
                    <span className="flex items-center gap-1">
                      <MessageCircle className="w-3 h-3" />
                      {video.commentCount}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleVerify(video.id)}
                    disabled={verifyingId === video.id}
                    title="Verify upload status with YouTube Data API"
                    className="flex items-center gap-1 text-[11px] font-medium text-zinc-300 hover:text-white px-2 py-1 rounded-md bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3 h-3 ${verifyingId === video.id ? 'animate-spin' : ''}`} />
                    <span>Verify</span>
                  </button>

                  <a
                    href={`https://youtube.com/watch?v=${video.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 text-zinc-400 hover:text-white rounded-md hover:bg-zinc-800 transition-colors"
                    title="Open on YouTube"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
