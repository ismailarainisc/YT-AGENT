export interface AppError {
  id?: string;
  title: string;
  operation: string;
  message: string;
  code?: string | number;
  httpStatus?: number;
  timestamp: string;
  requestId?: string;
  suggestedFix?: string;
  page?: string;
  details?: Record<string, any>;
}

/**
 * Sanitizes an error message or string to ensure NO tokens, API secrets,
 * passwords, or sensitive auth headers ever leak into copied error reports.
 */
export function sanitizeMessage(msg?: string): string {
  if (!msg) return 'An unexpected error occurred.';
  return msg
    .replace(/(ya29\.[a-zA-Z0-9_\-]+)/g, '[REDACTED_ACCESS_TOKEN]')
    .replace(/(1\/\/[a-zA-Z0-9_\-]+)/g, '[REDACTED_REFRESH_TOKEN]')
    .replace(/(AIzaSy[a-zA-Z0-9_\-]{33})/g, '[REDACTED_API_KEY]')
    .replace(/Bearer\s+[a-zA-Z0-9_\-\.]+/gi, 'Bearer [REDACTED]')
    .replace(/client_secret=[^&\s]+/gi, 'client_secret=[REDACTED]');
}

/**
 * Formats an error into the canonical structured ERROR REPORT
 */
export function formatErrorReport(err: AppError): string {
  const ts = err.timestamp || new Date().toISOString();
  const page = err.page || 'YouTube Studio';
  const operation = err.operation || 'System Operation';
  const code = err.code !== undefined && err.code !== '' ? String(err.code) : 'N/A';
  const status = err.httpStatus ? String(err.httpStatus) : 'N/A';
  const message = sanitizeMessage(err.message);
  const reqId = err.requestId || `req_${Date.now().toString(36)}`;
  const fix = err.suggestedFix || 'Please check your connection and retry the operation.';

  return [
    'ERROR REPORT',
    `Time: ${ts}`,
    `Page: ${page}`,
    `Operation: ${operation}`,
    `Error Code: ${code}`,
    `HTTP Status: ${status}`,
    `Message: ${message}`,
    `Request ID: ${reqId}`,
    `Suggested Fix: ${fix}`,
  ].join('\n');
}

/**
 * Safely copies error report to clipboard
 */
export async function copyErrorReportToClipboard(err: AppError): Promise<boolean> {
  const text = formatErrorReport(err);
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fallback
  }

  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    return true;
  } catch {
    return false;
  }
}
