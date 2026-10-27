import React, { useState, useEffect } from 'react';
import {
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Trash2,
  RefreshCw,
  Terminal,
  ShieldAlert,
  Film,
  Lock,
} from 'lucide-react';
import { UploadJob } from '../types.ts';

interface LogItem {
  id: string;
  job_id: string | null;
  level: 'info' | 'warn' | 'error' | 'success';
  message: string;
  details?: string;
  created_at: string;
}

export const QueueMonitor: React.FC = () => {
  const [jobs, setJobs] = useState<UploadJob[]>([]);
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchQueue = async () => {
    try {
      const res = await fetch('/api/queue/jobs');
      const data = await res.json();
      setJobs(data.jobs || []);
      setLogs(data.logs || []);
    } catch (err) {
      console.warn('Queue poll notice:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
    const interval = setInterval(fetchQueue, 3500);
    return () => clearInterval(interval);
  }, []);

  const handleRetry = async (jobId: string) => {
    setActionLoading(jobId);
    try {
      await fetch(`/api/queue/retry/${jobId}`, { method: 'POST' });
      await fetchQueue();
    } catch (err) {
      console.warn('Retry notice:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = async (jobId: string) => {
    setActionLoading(jobId);
    try {
      await fetch(`/api/upload/cancel/${jobId}`, { method: 'POST' });
      await fetchQueue();
    } catch (err) {
      console.warn('Cancel notice:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleClearCompleted = async () => {
    try {
      await fetch('/api/queue/clear-completed', { method: 'DELETE' });
      await fetchQueue();
    } catch (err) {
      console.warn('Clear notice:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-zinc-900 border border-zinc-800">
        <div>
          <h3 className="text-base font-bold text-white tracking-tight">Persistent Task Queue</h3>
          <p className="text-xs text-zinc-400">
            SQLite-backed background worker that survives restarts and retries failed operations
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleClearCompleted}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-zinc-400 hover:text-white bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 rounded-xl transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear Completed</span>
          </button>
          <button
            onClick={fetchQueue}
            className="p-2 bg-zinc-950 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-xl border border-zinc-800 transition-colors"
            title="Refresh queue"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Grid: Jobs List + Live Server Execution Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Job Queue */}
        <div className="lg:col-span-7 space-y-3">
          <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider px-1">
            Queued & Recent Jobs ({jobs.length})
          </h4>

          {jobs.length === 0 ? (
            <div className="p-8 rounded-2xl bg-zinc-900/50 border border-zinc-800 text-center text-xs text-zinc-500">
              No tasks currently in queue. Upload a video to see background tasks in real time.
            </div>
          ) : (
            <div className="space-y-3">
              {jobs.map((job) => (
                <div
                  key={job.id}
                  className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 space-y-3 text-xs"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm truncate max-w-[260px]">
                          {job.title}
                        </span>
                        {job.is_short ? (
                          <span className="text-[10px] font-semibold text-red-400 bg-red-950/40 border border-red-800/40 px-1.5 py-0.5 rounded">
                            Short
                          </span>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-zinc-400">
                        <span className="font-mono text-zinc-500">{job.id}</span>
                        <span aria-hidden="true">·</span>
                        <span className="flex items-center gap-1 text-zinc-300">
                          <Lock className="w-3 h-3 text-zinc-500" />
                          {job.privacy_status}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{new Date(job.created_at).toLocaleTimeString()}</span>
                      </div>
                    </div>

                    {/* Status Pill */}
                    <div className="shrink-0 flex items-center gap-2">
                      <span
                        className={`px-2.5 py-1 rounded-lg font-semibold text-[11px] flex items-center gap-1.5 ${
                          job.status === 'completed'
                            ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/60'
                            : job.status === 'processing'
                            ? 'bg-blue-950/60 text-blue-400 border border-blue-800/60'
                            : job.status === 'failed'
                            ? 'bg-red-950/60 text-red-400 border border-red-800/60'
                            : 'bg-zinc-800 text-zinc-300'
                        }`}
                      >
                        {job.status === 'completed' && <CheckCircle2 className="w-3 h-3" />}
                        {job.status === 'processing' && <RefreshCw className="w-3 h-3 animate-spin" />}
                        {job.status === 'failed' && <XCircle className="w-3 h-3" />}
                        {job.status === 'pending' && <Clock className="w-3 h-3" />}
                        <span className="capitalize">{job.status}</span>
                      </span>

                      {job.status === 'failed' && (
                        <button
                          onClick={() => handleRetry(job.id)}
                          disabled={actionLoading === job.id}
                          className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-lg transition-colors"
                          title="Retry Job"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {job.status === 'pending' && (
                        <button
                          onClick={() => handleCancel(job.id)}
                          disabled={actionLoading === job.id}
                          className="p-1.5 bg-zinc-800 hover:bg-red-900/40 text-zinc-400 hover:text-red-400 rounded-lg transition-colors"
                          title="Cancel Job"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Progress Bar */}
                  {job.status === 'processing' && (
                    <div className="space-y-1">
                      <div className="w-full h-1.5 bg-zinc-950 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full transition-all duration-300"
                          style={{ width: `${job.progress}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-zinc-500">
                        <span>Uploading stream to YouTube Resumable API</span>
                        <span>{job.progress}%</span>
                      </div>
                    </div>
                  )}

                  {/* Verification status if completed */}
                  {job.status === 'completed' && job.verified_status && (
                    <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 bg-emerald-950/20 px-2.5 py-1.5 rounded-lg border border-emerald-800/20">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>
                        Authoritatively verified on YouTube: Video ID{' '}
                        <strong className="font-mono">{job.youtube_video_id}</strong> is{' '}
                        <strong className="capitalize">{job.verified_status}</strong>
                      </span>
                    </div>
                  )}

                  {/* Error if failed */}
                  {job.status === 'failed' && job.error_message && (
                    <div className="flex items-start gap-2 text-[11px] text-red-300 bg-red-950/30 p-2.5 rounded-lg border border-red-800/40">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <span className="font-mono break-all">{job.error_message}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Execution Logs Terminal */}
        <div className="lg:col-span-5 space-y-3">
          <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider px-1 flex items-center gap-1.5">
            <Terminal className="w-3.5 h-3.5 text-zinc-500" />
            <span>Execution Audit Stream</span>
          </h4>

          <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 font-mono text-[11px] space-y-2 h-[480px] overflow-y-auto">
            {logs.length === 0 ? (
              <p className="text-zinc-600">No logs recorded yet.</p>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="leading-relaxed border-b border-zinc-900/80 pb-1.5">
                  <div className="flex items-center gap-2 text-zinc-500 text-[10px]">
                    <span>{new Date(log.created_at).toLocaleTimeString()}</span>
                    <span
                      className={`uppercase font-bold text-[9px] px-1 py-0.2 rounded ${
                        log.level === 'error'
                          ? 'text-red-400 bg-red-950'
                          : log.level === 'warn'
                          ? 'text-amber-400 bg-amber-950'
                          : log.level === 'success'
                          ? 'text-emerald-400 bg-emerald-950'
                          : 'text-zinc-400 bg-zinc-900'
                      }`}
                    >
                      {log.level}
                    </span>
                  </div>
                  <p className="text-zinc-300 mt-0.5">{log.message}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
