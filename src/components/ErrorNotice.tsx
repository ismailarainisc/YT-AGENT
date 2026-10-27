import React, { useState } from 'react';
import {
  AlertTriangle,
  Copy,
  Check,
  RotateCcw,
  X,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
} from 'lucide-react';
import { AppError, copyErrorReportToClipboard } from '../utils/errorDiagnostics.ts';

interface ErrorNoticeProps {
  error: AppError;
  onRetry?: () => void;
  isRetrying?: boolean;
  onDismiss?: () => void;
  className?: string;
  compact?: boolean;
}

export const ErrorNotice: React.FC<ErrorNoticeProps> = ({
  error,
  onRetry,
  isRetrying = false,
  onDismiss,
  className = '',
  compact = false,
}) => {
  const [copied, setCopied] = useState(false);
  const [showDetails, setShowDetails] = useState(!compact);

  const handleCopy = async () => {
    const success = await copyErrorReportToClipboard(error);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div
      role="alert"
      className={`rounded-2xl border border-red-500/40 bg-gradient-to-br from-red-950/50 via-zinc-900 to-zinc-950 p-4 sm:p-5 text-zinc-100 shadow-xl transition-all ${className}`}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-red-600/20 text-red-400 border border-red-500/30 shrink-0">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="text-sm sm:text-base font-extrabold text-white">
                {error.title || 'Operation Failed'}
              </h4>
              {error.code && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-red-950 text-red-300 border border-red-800">
                  Code: {error.code}
                </span>
              )}
              {error.httpStatus && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700">
                  HTTP {error.httpStatus}
                </span>
              )}
            </div>
            <p className="text-xs text-red-200/90 font-medium">
              <span className="text-zinc-400">Operation:</span> {error.operation}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="p-1.5 text-zinc-400 hover:text-zinc-200 rounded-lg hover:bg-zinc-800/80 transition-colors"
            title={showDetails ? 'Hide details' : 'Show details'}
            aria-label="Toggle details"
          >
            {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="p-1.5 text-zinc-400 hover:text-zinc-200 rounded-lg hover:bg-zinc-800/80 transition-colors"
              title="Dismiss error"
              aria-label="Dismiss error"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main message */}
      <div className="mt-3 pl-0 sm:pl-11">
        <div className="p-3 rounded-xl bg-zinc-950/80 border border-red-900/30 text-xs text-zinc-200 font-mono break-words leading-relaxed">
          {error.message}
        </div>

        {/* Suggested Fix */}
        {error.suggestedFix && (
          <div className="mt-2.5 flex items-start gap-2 text-xs text-amber-300/90 bg-amber-950/30 border border-amber-800/40 p-2.5 rounded-xl">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-amber-300">Suggested Fix: </span>
              <span className="text-amber-200/90">{error.suggestedFix}</span>
            </div>
          </div>
        )}

        {/* Detailed diagnostic metadata */}
        {showDetails && (
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-zinc-400 font-mono pt-2 border-t border-zinc-800/60">
            <div>
              <span className="text-zinc-500">Timestamp: </span>
              <span>{error.timestamp || new Date().toLocaleTimeString()}</span>
            </div>
            <div>
              <span className="text-zinc-500">Request ID: </span>
              <span>{error.requestId || `req_${Date.now().toString(36)}`}</span>
            </div>
            {error.page && (
              <div>
                <span className="text-zinc-500">Page: </span>
                <span>{error.page}</span>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons: Retry & Copy Error */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {onRetry && (
            <button
              onClick={onRetry}
              disabled={isRetrying}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-500 active:scale-95 disabled:opacity-50 transition-all shadow-md shadow-red-600/30"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isRetrying ? 'animate-spin' : ''}`} />
              <span>{isRetrying ? 'Retrying...' : 'Retry'}</span>
            </button>
          )}

          <button
            onClick={handleCopy}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-all active:scale-95 ${
              copied
                ? 'bg-emerald-950/80 border-emerald-500/60 text-emerald-300 shadow-sm shadow-emerald-500/20'
                : 'bg-zinc-800/90 hover:bg-zinc-700/90 border-zinc-700 text-zinc-200'
            }`}
            title="Copy structured diagnostic report to clipboard"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Error Report Copied!' : 'Copy Error'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
