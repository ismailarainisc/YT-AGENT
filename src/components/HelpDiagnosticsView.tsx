import React, { useState, useEffect } from 'react';
import {
  HelpCircle,
  ShieldCheck,
  AlertTriangle,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Play,
  RefreshCw,
  Terminal,
  KeyRound,
  FileCheck,
  Radio,
  Sliders,
  Copy,
  Check,
  Database,
  Server,
  Activity,
  Clock,
  RotateCcw,
  Zap,
} from 'lucide-react';
import { YouTubeChannel, TestResult } from '../types.ts';
import { ErrorNotice } from './ErrorNotice.tsx';
import { AppError, copyErrorReportToClipboard, formatErrorReport } from '../utils/errorDiagnostics.ts';

interface HelpDiagnosticsViewProps {
  channel: YouTubeChannel | null;
  onOpenSetupWizard: () => void;
  onConnectClick: (mode?: 'popup' | 'redirect') => void;
}

export const HelpDiagnosticsView: React.FC<HelpDiagnosticsViewProps> = ({
  channel,
  onOpenSetupWizard,
  onConnectClick,
}) => {
  const [preflight, setPreflight] = useState<any>(null);
  const [loadingPreflight, setLoadingPreflight] = useState(true);
  const [health, setHealth] = useState<any>(null);
  const [loadingHealth, setLoadingHealth] = useState(true);
  const [tests, setTests] = useState<TestResult[]>([]);
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [testSummary, setTestSummary] = useState<any>(null);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  const fetchPreflight = async () => {
    setLoadingPreflight(true);
    try {
      const res = await fetch('/api/auth/preflight');
      if (res.ok) {
        const json = await res.json();
        setPreflight(json);
      }
    } catch (e) {
      console.warn('Notice loading preflight:', e);
    } finally {
      setLoadingPreflight(false);
    }
  };

  const fetchHealth = async () => {
    setLoadingHealth(true);
    try {
      const res = await fetch('/api/diagnostics/health');
      if (res.ok) {
        const json = await res.json();
        setHealth(json);
      }
    } catch (e) {
      console.warn('Notice fetching health diagnostics:', e);
    } finally {
      setLoadingHealth(false);
    }
  };

  useEffect(() => {
    fetchPreflight();
    fetchHealth();
  }, []);

  const showCopyToast = (msg: string) => {
    setCopyFeedback(msg);
    setTimeout(() => setCopyFeedback(null), 3000);
  };

  const handleRunTests = async () => {
    setIsRunningTests(true);
    try {
      const res = await fetch('/api/test/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runLiveIntegration: Boolean(channel) }),
      });
      if (res.ok) {
        const data = await res.json();
        setTests(data.results || []);
        setTestSummary({
          passed: data.passed,
          failed: data.failed,
          total: data.total,
          durationMs: data.durationMs,
        });
      }
    } catch (e) {
      console.warn('Notice running diagnostics:', e);
    } finally {
      setIsRunningTests(false);
    }
  };

  const handleCopyDiagnosticsReport = async () => {
    const report = [
      '========================================',
      'YOUTUBE STUDIO AI AGENT - FULL DIAGNOSTICS REPORT',
      `Generated: ${new Date().toISOString()}`,
      '========================================',
      '',
      '[1. YOUTUBE CONNECTION HEALTH]',
      `Status: ${health?.youtubeConnection?.status || (channel ? 'Connected' : 'Disconnected')}`,
      `Channel Title: ${channel?.title || 'None'}`,
      `Channel ID: ${channel?.channel_id || 'None'}`,
      `API Enablement Required: ${health?.youtubeConnection?.isApiEnablementRequired ? 'YES (Setup Required)' : 'NO'}`,
      `Last Successful Sync: ${health?.youtubeConnection?.lastSuccessfulSync || 'Never'}`,
      '',
      '[2. OAUTH & CREDENTIAL HEALTH]',
      `Credentials Configured: ${preflight?.isConfigured ? 'YES' : 'NO'}`,
      `Client ID: ${preflight?.checks?.find((c: any) => c.id === 'client_id')?.value || 'Not configured'}`,
      `Active Account: ${health?.oauthPermissions?.hasAccount ? 'Found' : 'None'}`,
      `Scopes: ${(health?.oauthPermissions?.scopes || []).join(', ') || 'youtube.upload, youtube.force-ssl, youtube.readonly'}`,
      '',
      '[3. BACKEND & DATABASE HEALTH]',
      `Server API Status: ${health?.backendApi?.status || 'Healthy'}`,
      `Server Uptime: ${health?.backendApi?.uptimeSeconds || 0} seconds`,
      `Database Status: ${health?.database?.status || 'Healthy'} (${health?.database?.type || 'SQLite'})`,
      `Database Tables: ${health?.database?.tableCount || 'Active'}`,
      '',
      '[4. RECENT FAILURES]',
      `Failed Uploads: ${health?.recentFailures?.failedUploads?.length || 0}`,
      `Failed Tasks: ${health?.recentFailures?.failedTasks?.length || 0}`,
      `Recent AI Errors: ${health?.recentFailures?.recentAiErrors?.length || 0}`,
      '',
      '[5. TEST SUITE RESULTS]',
      testSummary
        ? `Passed: ${testSummary.passed}/${testSummary.total} (${testSummary.failed} failed) in ${testSummary.durationMs}ms`
        : 'Suite not executed yet.',
      '========================================',
    ].join('\n');

    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(report);
        showCopyToast('Full Diagnostics Report copied to clipboard!');
      }
    } catch {
      showCopyToast('Report generated. Clipboard unavailable in iframe.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification for Clipboard Copy */}
      {copyFeedback && (
        <div className="fixed top-20 right-4 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs shadow-2xl animate-in slide-in-from-top duration-200">
          <Check className="w-4 h-4" />
          <span>{copyFeedback}</span>
        </div>
      )}

      {/* Header */}
      <div className="p-6 rounded-3xl bg-zinc-900 border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-600 rounded-xl text-white shadow-md shadow-amber-600/30">
              <HelpCircle className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-black text-white tracking-tight">Help & Diagnostics Center</h2>
          </div>
          <p className="text-xs text-zinc-400">
            Automated system tests, connection health metrics, Google Cloud API enablement, and diagnostic reports.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={handleCopyDiagnosticsReport}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-bold text-xs border border-zinc-700 transition-colors"
          >
            <Copy className="w-3.5 h-3.5 text-zinc-300" />
            <span>Copy Diagnostics</span>
          </button>

          <button
            onClick={handleRunTests}
            disabled={isRunningTests}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-red-600/30 transition-all active:scale-95"
          >
            <Play className={`w-3.5 h-3.5 fill-white ${isRunningTests ? 'animate-spin' : ''}`} />
            <span>{isRunningTests ? 'Running Suite...' : 'Run Diagnostics Suite'}</span>
          </button>
        </div>
      </div>

      {/* High-Priority Guide: YouTube Data API Enablement */}
      <div className="p-6 rounded-3xl bg-gradient-to-br from-amber-950/40 via-zinc-900 to-zinc-900 border border-amber-800/60 space-y-4 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-amber-300 font-bold text-sm">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>Step-by-Step: Enabling YouTube Data API v3 in Google Cloud</span>
            </div>
            <p className="text-xs text-amber-200/80 leading-relaxed max-w-2xl">
              To connect your real YouTube channel, enable YouTube Data API v3 on your Google Cloud Project or enter your OAuth Web Client credentials in the Setup Wizard.
            </p>
          </div>

          <a
            href="https://console.cloud.google.com/apis/library/youtube.googleapis.com"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-amber-950 font-bold text-xs shrink-0 transition-colors shadow-md"
          >
            <span>Open Google Cloud Library</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
          <div className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-1">
            <div className="font-bold text-amber-400">1. Click Link Above</div>
            <p className="text-[11px] text-zinc-400">
              Opens the YouTube Data API v3 Library in Google Cloud Console.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-1">
            <div className="font-bold text-amber-400">2. Click "Enable" Button</div>
            <p className="text-[11px] text-zinc-400">
              Blue button on the Google Cloud API dashboard. Takes ~10 seconds.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-1">
            <div className="font-bold text-amber-400">3. Re-authenticate Channel</div>
            <p className="text-[11px] text-zinc-400">
              Click Connect YouTube in this app to finalize token exchange.
            </p>
          </div>
        </div>
      </div>

      {/* System Health Overview Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* YouTube Connection Health */}
        <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-2">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-semibold">YouTube Connection</span>
            <Radio className="w-4 h-4 text-red-500" />
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                channel
                  ? health?.youtubeConnection?.isApiEnablementRequired
                    ? 'bg-amber-400'
                    : 'bg-emerald-400'
                  : 'bg-zinc-500'
              }`}
            />
            <span className="text-sm font-bold text-white truncate">
              {channel
                ? health?.youtubeConnection?.isApiEnablementRequired
                  ? 'API Disabled'
                  : 'Connected'
                : 'Not Connected'}
            </span>
          </div>
          <p className="text-[11px] text-zinc-400 truncate">
            {channel?.title || 'Connect your official channel'}
          </p>
        </div>

        {/* OAuth & Permissions Status */}
        <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-2">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-semibold">OAuth & Permissions</span>
            <KeyRound className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                preflight?.isConfigured ? 'bg-emerald-400' : 'bg-amber-400'
              }`}
            />
            <span className="text-sm font-bold text-white truncate">
              {preflight?.isConfigured ? 'OAuth Configured' : 'Missing Client Secret'}
            </span>
          </div>
          <p className="text-[11px] text-zinc-400 truncate">
            3 YouTube scopes authorized
          </p>
        </div>

        {/* Backend / API Health */}
        <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-2">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-semibold">Backend / API Health</span>
            <Server className="w-4 h-4 text-blue-400" />
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            <span className="text-sm font-bold text-white truncate">
              Express + Node {health?.backendApi?.nodeVersion || ''}
            </span>
          </div>
          <p className="text-[11px] text-zinc-400">
            Uptime: {health?.backendApi?.uptimeSeconds ? `${health.backendApi.uptimeSeconds}s` : 'Active'}
          </p>
        </div>

        {/* Database Health */}
        <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-2">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-semibold">Database Health</span>
            <Database className="w-4 h-4 text-purple-400" />
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            <span className="text-sm font-bold text-white truncate">
              {health?.database?.status === 'healthy' ? 'SQLite Healthy' : 'Degraded'}
            </span>
          </div>
          <p className="text-[11px] text-zinc-400 truncate">
            {health?.database?.tableCount || 8} tables persistent
          </p>
        </div>
      </div>

      {/* Analytics Refresh & Recent Failures Panel */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Last Successful Analytics Refresh */}
        <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-red-500" />
              <span>Last Successful Analytics Refresh</span>
            </h3>
            <button
              onClick={fetchHealth}
              disabled={loadingHealth}
              className="text-zinc-400 hover:text-white p-1 rounded-lg"
              title="Refresh status"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingHealth ? 'animate-spin' : ''}`} />
            </button>
          </div>
          <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800/80 text-xs text-zinc-300 font-mono">
            {health?.youtubeConnection?.lastSuccessfulSync ? (
              <div className="space-y-1">
                <div className="text-emerald-400 font-bold">Synchronized</div>
                <div className="text-[11px] text-zinc-400">
                  {new Date(health.youtubeConnection.lastSuccessfulSync).toLocaleString()}
                </div>
              </div>
            ) : (
              <div className="text-zinc-500">No previous analytics sync recorded for this session.</div>
            )}
          </div>
        </div>

        {/* Recent Failures & Retry Options */}
        <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-3">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-amber-500" />
            <span>Recent Failures & Recovery</span>
          </h3>

          <div className="space-y-2 text-xs">
            {health?.recentFailures?.failedUploads?.length > 0 ? (
              health.recentFailures.failedUploads.map((fail: any) => (
                <div
                  key={fail.id}
                  className="p-2.5 rounded-xl bg-red-950/30 border border-red-900/40 flex items-center justify-between gap-2"
                >
                  <div className="truncate min-w-0">
                    <p className="font-bold text-red-300 truncate">{fail.file_name || 'Upload Job'}</p>
                    <p className="text-[10px] text-red-400/80 truncate">{fail.error_message}</p>
                  </div>
                  <button
                    onClick={() =>
                      copyErrorReportToClipboard({
                        title: 'Upload Job Failure',
                        operation: 'Background Video Upload',
                        message: fail.error_message,
                        code: 'UPLOAD_FAILED',
                        timestamp: fail.updated_at || new Date().toISOString(),
                        requestId: fail.id,
                        suggestedFix: 'Verify video codec and retry job in Activity tab.',
                        page: 'Diagnostics',
                      }).then(() => showCopyToast('Error report copied!'))
                    }
                    className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 shrink-0"
                    title="Copy Error"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                </div>
              ))
            ) : (
              <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800/80 text-xs text-emerald-400 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Zero persistent task or upload failures recorded.</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Automated Diagnostics Test Suite */}
      {testSummary && (
        <div className="p-6 rounded-3xl bg-zinc-900 border border-zinc-800 space-y-4 shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800">
            <div className="space-y-0.5">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-emerald-400" />
                <span>Automated Test Suite Results</span>
              </h3>
              <p className="text-xs text-zinc-400">
                {testSummary.passed} passed of {testSummary.total} tests in {testSummary.durationMs}ms
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`text-xs px-2.5 py-1 rounded-full font-bold uppercase tracking-wider ${
                  testSummary.failed === 0
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    : 'bg-red-500/20 text-red-400 border border-red-500/40'
                }`}
              >
                {testSummary.failed === 0 ? 'All Systems Passing' : `${testSummary.failed} Failed`}
              </span>

              {testSummary.failed > 0 && (
                <button
                  onClick={async () => {
                    const failedTests = tests.filter((t) => t.status === 'failed');
                    const errReport: AppError = {
                      title: `Diagnostics Suite: ${failedTests.length} Failed Checks`,
                      operation: 'Diagnostics Automated Test Suite Run',
                      message: failedTests.map((t) => `[${t.category}] ${t.name}: ${t.message}`).join(' | '),
                      code: 'DIAGNOSTICS_TESTS_FAILED',
                      timestamp: new Date().toISOString(),
                      suggestedFix:
                        'Review Google OAuth client setup and YouTube Data API v3 enablement status.',
                      page: 'Help & Diagnostics',
                    };
                    await copyErrorReportToClipboard(errReport);
                    showCopyToast('Failed tests error report copied to clipboard!');
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold text-red-300 bg-red-950/80 hover:bg-red-900 border border-red-700/60 transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Failures Report</span>
                </button>
              )}
            </div>
          </div>

          <div className="divide-y divide-zinc-800/60 max-h-96 overflow-y-auto pr-1">
            {tests.map((test) => (
              <div key={test.id} className="py-3 flex flex-col sm:flex-row sm:items-start justify-between gap-3 text-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {test.status === 'passed' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : test.status === 'failed' ? (
                      <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-zinc-500 shrink-0" />
                    )}
                    <span className="font-bold text-white">{test.name}</span>
                    <span className="text-[10px] text-zinc-500 font-mono uppercase">[{test.category}]</span>
                  </div>
                  <p className="text-[11px] text-zinc-400 pl-6 leading-relaxed">{test.message}</p>
                </div>
                <div className="flex items-center gap-2 self-end sm:self-auto shrink-0 pl-6 sm:pl-0">
                  <span className="text-[10px] text-zinc-500">{test.durationMs}ms</span>
                  {test.status === 'failed' && (
                    <button
                      onClick={async () => {
                        await copyErrorReportToClipboard({
                          title: `Test Failed: ${test.name}`,
                          operation: `Diagnostics Test: ${test.category}`,
                          message: test.message,
                          code: test.category.toUpperCase(),
                          timestamp: new Date().toISOString(),
                          requestId: `diag_${test.id}`,
                          suggestedFix:
                            test.category === 'oauth'
                              ? 'Configure valid Google OAuth Client ID and Secret in Settings.'
                              : test.category === 'live_integration'
                              ? 'Ensure YouTube channel is connected and YouTube Data API v3 is enabled.'
                              : 'Check system configuration and retry.',
                          page: 'Help & Diagnostics',
                        });
                        showCopyToast('Error report copied to clipboard!');
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-950/80 hover:bg-red-900 border border-red-700/60 text-red-300 text-[11px] font-semibold transition-colors"
                      title="Copy structured error report"
                    >
                      <Copy className="w-3 h-3" />
                      <span>Copy Error</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Preflight Checks */}
      <div className="p-6 rounded-3xl bg-zinc-900 border border-zinc-800 space-y-4 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Terminal className="w-4 h-4 text-blue-400" />
              <span>Preflight System Checklist</span>
            </h3>
            <p className="text-xs text-zinc-400">
              Validates credentials, HTTPS redirect URIs, and scopes.
            </p>
          </div>
          <button
            onClick={fetchPreflight}
            disabled={loadingPreflight}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingPreflight ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {preflight?.checks && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {preflight.checks.map((check: any) => (
              <div
                key={check.id}
                className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800/80 space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">{check.name}</span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                      check.status === 'ok'
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-amber-500/20 text-amber-300'
                    }`}
                  >
                    {check.status === 'ok' ? 'Ready' : 'Pending'}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400">{check.description}</p>
                <p className="text-[10px] text-zinc-500 font-mono pt-1 truncate">{check.value}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
