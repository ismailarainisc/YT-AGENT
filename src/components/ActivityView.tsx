import React, { useState, useEffect } from 'react';
import {
  ListChecks,
  Activity,
  ShieldCheck,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Trash2,
  RotateCcw,
  Film,
  User,
  Sliders,
  Copy,
  Check,
} from 'lucide-react';
import { UploadJob } from '../types.ts';
import { copyErrorReportToClipboard } from '../utils/errorDiagnostics.ts';

export const ActivityView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'queue' | 'audit'>('queue');
  const [jobs, setJobs] = useState<UploadJob[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copyToast, setCopyToast] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [queueRes, auditRes] = await Promise.all([
        fetch('/api/queue/jobs'),
        fetch('/api/logs/audit'),
      ]);

      if (queueRes.ok) {
        const qJson = await queueRes.json();
        setJobs(qJson.jobs || []);
      }
      if (auditRes.ok) {
        const aJson = await auditRes.json();
        setAuditLogs(aJson.logs || []);
      }
    } catch (e) {
      console.warn('Notice loading activity logs:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 8000);
    return () => clearInterval(interval);
  }, []);

  const handleRetryJob = async (jobId: string) => {
    try {
      await fetch(`/api/queue/retry/${jobId}`, { method: 'POST' });
      fetchData();
    } catch (e) {
      console.warn('Notice retrying job:', e);
    }
  };

  const handleClearCompleted = async () => {
    try {
      await fetch('/api/queue/clear-completed', { method: 'DELETE' });
      fetchData();
    } catch (e) {
      console.warn('Notice clearing completed jobs:', e);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {copyToast && (
        <div className="fixed top-20 right-4 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs shadow-2xl animate-in slide-in-from-top duration-200">
          <Check className="w-4 h-4" />
          <span>{copyToast}</span>
        </div>
      )}

      {/* Header */}
      <div className="p-6 rounded-3xl bg-zinc-900 border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-600 rounded-xl text-white shadow-md shadow-blue-600/30">
              <Activity className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-black text-white tracking-tight">Activity & Task History</h2>
          </div>
          <p className="text-xs text-zinc-400">
            Real-time tracking of autonomous upload jobs, scheduled publishing, and cryptographic audit logs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-zinc-300 bg-zinc-800 hover:bg-zinc-700 rounded-xl border border-zinc-700 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          {activeTab === 'queue' && (
            <button
              onClick={handleClearCompleted}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 rounded-xl border border-zinc-700 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Done</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-zinc-800 pb-2">
        <button
          onClick={() => setActiveTab('queue')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'queue'
              ? 'bg-blue-600 text-white'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
          }`}
        >
          Upload Queue ({jobs.length})
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'audit'
              ? 'bg-blue-600 text-white'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
          }`}
        >
          Security Audit Log ({auditLogs.length})
        </button>
      </div>

      {/* Tab 1: Queue */}
      {activeTab === 'queue' && (
        <div className="space-y-3">
          {jobs.length > 0 ? (
            jobs.map((job) => (
              <div
                key={job.id}
                className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-3 hover:border-zinc-700 transition-all"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        job.status === 'completed'
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : job.status === 'failed'
                          ? 'bg-red-500/10 text-red-400'
                          : 'bg-blue-500/10 text-blue-400'
                      }`}
                    >
                      <Film className="w-4 h-4" />
                    </div>

                    <div>
                      <h4 className="text-xs font-bold text-white truncate max-w-md">
                        {job.title}
                      </h4>
                      <p className="text-[11px] text-zinc-400">
                        {job.original_filename} · {job.privacy_status.toUpperCase()} · {formatDate(job.created_at)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        job.status === 'completed'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : job.status === 'failed'
                          ? 'bg-red-500/20 text-red-400'
                          : 'bg-blue-500/20 text-blue-300 animate-pulse'
                      }`}
                    >
                      {job.status}
                    </span>

                    {job.status === 'failed' && (
                      <button
                        onClick={() => handleRetryJob(job.id)}
                        className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-lg transition-colors"
                        title="Retry Job"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Progress bar */}
                {job.status === 'processing' && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-zinc-400 font-semibold">
                      <span>Uploading to YouTube via Resumable Protocol</span>
                      <span>{job.progress}%</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-zinc-950 border border-zinc-800 overflow-hidden">
                      <div
                        style={{ width: `${job.progress}%` }}
                        className="h-full bg-blue-500 rounded-full transition-all duration-300"
                      />
                    </div>
                  </div>
                )}

                {job.error_message && (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-xl bg-red-950/40 border border-red-900/40 text-[11px] text-red-300">
                    <p className="leading-relaxed">
                      <span className="font-bold text-red-200">Error: </span>
                      {job.error_message}
                    </p>
                    <button
                      onClick={async () => {
                        await copyErrorReportToClipboard({
                          title: `Upload Job Failed: ${job.title}`,
                          operation: 'YouTube Resumable Upload Task',
                          message: job.error_message || 'Background upload task failed.',
                          code: 'UPLOAD_JOB_FAILED',
                          timestamp: job.created_at || new Date().toISOString(),
                          requestId: `job_${job.id}`,
                          suggestedFix:
                            job.error_message && job.error_message.includes('SERVICE_DISABLED')
                              ? 'Enable YouTube Data API v3 in Google Cloud Console or configure your personal OAuth Client in Settings.'
                              : 'Verify YouTube channel quota and video file codec, then click Retry.',
                          page: 'Activity & Task History',
                        });
                        setCopyToast('Error report copied to clipboard!');
                        setTimeout(() => setCopyToast(null), 3000);
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-900/60 hover:bg-red-800 text-white font-semibold text-[10px] shrink-0 border border-red-700/60 transition-colors"
                      title="Copy structured diagnostic report"
                    >
                      <Copy className="w-3 h-3" />
                      <span>Copy Error</span>
                    </button>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="p-8 rounded-2xl bg-zinc-900 border border-zinc-800 text-center space-y-2">
              <CheckCircle2 className="w-8 h-8 text-zinc-600 mx-auto" />
              <p className="text-sm font-bold text-white">Upload Queue Empty</p>
              <p className="text-xs text-zinc-400">All background jobs have completed execution.</p>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Audit Logs */}
      {activeTab === 'audit' && (
        <div className="p-5 sm:p-6 rounded-3xl bg-zinc-900 border border-zinc-800 space-y-4 shadow-lg">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Immutable Audit Trail</span>
            </h3>
            <span className="text-[11px] text-zinc-500">Security event logging</span>
          </div>

          <div className="divide-y divide-zinc-800/80">
            {auditLogs.map((log) => (
              <div key={log.id} className="py-3 flex items-start justify-between gap-4 text-xs">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white">{log.action.replace(/_/g, ' ').toUpperCase()}</span>
                    <span className="text-[10px] text-zinc-500 font-mono">by {log.actor}</span>
                  </div>
                  {log.details && (
                    <p className="text-[11px] text-zinc-400 font-mono bg-zinc-950 p-1.5 rounded-lg border border-zinc-800 max-w-xl truncate">
                      {log.details}
                    </p>
                  )}
                </div>
                <span className="text-[10px] text-zinc-500 shrink-0">{formatDate(log.created_at)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
