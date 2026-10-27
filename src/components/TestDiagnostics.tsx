import React, { useState } from 'react';
import {
  Play,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  ShieldCheck,
  Cpu,
  Database,
  Lock,
  MessageSquare,
  Radio,
  Clock,
} from 'lucide-react';
import { TestResult, YouTubeChannel } from '../types.ts';

interface TestDiagnosticsProps {
  channel: YouTubeChannel | null;
}

export const TestDiagnostics: React.FC<TestDiagnosticsProps> = ({ channel }) => {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);
  const [summary, setSummary] = useState<{ total: number; passed: number; failed: number; skipped: number } | null>(null);
  const [runLiveIntegration, setRunLiveIntegration] = useState(Boolean(channel));

  const handleRunTests = async () => {
    setIsRunning(true);
    try {
      const res = await fetch('/api/test/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runLiveIntegration }),
      });
      const data = await res.json();
      setResults(data.results || []);
      setSummary({
        total: data.total,
        passed: data.passed,
        failed: data.failed,
        skipped: data.skipped,
      });
    } catch (err) {
      console.warn('Test run notice:', err);
    } finally {
      setIsRunning(false);
    }
  };

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'policy':
        return <Lock className="w-3.5 h-3.5 text-red-400" />;
      case 'ai':
        return <Cpu className="w-3.5 h-3.5 text-purple-400" />;
      case 'database':
        return <Database className="w-3.5 h-3.5 text-blue-400" />;
      case 'comments':
        return <MessageSquare className="w-3.5 h-3.5 text-amber-400" />;
      case 'live_integration':
        return <Radio className="w-3.5 h-3.5 text-emerald-400" />;
      default:
        return <ShieldCheck className="w-3.5 h-3.5 text-zinc-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">Automated Verification & Diagnostics</h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Automated tests covering privacy policy invariants, Urdu/English NLP, database recovery, and live API connectivity
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleRunTests}
              disabled={isRunning}
              className="flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-red-600/20 disabled:opacity-50"
            >
              <Play className={`w-3.5 h-3.5 ${isRunning ? 'animate-spin' : 'fill-white'}`} />
              <span>{isRunning ? 'Running Test Suite...' : 'Run Automated Tests'}</span>
            </button>
          </div>
        </div>

        {/* Live Integration Toggle */}
        <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-xs">
          <label className="flex items-center gap-2 cursor-pointer text-zinc-300">
            <input
              type="checkbox"
              checked={runLiveIntegration}
              onChange={(e) => setRunLiveIntegration(e.target.checked)}
              disabled={!channel}
              className="w-4 h-4 rounded border-zinc-700 text-red-600 bg-zinc-900"
            />
            <span className="font-medium text-white">
              Include Live YouTube Channel Integration Check
            </span>
            {!channel && (
              <span className="text-zinc-500 text-[11px]">(Requires connected channel)</span>
            )}
          </label>

          <span className="text-zinc-500 text-[11px]">
            Strict separation: Mocks for isolation, live checks strictly when authorized.
          </span>
        </div>
      </div>

      {/* Summary Scorecard */}
      {summary && (
        <div className="grid grid-cols-4 gap-3">
          <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 text-center">
            <div className="text-xs text-zinc-400">Total Cases</div>
            <div className="text-2xl font-bold text-white mt-1">{summary.total}</div>
          </div>
          <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-800/40 text-center">
            <div className="text-xs text-emerald-300">Passed</div>
            <div className="text-2xl font-bold text-emerald-400 mt-1">{summary.passed}</div>
          </div>
          <div className="p-4 rounded-xl bg-red-950/40 border border-red-800/40 text-center">
            <div className="text-xs text-red-300">Failed</div>
            <div className="text-2xl font-bold text-red-400 mt-1">{summary.failed}</div>
          </div>
          <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 text-center">
            <div className="text-xs text-zinc-500">Skipped</div>
            <div className="text-2xl font-bold text-zinc-400 mt-1">{summary.skipped}</div>
          </div>
        </div>
      )}

      {/* Results Table */}
      {results.length > 0 && (
        <div className="rounded-2xl bg-zinc-900 border border-zinc-800 overflow-hidden">
          <div className="px-5 py-3 border-b border-zinc-800 bg-zinc-950/40 text-xs font-semibold text-zinc-400">
            Execution Assertion Results
          </div>
          <div className="divide-y divide-zinc-800/60">
            {results.map((res) => (
              <div key={res.id} className="p-4 flex items-start justify-between gap-4 text-xs">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    {res.status === 'passed' && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    )}
                    {res.status === 'failed' && <XCircle className="w-4 h-4 text-red-400" />}
                    {res.status === 'skipped' && <Clock className="w-4 h-4 text-zinc-500" />}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] text-zinc-500">{res.id}</span>
                      <span className="font-semibold text-white">{res.name}</span>
                    </div>
                    <p className={`text-[11px] ${res.status === 'failed' ? 'text-red-300 font-mono' : 'text-zinc-400'}`}>
                      {res.message}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  <span className="flex items-center gap-1 text-[11px] text-zinc-400 font-mono">
                    {getCategoryIcon(res.category)}
                    <span className="capitalize">{res.category.replace('_', ' ')}</span>
                  </span>
                  <span className="text-[10px] text-zinc-500 font-mono">{res.durationMs}ms</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
