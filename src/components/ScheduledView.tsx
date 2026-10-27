import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  Video,
  Lock,
  XCircle,
  RefreshCw,
  Send,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

export const ScheduledView: React.FC = () => {
  const [scheduledJobs, setScheduledJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [releasingId, setReleasingId] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const fetchScheduled = async () => {
    try {
      const res = await fetch('/api/schedule/list');
      const data = await res.json();
      setScheduledJobs(data.scheduled || []);
    } catch (err) {
      console.warn('Fetch schedule notice:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScheduled();
  }, []);

  const handleCancel = async (jobId: string) => {
    setCancellingId(jobId);
    try {
      await fetch(`/api/upload/cancel/${jobId}`, { method: 'POST' });
      setActionSuccess('Scheduled job cancelled successfully.');
      setTimeout(() => setActionSuccess(null), 3500);
      await fetchScheduled();
    } catch (err) {
      console.warn('Cancel schedule error:', err);
    } finally {
      setCancellingId(null);
    }
  };

  const handleReleaseNow = async (jobId: string) => {
    setReleasingId(jobId);
    try {
      const res = await fetch(`/api/schedule/release-now/${jobId}`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setActionSuccess(data.message || 'Job queued for immediate release!');
        setTimeout(() => setActionSuccess(null), 4000);
        await fetchScheduled();
      }
    } catch (err) {
      console.warn('Release now error:', err);
    } finally {
      setReleasingId(null);
    }
  };

  const getYearBadge = (publishAt: string) => {
    const d = new Date(publishAt);
    if (isNaN(d.getTime())) return null;
    const targetYear = d.getFullYear();
    const currentYear = new Date().getFullYear();
    const isFutureYear = targetYear > currentYear;

    return (
      <span
        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider ${
          isFutureYear
            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
            : 'bg-zinc-800 text-zinc-300 border border-zinc-700'
        }`}
      >
        {isFutureYear ? `Year ${targetYear}` : `${targetYear}`}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-zinc-900 border border-zinc-800">
        <div>
          <h3 className="text-base font-bold text-white tracking-tight">Scheduled Publication Queue</h3>
          <p className="text-xs text-zinc-400">
            Pending video uploads staged for timed release across present & future years
          </p>
        </div>

        <button
          onClick={fetchScheduled}
          className="p-2 bg-zinc-950 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-xl border border-zinc-800 transition-colors"
          title="Refresh scheduled list"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {actionSuccess && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/80 text-emerald-300 text-xs font-medium">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {loading ? (
        <div className="p-12 text-center text-xs text-zinc-500">Loading scheduled content...</div>
      ) : scheduledJobs.length === 0 ? (
        <div className="p-12 rounded-2xl bg-zinc-900/40 border border-zinc-800 text-center space-y-3">
          <div className="w-12 h-12 rounded-xl bg-zinc-800 flex items-center justify-center text-zinc-500 mx-auto">
            <Calendar className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-white">No Scheduled Publications</p>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto">
              You can schedule video publishing by specifying a future date or year in your natural language instructions (e.g. &quot;Schedule for tomorrow at 6 PM&quot; or &quot;Publish in Year 2027&quot;), or by using the date picker in AI Studio Upload.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {scheduledJobs.map((job) => {
            const dateObj = new Date(job.publish_at);
            const isValid = !isNaN(dateObj.getTime());

            return (
              <div
                key={job.id}
                className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-xs"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-400 mt-0.5">
                    <Video className="w-4 h-4" />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-white text-sm">{job.title}</span>
                      {isValid && getYearBadge(job.publish_at)}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-zinc-400 text-[11px]">
                      <span className="flex items-center gap-1 text-amber-400 font-medium">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Publishing: {isValid ? dateObj.toLocaleString() : job.publish_at}</span>
                      </span>
                      <span aria-hidden="true" className="text-zinc-600">·</span>
                      <span className="flex items-center gap-1">
                        <Lock className="w-3 h-3 text-zinc-500" />
                        <span className="capitalize">{job.privacy_status}</span>
                      </span>
                      <span aria-hidden="true" className="text-zinc-600">·</span>
                      <span className="text-zinc-500 font-mono">Job: {job.id.slice(0, 12)}...</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto justify-end pt-2 md:pt-0 border-t md:border-t-0 border-zinc-800">
                  <button
                    onClick={() => handleReleaseNow(job.id)}
                    disabled={releasingId === job.id || cancellingId === job.id}
                    title="Publish immediately without waiting for scheduled date"
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-800/80 rounded-lg transition-colors text-xs font-semibold disabled:opacity-50"
                  >
                    <Send className={`w-3.5 h-3.5 ${releasingId === job.id ? 'animate-pulse' : ''}`} />
                    <span>{releasingId === job.id ? 'Releasing...' : 'Release Now'}</span>
                  </button>

                  <button
                    onClick={() => handleCancel(job.id)}
                    disabled={cancellingId === job.id || releasingId === job.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-950 hover:bg-red-950/40 text-zinc-400 hover:text-red-400 border border-zinc-800 rounded-lg transition-colors text-xs disabled:opacity-50"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Cancel</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
