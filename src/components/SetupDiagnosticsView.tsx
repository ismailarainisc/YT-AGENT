import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  Copy,
  Check,
  ShieldCheck,
  Cpu,
  Database,
  Lock,
  Layers,
  Sparkles,
} from 'lucide-react';

interface SetupDiagnosticsViewProps {
  onOpenSetupWizard: () => void;
  onConnectClick: () => void;
}

export const SetupDiagnosticsView: React.FC<SetupDiagnosticsViewProps> = ({
  onOpenSetupWizard,
  onConnectClick,
}) => {
  const [preflight, setPreflight] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const fetchPreflight = async () => {
    try {
      const res = await fetch('/api/setup/preflight');
      const data = await res.json();
      setPreflight(data);
    } catch (err) {
      console.warn('Preflight notice:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPreflight();
  }, []);

  const handleCopyUri = (uri: string) => {
    navigator.clipboard.writeText(uri);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-2">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              <Layers className="w-5 h-5 text-red-500" />
              <span>Automatic Google Cloud Setup Assistant</span>
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Automated environment inspection, prerequisite verification, and guided Google Cloud readiness checklist
            </p>
          </div>

          <button
            onClick={fetchPreflight}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-zinc-300 bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 rounded-xl transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Recheck Environment</span>
          </button>
        </div>
      </div>

      {/* Pre-flight Checks Grid */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider px-1">
          System Readiness & Configuration Checklist
        </h4>

        {loading ? (
          <div className="p-8 text-center text-xs text-zinc-500">Inspecting capabilities...</div>
        ) : (
          <div className="divide-y divide-zinc-800 rounded-2xl bg-zinc-900 border border-zinc-800 overflow-hidden">
            {preflight?.checks?.map((check: any) => (
              <div
                key={check.id}
                className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    {check.status === 'ok' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                    )}
                  </div>
                  <div>
                    <span className="font-bold text-white">{check.name}</span>
                    <p className="text-[11px] text-zinc-400">{check.description}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                  {check.actionUrl ? (
                    <a
                      href={check.actionUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-[11px] text-red-400 hover:text-red-300 underline bg-zinc-950 px-2.5 py-1 rounded-lg border border-red-900/50 flex items-center gap-1 max-w-[240px] truncate"
                    >
                      <span>Enable in Google Cloud</span>
                      <ExternalLink className="w-3 h-3 shrink-0" />
                    </a>
                  ) : (
                    <span className="font-mono text-[11px] text-zinc-300 bg-zinc-950 px-2.5 py-1 rounded-lg border border-zinc-800 truncate max-w-[240px]">
                      {check.value}
                    </span>
                  )}

                  {check.status === 'ok' ? (
                    <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40 shrink-0">
                      VERIFIED
                    </span>
                  ) : (
                    <span className="text-[10px] font-semibold text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/40 shrink-0">
                      ACTION REQUIRED
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Action Guidance Card */}
      <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-4">
        <h4 className="text-sm font-bold text-white">Remaining Automated vs Manual Steps</h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {/* Automated */}
          <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2">
            <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Automated by AI Studio & App</span>
            </span>
            <ul className="space-y-1.5 text-zinc-400 text-[11px]">
              <li>✓ Node v22 runtime with TypeScript and Express</li>
              <li>✓ SQLite database initialization & migrations</li>
              <li>✓ AES-256-GCM token encryption and key derivation</li>
              <li>✓ Background job queue worker with restart recovery</li>
              <li>✓ Official YouTube Resumable Upload protocol implementation</li>
              <li>✓ Gemini Flash 3.8 multilingual NLP & SEO engine</li>
              <li>✓ Deterministic Policy Engine (Private by default)</li>
            </ul>
          </div>

          {/* User Consented */}
          <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2">
            <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Requires Your Account Consent</span>
            </span>
            <ul className="space-y-1.5 text-zinc-400 text-[11px]">
              <li>1. Register OAuth Web Client in Google Cloud Console</li>
              <li>2. Enable YouTube Data API v3 in your Google Cloud Project</li>
              <li>3. Configure authorized redirect URI:</li>
              <li className="font-mono text-red-400 break-all select-all pt-1">
                {preflight?.redirectUri || 'https://.../api/auth/google/callback'}
              </li>
              <li>4. Click &quot;Connect with YouTube&quot; to authorize your personal channel</li>
            </ul>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={onOpenSetupWizard}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg font-semibold text-[11px] transition-colors"
              >
                Open Setup Wizard
              </button>
              <button
                onClick={onConnectClick}
                className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg font-medium text-[11px] transition-colors"
              >
                Connect Account
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
