import React from 'react';
import {
  Youtube,
  Sparkles,
  ShieldCheck,
  Settings,
  LogOut,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { ConnectedAccount, YouTubeChannel } from '../types.ts';

interface HeaderProps {
  channel: YouTubeChannel | null;
  account: ConnectedAccount | null;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onConnectClick: (mode?: 'popup' | 'redirect') => void;
  onDisconnectClick: () => void;
  onOpenSetup: () => void;
  onOpenSettings: () => void;
  isConnecting: boolean;
  isCredentialsConfigured: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  channel,
  account,
  activeTab,
  setActiveTab,
  onConnectClick,
  onDisconnectClick,
  onOpenSetup,
  onOpenSettings,
  isConnecting,
  isCredentialsConfigured,
}) => {
  const tabs = [
    { id: 'studio', label: 'AI Agent Studio' },
    { id: 'videos', label: 'Videos & Shorts' },
    { id: 'comments', label: 'Comments' },
    { id: 'seo', label: 'Thumbnails & SEO' },
    { id: 'analytics', label: 'Analytics' },
    { id: 'schedule', label: 'Scheduled' },
    { id: 'queue', label: 'Task Queue' },
    { id: 'security', label: 'Security & Audit' },
    { id: 'diagnostics', label: 'Automated Tests' },
    { id: 'cloud_assistant', label: 'Setup Assistant' },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-800 bg-zinc-950/90 backdrop-blur-md">
      {/* Top Banner Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-600 flex items-center justify-center text-white shadow-md shadow-red-600/20">
              <Youtube className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-tight text-white">YouTube AI Agent</span>
                <span className="text-[10px] font-semibold text-zinc-400 bg-zinc-800/80 px-2 py-0.5 rounded border border-zinc-700/60 uppercase tracking-wider">
                  Studio Pro
                </span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-zinc-400">
                <span className="flex items-center gap-1 text-emerald-400">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Strict Policy (Safe Private)
                </span>
                <span aria-hidden="true" className="text-zinc-600">·</span>
                <span className="flex items-center gap-1 text-zinc-400">
                  <Sparkles className="w-3 h-3 text-red-400" />
                  Gemini Flash 3.8
                </span>
              </div>
            </div>
          </div>

          {/* Right Action Area */}
          <div className="flex items-center gap-3">
            {!channel ? (
              <div className="flex items-center gap-2">
                {!isCredentialsConfigured && (
                  <button
                    onClick={onOpenSetup}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-amber-300 bg-amber-950/40 border border-amber-800/60 rounded-xl hover:bg-amber-900/40 transition-colors"
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    <span>Configure OAuth</span>
                  </button>
                )}

                {account ? (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-950/30 border border-amber-700/50 text-xs">
                    {account.picture ? (
                      <img
                        src={account.picture}
                        alt={account.name || 'Google Account'}
                        className="w-6 h-6 rounded-full border border-amber-500/60 object-cover"
                      />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-amber-600 text-white flex items-center justify-center text-[10px] font-bold">
                        {(account.name || account.email || 'A').charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="text-left hidden sm:block">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-white truncate max-w-[120px]">
                          {account.name || account.email}
                        </span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono font-bold">
                          API Setup
                        </span>
                      </div>
                      <p className="text-[10px] text-zinc-400 truncate max-w-[130px]">{account.email}</p>
                    </div>
                    <button
                      onClick={onDisconnectClick}
                      title="Disconnect Account"
                      className="p-1 text-zinc-400 hover:text-red-400 transition-colors ml-1"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => onConnectClick('popup')}
                      disabled={isConnecting}
                      className={`relative overflow-hidden flex items-center gap-2 px-4 py-2 text-xs font-bold text-white rounded-xl transition-all shadow-md ${
                        isConnecting
                          ? 'bg-red-700/80 cursor-wait shadow-red-600/40 ring-2 ring-red-500/40'
                          : 'bg-red-600 hover:bg-red-500 shadow-red-600/30 hover:scale-[1.02] active:scale-[0.98]'
                      }`}
                    >
                      {/* Subtle loading shimmer overlay */}
                      {isConnecting && (
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent animate-pulse" />
                      )}
                      {isConnecting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-white/90 shrink-0" />
                          <span className="relative z-10 text-white/95 tracking-tight">Connecting to YouTube...</span>
                        </>
                      ) : (
                        <>
                          <Youtube className="w-4 h-4 fill-white shrink-0" />
                          <span>Connect with YouTube</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => onConnectClick('redirect')}
                      disabled={isConnecting}
                      title="Sign in via Full-Page Redirect (recommended if browser blocks popups)"
                      className="px-2.5 py-2 text-[10px] font-semibold text-zinc-300 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl transition-colors disabled:opacity-50"
                    >
                      Redirect
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-3">
                {/* Channel Mini Profile */}
                <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800">
                  {channel.avatar_url ? (
                    <img
                      src={channel.avatar_url}
                      alt={channel.title}
                      className="w-7 h-7 rounded-full object-cover border border-zinc-700"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-red-600 text-white flex items-center justify-center text-xs font-bold">
                      {channel.title.charAt(0)}
                    </div>
                  )}
                  <div className="text-left hidden sm:block">
                    <p className="text-xs font-bold text-white leading-tight truncate max-w-[140px]">
                      {channel.title}
                    </p>
                    <p className="text-[10px] text-zinc-400">
                      {channel.custom_url || channel.channel_id.substring(0, 10)}
                    </p>
                  </div>
                </div>

                <button
                  onClick={onDisconnectClick}
                  title="Disconnect Channel"
                  className="p-2 text-zinc-400 hover:text-red-400 rounded-xl hover:bg-zinc-900 border border-transparent hover:border-zinc-800 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}

            <button
              onClick={onOpenSettings}
              title="Settings & Backups"
              className="p-2 text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-900 border border-zinc-800 transition-colors"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="flex items-center space-x-1 border-t border-zinc-800/80 pt-1 overflow-x-auto scrollbar-none">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3.5 py-2.5 text-xs font-medium rounded-t-lg transition-colors whitespace-nowrap ${
                  isActive
                    ? 'text-white border-b-2 border-red-500 font-semibold bg-zinc-900/40'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/20'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
