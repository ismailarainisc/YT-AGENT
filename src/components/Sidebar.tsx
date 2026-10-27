import React from 'react';
import {
  LayoutDashboard,
  Video,
  Flame,
  UploadCloud,
  MessageSquare,
  BarChart3,
  Sparkles,
  CalendarClock,
  Radio,
  ListChecks,
  Settings,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  Youtube,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  X,
  LogOut,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import { YouTubeChannel, ConnectedAccount, ConnectionState } from '../types.ts';

export interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  badgeColor?: string;
}

export const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'videos', label: 'Videos', icon: Video },
  { id: 'shorts', label: 'Shorts', icon: Flame, badge: 'New', badgeColor: 'bg-red-500/20 text-red-300' },
  { id: 'upload', label: 'Upload Video', icon: UploadCloud },
  { id: 'comments', label: 'Comments', icon: MessageSquare },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'ai_assistant', label: 'AI Assistant', icon: Sparkles, badge: 'Gemini', badgeColor: 'bg-purple-500/20 text-purple-300' },
  { id: 'scheduled', label: 'Scheduled Posts', icon: CalendarClock },
  { id: 'channel', label: 'Channel', icon: Radio },
  { id: 'activity', label: 'Activity & History', icon: ListChecks },
  { id: 'settings', label: 'Settings', icon: Settings },
  { id: 'help_diagnostics', label: 'Help & Diagnostics', icon: HelpCircle },
];

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  channel: YouTubeChannel | null;
  account: ConnectedAccount | null;
  connectionState: ConnectionState;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
  onConnectClick: (mode?: 'popup' | 'redirect') => void;
  onDisconnectClick: () => void;
  isConnecting: boolean;
  justConnected?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  channel,
  account,
  connectionState,
  isCollapsed,
  setIsCollapsed,
  isMobileOpen,
  setIsMobileOpen,
  onConnectClick,
  onDisconnectClick,
  isConnecting,
  justConnected,
}) => {
  const handleNavClick = (tabId: string) => {
    setActiveTab(tabId);
    if (isMobileOpen) {
      setIsMobileOpen(false);
    }
  };

  const getStatusBadge = () => {
    switch (connectionState) {
      case 'connected_authorized':
        return { text: 'Connected', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40', icon: CheckCircle2 };
      case 'api_enablement_required':
        return { text: 'API Pending', color: 'bg-amber-500/20 text-amber-300 border-amber-500/40', icon: AlertTriangle };
      case 'connected_missing_permissions':
        return { text: 'Scope Missing', color: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40', icon: AlertTriangle };
      case 'connecting':
        return { text: 'Connecting...', color: 'bg-blue-500/20 text-blue-300 border-blue-500/40', icon: Youtube };
      default:
        return { text: 'Disconnected', color: 'bg-zinc-800 text-zinc-400 border-zinc-700', icon: ShieldCheck };
    }
  };

  const status = getStatusBadge();
  const StatusIcon = status.icon;

  const sidebarContent = (
    <div className="flex flex-col h-full bg-zinc-950 text-zinc-100 select-none">
      {/* Brand Header */}
      <div className={`flex items-center justify-between border-b border-zinc-800/80 ${isCollapsed ? 'p-3 justify-center' : 'p-4'}`}>
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-9 h-9 rounded-xl bg-red-600 flex items-center justify-center text-white shrink-0 shadow-lg shadow-red-600/30">
            <Youtube className="w-5 h-5 fill-white" />
          </div>
          {!isCollapsed && (
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-sm tracking-tight text-white truncate">YouTube AI Agent</span>
                <span className="text-[9px] font-bold text-red-400 bg-red-950/70 px-1.5 py-0.2 rounded border border-red-800/50 uppercase">
                  Pro
                </span>
              </div>
              <p className="text-[10px] text-zinc-400 truncate flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-400 shrink-0" />
                <span>Safe Private Mode</span>
              </p>
            </div>
          )}
        </div>

        {/* Mobile close button */}
        <button
          onClick={() => setIsMobileOpen(false)}
          className="md:hidden p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800"
          aria-label="Close navigation"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Connection Status Pill */}
      <div className={`border-b border-zinc-800/80 ${isCollapsed ? 'p-2 text-center' : 'p-3'}`}>
        {!isCollapsed ? (
          <div
            className={`flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs transition-all duration-500 ${
              justConnected || connectionState === 'connected_authorized'
                ? 'bg-emerald-950/40 border border-emerald-500/50 ring-1 ring-emerald-500/30 shadow-md shadow-emerald-500/10'
                : 'bg-zinc-900/80 border border-zinc-800'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="relative flex h-2 w-2 shrink-0">
                <span
                  className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                    justConnected || connectionState === 'connected_authorized'
                      ? 'bg-emerald-400'
                      : connectionState === 'api_enablement_required'
                      ? 'bg-amber-400'
                      : 'bg-zinc-400'
                  }`}
                />
                <span
                  className={`relative inline-flex rounded-full h-2 w-2 ${
                    justConnected || connectionState === 'connected_authorized'
                      ? 'bg-emerald-500'
                      : connectionState === 'api_enablement_required'
                      ? 'bg-amber-500'
                      : 'bg-zinc-500'
                  }`}
                />
              </span>
              <span
                className={`text-[11px] font-semibold truncate ${
                  justConnected || connectionState === 'connected_authorized'
                    ? 'text-emerald-300'
                    : 'text-zinc-300'
                }`}
              >
                {status.text}
              </span>
            </div>
            {!channel && (
              <button
                onClick={() => onConnectClick('popup')}
                disabled={isConnecting}
                className={`relative overflow-hidden flex items-center gap-1 px-2 py-1 text-[10px] font-bold text-white rounded-lg transition-all ${
                  isConnecting
                    ? 'bg-red-700/80 cursor-wait ring-1 ring-red-500/40'
                    : 'bg-red-600 hover:bg-red-500 shadow-sm shadow-red-600/30 active:scale-95'
                }`}
              >
                {isConnecting && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
                )}
                {isConnecting ? (
                  <>
                    <Loader2 className="w-2.5 h-2.5 animate-spin" />
                    <span>Connecting...</span>
                  </>
                ) : (
                  <span>Connect</span>
                )}
              </button>
            )}
          </div>
        ) : (
          <div
            title={`Status: ${status.text}`}
            className={`w-8 h-8 mx-auto rounded-lg flex items-center justify-center transition-all ${
              justConnected || connectionState === 'connected_authorized'
                ? 'bg-emerald-950/60 border border-emerald-500/50 shadow-md shadow-emerald-500/20 ring-1 ring-emerald-500/40'
                : 'bg-zinc-900 border border-zinc-800'
            }`}
          >
            <StatusIcon
              className={`w-4 h-4 ${
                justConnected || connectionState === 'connected_authorized'
                  ? 'text-emerald-400'
                  : 'text-zinc-400'
              }`}
            />
          </div>
        )}
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              title={isCollapsed ? item.label : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                isActive
                  ? 'bg-red-600 text-white font-bold shadow-md shadow-red-600/20'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900'
              } ${isCollapsed ? 'justify-center px-2' : ''}`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-zinc-400'}`} />
              {!isCollapsed && (
                <div className="flex-1 flex items-center justify-between text-left truncate">
                  <span className="truncate">{item.label}</span>
                  {item.badge && (
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded font-semibold shrink-0 uppercase tracking-wider ${
                        isActive ? 'bg-white/20 text-white' : item.badgeColor || 'bg-zinc-800 text-zinc-300'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom Profile & Toggle Section */}
      <div className="p-2 border-t border-zinc-800/80 bg-zinc-950/80 space-y-2">
        {/* Channel Info if Connected */}
        {channel ? (
          <div
            className={`rounded-xl transition-all duration-700 p-2.5 relative overflow-hidden ${
              justConnected
                ? 'bg-gradient-to-r from-emerald-950/60 to-zinc-900 border-2 border-emerald-500/80 ring-4 ring-emerald-500/25 shadow-xl shadow-emerald-500/25 animate-pulse'
                : 'bg-zinc-900 border border-zinc-800'
            } ${isCollapsed ? 'text-center' : ''}`}
          >
            {/* Success shimmer glow effect */}
            {justConnected && (
              <div className="absolute top-0 right-0 w-2 h-2 rounded-full bg-emerald-400 animate-ping m-1.5" />
            )}
            <div className="flex items-center gap-2.5">
              <div className="relative shrink-0">
                {channel.avatar_url ? (
                  <img
                    src={channel.avatar_url}
                    alt={channel.title}
                    className={`w-8 h-8 rounded-full object-cover transition-all ${
                      justConnected
                        ? 'border-2 border-emerald-400 shadow-md shadow-emerald-500/50'
                        : 'border border-zinc-700'
                    }`}
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-red-600 text-white flex items-center justify-center text-xs font-bold">
                    {channel.title.charAt(0)}
                  </div>
                )}
                {/* Active connection dot */}
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-zinc-950 rounded-full" />
              </div>
              {!isCollapsed && (
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-bold text-white truncate leading-tight">
                      {channel.title}
                    </p>
                    {justConnected && (
                      <span className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-300 text-[8px] font-bold border border-emerald-500/40">
                        <CheckCircle2 className="w-2.5 h-2.5" /> Live
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-zinc-400 truncate">
                    {channel.custom_url || channel.channel_id}
                  </p>
                </div>
              )}
              {!isCollapsed && (
                <button
                  onClick={onDisconnectClick}
                  title="Disconnect Channel"
                  className="p-1 text-zinc-500 hover:text-red-400 rounded-lg hover:bg-zinc-800 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        ) : (
          !isCollapsed && (
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-zinc-900 to-zinc-900/60 border border-zinc-800 text-center space-y-2">
              <p className="text-[11px] font-semibold text-zinc-200">Connect Your Channel</p>
              <button
                onClick={() => onConnectClick('popup')}
                disabled={isConnecting}
                className={`w-full flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-bold text-white rounded-xl shadow-sm transition-all relative overflow-hidden ${
                  isConnecting
                    ? 'bg-red-700/80 cursor-wait shadow-red-600/40 ring-2 ring-red-500/40'
                    : 'bg-red-600 hover:bg-red-500 shadow-red-600/30 hover:scale-[1.01] active:scale-[0.98]'
                }`}
              >
                {isConnecting && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent animate-pulse" />
                )}
                {isConnecting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                    <span className="relative z-10 tracking-tight">Connecting to YouTube...</span>
                  </>
                ) : (
                  <>
                    <Youtube className="w-3.5 h-3.5" />
                    <span>Connect with YouTube</span>
                  </>
                )}
              </button>
            </div>
          )
        )}

        {/* Desktop Collapse Toggle */}
        <div className="hidden md:flex items-center justify-between pt-1">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="w-full flex items-center justify-center gap-2 py-1.5 px-2 text-[11px] font-medium text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-900 transition-colors"
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <>
                <ChevronLeft className="w-4 h-4" />
                <span>Collapse menu</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar (fixed/sticky) */}
      <aside
        className={`hidden md:flex flex-col border-r border-zinc-800/80 transition-all duration-300 h-screen sticky top-0 shrink-0 z-30 ${
          isCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Slide-Out Drawer */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
            onClick={() => setIsMobileOpen(false)}
          />

          {/* Drawer Panel */}
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-zinc-950 border-r border-zinc-800 shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
