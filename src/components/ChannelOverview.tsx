import React from 'react';
import {
  Users,
  Video,
  Eye,
  RefreshCw,
  ExternalLink,
  Shield,
  AlertCircle,
  PlusCircle,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { YouTubeChannel } from '../types.ts';

interface ChannelOverviewProps {
  channel: YouTubeChannel | null;
  hasAccountWithoutChannel: boolean;
  onRefresh: () => void;
  isRefreshing: boolean;
  onConnectClick: (mode?: 'popup' | 'redirect') => void;
  apiEnablement?: { required: boolean; activationUrl: string; projectId: string } | null;
  isConnecting?: boolean;
}

export const ChannelOverview: React.FC<ChannelOverviewProps> = ({
  channel,
  hasAccountWithoutChannel,
  onRefresh,
  isRefreshing,
  onConnectClick,
  apiEnablement,
  isConnecting = false,
}) => {
  if (apiEnablement?.required && !channel) {
    return (
      <div className="p-6 rounded-2xl bg-zinc-900 border border-amber-600/30 text-left space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Google Account Authorized · Awaiting YouTube API Enablement</h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Your Google credentials are saved. Once YouTube Data API v3 is enabled on your Google Cloud Project, your channel details and statistics will load automatically.
              </p>
            </div>
          </div>
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl text-xs font-medium border border-zinc-700 transition-colors shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Checking...' : 'Check Status'}</span>
          </button>
        </div>
      </div>
    );
  }

  if (hasAccountWithoutChannel) {
    return (
      <div className="p-6 rounded-2xl bg-amber-950/20 border border-amber-800/40 text-left space-y-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Google Account Connected, But No YouTube Channel Found</h3>
            <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
              Your Google account is signed in, but YouTube reports that no accessible channel has been created yet for this account.
            </p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800 space-y-3 text-xs">
          <p className="text-zinc-300">
            To use this AI Agent, create your official channel on YouTube (takes 30 seconds):
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <a
              href="https://www.youtube.com/create_channel"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl font-medium transition-colors"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create Official YouTube Channel</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>

            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl font-medium transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? 'Checking...' : 'Recheck Channel Status'}</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!channel) {
    return (
      <div className="p-8 rounded-2xl bg-zinc-900/60 border border-zinc-800 text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-red-600/10 border border-red-500/20 text-red-500 flex items-center justify-center mx-auto">
          <Video className="w-7 h-7" />
        </div>
        <div className="max-w-md mx-auto space-y-1.5">
          <h3 className="text-lg font-bold text-white">Connect Your YouTube Channel</h3>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Link your real personal channel with one click to enable video publishing, AI instruction execution, Shorts formatting, and smart comment management.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            onClick={() => onConnectClick('popup')}
            disabled={isConnecting}
            className={`relative overflow-hidden inline-flex items-center gap-2 px-6 py-2.5 text-white text-xs font-bold rounded-xl shadow-lg transition-all ${
              isConnecting
                ? 'bg-red-700/80 cursor-wait shadow-red-600/40 ring-2 ring-red-500/40'
                : 'bg-red-600 hover:bg-red-500 shadow-red-600/20 hover:scale-[1.02] active:scale-[0.98]'
            }`}
          >
            {isConnecting && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent animate-pulse" />
            )}
            {isConnecting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span className="relative z-10 tracking-tight">Connecting to YouTube...</span>
              </>
            ) : (
              <>
                <Video className="w-4 h-4" />
                <span>Connect with YouTube</span>
              </>
            )}
          </button>
          <button
            onClick={() => onConnectClick('redirect')}
            disabled={isConnecting}
            className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold rounded-xl border border-zinc-700 transition-colors disabled:opacity-50"
            title="Use full-page redirect if browser blocks popups"
          >
            <span>Or Sign In via Full-Page Redirect</span>
          </button>
        </div>
      </div>
    );
  }

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US', { notation: 'compact', compactDisplay: 'short' }).format(num);
  };

  return (
    <div className="rounded-2xl bg-zinc-900 border border-zinc-800 overflow-hidden shadow-xl">
      {/* Banner / Header */}
      <div className="relative h-28 sm:h-36 bg-gradient-to-r from-zinc-950 via-zinc-900 to-red-950/40 border-b border-zinc-800">
        {channel.banner_url && (
          <img
            src={channel.banner_url}
            alt="Channel Banner"
            className="w-full h-full object-cover opacity-40"
          />
        )}
        <div className="absolute top-3 right-3 flex items-center gap-2">
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 rounded-xl text-xs font-medium backdrop-blur-sm border border-zinc-700/60 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Syncing...' : 'Refresh Stats'}</span>
          </button>
          <a
            href={`https://youtube.com/channel/${channel.channel_id}`}
            target="_blank"
            rel="noreferrer"
            className="p-1.5 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 rounded-xl backdrop-blur-sm border border-zinc-700/60 transition-colors"
            title="View Channel on YouTube"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>

      {/* Profile Details & Metrics */}
      <div className="px-6 pb-6 pt-0 relative">
        <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 -mt-12 sm:-mt-14 mb-6">
          <div className="flex items-end gap-4">
            {channel.avatar_url ? (
              <img
                src={channel.avatar_url}
                alt={channel.title}
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover border-4 border-zinc-900 shadow-2xl bg-zinc-800"
              />
            ) : (
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-red-600 text-white flex items-center justify-center text-2xl font-bold border-4 border-zinc-900 shadow-2xl">
                {channel.title.charAt(0)}
              </div>
            )}
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">{channel.title}</h2>
                <CheckCircle2 className="w-4 h-4 text-red-500 fill-red-500/20" />
              </div>
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <span>{channel.custom_url || 'YouTube Channel'}</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono text-[11px] text-zinc-500">{channel.channel_id}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-3 py-1.5 rounded-xl font-medium">
            <Shield className="w-3.5 h-3.5" />
            <span>Authorized via Google OAuth 2.0</span>
          </div>
        </div>

        {/* Real Channel Metrics Grid */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800/70">
            <div className="flex items-center gap-2 text-zinc-400 text-xs mb-1">
              <Users className="w-3.5 h-3.5 text-red-400" />
              <span>Subscribers</span>
            </div>
            <div className="text-xl font-extrabold text-white">
              {formatNumber(channel.subscriber_count)}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800/70">
            <div className="flex items-center gap-2 text-zinc-400 text-xs mb-1">
              <Video className="w-3.5 h-3.5 text-blue-400" />
              <span>Total Videos</span>
            </div>
            <div className="text-xl font-extrabold text-white">
              {formatNumber(channel.video_count)}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800/70">
            <div className="flex items-center gap-2 text-zinc-400 text-xs mb-1">
              <Eye className="w-3.5 h-3.5 text-amber-400" />
              <span>Total Views</span>
            </div>
            <div className="text-xl font-extrabold text-white">
              {formatNumber(channel.view_count)}
            </div>
          </div>
        </div>

        {channel.description && (
          <p className="mt-4 text-xs text-zinc-400 line-clamp-2 leading-relaxed">
            {channel.description}
          </p>
        )}
      </div>
    </div>
  );
};
