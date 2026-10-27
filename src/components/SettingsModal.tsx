import React, { useState, useEffect } from 'react';
import {
  X,
  Database,
  Download,
  Upload,
  Key,
  Shield,
  FileText,
  AlertTriangle,
  CheckCircle2,
  HardDrive,
} from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSetupWizard: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onOpenSetupWizard,
}) => {
  const [backupLoading, setBackupLoading] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetch('/api/logs/audit')
        .then((res) => res.json())
        .then((data) => setAuditLogs(data.logs || []))
        .catch((err) => console.warn('Audit fetch notice:', err));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDownloadBackup = async () => {
    setBackupLoading(true);
    setMessage(null);
    try {
      const res = await fetch('/api/database/backup');
      const data = await res.json();
      if (!data.success) throw new Error('Backup generation failed');

      // Trigger download
      const blob = new Blob([data.backupData], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `youtube_agent_backup_${Date.now()}.sqlite.b64`;
      a.click();
      URL.revokeObjectURL(url);
      setMessage('Backup downloaded successfully!');
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
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
    reader.onload = async (evt) => {
      try {
        const base64 = evt.target?.result as string;
        const res = await fetch('/api/database/restore', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ backupData: base64 }),
        });
        const data = await res.json();
        if (data.success) {
          setMessage('Database restored successfully! Reloading...');
          setTimeout(() => window.location.reload(), 1500);
        } else {
          throw new Error(data.error);
        }
      } catch (err: any) {
        setMessage(`Restore failed: ${err.message}`);
      } finally {
        setRestoreLoading(false);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/50">
          <div className="flex items-center gap-2.5">
            <Database className="w-5 h-5 text-red-500" />
            <h2 className="text-base font-bold text-white tracking-tight">
              Settings, SQLite Storage & Backups
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6 text-xs">
          {message && (
            <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-200">
              {message}
            </div>
          )}

          {/* SQLite Backup Card */}
          <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-white font-semibold">
                <HardDrive className="w-4 h-4 text-blue-400" />
                <span>Project-Integrated SQLite Database</span>
              </div>
              <span className="text-[10px] text-zinc-500 font-mono">data/youtube_agent.sqlite</span>
            </div>

            <p className="text-zinc-400 text-[11px] leading-relaxed">
              Stores channel connections, credentials (AES-256 encrypted), upload jobs, and comments. No external managed database (like Supabase or Firebase) is required.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                onClick={handleDownloadBackup}
                disabled={backupLoading}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-medium transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{backupLoading ? 'Exporting...' : 'Export SQLite Backup'}</span>
              </button>

              <label className="flex items-center gap-1.5 px-3.5 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-xl border border-zinc-800 font-medium transition-colors cursor-pointer">
                <Upload className="w-3.5 h-3.5" />
                <span>{restoreLoading ? 'Restoring...' : 'Restore from Backup'}</span>
                <input
                  type="file"
                  accept=".b64,.sqlite,.txt"
                  className="hidden"
                  onChange={handleRestoreFile}
                />
              </label>
            </div>
          </div>

          {/* Credentials Card */}
          <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2 text-white font-semibold">
                <Key className="w-4 h-4 text-amber-400" />
                <span>Google Cloud OAuth Credentials</span>
              </div>
              <p className="text-zinc-400 text-[11px]">
                Configured with YouTube Data API v3 scopes and encrypted at rest
              </p>
            </div>
            <button
              onClick={() => {
                onClose();
                onOpenSetupWizard();
              }}
              className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-medium transition-colors"
            >
              Reconfigure
            </button>
          </div>

          {/* Recent Audit Events */}
          <div className="space-y-2">
            <h4 className="font-semibold text-zinc-300 text-xs flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              <span>Recent Security Audit Log</span>
            </h4>
            <div className="max-h-48 overflow-y-auto rounded-xl border border-zinc-800/80 bg-zinc-950 divide-y divide-zinc-900 font-mono text-[11px]">
              {auditLogs.length === 0 ? (
                <div className="p-3 text-zinc-600">No security audit events recorded.</div>
              ) : (
                auditLogs.map((log) => (
                  <div key={log.id} className="p-2.5 flex items-center justify-between text-zinc-400">
                    <div className="flex items-center gap-2">
                      <span className="text-zinc-200 font-semibold">{log.action}</span>
                      <span className="text-zinc-500">by {log.actor}</span>
                    </div>
                    <span className="text-[10px] text-zinc-600">
                      {new Date(log.created_at).toLocaleTimeString()}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
