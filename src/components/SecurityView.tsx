import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Key,
  Lock,
  FileText,
  Clock,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Server,
} from 'lucide-react';

export const SecurityView: React.FC = () => {
  const [audit, setAudit] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchAudit = async () => {
    try {
      const res = await fetch('/api/security/audit-full');
      const data = await res.json();
      setAudit(data);
    } catch (err) {
      console.warn('Audit fetch notice:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAudit();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-zinc-900 border border-zinc-800">
        <div>
          <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <span>Security & Policy Invariant Console</span>
          </h3>
          <p className="text-xs text-zinc-400">
            Cryptographic storage, token lifespan management, and deterministic privacy policies
          </p>
        </div>

        <button
          onClick={fetchAudit}
          className="p-2 bg-zinc-950 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-xl border border-zinc-800 transition-colors"
          title="Refresh audit"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Security Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Token Cryptography Vault */}
        <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-white flex items-center gap-1.5">
              <Lock className="w-4 h-4 text-emerald-400" />
              <span>Token Vault Encryption</span>
            </span>
            <span className="text-[10px] text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40">
              ACTIVE
            </span>
          </div>

          <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800/80 space-y-1 text-xs">
            <div className="flex justify-between text-zinc-400">
              <span>Cipher:</span>
              <span className="font-mono text-white">AES-256-GCM</span>
            </div>
            <div className="flex justify-between text-zinc-400">
              <span>Storage:</span>
              <span className="font-mono text-zinc-300">SQLite (Encrypted)</span>
            </div>
            <div className="flex justify-between text-zinc-400">
              <span>Auth Tag:</span>
              <span className="font-mono text-emerald-400">128-bit MAC</span>
            </div>
          </div>
          <p className="text-[11px] text-zinc-500">
            Refresh tokens & secrets are never stored in plaintext or exposed to frontend bundles.
          </p>
        </div>

        {/* Policy Engine Safe Mode */}
        <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-white flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-blue-400" />
              <span>Publishing Policy Engine</span>
            </span>
            <span className="text-[10px] text-blue-400 bg-blue-950/60 px-2 py-0.5 rounded border border-blue-800/40">
              DETERMINISTIC
            </span>
          </div>

          <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800/80 space-y-1 text-xs">
            <div className="flex justify-between text-zinc-400">
              <span>Default Privacy:</span>
              <span className="font-semibold text-emerald-400">Private</span>
            </div>
            <div className="flex justify-between text-zinc-400">
              <span>Public Publishing:</span>
              <span className="text-zinc-300">Requires Override</span>
            </div>
            <div className="flex justify-between text-zinc-400">
              <span>Unverified Flags:</span>
              <span className="font-mono text-white">{audit?.policyEngine?.unverifiedCount || 0}</span>
            </div>
          </div>
          <p className="text-[11px] text-zinc-500">
            The LLM cannot override hardcoded security policies or silently publish content publicly.
          </p>
        </div>

        {/* OAuth Client Status */}
        <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-white flex items-center gap-1.5">
              <Key className="w-4 h-4 text-amber-400" />
              <span>OAuth Credential State</span>
            </span>
            <span className={`text-[10px] px-2 py-0.5 rounded border ${
              audit?.credentials?.configured
                ? 'text-emerald-400 bg-emerald-950/60 border-emerald-800/40'
                : 'text-amber-400 bg-amber-950/60 border-amber-800/40'
            }`}>
              {audit?.credentials?.configured ? 'CONFIGURED' : 'PENDING'}
            </span>
          </div>

          <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800/80 space-y-1 text-xs">
            <div className="flex justify-between text-zinc-400">
              <span>Client ID:</span>
              <span className="font-mono text-zinc-300">{audit?.credentials?.clientIdMasked || 'None'}</span>
            </div>
            <div className="flex justify-between text-zinc-400">
              <span>Active User:</span>
              <span className="font-mono text-white truncate max-w-[130px]">{audit?.token?.activeUser || 'None'}</span>
            </div>
            <div className="flex justify-between text-zinc-400">
              <span>Token Status:</span>
              <span className={audit?.token?.tokenValid ? 'text-emerald-400' : 'text-zinc-500'}>
                {audit?.token?.tokenValid ? 'Valid & Active' : 'Disconnected'}
              </span>
            </div>
          </div>
          <p className="text-[11px] text-zinc-500">
            Tokens auto-refresh in background 3 minutes before expiration.
          </p>
        </div>
      </div>

      {/* Security Audit Event Trail */}
      <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-3">
        <h4 className="text-sm font-bold text-white flex items-center gap-2">
          <FileText className="w-4 h-4 text-zinc-400" />
          <span>Authoritative Security Audit Trail</span>
        </h4>

        <div className="max-h-80 overflow-y-auto rounded-xl border border-zinc-800 bg-zinc-950 divide-y divide-zinc-900 font-mono text-xs">
          {!audit?.recentEvents || audit.recentEvents.length === 0 ? (
            <div className="p-4 text-zinc-600 text-center">No security audit events recorded yet.</div>
          ) : (
            audit.recentEvents.map((evt: any) => (
              <div key={evt.id} className="p-3 flex items-center justify-between text-zinc-300">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white">{evt.action}</span>
                    <span className="text-[10px] text-zinc-500">by {evt.actor}</span>
                  </div>
                  {evt.details && (
                    <p className="text-[10px] text-zinc-500 font-mono truncate max-w-lg">
                      {evt.details}
                    </p>
                  )}
                </div>
                <span className="text-[10px] text-zinc-600 shrink-0">
                  {new Date(evt.created_at).toLocaleTimeString()}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
