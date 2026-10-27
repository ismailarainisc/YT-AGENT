import React, { useState } from 'react';
import { X, ExternalLink, Copy, Check, ShieldCheck, Key, AlertCircle } from 'lucide-react';

interface SetupWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  redirectUri: string;
  onCredentialsSaved: () => void;
}

export const SetupWizardModal: React.FC<SetupWizardModalProps> = ({
  isOpen,
  onClose,
  redirectUri,
  onCredentialsSaved,
}) => {
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [activeStep, setActiveStep] = useState(1);

  if (!isOpen) return null;

  const handleCopyUri = () => {
    navigator.clipboard.writeText(redirectUri);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId.trim() || !clientSecret.trim()) {
      setError('Please provide both Client ID and Client Secret.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/setup/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: clientId.trim(), clientSecret: clientSecret.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save credentials');

      setSuccess(true);
      onCredentialsSaved();
      if (data.authUrl) {
        setTimeout(() => {
          window.location.href = data.authUrl;
        }, 800);
      } else {
        setTimeout(() => {
          onClose();
          setSuccess(false);
        }, 1500);
      }
    } catch (err: any) {
      setError(err.message || 'Error saving credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-600/10 border border-red-500/20 flex items-center justify-center text-red-500">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">Google Cloud OAuth Setup Wizard</h2>
              <p className="text-xs text-zinc-400">Connect your real personal YouTube account safely</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Selector */}
        <div className="flex items-center border-b border-zinc-800 bg-zinc-950/40 px-6 py-2.5 gap-2 overflow-x-auto text-xs">
          {[
            { num: 1, label: 'Enable API' },
            { num: 2, label: 'OAuth Consent' },
            { num: 3, label: 'Redirect URI' },
            { num: 4, label: 'Save Credentials' },
          ].map((s) => (
            <button
              key={s.num}
              onClick={() => setActiveStep(s.num)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-medium transition-all ${
                activeStep === s.num
                  ? 'bg-zinc-800 text-white shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
              }`}
            >
              <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                activeStep === s.num ? 'bg-red-600 text-white font-bold' : 'bg-zinc-800 text-zinc-400'
              }`}>
                {s.num}
              </span>
              <span>{s.label}</span>
            </button>
          ))}
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-sm">
          {activeStep === 1 && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800/80 space-y-2">
                <span className="text-xs font-semibold text-red-400 uppercase tracking-wider">Step 1 of 4</span>
                <h3 className="text-base font-semibold text-white">Enable YouTube Data API v3 in Your Project</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Google requires that YouTube Data API v3 is activated inside your Google Cloud project (where you are the Owner).
                </p>
              </div>

              <div className="space-y-2.5 text-zinc-300 text-xs leading-relaxed">
                <p>1. Open Google Cloud Console with your personal Google account (<strong className="text-white">ismail221210@gmail.com</strong>).</p>
                <p>
                  2. Make sure you select your own personal project (or click <strong>Create Free Project</strong> below if you don&apos;t have one yet). <em>Do not select the internal hosting project integral-planet-xn2tx.</em>
                </p>
                <p>3. In your personal project, click the blue <strong>ENABLE</strong> button.</p>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <a
                  href="https://console.cloud.google.com/apis/library/youtube.googleapis.com"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-medium text-xs transition-colors shadow-sm"
                >
                  <span>Enable YouTube Data API v3 (Official Library)</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>

                <a
                  href="https://console.cloud.google.com/projectcreate"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium text-xs transition-colors border border-zinc-700"
                >
                  <span>Create Free Project (1-Click)</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          )}

          {activeStep === 2 && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800/80 space-y-2">
                <span className="text-xs font-semibold text-red-400 uppercase tracking-wider">Step 2 of 4</span>
                <h3 className="text-base font-semibold text-white">Configure OAuth Consent Screen</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Configure the consent screen that appears when you click "Connect with YouTube".
                </p>
              </div>

              <div className="space-y-2 text-zinc-300 text-xs leading-relaxed">
                <p>1. Go to <strong>APIs & Services &gt; OAuth consent screen</strong>.</p>
                <p>2. Choose <strong>External</strong> User Type.</p>
                <p>3. Enter App name: <code className="text-zinc-100 bg-zinc-800 px-1.5 py-0.5 rounded">YouTube AI Agent</code>.</p>
                <p>4. Under <strong>Test Users</strong>, add your own personal Google email address.</p>
              </div>

              <a
                href="https://console.cloud.google.com/apis/credentials/consent"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-medium text-xs transition-colors border border-zinc-700"
              >
                <span>Open OAuth Consent Screen</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}

          {activeStep === 3 && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800/80 space-y-2">
                <span className="text-xs font-semibold text-red-400 uppercase tracking-wider">Step 3 of 4</span>
                <h3 className="text-base font-semibold text-white">Add Authorized Redirect URI</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Google requires an exact match for the redirect callback URL to prevent security spoofing.
                </p>
              </div>

              <div className="space-y-2 text-zinc-300 text-xs">
                <p>Under <strong>Credentials &gt; Create Credentials &gt; OAuth client ID</strong>:</p>
                <p>• Application Type: <strong>Web application</strong></p>
                <p>• Name: <code className="text-zinc-100 bg-zinc-800 px-1.5 py-0.5 rounded">YouTube Agent Web Client</code></p>
                <p>• <strong>Authorized redirect URIs</strong>: Paste the exact URL below:</p>
              </div>

              <div className="flex items-center justify-between gap-2 p-3 bg-zinc-950 border border-zinc-800 rounded-xl">
                <code className="text-xs text-red-400 font-mono break-all select-all">{redirectUri}</code>
                <button
                  type="button"
                  onClick={handleCopyUri}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-200 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors shrink-0"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              <a
                href="https://console.cloud.google.com/apis/credentials"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-medium text-xs transition-colors border border-zinc-700"
              >
                <span>Open Google Credentials Console</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}

          {activeStep === 4 && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800/80 space-y-2">
                <span className="text-xs font-semibold text-red-400 uppercase tracking-wider">Step 4 of 4</span>
                <h3 className="text-base font-semibold text-white">Save Google Credentials</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Credentials are encrypted at rest inside SQLite with AES-256-GCM. Never exposed in frontend bundles.
                </p>
              </div>

              {error && (
                <div className="flex items-center gap-2.5 p-3 rounded-xl bg-red-950/50 border border-red-800 text-red-200 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {success && (
                <div className="flex items-center gap-2.5 p-3 rounded-xl bg-emerald-950/50 border border-emerald-800 text-emerald-200 text-xs">
                  <ShieldCheck className="w-4 h-4 shrink-0" />
                  <span>Credentials saved! You can now click "Connect with YouTube".</span>
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    Google OAuth Client ID
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 123456789-abcdef.apps.googleusercontent.com"
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-red-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    Google OAuth Client Secret
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="GOCSPX-..."
                    value={clientSecret}
                    onChange={(e) => setClientSecret(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-red-500 font-mono"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setActiveStep(3)}
                  className="px-4 py-2 text-xs font-medium text-zinc-400 hover:text-white transition-colors"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-medium transition-colors disabled:opacity-50 shadow-sm"
                >
                  {loading ? 'Encrypting & Saving...' : 'Save & Enable Connect'}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-zinc-800 bg-zinc-950/60 text-xs text-zinc-500">
          <span>Official YouTube Data API v3 OAuth Flow</span>
          <div className="flex items-center gap-2">
            {activeStep > 1 && (
              <button
                onClick={() => setActiveStep(activeStep - 1)}
                className="hover:text-zinc-300 underline"
              >
                Previous Step
              </button>
            )}
            {activeStep < 4 && (
              <button
                onClick={() => setActiveStep(activeStep + 1)}
                className="hover:text-zinc-300 font-medium text-red-400 underline"
              >
                Next Step
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
