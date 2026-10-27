import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar.tsx';
import { Navbar } from './components/Navbar.tsx';
import { DashboardView } from './components/DashboardView.tsx';
import { VideosLibrary } from './components/VideosLibrary.tsx';
import { ShortsStudio } from './components/ShortsStudio.tsx';
import { StudioUpload } from './components/StudioUpload.tsx';
import { CommentManager } from './components/CommentManager.tsx';
import { AnalyticsView } from './components/AnalyticsView.tsx';
import { AiAssistantStudio } from './components/AiAssistantStudio.tsx';
import { ScheduledView } from './components/ScheduledView.tsx';
import { ChannelView } from './components/ChannelView.tsx';
import { ActivityView } from './components/ActivityView.tsx';
import { SettingsView } from './components/SettingsView.tsx';
import { HelpDiagnosticsView } from './components/HelpDiagnosticsView.tsx';
import { SetupWizardModal } from './components/SetupWizardModal.tsx';
import { SettingsModal } from './components/SettingsModal.tsx';
import { ApiEnablementBanner } from './components/ApiEnablementBanner.tsx';
import { ConnectedAccount, YouTubeChannel, ConnectionState } from './types.ts';
import { googleSignIn, logout, checkRedirectResult } from './auth.ts';
import { AlertCircle, CheckCircle2, ShieldCheck, X, ExternalLink, Youtube } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [channel, setChannel] = useState<YouTubeChannel | null>(null);
  const [account, setAccount] = useState<ConnectedAccount | null>(null);
  const [hasAccountWithoutChannel, setHasAccountWithoutChannel] = useState(false);
  const [isRefreshingChannel, setIsRefreshingChannel] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [redirectUri, setRedirectUri] = useState('');
  const [isCredentialsConfigured, setIsCredentialsConfigured] = useState(false);
  const [directAuthUrl, setDirectAuthUrl] = useState<string | null>(null);
  const [directRedirectUri, setDirectRedirectUri] = useState<string>('');
  const [apiEnablement, setApiEnablement] = useState<{
    required: boolean;
    activationUrl: string;
    projectId: string;
  } | null>(null);

  // Layout states
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  // Modals
  const [isSetupOpen, setIsSetupOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Notifications
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [justConnected, setJustConnected] = useState(false);

  const triggerConnectedSuccess = (ch: YouTubeChannel) => {
    setChannel(ch);
    setApiEnablement(null);
    setHasAccountWithoutChannel(false);
    setJustConnected(true);
    setTimeout(() => setJustConnected(false), 6000);
  };

  // Determine real connection state
  const computeConnectionState = (): ConnectionState => {
    if (isConnecting) return 'connecting';
    if (apiEnablement?.required && !channel) return 'api_enablement_required';
    if (channel) return 'connected_authorized';
    if (hasAccountWithoutChannel) return 'connected_missing_channel';
    return 'not_connected';
  };

  const connectionState = computeConnectionState();

  // Check URL params for OAuth return or error
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const authError = params.get('auth_error');
    const connected = params.get('connected');
    const channelName = params.get('channel');

    if (authError) {
      if (
        authError.includes('YouTube Data API v3 has not been used') ||
        authError.includes('SERVICE_DISABLED')
      ) {
        setApiEnablement({
          required: true,
          activationUrl: 'https://console.cloud.google.com/apis/library/youtube.googleapis.com',
          projectId: 'personal',
        });
      } else {
        setToast({
          type: 'error',
          message: `Google Sign-In: ${decodeURIComponent(authError)}`,
        });
      }
      window.history.replaceState({}, '', window.location.pathname);
    } else if (connected === 'success') {
      setToast({
        type: 'success',
        message: `Connected official YouTube channel "${channelName || ''}"!`,
      });
      window.history.replaceState({}, '', window.location.pathname);
    } else if (connected === 'no_channel') {
      setHasAccountWithoutChannel(true);
      setToast({
        type: 'info',
        message: 'Google account authenticated, but no active YouTube channel found.',
      });
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  // Fetch initial setup and status
  const fetchStatus = async () => {
    try {
      const [setupRes, authRes] = await Promise.all([
        fetch('/api/setup/status'),
        fetch('/api/auth/status'),
      ]);

      if (setupRes.ok) {
        const setupData = await setupRes.json();
        setRedirectUri(setupData.redirectUri);
        setIsCredentialsConfigured(setupData.isConfigured);
      }

      if (authRes.ok) {
        const authData = await authRes.json();
        setChannel(authData.channel);
        setAccount(authData.account);

        if (authData.apiEnablement?.required && !authData.channel) {
          setApiEnablement(authData.apiEnablement);
        } else if (authData.channel) {
          setApiEnablement(null);
        }

        if (authData.account && !authData.channel && !authData.apiEnablement?.required) {
          setHasAccountWithoutChannel(true);
        } else {
          setHasAccountWithoutChannel(false);
        }
      }
    } catch (err) {
      console.warn('Notice fetching auth status:', err);
    }
  };

  useEffect(() => {
    fetchStatus();

    // Check if returning from redirect flow
    checkRedirectResult().then((result) => {
      if (result?.requiresApiEnablement) {
        setApiEnablement({
          required: true,
          activationUrl:
            result.activationUrl ||
            'https://console.cloud.google.com/apis/library/youtube.googleapis.com',
          projectId: result.projectId || 'personal',
        });
      } else if (result?.channel) {
        setChannel(result.channel);
        setApiEnablement(null);
        setHasAccountWithoutChannel(false);
        setToast({
          type: 'success',
          message: `Successfully connected official YouTube channel "${result.channel.title}"!`,
        });
      }
    });
  }, []);

  // Auto-verify when user returns from Google Cloud tab
  useEffect(() => {
    const handleFocus = async () => {
      if (apiEnablement?.required && !channel) {
        try {
          const res = await fetch('/api/channel/verify-enablement', { method: 'POST' });
          const data = await res.json();
          if (data.success && data.channel) {
            setChannel(data.channel);
            setApiEnablement(null);
            setToast({
              type: 'success',
              message: `YouTube Data API verified! Connected to channel "${data.channel.title}".`,
            });
          }
        } catch (e) {
          // ignore background check errors
        }
      }
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [apiEnablement, channel]);

  // Listen for OAuth completion message from popup/new-tab
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        fetchStatus();
        setDirectAuthUrl(null);
        setIsConnecting(false);
        setToast({
          type: 'success',
          message: `Connected official YouTube channel "${event.data.channel || ''}"!`,
        });
      } else if (event.data?.type === 'OAUTH_NO_CHANNEL') {
        fetchStatus();
        setDirectAuthUrl(null);
        setIsConnecting(false);
        setHasAccountWithoutChannel(true);
        setToast({
          type: 'info',
          message: 'Google account authenticated, but no active YouTube channel found.',
        });
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleConnectClick = async (mode: 'popup' | 'redirect' = 'popup') => {
    setIsConnecting(true);
    try {
      // 1. Primary: Use the newly provisioned Google OAuth Sign-In (Firebase Auth)
      const result = await googleSignIn(mode);

      if (result.cancelled) {
        setToast({
          type: 'info',
          message: 'Sign-in cancelled. Click "Connect with YouTube" anytime to retry.',
        });
        return;
      }

      if (result.redirecting) {
        setToast({ type: 'info', message: 'Redirecting to Google account consent screen...' });
        return;
      }

      if (result.requiresApiEnablement) {
        setApiEnablement({
          required: true,
          activationUrl:
            result.activationUrl ||
            'https://console.cloud.google.com/apis/library/youtube.googleapis.com',
          projectId: result.projectId || 'personal',
        });
        setToast({
          type: 'info',
          message: 'Google Account authorized! 1 quick step: Link Google Cloud OAuth Client to connect live.',
        });
        await fetchStatus();
        return;
      }

      if (result.channel) {
        triggerConnectedSuccess(result.channel);
        setToast({
          type: 'success',
          message: `Successfully connected official YouTube channel "${result.channel.title}"!`,
        });
      } else if (result.user) {
        setHasAccountWithoutChannel(true);
      }
    } catch (popupError: any) {
      console.warn('Sign-in notice:', popupError);
      // Fallback: Check if direct URL is available
      try {
        const res = await fetch(`/api/auth/google/url?origin=${encodeURIComponent(window.location.origin)}`);
        const data = await res.json();
        if (data.url) {
          if (data.redirectUri) setDirectRedirectUri(data.redirectUri);
          setDirectAuthUrl(data.url);
          setToast({
            type: 'info',
            message: 'Tap below to open Google Sign-In in a secure window.',
          });
          return;
        }
      } catch (e) {}

      setToast({
        type: 'error',
        message: popupError?.message || 'Failed to complete Google Sign-In.',
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnectClick = async () => {
    if (!confirm('Are you sure you want to disconnect this YouTube channel?')) return;
    try {
      await logout();
      setChannel(null);
      setAccount(null);
      setApiEnablement(null);
      setToast({ type: 'info', message: 'YouTube channel disconnected and credentials revoked.' });
    } catch (err) {
      console.warn('Disconnect notice:', err);
    }
  };

  const handleRefreshChannel = async () => {
    setIsRefreshingChannel(true);
    try {
      const res = await fetch('/api/channel/refresh', { method: 'POST' });
      const data = await res.json();
      if (data.channel) {
        setChannel(data.channel);
        setApiEnablement(null);
        setHasAccountWithoutChannel(false);
        setToast({ type: 'success', message: 'Channel statistics refreshed.' });
      } else if (data.requiresApiEnablement) {
        setApiEnablement({
          required: true,
          activationUrl:
            data.activationUrl ||
            'https://console.cloud.google.com/apis/library/youtube.googleapis.com',
          projectId: data.projectId || 'personal',
        });
      } else {
        setHasAccountWithoutChannel(true);
      }
    } catch (err) {
      console.warn('Refresh notice:', err);
    } finally {
      setIsRefreshingChannel(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex font-sans selection:bg-red-600 selection:text-white">
      {/* Toast Banner */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl border text-xs backdrop-blur-md transition-all ${
            toast.type === 'success'
              ? 'bg-emerald-950/90 border-emerald-700/60 text-emerald-200'
              : toast.type === 'error'
              ? 'bg-red-950/90 border-red-700/60 text-red-200'
              : 'bg-zinc-900/90 border-zinc-700 text-zinc-200'
          }`}
        >
          {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />}
          {toast.type === 'error' && <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />}
          {toast.type === 'info' && <ShieldCheck className="w-4 h-4 shrink-0 text-blue-400" />}
          <span>{toast.message}</span>
          <button
            onClick={() => setToast(null)}
            className="p-1 hover:bg-white/10 rounded-lg transition-colors ml-2"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Collapsible Left Sidebar (Desktop & Mobile Drawer) */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        channel={channel}
        account={account}
        connectionState={connectionState}
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
        isMobileOpen={isMobileNavOpen}
        setIsMobileOpen={setIsMobileNavOpen}
        onConnectClick={handleConnectClick}
        onDisconnectClick={handleDisconnectClick}
        isConnecting={isConnecting}
        justConnected={justConnected}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen overflow-x-hidden">
        {/* Top Navbar */}
        <Navbar
          activeTab={activeTab}
          onOpenMobileNav={() => setIsMobileNavOpen(true)}
          channel={channel}
          account={account}
          connectionState={connectionState}
          onConnectClick={handleConnectClick}
          onDisconnectClick={handleDisconnectClick}
          onRefreshChannel={handleRefreshChannel}
          isRefreshing={isRefreshingChannel}
          isConnecting={isConnecting}
          onNavigateTab={setActiveTab}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenSetup={() => setIsSetupOpen(true)}
          isCredentialsConfigured={isCredentialsConfigured}
        />

        {/* Page Content Container */}
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
          {/* Prominent API Enablement Banner when required */}
          {apiEnablement?.required && !channel && (
            <ApiEnablementBanner
              activationUrl={apiEnablement.activationUrl}
              projectId={apiEnablement.projectId}
              onVerified={(verifiedChannel) => {
                triggerConnectedSuccess(verifiedChannel);
                setToast({
                  type: 'success',
                  message: `Successfully connected YouTube channel "${verifiedChannel.title}"!`,
                });
                fetchStatus();
              }}
              onRefreshStatus={fetchStatus}
              onOpenSetup={() => setIsSetupOpen(true)}
            />
          )}

          {/* 1. Dashboard Page (Home) */}
          {activeTab === 'dashboard' && (
            <DashboardView
              channel={channel}
              connectionState={connectionState}
              onRefreshChannel={handleRefreshChannel}
              isRefreshing={isRefreshingChannel}
              onNavigateTab={setActiveTab}
              onConnectClick={handleConnectClick}
              apiEnablement={apiEnablement}
            />
          )}

          {/* 2. Videos Page */}
          {activeTab === 'videos' && (
            <VideosLibrary
              channel={channel}
              onNavigateUpload={() => setActiveTab('upload')}
            />
          )}

          {/* 3. Shorts Page */}
          {activeTab === 'shorts' && (
            <ShortsStudio
              channel={channel}
              onNavigateUpload={() => setActiveTab('upload')}
            />
          )}

          {/* 4. Upload Video Page */}
          {activeTab === 'upload' && (
            <StudioUpload
              channel={channel}
              onJobEnqueued={(_jobId) => {
                setToast({
                  type: 'success',
                  message: 'Upload job added to persistent queue! Tracking execution in real time.',
                });
                setActiveTab('activity');
              }}
              onConnectClick={handleConnectClick}
            />
          )}

          {/* 5. Comments Page */}
          {activeTab === 'comments' && (
            <CommentManager
              channel={channel}
              onConnectClick={handleConnectClick}
            />
          )}

          {/* 6. Analytics Page */}
          {activeTab === 'analytics' && (
            <AnalyticsView
              channel={channel}
              onRefreshChannel={handleRefreshChannel}
              isRefreshing={isRefreshingChannel}
            />
          )}

          {/* 7. AI Assistant Page */}
          {activeTab === 'ai_assistant' && (
            <AiAssistantStudio
              channel={channel}
              onNavigateUpload={() => setActiveTab('upload')}
            />
          )}

          {/* 8. Scheduled Posts Page */}
          {activeTab === 'scheduled' && <ScheduledView />}

          {/* 9. Channel Page */}
          {activeTab === 'channel' && (
            <ChannelView
              channel={channel}
              account={account}
              connectionState={connectionState}
              onRefresh={handleRefreshChannel}
              isRefreshing={isRefreshingChannel}
              onDisconnect={handleDisconnectClick}
              onConnectClick={handleConnectClick}
            />
          )}

          {/* 10. Activity and Task History Page */}
          {activeTab === 'activity' && <ActivityView />}

          {/* 11. Settings Page */}
          {activeTab === 'settings' && (
            <SettingsView
              channel={channel}
              account={account}
              onOpenSetupWizard={() => setIsSetupOpen(true)}
            />
          )}

          {/* 12. Help and Diagnostics Page */}
          {activeTab === 'help_diagnostics' && (
            <HelpDiagnosticsView
              channel={channel}
              onOpenSetupWizard={() => setIsSetupOpen(true)}
              onConnectClick={handleConnectClick}
            />
          )}
        </main>
      </div>

      {/* Modals */}
      <SetupWizardModal
        isOpen={isSetupOpen}
        onClose={() => setIsSetupOpen(false)}
        redirectUri={redirectUri}
        onCredentialsSaved={() => {
          fetchStatus();
          setToast({ type: 'success', message: 'Google OAuth Credentials saved successfully!' });
        }}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onOpenSetupWizard={() => setIsSetupOpen(true)}
      />

      {/* Direct Google OAuth Modal (escapes preview iframe 403 error & provides redirect URI helper) */}
      {directAuthUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-lg w-full text-center space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-xl bg-red-600/10 border border-red-500/20 text-red-500 flex items-center justify-center mx-auto">
              <Youtube className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">Connect Official YouTube Account</h3>
              <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                Google requires opening sign-in in a separate window. If you see <strong>redirect_uri_mismatch</strong>, make sure this exact URI is listed in your Google Cloud Console:
              </p>
            </div>

            {/* Exact Redirect URI Box with Copy */}
            <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl text-left space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-zinc-400">
                <span className="font-semibold text-zinc-300">Authorized Redirect URI:</span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(directRedirectUri || redirectUri);
                    setToast({ type: 'success', message: 'Redirect URI copied to clipboard!' });
                  }}
                  className="text-red-400 hover:text-red-300 font-medium cursor-pointer"
                >
                  Copy URI
                </button>
              </div>
              <code className="block text-[11px] text-red-400 font-mono break-all select-all">
                {directRedirectUri || redirectUri}
              </code>
            </div>

            <div className="flex flex-col gap-2.5 pt-1">
              <a
                href={directAuthUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => {
                  setToast({ type: 'info', message: 'Authorizing on Google... Once approved, this dashboard will update live!' });
                }}
                className="flex items-center justify-center gap-2 py-3 px-4 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-red-600/30"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Open Google Sign-In Window</span>
              </a>

              <a
                href="https://console.cloud.google.com/apis/credentials"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 py-2 px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl text-xs font-medium transition-colors border border-zinc-700"
              >
                <span>Open Google Cloud Console (Add URI)</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              <button
                type="button"
                onClick={() => setDirectAuthUrl(null)}
                className="py-2 text-xs text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
