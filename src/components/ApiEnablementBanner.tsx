import React, { useState } from 'react';
import {
  ExternalLink,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
  Video,
  ArrowRight,
  Info,
  Copy,
  Check,
  Key,
} from 'lucide-react';
import { YouTubeChannel } from '../types.ts';
import { copyErrorReportToClipboard } from '../utils/errorDiagnostics.ts';

interface ApiEnablementBannerProps {
  activationUrl: string;
  projectId: string;
  onVerified: (channel: YouTubeChannel) => void;
  onRefreshStatus?: () => void;
  onOpenSetup?: () => void;
}

export const ApiEnablementBanner: React.FC<ApiEnablementBannerProps> = ({
  activationUrl,
  projectId,
  onVerified,
  onRefreshStatus,
  onOpenSetup,
}) => {
  const [isVerifying, setIsVerifying] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [hasOpenedLink, setHasOpenedLink] = useState(false);
  const [copied, setCopied] = useState(false);

  const directActivationUrl =
    activationUrl ||
    'https://console.cloud.google.com/apis/library/youtube.googleapis.com?project=project-b30c08ce-72c4-49f8-b1c';

  const handleVerify = async () => {
    setIsVerifying(true);
    setStatusMessage(null);
    try {
      const res = await fetch('/api/channel/verify-enablement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();

      if (data.success && data.channel) {
        onVerified(data.channel);
      } else if (data.stillDisabled) {
        setStatusMessage(
          'YouTube Data API v3 is turning ON in Google Cloud. If you just clicked ENABLE, Google Cloud takes about 15–30 seconds to propagate. Please wait a moment and click "Verify & Connect Channel" again.'
        );
      } else if (data.success && data.hasChannel === false) {
        setStatusMessage(
          'API verified! Your Google account is authenticated, but no active YouTube channel was found. Create one on YouTube to proceed.'
        );
        if (onRefreshStatus) onRefreshStatus();
      } else {
        setStatusMessage(data.error || data.message || 'Verification could not be completed. Please retry.');
      }
    } catch (err: any) {
      setStatusMessage(err.message || 'Failed to verify API status. Please check your network connection.');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-red-950/50 via-zinc-900 to-zinc-900 border border-red-500/50 p-6 shadow-2xl backdrop-blur-md space-y-5">
      {/* Glow highlight */}
      <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-red-500 via-amber-500 to-red-500 animate-pulse" />

      {/* Header section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="p-3 rounded-2xl bg-red-600/20 border border-red-500/40 text-red-400 shrink-0">
            <Video className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-bold text-white tracking-tight">
                One Final Step: Turn ON YouTube Data API in Google Cloud
              </h3>
              <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                OAuth Project Ready
              </span>
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed max-w-2xl">
              Your Google OAuth setup is complete on project <code className="text-amber-300 font-mono font-bold">project-b30c08ce-72c4-49f8-b1c</code> (Project # 565998434119). 
              Google requires you to click <strong>&quot;ENABLE&quot;</strong> once so YouTube allows this app to read your channel and upload videos.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
          <div className="px-2.5 py-1 rounded-lg bg-zinc-900/90 border border-emerald-500/30 text-[11px] text-emerald-300 flex items-center gap-1.5 font-mono">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Project Authorized</span>
          </div>
        </div>
      </div>

      {/* 2 Simple Steps */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        <div className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800 space-y-2">
          <div className="flex items-center gap-2 text-white font-bold text-xs">
            <span className="w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center text-[10px]">1</span>
            <span>Click &quot;Enable YouTube Data API&quot;</span>
          </div>
          <p className="text-[11px] text-zinc-400 leading-relaxed">
            Opens Google Cloud Console directly for your project. Click the blue <strong>&quot;ENABLE&quot;</strong> button.
          </p>
          <a
            href={directActivationUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setHasOpenedLink(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold transition-all shadow-md mt-1"
          >
            <span>Open Google Cloud to Enable API</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        <div className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800 space-y-2">
          <div className="flex items-center gap-2 text-white font-bold text-xs">
            <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px]">2</span>
            <span>Verify &amp; Connect Live</span>
          </div>
          <p className="text-[11px] text-zinc-400 leading-relaxed">
            Once you click Enable in Google Cloud, click below to immediately verify and load your live channel and stats.
          </p>
          <button
            onClick={handleVerify}
            disabled={isVerifying}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all shadow-md mt-1 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isVerifying ? 'animate-spin' : ''}`} />
            <span>{isVerifying ? 'Verifying with YouTube API...' : 'Verify & Connect Channel Now'}</span>
          </button>
        </div>
      </div>

      {/* Status feedback banner if user tried verifying */}
      {statusMessage && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-zinc-950/90 border border-amber-600/40 text-xs text-amber-200">
          <div className="flex items-start gap-2.5">
            <Info className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
            <div className="space-y-1">
              <p className="leading-relaxed">{statusMessage}</p>
            </div>
          </div>
          <button
            onClick={async () => {
              await copyErrorReportToClipboard({
                title: 'YouTube Data API Enablement Pending',
                operation: 'Google Cloud API Verification',
                message: statusMessage,
                code: 'API_ENABLEMENT_REQUIRED',
                timestamp: new Date().toISOString(),
                requestId: `gcp_${projectId || 'personal'}`,
                suggestedFix: 'Open Google Cloud Console and enable YouTube Data API v3 or configure your OAuth credentials.',
                page: 'Dashboard',
              });
              setCopied(true);
              setTimeout(() => setCopied(false), 2500);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-950/80 hover:bg-amber-900 border border-amber-700/60 text-amber-300 text-xs font-semibold shrink-0 transition-colors self-end sm:self-auto"
            title="Copy structured diagnostic report"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied!' : 'Copy Error'}</span>
          </button>
        </div>
      )}
    </div>
  );
};
