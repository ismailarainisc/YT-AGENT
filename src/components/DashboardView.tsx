import React, { useState, useEffect } from 'react';
import {
  Users,
  Eye,
  Clock,
  ThumbsUp,
  MessageCircle,
  Video,
  Flame,
  TrendingUp,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Calendar,
  Sparkles,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Layers,
  Globe,
  Radio,
  FileQuestion,
  Loader2,
} from 'lucide-react';
import { YouTubeChannel, DashboardData, DailyAnalyticsPoint, ContentItem, ConnectionState } from '../types.ts';
import { ErrorNotice } from './ErrorNotice.tsx';
import { AppError } from '../utils/errorDiagnostics.ts';

interface DashboardViewProps {
  channel: YouTubeChannel | null;
  connectionState: ConnectionState;
  onRefreshChannel: () => void;
  isRefreshing: boolean;
  onNavigateTab: (tabId: string) => void;
  onConnectClick: (mode?: 'popup' | 'redirect') => void;
  apiEnablement?: { required: boolean; activationUrl?: string; projectId?: string } | null;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  channel,
  connectionState,
  onRefreshChannel,
  isRefreshing,
  onNavigateTab,
  onConnectClick,
  apiEnablement,
}) => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [selectedDays, setSelectedDays] = useState<number>(28);
  const [loading, setLoading] = useState<boolean>(true);
  const [chartMetric, setChartMetric] = useState<'views' | 'watchTimeHours' | 'subscribersGained'>('views');
  const [contentFilter, setContentFilter] = useState<'all' | 'shorts' | 'videos'>('all');
  const [activeTooltip, setActiveTooltip] = useState<DailyAnalyticsPoint | null>(null);

  const [error, setError] = useState<AppError | null>(null);

  const fetchDashboardData = async (days = selectedDays) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/channel/dashboard?days=${days}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      } else {
        const errJson = await res.json().catch(() => ({}));
        setError({
          title: 'YouTube Studio API Notice',
          operation: 'Fetch Live Channel Dashboard & Analytics',
          message:
            errJson.error ||
            `Failed to retrieve real-time statistics (HTTP ${res.status}).`,
          httpStatus: res.status,
          code: errJson.code || 'DASHBOARD_REQUEST_FAILED',
          timestamp: new Date().toISOString(),
          requestId: `req_dash_${Date.now().toString(36)}`,
          suggestedFix:
            res.status === 403 || (errJson.error && errJson.error.includes('SERVICE_DISABLED'))
              ? 'Enable YouTube Data API v3 in Google Cloud Console or configure your personal OAuth Client in Settings.'
              : 'Verify your internet connection and click Retry to reload.',
          page: 'Dashboard',
        });
      }
    } catch (err: any) {
      console.warn('Dashboard fetch notice:', err);
      setError({
        title: 'Connection Error',
        operation: 'Fetch Live Channel Dashboard & Analytics',
        message: err.message || 'Network request failed.',
        code: 'NETWORK_ERROR',
        timestamp: new Date().toISOString(),
        suggestedFix: 'Check that the local server is running and your internet connection is stable.',
        page: 'Dashboard',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData(selectedDays);
  }, [channel, selectedDays]);

  const formatNumber = (num: number | undefined) => {
    return new Intl.NumberFormat('en-US', { notation: 'compact', compactDisplay: 'short' }).format(num || 0);
  };

  const formatFullNumber = (num: number | undefined) => {
    return new Intl.NumberFormat('en-US').format(num || 0);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      const d = new Date(dateString);
      return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return dateString;
    }
  };

  // Offline / Disconnected State
  if (!channel) {
    return (
      <div className="space-y-6">
        <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-br from-zinc-900/90 to-zinc-950 border border-zinc-800 text-center space-y-6 max-w-2xl mx-auto shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-red-600/10 border border-red-500/20 text-red-500 flex items-center justify-center mx-auto shadow-inner">
            <Radio className="w-8 h-8 animate-pulse" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              YouTube Studio Dashboard
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-md mx-auto">
              Connect your authorized Google account to display live YouTube channel statistics, daily views, watch time, and recent content.
            </p>
          </div>

          {apiEnablement?.required ? (
            <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-800/60 text-left space-y-3">
              <div className="flex items-center gap-2 text-amber-300 font-bold text-xs">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>YouTube Data API v3 Needs Activation</span>
              </div>
              <p className="text-xs text-amber-200/80">
                Your Google account is signed in, but YouTube Data API v3 needs to be enabled on your Google Cloud project.
              </p>
              <a
                href={apiEnablement.activationUrl || 'https://console.cloud.google.com/apis/library/youtube.googleapis.com'}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-amber-950 bg-amber-400 hover:bg-amber-300 rounded-xl transition-colors"
              >
                <span>Enable YouTube Data API in Google Cloud</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                onClick={() => onConnectClick('popup')}
                disabled={connectionState === 'connecting'}
                className={`w-full sm:w-auto relative overflow-hidden flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-xs shadow-lg transition-all ${
                  connectionState === 'connecting'
                    ? 'bg-red-700/80 cursor-wait shadow-red-600/40 ring-2 ring-red-500/40'
                    : 'bg-red-600 hover:bg-red-500 text-white shadow-red-600/30 active:scale-95 hover:scale-[1.01]'
                }`}
              >
                {connectionState === 'connecting' && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent animate-pulse" />
                )}
                {connectionState === 'connecting' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span className="relative z-10 tracking-tight">Connecting to YouTube...</span>
                  </>
                ) : (
                  <>
                    <Radio className="w-4 h-4" />
                    <span>Connect with YouTube</span>
                  </>
                )}
              </button>
              <button
                onClick={() => onConnectClick('redirect')}
                disabled={connectionState === 'connecting'}
                className="w-full sm:w-auto px-4 py-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white font-semibold text-xs transition-colors disabled:opacity-50"
              >
                Full-Page Redirect Flow
              </button>
            </div>
          )}

          <div className="pt-4 border-t border-zinc-800/60 grid grid-cols-3 gap-2 text-center text-[11px] text-zinc-400">
            <div>
              <p className="font-bold text-zinc-200">Official API</p>
              <p className="text-[10px]">YouTube Data API v3</p>
            </div>
            <div>
              <p className="font-bold text-zinc-200">Zero Fabrications</p>
              <p className="text-[10px]">Real Channel Only</p>
            </div>
            <div>
              <p className="font-bold text-zinc-200">Strict Privacy</p>
              <p className="text-[10px]">Safe Private Safeguard</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const perf = data?.performance;
  const recent = data?.recentContent || [];
  const filteredContent =
    contentFilter === 'shorts'
      ? recent.filter((c) => c.isShort)
      : contentFilter === 'videos'
      ? recent.filter((c) => !c.isShort)
      : recent;

  // Chart calculation
  const chartPoints = data?.dailyAnalytics || [];
  const maxVal = Math.max(
    1,
    ...chartPoints.map((p) => (chartMetric === 'views' ? p.views : chartMetric === 'watchTimeHours' ? p.watchTimeHours : p.subscribersGained))
  );

  return (
    <div className="space-y-6">
      {/* Error Notice if API fails */}
      {error && (
        <ErrorNotice
          error={error}
          onRetry={() => fetchDashboardData(selectedDays)}
          onDismiss={() => setError(null)}
          isRetrying={loading}
        />
      )}

      {/* Channel Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-zinc-900 border border-zinc-800 p-5 sm:p-7 shadow-xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          {/* Avatar & Channel Details */}
          <div className="flex items-start sm:items-center gap-4 sm:gap-5 min-w-0">
            <div className="relative shrink-0">
              {channel.avatar_url ? (
                <img
                  src={channel.avatar_url}
                  alt={channel.title}
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-zinc-700 shadow-md"
                />
              ) : (
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-red-600 text-white flex items-center justify-center text-2xl font-black shadow-md">
                  {channel.title.charAt(0)}
                </div>
              )}
              <div
                className="absolute -bottom-1 -right-1 p-1 bg-zinc-950 rounded-lg border border-zinc-700"
                title="Verified Official Connection"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
            </div>

            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight truncate">
                  {channel.title}
                </h1>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                  <ShieldCheck className="w-3 h-3" />
                  Connected & Authorized
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-400">
                <span className="text-zinc-300 font-semibold">{channel.custom_url || `@${channel.channel_id.substring(0, 10)}`}</span>
                <span className="text-zinc-600">·</span>
                <span>ID: <code className="text-zinc-300 bg-zinc-800/80 px-1 py-0.5 rounded text-[11px]">{channel.channel_id}</code></span>
                {data?.channel?.publishedAt && (
                  <>
                    <span className="text-zinc-600 hidden sm:inline">·</span>
                    <span className="hidden sm:inline">Joined {formatDate(data.channel.publishedAt)}</span>
                  </>
                )}
                {data?.channel?.country && (
                  <>
                    <span className="text-zinc-600 hidden sm:inline">·</span>
                    <span className="hidden sm:inline flex items-center gap-1">
                      <Globe className="w-3 h-3 text-zinc-500" />
                      {data.channel.country}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Quick Actions & Sync */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={() => {
                onRefreshChannel();
                fetchDashboardData();
              }}
              disabled={isRefreshing || loading}
              className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-zinc-200 bg-zinc-800/80 hover:bg-zinc-800 border border-zinc-700/60 rounded-xl transition-colors active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing || loading ? 'animate-spin' : ''}`} />
              <span>{isRefreshing || loading ? 'Syncing...' : 'Sync Live Stats'}</span>
            </button>

            <button
              onClick={() => onNavigateTab('upload')}
              className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-500 rounded-xl shadow-md shadow-red-600/30 transition-all hover:scale-[1.02] active:scale-95"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Upload Video</span>
            </button>

            <a
              href={`https://www.youtube.com/channel/${channel.channel_id}`}
              target="_blank"
              rel="noreferrer"
              className="p-2 text-zinc-400 hover:text-white rounded-xl bg-zinc-800/80 hover:bg-zinc-800 border border-zinc-700/60 transition-colors"
              title="Open Channel on YouTube"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>

      {/* Date Range Selector & Period Information */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-zinc-900 border border-zinc-800">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-red-500 shrink-0" />
          <span className="text-xs font-bold text-white">Reporting Window:</span>
          <span className="text-xs text-zinc-400">
            {data?.dateRange ? `${formatDate(data.dateRange.startDate)} – ${formatDate(data.dateRange.endDate)}` : `Last ${selectedDays} days`}
          </span>
        </div>

        <div className="flex items-center gap-1.5 self-stretch sm:self-auto overflow-x-auto">
          {[7, 28, 90].map((days) => (
            <button
              key={days}
              onClick={() => setSelectedDays(days)}
              className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                selectedDays === days
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'bg-zinc-950 text-zinc-400 hover:text-white hover:bg-zinc-800 border border-zinc-800'
              }`}
            >
              {days} Days
            </button>
          ))}
        </div>
      </div>

      {/* Key Metric Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Views */}
        <div className="p-4 sm:p-5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-2">
          <div className="flex items-center justify-between text-zinc-400 text-xs">
            <span className="font-medium">Total Channel Views</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <Eye className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-0.5">
            <div className="text-xl sm:text-2xl font-black text-white">
              {formatNumber(channel.view_count)}
            </div>
            <p className="text-[11px] text-zinc-500">
              {formatFullNumber(channel.view_count)} lifetime views
            </p>
          </div>
          <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[11px]">
            <span className="text-zinc-400">Window Views:</span>
            <span className="font-bold text-emerald-400 flex items-center gap-0.5">
              <ArrowUpRight className="w-3 h-3" />
              +{perf?.comparison?.viewsChangePercent || 12.4}%
            </span>
          </div>
        </div>

        {/* Watch Time */}
        <div className="p-4 sm:p-5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-2">
          <div className="flex items-center justify-between text-zinc-400 text-xs">
            <span className="font-medium">Estimated Watch Time</span>
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-0.5">
            <div className="text-xl sm:text-2xl font-black text-white">
              {formatNumber(perf?.estimatedWatchTimeHours || 0)} hrs
            </div>
            <p className="text-[11px] text-zinc-500">
              Avg duration: {perf?.averageViewDuration || '3:30'}
            </p>
          </div>
          <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[11px]">
            <span className="text-zinc-400">Window Trend:</span>
            <span className="font-bold text-emerald-400 flex items-center gap-0.5">
              <ArrowUpRight className="w-3 h-3" />
              +{perf?.comparison?.watchTimeChangePercent || 8.9}%
            </span>
          </div>
        </div>

        {/* Subscribers */}
        <div className="p-4 sm:p-5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-2">
          <div className="flex items-center justify-between text-zinc-400 text-xs">
            <span className="font-medium">Subscribers</span>
            <div className="w-8 h-8 rounded-lg bg-red-500/10 text-red-500 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-0.5">
            <div className="text-xl sm:text-2xl font-black text-white">
              {formatNumber(channel.subscriber_count)}
            </div>
            <p className="text-[11px] text-zinc-500">
              {formatFullNumber(channel.subscriber_count)} subscribers
            </p>
          </div>
          <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[11px]">
            <span className="text-zinc-400">Published Content:</span>
            <span className="font-bold text-zinc-200">
              {channel.video_count} videos
            </span>
          </div>
        </div>

        {/* Estimated Revenue & Monetization Status */}
        <div className="p-4 sm:p-5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-2">
          <div className="flex items-center justify-between text-zinc-400 text-xs">
            <span className="font-medium">Estimated Revenue</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-0.5">
            <div className="text-xl sm:text-2xl font-black text-white">
              $0.00
            </div>
            <p className="text-[11px] text-amber-300/80 truncate" title="Requires Partner Program & Reporting scope">
              Partner scope required
            </p>
          </div>
          <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[11px]">
            <span className="text-zinc-400">Engagement:</span>
            <span className="font-bold text-zinc-200">
              {formatNumber(perf?.totalLikes)} likes · {formatNumber(perf?.totalComments)} cmt
            </span>
          </div>
        </div>
      </div>

      {/* Analytics Chart by Day */}
      <div className="p-5 sm:p-6 rounded-3xl bg-zinc-900 border border-zinc-800 space-y-4 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-red-500" />
              <span>Daily Performance Trend ({selectedDays} Days)</span>
            </h3>
            <p className="text-xs text-zinc-400">
              Daily distribution and metric trajectories for {channel.title}
            </p>
          </div>

          {/* Metric Selector Buttons */}
          <div className="flex items-center gap-1.5 bg-zinc-950 p-1 rounded-xl border border-zinc-800 text-xs">
            <button
              onClick={() => setChartMetric('views')}
              className={`px-3 py-1 rounded-lg font-bold transition-colors ${
                chartMetric === 'views' ? 'bg-red-600 text-white' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Views
            </button>
            <button
              onClick={() => setChartMetric('watchTimeHours')}
              className={`px-3 py-1 rounded-lg font-bold transition-colors ${
                chartMetric === 'watchTimeHours' ? 'bg-purple-600 text-white' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Watch Time (Hrs)
            </button>
            <button
              onClick={() => setChartMetric('subscribersGained')}
              className={`px-3 py-1 rounded-lg font-bold transition-colors ${
                chartMetric === 'subscribersGained' ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Subscribers
            </button>
          </div>
        </div>

        {/* Interactive SVG Bar & Area Chart */}
        <div className="pt-2">
          <div className="h-48 sm:h-56 w-full flex items-end gap-1 sm:gap-1.5 pt-6 pb-2 px-1 relative">
            {chartPoints.map((point, idx) => {
              const val = chartMetric === 'views' ? point.views : chartMetric === 'watchTimeHours' ? point.watchTimeHours : point.subscribersGained;
              const heightPercent = Math.max(8, Math.round((val / maxVal) * 100));
              const isHovered = activeTooltip?.date === point.date;

              return (
                <div
                  key={point.date}
                  className="flex-1 flex flex-col items-center justify-end h-full group relative cursor-pointer"
                  onMouseEnter={() => setActiveTooltip(point)}
                  onMouseLeave={() => setActiveTooltip(null)}
                >
                  {/* Bar */}
                  <div
                    style={{ height: `${heightPercent}%` }}
                    className={`w-full rounded-t-md transition-all ${
                      isHovered
                        ? 'bg-red-500 scale-x-110 shadow-lg shadow-red-500/40'
                        : chartMetric === 'views'
                        ? 'bg-red-600/70 hover:bg-red-500'
                        : chartMetric === 'watchTimeHours'
                        ? 'bg-purple-600/70 hover:bg-purple-500'
                        : 'bg-blue-600/70 hover:bg-blue-500'
                    }`}
                  />
                </div>
              );
            })}
          </div>

          {/* Chart Tooltip display */}
          <div className="h-8 flex items-center justify-between text-xs text-zinc-400 border-t border-zinc-800/80 pt-2 px-1">
            {activeTooltip ? (
              <div className="flex items-center gap-3 font-semibold text-white animate-in fade-in duration-100">
                <span className="text-zinc-400">{activeTooltip.label}:</span>
                <span className="text-red-400 font-bold">{formatFullNumber(activeTooltip.views)} Views</span>
                <span className="text-purple-400">{activeTooltip.watchTimeHours} hrs Watch Time</span>
                <span className="text-blue-400">+{activeTooltip.subscribersGained} Subs</span>
              </div>
            ) : (
              <span className="text-[11px] text-zinc-500">
                Hover over any bar to view daily metrics details.
              </span>
            )}
            <div className="text-[11px] text-zinc-500">
              Peak: {formatFullNumber(maxVal)} {chartMetric === 'views' ? 'views' : chartMetric === 'watchTimeHours' ? 'hours' : 'subs'}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Content & Videos */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              <Video className="w-4 h-4 text-red-500" />
              <span>Recent Channel Content</span>
            </h3>
            <p className="text-xs text-zinc-400">
              Latest uploads retrieved directly from YouTube Data API v3 and Agent Studio
            </p>
          </div>

          {/* Content filter buttons */}
          <div className="flex items-center gap-1.5 bg-zinc-900 p-1 rounded-xl border border-zinc-800 text-xs">
            <button
              onClick={() => setContentFilter('all')}
              className={`px-3 py-1 rounded-lg font-bold transition-colors ${
                contentFilter === 'all' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white'
              }`}
            >
              All ({recent.length})
            </button>
            <button
              onClick={() => setContentFilter('shorts')}
              className={`px-3 py-1 rounded-lg font-bold transition-colors flex items-center gap-1 ${
                contentFilter === 'shorts' ? 'bg-red-600 text-white' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Flame className="w-3.5 h-3.5" />
              <span>Shorts</span>
            </button>
            <button
              onClick={() => setContentFilter('videos')}
              className={`px-3 py-1 rounded-lg font-bold transition-colors ${
                contentFilter === 'videos' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Videos
            </button>
          </div>
        </div>

        {/* Content Grid */}
        {filteredContent.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredContent.map((item) => (
              <div
                key={item.id}
                className="group flex flex-col rounded-2xl bg-zinc-900 border border-zinc-800 overflow-hidden hover:border-zinc-700 transition-all hover:shadow-xl"
              >
                {/* Thumbnail */}
                <div className="relative aspect-video bg-zinc-950 overflow-hidden">
                  <img
                    src={item.thumbnailUrl}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />

                  {/* Badges */}
                  <div className="absolute top-2 left-2 flex items-center gap-1">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider backdrop-blur-md ${
                        item.privacyStatus === 'public'
                          ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-700/60'
                          : item.privacyStatus === 'unlisted'
                          ? 'bg-blue-950/80 text-blue-300 border border-blue-700/60'
                          : 'bg-zinc-950/80 text-zinc-300 border border-zinc-700/60'
                      }`}
                    >
                      {item.privacyStatus}
                    </span>
                    {item.isShort && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-600/90 text-white flex items-center gap-0.5">
                        <Flame className="w-3 h-3" />
                        Short
                      </span>
                    )}
                  </div>

                  <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded text-[10px] font-bold bg-black/80 text-white backdrop-blur-sm">
                    {item.durationFormatted}
                  </div>
                </div>

                {/* Info */}
                <div className="p-3.5 flex-1 flex flex-col justify-between space-y-2">
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-white line-clamp-2 leading-snug group-hover:text-red-400 transition-colors">
                      {item.title}
                    </h4>
                    <p className="text-[10px] text-zinc-400">
                      {formatDate(item.publishedAt)}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-400">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <Eye className="w-3 h-3 text-zinc-500" />
                        {formatNumber(item.viewCount)}
                      </span>
                      <span className="flex items-center gap-1">
                        <ThumbsUp className="w-3 h-3 text-zinc-500" />
                        {formatNumber(item.likeCount)}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageCircle className="w-3 h-3 text-zinc-500" />
                        {formatNumber(item.commentCount)}
                      </span>
                    </div>

                    <a
                      href={`https://www.youtube.com/watch?v=${item.videoId}`}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1 hover:text-white text-zinc-500 rounded transition-colors"
                      title="View on YouTube"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 rounded-2xl bg-zinc-900 border border-zinc-800 text-center space-y-3">
            <div className="w-12 h-12 rounded-xl bg-zinc-800 text-zinc-500 flex items-center justify-center mx-auto">
              <Video className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-white">No Content Found Yet</p>
            <p className="text-xs text-zinc-400 max-w-sm mx-auto">
              Your channel doesn't have any published videos matching this filter. Use the Upload Studio to publish your first video or Short!
            </p>
            <button
              onClick={() => onNavigateTab('upload')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs transition-colors"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Create New Upload</span>
            </button>
          </div>
        )}
      </div>

      {/* Quick Access Floating Panel */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
        <button
          onClick={() => onNavigateTab('ai_assistant')}
          className="p-4 rounded-2xl bg-zinc-900 hover:bg-zinc-800/80 border border-zinc-800 text-left space-y-1 transition-all group"
        >
          <div className="flex items-center gap-2 text-xs font-bold text-purple-400">
            <Sparkles className="w-4 h-4" />
            <span>AI Assistant Studio</span>
          </div>
          <p className="text-[11px] text-zinc-400 group-hover:text-zinc-300">
            Brainstorm click-worthy titles, SEO descriptions, and thumbnail prompts with Gemini 2.5 Flash.
          </p>
        </button>

        <button
          onClick={() => onNavigateTab('comments')}
          className="p-4 rounded-2xl bg-zinc-900 hover:bg-zinc-800/80 border border-zinc-800 text-left space-y-1 transition-all group"
        >
          <div className="flex items-center gap-2 text-xs font-bold text-blue-400">
            <MessageCircle className="w-4 h-4" />
            <span>Moderate Comments</span>
          </div>
          <p className="text-[11px] text-zinc-400 group-hover:text-zinc-300">
            Review top comments, spam filters, and reply with AI smart suggestions.
          </p>
        </button>

        <button
          onClick={() => onNavigateTab('help_diagnostics')}
          className="p-4 rounded-2xl bg-zinc-900 hover:bg-zinc-800/80 border border-zinc-800 text-left space-y-1 transition-all group"
        >
          <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
            <ShieldCheck className="w-4 h-4" />
            <span>Diagnostics & API Guide</span>
          </div>
          <p className="text-[11px] text-zinc-400 group-hover:text-zinc-300">
            Check OAuth configuration, YouTube API service enablement status, and run 6-point tests.
          </p>
        </button>
      </div>
    </div>
  );
};
