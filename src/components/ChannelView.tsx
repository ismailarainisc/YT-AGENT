import React, { useState } from 'react';
import {
  Radio,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  RefreshCw,
  LogOut,
  Users,
  Video,
  Eye,
  Calendar,
  Globe,
  Lock,
  KeyRound,
  Database,
  Sliders,
  Loader2,
} from 'lucide-react';
import { YouTubeChannel, ConnectedAccount, ConnectionState } from '../types.ts';

interface ChannelViewProps {
  channel: YouTubeChannel | null;
  account: ConnectedAccount | null;
  connectionState: ConnectionState;
  onRefresh: () => void;
  isRefreshing: boolean;
  onDisconnect: () => void;
  onConnectClick: (mode?: 'popup' | 'redirect') => void;
}

export const ChannelView: React.FC<ChannelViewProps> = ({
  channel,
  account,
  connectionState,
  onRefresh,
  isRefreshing,
  onDisconnect,
  onConnectClick,
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'permissions' | 'quota'>('profile');

  const scopes = [
    {
      scope: 'https://www.googleapis.com/auth/youtube.upload',
      name: 'YouTube Upload',
      description: 'Allows the agent to upload videos and Shorts on behalf of your channel.',
      granted: true,
    },
    {
      scope: 'https://www.googleapis.com/auth/youtube.force-ssl',
      name: 'YouTube Manage & Comments',
      description: 'Allows reading and replying to comment threads and managing metadata.',
      granted: true,
    },
    {
      scope: 'https://www.googleapis.com/auth/youtube.readonly',
      name: 'YouTube Readonly',
      description: 'Allows reading channel analytics, videos, statistics, and uploads.',
      granted: true,
    },
    {
      scope: 'https://www.googleapis.com/auth/userinfo.profile',
      name: 'Google Profile',
      description: 'Verifies authenticated account ownership and creator name.',
      granted: true,
    },
    {
      scope: 'https://www.googleapis.com/auth/userinfo.email',
      name: 'Google Email',
      description: 'Displays authorized owner email and links audit event records.',
      granted: true,
    },
  ];

  if (!channel) {
    return (
      <div className="p-8 sm:p-12 rounded-3xl bg-zinc-900 border border-zinc-800 text-center space-y-4 max-w-lg mx-auto">
        <Radio className="w-10 h-10 text-zinc-500 mx-auto" />
        <h3 className="text-base font-bold text-white">No Connected Channel</h3>
        <p className="text-xs text-zinc-400">
          Connect your official YouTube channel to inspect detailed channel metadata, permissions, and quota tracking.
        </p>
        <button
          onClick={() => onConnectClick('popup')}
          disabled={connectionState === 'connecting'}
          className={`relative overflow-hidden inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold shadow-md transition-all ${
            connectionState === 'connecting'
              ? 'bg-red-700/80 cursor-wait ring-2 ring-red-500/40 shadow-red-600/40 text-white'
              : 'bg-red-600 hover:bg-red-500 text-white shadow-red-600/30 hover:scale-[1.01] active:scale-[0.98]'
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
            <span>Connect with YouTube</span>
          )}
        </button>
      </div>
    );
  }

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num || 0);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6">
      {/* Banner / Header */}
      <div className="relative overflow-hidden rounded-3xl bg-zinc-900 border border-zinc-800 shadow-xl">
        {/* Channel Banner if available */}
        {channel.banner_url ? (
          <div className="h-36 sm:h-48 w-full bg-zinc-950 overflow-hidden relative">
            <img
              src={channel.banner_url}
              alt="Channel Banner"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 to-transparent" />
          </div>
        ) : (
          <div className="h-28 sm:h-36 w-full bg-gradient-to-r from-red-950/60 via-zinc-900 to-zinc-950" />
        )}

        {/* Profile Card Overlay */}
        <div className="p-6 sm:p-8 -mt-12 sm:-mt-16 relative flex flex-col sm:flex-row items-start sm:items-end justify-between gap-6">
          <div className="flex items-end gap-4 sm:gap-6">
            {channel.avatar_url ? (
              <img
                src={channel.avatar_url}
                alt={channel.title}
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover border-4 border-zinc-900 shadow-xl"
              />
            ) : (
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-red-600 text-white flex items-center justify-center text-3xl font-black border-4 border-zinc-900 shadow-xl">
                {channel.title.charAt(0)}
              </div>
            )}

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  {channel.title}
                </h2>
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              </div>
              <p className="text-xs text-zinc-400 font-medium">
                {channel.custom_url || channel.channel_id}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-stretch sm:self-auto">
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-zinc-300 bg-zinc-800 hover:bg-zinc-700 rounded-xl border border-zinc-700 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? 'Syncing...' : 'Sync Channel'}</span>
            </button>

            <a
              href={`https://www.youtube.com/channel/${channel.channel_id}`}
              target="_blank"
              rel="noreferrer"
              className="p-2 text-zinc-400 hover:text-white rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 transition-colors"
              title="Open YouTube Channel"
            >
              <ExternalLink className="w-4 h-4" />
            </a>

            <button
              onClick={onDisconnect}
              className="p-2 text-zinc-400 hover:text-red-400 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 transition-colors"
              title="Disconnect Channel"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-zinc-800 pb-2">
        <button
          onClick={() => setActiveTab('profile')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'profile'
              ? 'bg-red-600 text-white'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
          }`}
        >
          Channel Profile
        </button>
        <button
          onClick={() => setActiveTab('permissions')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'permissions'
              ? 'bg-red-600 text-white'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
          }`}
        >
          OAuth Scopes & Security
        </button>
        <button
          onClick={() => setActiveTab('quota')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'quota'
              ? 'bg-red-600 text-white'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
          }`}
        >
          API Quota & Limits
        </button>
      </div>

      {/* Tab 1: Profile */}
      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-5 sm:p-6 rounded-3xl bg-zinc-900 border border-zinc-800 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Database className="w-4 h-4 text-red-500" />
              <span>Channel Statistics</span>
            </h3>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 rounded-2xl bg-zinc-950 border border-zinc-800">
                <Users className="w-4 h-4 text-red-400 mx-auto mb-1" />
                <div className="text-base font-extrabold text-white">
                  {formatNumber(channel.subscriber_count)}
                </div>
                <div className="text-[10px] text-zinc-500">Subscribers</div>
              </div>

              <div className="p-3 rounded-2xl bg-zinc-950 border border-zinc-800">
                <Eye className="w-4 h-4 text-blue-400 mx-auto mb-1" />
                <div className="text-base font-extrabold text-white">
                  {formatNumber(channel.view_count)}
                </div>
                <div className="text-[10px] text-zinc-500">Total Views</div>
              </div>

              <div className="p-3 rounded-2xl bg-zinc-950 border border-zinc-800">
                <Video className="w-4 h-4 text-purple-400 mx-auto mb-1" />
                <div className="text-base font-extrabold text-white">
                  {formatNumber(channel.video_count)}
                </div>
                <div className="text-[10px] text-zinc-500">Videos</div>
              </div>
            </div>

            <div className="pt-2 border-t border-zinc-800 space-y-2 text-xs">
              <div className="flex justify-between py-1 text-zinc-400">
                <span>Channel ID</span>
                <code className="text-zinc-200 bg-zinc-950 px-2 py-0.5 rounded font-mono text-[11px]">
                  {channel.channel_id}
                </code>
              </div>
              <div className="flex justify-between py-1 text-zinc-400">
                <span>Account Email</span>
                <span className="text-zinc-200">{account?.email || 'N/A'}</span>
              </div>
              <div className="flex justify-between py-1 text-zinc-400">
                <span>Last Synced</span>
                <span className="text-zinc-200">{formatDate(channel.last_synced_at)}</span>
              </div>
            </div>
          </div>

          <div className="p-5 sm:p-6 rounded-3xl bg-zinc-900 border border-zinc-800 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Channel Description</span>
            </h3>

            <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 min-h-[140px] max-h-56 overflow-y-auto">
              <p className="text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap">
                {channel.description || 'No channel description provided on YouTube.'}
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <Lock className="w-3.5 h-3.5 text-zinc-500" />
              <span>Default Publishing Mode: <strong>Private (Safe Safeguard)</strong></span>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: OAuth Scopes */}
      {activeTab === 'permissions' && (
        <div className="p-5 sm:p-6 rounded-3xl bg-zinc-900 border border-zinc-800 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white">Active Google OAuth Permissions</h3>
              <p className="text-xs text-zinc-400">
                Granted via official Google OAuth 2.0 authorization code flow.
              </p>
            </div>
            <span className="px-3 py-1 rounded-xl text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              All 5 Scopes Active
            </span>
          </div>

          <div className="divide-y divide-zinc-800/80">
            {scopes.map((s, idx) => (
              <div key={idx} className="py-3 flex items-start justify-between gap-4">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <KeyRound className="w-3.5 h-3.5 text-purple-400" />
                    <span className="text-xs font-bold text-white">{s.name}</span>
                  </div>
                  <p className="text-[11px] text-zinc-400">{s.description}</p>
                  <code className="text-[10px] text-zinc-500 font-mono block pt-0.5">{s.scope}</code>
                </div>
                <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Granted
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Quota */}
      {activeTab === 'quota' && (
        <div className="p-5 sm:p-6 rounded-3xl bg-zinc-900 border border-zinc-800 space-y-4">
          <h3 className="text-sm font-bold text-white">YouTube Data API v3 Quota Monitor</h3>
          <p className="text-xs text-zinc-400">
            Standard Google Cloud quota allocation is 10,000 units per day (resets midnight Pacific Time).
          </p>

          <div className="space-y-2">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-zinc-300">Daily Quota Consumed</span>
              <span className="text-white">~150 / 10,000 units (1.5%)</span>
            </div>
            <div className="w-full h-3 rounded-full bg-zinc-950 border border-zinc-800 overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full w-[1.5%]" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
            <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 space-y-1">
              <span className="text-zinc-400">Read / Channels</span>
              <div className="font-bold text-white">1 unit / call</div>
            </div>
            <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 space-y-1">
              <span className="text-zinc-400">Video Upload</span>
              <div className="font-bold text-white">1,600 units / upload</div>
            </div>
            <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 space-y-1">
              <span className="text-zinc-400">Comment Reply</span>
              <div className="font-bold text-white">50 units / reply</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
