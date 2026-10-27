import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  Users,
  Video,
  Eye,
  Heart,
  MessageCircle,
  RefreshCw,
  Film,
  Calendar,
} from 'lucide-react';
import { YouTubeChannel } from '../types.ts';
import { ErrorNotice } from './ErrorNotice.tsx';
import { AppError } from '../utils/errorDiagnostics.ts';

interface AnalyticsViewProps {
  channel: YouTubeChannel | null;
  onRefreshChannel: () => void;
  isRefreshing: boolean;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  channel,
  onRefreshChannel,
  isRefreshing,
}) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AppError | null>(null);

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/channel/analytics');
      if (res.ok) {
        const json = await res.json();
        setData(json);
      } else {
        const errJson = await res.json().catch(() => ({}));
        setError({
          title: 'Analytics Data Notice',
          operation: 'Fetch Channel Analytics & Metrics',
          message: errJson.error || `Failed to fetch analytics (HTTP ${res.status}).`,
          httpStatus: res.status,
          code: 'ANALYTICS_FETCH_FAILED',
          timestamp: new Date().toISOString(),
          requestId: `anly_${Date.now().toString(36)}`,
          suggestedFix:
            res.status === 403
              ? 'Enable YouTube Data API v3 in Google Cloud Console or configure your personal OAuth Client in Settings.'
              : 'Retry syncing channel analytics.',
          page: 'Analytics',
        });
      }
    } catch (err: any) {
      console.warn('Analytics notice:', err);
      setError({
        title: 'Network Error',
        operation: 'Fetch Channel Analytics',
        message: err.message || 'Network request failed.',
        code: 'NETWORK_ERROR',
        timestamp: new Date().toISOString(),
        suggestedFix: 'Check connection and retry.',
        page: 'Analytics',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [channel]);

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US', { notation: 'compact', compactDisplay: 'short' }).format(num || 0);
  };

  if (!channel) {
    return (
      <div className="p-12 rounded-2xl bg-zinc-900 border border-zinc-800 text-center space-y-3">
        <div className="w-12 h-12 rounded-xl bg-zinc-800 text-zinc-500 flex items-center justify-center mx-auto">
          <BarChart3 className="w-6 h-6" />
        </div>
        <p className="text-sm font-bold text-white">Channel Analytics Offline</p>
        <p className="text-xs text-zinc-400 max-w-sm mx-auto">
          Connect your authorized YouTube channel to access live subscriber statistics, view counts, and engagement analytics.
        </p>
      </div>
    );
  }

  const agentUploads = data?.agentUploads || {};

  return (
    <div className="space-y-6">
      {error && (
        <ErrorNotice
          error={error}
          onRetry={fetchAnalytics}
          onDismiss={() => setError(null)}
          isRetrying={loading}
        />
      )}

      {/* Header bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-zinc-900 border border-zinc-800">
        <div>
          <h3 className="text-base font-bold text-white tracking-tight">Channel Analytics & Performance</h3>
          <p className="text-xs text-zinc-400">
            Real official YouTube Data API statistics for {channel.title}
          </p>
        </div>

        <button
          onClick={onRefreshChannel}
          disabled={isRefreshing}
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-zinc-200 bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 rounded-xl transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span>{isRefreshing ? 'Syncing...' : 'Sync Live Stats'}</span>
        </button>
      </div>

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-1">
          <div className="flex items-center justify-between text-zinc-400 text-xs">
            <span>Subscribers</span>
            <Users className="w-4 h-4 text-red-500" />
          </div>
          <div className="text-2xl font-extrabold text-white">
            {formatNumber(channel.subscriber_count)}
          </div>
          <p className="text-[10px] text-zinc-500">Official channel audience</p>
        </div>

        <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-1">
          <div className="flex items-center justify-between text-zinc-400 text-xs">
            <span>Lifetime Views</span>
            <Eye className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-extrabold text-white">
            {formatNumber(channel.view_count)}
          </div>
          <p className="text-[10px] text-zinc-500">Total channel impressions</p>
        </div>

        <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-1">
          <div className="flex items-center justify-between text-zinc-400 text-xs">
            <span>Agent Uploads</span>
            <Video className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-extrabold text-white">
            {agentUploads.total || 0}
          </div>
          <p className="text-[10px] text-zinc-500">Processed by this agent</p>
        </div>

        <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-1">
          <div className="flex items-center justify-between text-zinc-400 text-xs">
            <span>Content Split</span>
            <Film className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-sm font-bold text-white pt-1">
            {agentUploads.shorts || 0} Shorts / {agentUploads.longForm || 0} Long
          </div>
          <p className="text-[10px] text-zinc-500">Shorts vs regular videos</p>
        </div>
      </div>

      {/* Content Breakdown & Engagement Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Uploaded Content Breakdown */}
        <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-4">
          <h4 className="text-sm font-bold text-white flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-red-500" />
            <span>AI Agent Publication Summary</span>
          </h4>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between items-center p-3 rounded-xl bg-zinc-950 border border-zinc-800">
              <span className="text-zinc-400">Total Upload Jobs Executed</span>
              <span className="font-bold text-white font-mono">{agentUploads.total || 0}</span>
            </div>
            <div className="flex justify-between items-center p-3 rounded-xl bg-zinc-950 border border-zinc-800">
              <span className="text-zinc-400">YouTube Shorts Published</span>
              <span className="font-bold text-red-400 font-mono">{agentUploads.shorts || 0}</span>
            </div>
            <div className="flex justify-between items-center p-3 rounded-xl bg-zinc-950 border border-zinc-800">
              <span className="text-zinc-400">Standard Long-Form Videos</span>
              <span className="font-bold text-blue-400 font-mono">{agentUploads.longForm || 0}</span>
            </div>
            <div className="flex justify-between items-center p-3 rounded-xl bg-zinc-950 border border-zinc-800">
              <span className="text-zinc-400">Total Channel Videos (All-time)</span>
              <span className="font-bold text-white font-mono">{channel.video_count || 0}</span>
            </div>
          </div>
        </div>

        {/* Channel Details Card */}
        <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-4">
          <h4 className="text-sm font-bold text-white flex items-center gap-2">
            <Calendar className="w-4 h-4 text-red-500" />
            <span>Authorized Channel Metadata</span>
          </h4>

          <div className="space-y-3 text-xs">
            <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 space-y-1">
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">Channel Title</span>
              <p className="text-white font-bold">{channel.title}</p>
            </div>
            <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 space-y-1">
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">Official YouTube Channel ID</span>
              <p className="text-zinc-300 font-mono text-[11px] select-all">{channel.channel_id}</p>
            </div>
            <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 space-y-1">
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">Last Authoritative API Sync</span>
              <p className="text-zinc-400">{new Date(channel.last_synced_at).toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
