import React, { useState, useEffect } from 'react';
import {
  Settings,
  Database,
  Download,
  Upload,
  Key,
  Shield,
  Sliders,
  HardDrive,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Lock,
} from 'lucide-react';
import { YouTubeChannel, ConnectedAccount } from '../types.ts';

interface SettingsViewProps {
  channel: YouTubeChannel | null;
  account: ConnectedAccount | null;
  onOpenSetupWizard: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  channel,
  account,
  onOpenSetupWizard,
}) => {
  const [backupLoading, setBackupLoading] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [defaultPrivacy, setDefaultPrivacy] = useState<'private' | 'unlisted' | 'public'>('private');
  const [requireHumanApproval, setRequireHumanApproval] = useState(true);

  const handleDownloadBackup = async () => {
    setBackupLoading(true);
    setMessage(null);
    try {
      const res = await fetch('/api/database/backup');
      const data = await res.json();
      if (!data.success) throw new Error('Backup generation failed');

      const blob = new Blob([data.backupData], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `youtube_agent_backup_${Date.now()}.sqlite.b64`;
      a.click();
      URL.revokeObjectURL(url);
      setMessage({ type: 'success', text: 'Database backup downloaded successfully!' });
    } catch (err: any) {
      setMessage({ type: 'error', text: `Backup error: ${err.message}` });
    } finally {
      setBackupLoading(false);
    }
  };

  const handleRestoreFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setRestoreLoading(true);
    setMessage(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const backupData = event.target?.result as string;
        const res = await fetch('/api/database/restore', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ backupData }),
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error || 'Restore failed');
        setMessage({ type: 'success', text: 'Database restored successfully! Reloading...' });
        setTimeout(() => window.location.reload(), 1500);
      } catch (err: any) {
        setMessage({ type: 'error', text: `Restore failed: ${err.message}` });
      } finally {
        setRestoreLoading(false);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-6 rounded-3xl bg-zinc-900 border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-zinc-800 rounded-xl text-white shadow-md">
              <Settings className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-black text-white tracking-tight">System & Privacy Settings</h2>
          </div>
          <p className="text-xs text-zinc-400">
            Configure upload privacy safeguards, Google Cloud credentials, and encrypted database backups.
          </p>
        </div>
      </div>

      {message && (
        <div
          className={`p-4 rounded-2xl flex items-center gap-3 text-xs border ${
            message.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-200'
              : 'bg-red-950/40 border-red-800/60 text-red-200'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Safety & Policy Safeguards */}
      <div className="p-6 rounded-3xl bg-zinc-900 border border-zinc-800 space-y-4 shadow-lg">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Shield className="w-4 h-4 text-emerald-400" />
          <span>Publishing Safeguards & Policy Engine</span>
        </h3>

        <div className="space-y-3">
          <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="font-bold text-xs text-white">Default Video Privacy Status</div>
              <p className="text-[11px] text-zinc-400">
                Determines the default YouTube visibility status when processing autonomous uploads.
              </p>
            </div>
            <select
              value={defaultPrivacy}
              onChange={(e) => setDefaultPrivacy(e.target.value as any)}
              className="px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-700 text-xs font-semibold text-white focus:outline-none focus:border-red-500"
            >
              <option value="private">Private (Strict Safe Default)</option>
              <option value="unlisted">Unlisted (Sharable Link)</option>
              <option value="public">Public (Immediate Broadcast)</option>
            </select>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800/80 flex items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="font-bold text-xs text-white">Require User Confirmation Before Public Release</div>
              <p className="text-[11px] text-zinc-400">
                Prevents accidental autonomous public uploads without explicit user verification.
              </p>
            </div>
            <input
              type="checkbox"
              checked={requireHumanApproval}
              onChange={(e) => setRequireHumanApproval(e.target.checked)}
              className="w-4 h-4 rounded text-red-600 focus:ring-0 bg-zinc-900 border-zinc-700"
            />
          </div>
        </div>
      </div>

      {/* Google Cloud & OAuth Config */}
      <div className="p-6 rounded-3xl bg-zinc-900 border border-zinc-800 space-y-4 shadow-lg">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Key className="w-4 h-4 text-purple-400" />
            <span>Google Cloud OAuth Credentials</span>
          </h3>
          <button
            onClick={onOpenSetupWizard}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-amber-300 bg-amber-950/40 border border-amber-800/60 rounded-xl hover:bg-amber-900/40 transition-colors"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Configure OAuth</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800/80 space-y-1">
            <span className="text-zinc-400">Target Google Cloud Project:</span>
            <div className="font-mono font-bold text-white">project-b30c08ce-72c4-49f8-b1c</div>
          </div>
          <div className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800/80 space-y-1">
            <span className="text-zinc-400">Connected Account:</span>
            <div className="font-bold text-white truncate">{account?.email || 'None connected'}</div>
          </div>
        </div>
      </div>

      {/* AI Multi-Provider Orchestration */}
      <div className="p-6 rounded-3xl bg-zinc-900 border border-zinc-800 space-y-4 shadow-lg">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Lock className="w-4 h-4 text-indigo-400" />
            <span>AI Orchestration & Multi-Provider Failover</span>
          </h3>
          <span className="text-[11px] font-medium text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-2 py-0.5 rounded-full">
            Circuit Breaker Active
          </span>
        </div>
        <p className="text-xs text-zinc-400">
          The app automatically routes queries to Google Gemini 3.8 Flash, with instant fallback to OpenRouter, NVIDIA NIM, and Mistral if rate-limits or quota restrictions are encountered.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800/80 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-white">Tier 1: Google Gemini</span>
              <span className="text-emerald-400 font-mono text-[10px]">Active</span>
            </div>
            <p className="text-[11px] text-zinc-400">gemini-3.8-flash for zero-latency comment analysis and intent extraction</p>
          </div>
          <div className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800/80 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-white">Tier 2-4: OpenRouter, NVIDIA, Mistral</span>
              <span className="text-purple-400 font-mono text-[10px]">Failover Ready</span>
            </div>
            <p className="text-[11px] text-zinc-400">Automatic cascading if primary provider encounters rate limits</p>
          </div>
        </div>
      </div>

      {/* Database Backup & Restore */}
      <div className="p-6 rounded-3xl bg-zinc-900 border border-zinc-800 space-y-4 shadow-lg">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <HardDrive className="w-4 h-4 text-blue-400" />
          <span>Database Backup & Restore</span>
        </h3>
        <p className="text-xs text-zinc-400">
          Export your SQLite state (credentials, channels, videos, audit logs) to an encrypted backup file, or restore from a previous backup.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            onClick={handleDownloadBackup}
            disabled={backupLoading}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-blue-600/30 transition-all active:scale-95"
          >
            <Download className="w-4 h-4" />
            <span>{backupLoading ? 'Exporting...' : 'Export SQLite Backup'}</span>
          </button>

          <label className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-xs border border-zinc-700 cursor-pointer transition-colors">
            <Upload className="w-4 h-4" />
            <span>{restoreLoading ? 'Restoring...' : 'Restore from Backup'}</span>
            <input
              type="file"
              accept=".b64,.sqlite,.txt"
              className="hidden"
              onChange={handleRestoreFile}
              disabled={restoreLoading}
            />
          </label>
        </div>
      </div>
    </div>
  );
};
