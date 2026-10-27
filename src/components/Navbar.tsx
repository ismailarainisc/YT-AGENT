import React from 'react';
import {
  Menu,
  Youtube,
  UploadCloud,
  RefreshCw,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Sliders,
  Settings,
  LogOut,
  ExternalLink,
} from 'lucide-react';
import { YouTubeChannel, ConnectedAccount, ConnectionState } from '../types.ts';
import { NAV_ITEMS } from './Sidebar.tsx';

interface NavbarProps {
  activeTab: string;
  onOpenMobileNav: () => void;
  channel: YouTubeChannel | null;
  account: ConnectedAccount | null;
  connectionState: ConnectionState;
  onConnectClick: (mode?: 'popup' | 'redirect') => void;
  onDisconnectClick: () => void;
  onRefreshChannel: () => void;
  isRefreshing: boolean;
  isConnecting: boolean;
  onNavigateTab: (tabId: string) => void;
  onOpenSettings: () => void;
  onOpenSetup: () => void;
  isCredentialsConfigured: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onOpenMobileNav,
  channel,
  account,
  connectionState,
  onConnectClick,
  onDisconnectClick,
  onRefreshChannel,
  isRefreshing,
  isConnecting,
  onNavigateTab,
  onOpenSettings,
  onOpenSetup,
  isCredentialsConfigured,
}) => {
  const currentNavItem = NAV_ITEMS.find((item) => item.id === activeTab);
  const CurrentIcon = currentNavItem?.icon;

  const getStatusBadge = () => {
    switch (connectionState) {
      case 'connected_authorized':
        return {
          label: 'Connected & Authorized',
          classes: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400',
          dot: 'bg-emerald-400',
        };
      case 'api_enablement_required':
        return {
          label: 'API Activation Pending',
          classes: 'bg-amber-500/15 border-amber-500/30 text-amber-300',
          dot: 'bg-amber-400',
        };
      case 'connected_missing_permissions':
        return {
          label: 'Missing Scopes',
          classes: 'bg-yellow-500/15 border-yellow-500/30 text-yellow-300',
          dot: 'bg-yellow-400',
        };
      case 'connecting':
        return {
          label: 'Connecting to Google...',
          classes: 'bg-blue-500/15 border-blue-500/30 text-blue-300 animate-pulse',
          dot: 'bg-blue-400',
        };
      default:
        return {
          label: 'Not Connected',
          classes: 'bg-zinc-800 border-zinc-700 text-zinc-400',
          dot: 'bg-zinc-500',
        };
    }
  };

  const status = getStatusBadge();

  return (
    <header className="sticky top-0 z-20 w-full h-16 border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between">
      {/* Left: Mobile hamburger & Page Breadcrumb */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileNav}
          className="md:hidden p-2 text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-900 border border-zinc-800 transition-colors"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          {CurrentIcon && (
            <div className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-red-500 hidden sm:flex items-center justify-center">
              <CurrentIcon className="w-4 h-4" />
            </div>
          )}
          <h2 className="text-sm sm:text-base font-extrabold text-white tracking-tight truncate">
            {currentNavItem?.label || 'Dashboard'}
          </h2>
        </div>
      </div>

      {/* Right: Actions, Connection Pill & Channel Profile */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Connection status pill */}
        <div
          className={`hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold border ${status.classes}`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
          <span>{status.label}</span>
        </div>

        {/* Sync Button (if channel connected) */}
        {channel && (
          <button
            onClick={onRefreshChannel}
            disabled={isRefreshing}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-zinc-300 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl transition-colors disabled:opacity-50"
            title="Sync Live Channel Statistics"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="hidden md:inline">{isRefreshing ? 'Syncing...' : 'Sync'}</span>
          </button>
        )}

        {/* Quick Upload Button */}
        {channel && (
          <button
            onClick={() => onNavigateTab('upload')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-red-600 hover:bg-red-500 rounded-xl shadow-md shadow-red-600/20 transition-all hover:scale-[1.02] active:scale-95"
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Upload</span>
          </button>
        )}

        {/* Connect Buttons if not connected */}
        {!channel ? (
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onConnectClick('popup')}
              disabled={isConnecting}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-red-600 hover:bg-red-500 rounded-xl shadow-md shadow-red-600/30 transition-all active:scale-95"
            >
              <Youtube className="w-3.5 h-3.5 fill-white" />
              <span>{isConnecting ? 'Signing in...' : 'Connect'}</span>
            </button>
            <button
              onClick={() => onConnectClick('redirect')}
              disabled={isConnecting}
              className="hidden lg:inline-flex px-2.5 py-1.5 text-[10px] font-semibold text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl transition-colors"
              title="Full-Page Redirect flow"
            >
              Redirect
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            {/* Channel Avatar */}
            {channel.avatar_url ? (
              <img
                src={channel.avatar_url}
                alt={channel.title}
                className="w-8 h-8 rounded-full object-cover border border-zinc-700"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-red-600 text-white flex items-center justify-center text-xs font-bold">
                {channel.title.charAt(0)}
              </div>
            )}
          </div>
        )}

        {/* Settings modal trigger */}
        <button
          onClick={onOpenSettings}
          className="p-2 text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-900 border border-zinc-800 transition-colors"
          title="App Settings"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
