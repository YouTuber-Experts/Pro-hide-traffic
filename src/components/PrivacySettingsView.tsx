import React, { useState } from 'react';
import { ShieldCheck, Check, AlertTriangle } from 'lucide-react';
import { PrivacySettingsRecord } from '../types';
import {
  StandardReferrerPolicy,
  REFERRER_POLICIES,
  validateDestinationUrl,
} from '../utils/privacyLogic';

interface PrivacySettingsViewProps {
  settings: PrivacySettingsRecord | null;
  onSaveSettings: (updates: Partial<PrivacySettingsRecord>) => Promise<void>;
}

export const PrivacySettingsView: React.FC<PrivacySettingsViewProps> = ({
  settings,
  onSaveSettings,
}) => {
  const [globalPolicy, setGlobalPolicy] = useState<StandardReferrerPolicy>(
    settings?.globalDefaultPolicy || 'strict-origin-when-cross-origin'
  );
  const [enforceHttpsOnly, setEnforceHttpsOnly] = useState<boolean>(
    settings?.enforceHttpsOnly ?? true
  );
  const [preventOpenRedirects, setPreventOpenRedirects] = useState<boolean>(
    settings?.preventOpenRedirects ?? true
  );
  const [requireRegisteredDomains, setRequireRegisteredDomains] = useState<boolean>(
    settings?.requireRegisteredDomains ?? true
  );
  const [stripQueryParametersOnCrossOrigin, setStripQueryParametersOnCrossOrigin] =
    useState<boolean>(settings?.stripQueryParametersOnCrossOrigin ?? true);

  const [saving, setSaving] = useState<boolean>(false);
  const [savedToast, setSavedToast] = useState<boolean>(false);

  // Interactive URL Security Validator Sandbox
  const [testUrlInput, setTestUrlInput] = useState<string>(
    'https://dca.com/login?redirect=https://untrusted.example.org'
  );

  const validationOutput = validateDestinationUrl(testUrlInput, {
    enforceHttpsOnly,
    preventOpenRedirects,
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavedToast(false);
    try {
      await onSaveSettings({
        globalDefaultPolicy: globalPolicy,
        enforceHttpsOnly,
        preventOpenRedirects,
        requireRegisteredDomains,
        stripQueryParametersOnCrossOrigin,
      });
      setSavedToast(true);
      setTimeout(() => setSavedToast(false), 2500);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <p className="text-xs text-slate-400 mb-1">
            W3C Referrer-Policy Standards · Zero-Spoofing Compliance · Open-Redirect Prevention
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100">
            Referrer Privacy & Security Settings
          </h1>
        </div>
        {savedToast && (
          <div className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400">
            <Check className="w-4 h-4" />
            Privacy settings saved to PostgreSQL
          </div>
        )}
      </div>

      {/* W3C Referrer-Policy Specification Matrix */}
      <form onSubmit={handleSave} className="space-y-6">
        <section className="bg-slate-900/90 border border-slate-800 rounded-lg p-6 space-y-5">
          <div>
            <h2 className="text-base font-semibold text-slate-100">
              1. Global Default Browser Referrer-Policy
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Select the baseline W3C standard policy applied when creating new websites or outbound links. All policies strictly adhere to browser security specifications without spoofing headers.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {REFERRER_POLICIES.map((pol) => {
              const isSelected = globalPolicy === pol.value;
              return (
                <label
                  key={pol.value}
                  className={`cursor-pointer border rounded-lg p-4 transition-colors block ${
                    isSelected
                      ? 'bg-blue-950/30 border-blue-500'
                      : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <input
                        type="radio"
                        name="globalReferrerPolicy"
                        value={pol.value}
                        checked={isSelected}
                        onChange={() => setGlobalPolicy(pol.value)}
                        className="text-blue-600 focus:ring-blue-500 bg-slate-900 border-slate-700"
                      />
                      <span className="font-mono font-bold text-sm text-slate-100">
                        {pol.label}
                      </span>
                    </div>
                    <span className="text-xs text-slate-400">
                      Privacy: {pol.privacyLevel}
                    </span>
                  </div>

                  <p className="mt-2 text-xs text-slate-300 leading-relaxed">
                    {pol.summary}
                  </p>

                  <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-1 text-xs font-mono">
                    <div className="flex justify-between text-slate-400">
                      <span>Cross-Origin (HTTPS→HTTPS):</span>
                      <span className="text-slate-200">{pol.crossOriginHeader}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Same-Origin:</span>
                      <span className="text-slate-200">{pol.sameOriginHeader}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Protocol Downgrade (HTTPS→HTTP):</span>
                      <span className="text-emerald-400">{pol.downgradeHeader}</span>
                    </div>
                  </div>
                </label>
              );
            })}
          </div>
        </section>

        {/* Security & Transport Guardrails */}
        <section className="bg-slate-900/90 border border-slate-800 rounded-lg p-6 space-y-5">
          <div>
            <h2 className="text-base font-semibold text-slate-100">
              2. Transport Security & Open-Redirect Guardrails
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Protect outbound traffic from unencrypted protocol downgrades, parameter injection, and unauthorized open redirects.
            </p>
          </div>

          <div className="divide-y divide-slate-800 text-sm">
            <label className="py-3.5 flex items-start justify-between gap-4 cursor-pointer">
              <div>
                <div className="font-medium text-slate-100">
                  Enforce Strict HTTPS Destination URLs
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  Reject any outbound link that targets an unencrypted http:// endpoint.
                </div>
              </div>
              <input
                type="checkbox"
                checked={enforceHttpsOnly}
                onChange={(e) => setEnforceHttpsOnly(e.target.checked)}
                className="mt-1 rounded border-slate-700 bg-slate-950 text-blue-600 focus:ring-blue-500"
              />
            </label>

            <label className="py-3.5 flex items-start justify-between gap-4 cursor-pointer">
              <div>
                <div className="font-medium text-slate-100">
                  Block Chained Open-Redirect Query Parameters
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  Automatically inspect query strings and block parameters such as ?redirect=, ?next=, or ?url= pointing to external origins.
                </div>
              </div>
              <input
                type="checkbox"
                checked={preventOpenRedirects}
                onChange={(e) => setPreventOpenRedirects(e.target.checked)}
                className="mt-1 rounded border-slate-700 bg-slate-950 text-blue-600 focus:ring-blue-500"
              />
            </label>

            <label className="py-3.5 flex items-start justify-between gap-4 cursor-pointer">
              <div>
                <div className="font-medium text-slate-100">
                  Require Registered Domain Topology Verification
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  Verify source and intermediate bridge domains against your workspace domain registry.
                </div>
              </div>
              <input
                type="checkbox"
                checked={requireRegisteredDomains}
                onChange={(e) => setRequireRegisteredDomains(e.target.checked)}
                className="mt-1 rounded border-slate-700 bg-slate-950 text-blue-600 focus:ring-blue-500"
              />
            </label>

            <label className="py-3.5 flex items-start justify-between gap-4 cursor-pointer">
              <div>
                <div className="font-medium text-slate-100">
                  Strip Sensitive Session Query Tokens on Cross-Origin Transit
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  Ensure internal session identifiers or path tokens from source websites (e.g. ABC.com) are never forwarded in referrer headers.
                </div>
              </div>
              <input
                type="checkbox"
                checked={stripQueryParametersOnCrossOrigin}
                onChange={(e) => setStripQueryParametersOnCrossOrigin(e.target.checked)}
                className="mt-1 rounded border-slate-700 bg-slate-950 text-blue-600 focus:ring-blue-500"
              />
            </label>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-800">
            <div className="text-xs text-slate-400">
              Standards Compliance: W3C Referrer Policy Level 1 · Zero Header Spoofing
            </div>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-500 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving Policy...' : 'Save Privacy Configuration'}
            </button>
          </div>
        </section>
      </form>

      {/* Interactive URL Security & Open-Redirect Validator Sandbox */}
      <section className="bg-slate-900/90 border border-slate-800 rounded-lg p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold text-slate-100">
              3. Live URL Validation & Open-Redirect Sandbox
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Test how the platform validates destination URLs against open-redirect exploits and insecure protocols.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setTestUrlInput('https://dca.com/campaigns/exclusive-membership')}
              className="px-2.5 py-1 text-xs font-mono bg-slate-800 hover:bg-slate-700 text-slate-200 rounded transition-colors"
            >
              Test Valid HTTPS
            </button>
            <button
              type="button"
              onClick={() =>
                setTestUrlInput('https://dca.com/login?redirect=https://phishing.example.com')
              }
              className="px-2.5 py-1 text-xs font-mono bg-slate-800 hover:bg-slate-700 text-amber-300 rounded transition-colors"
            >
              Test Open-Redirect Exploit
            </button>
            <button
              type="button"
              onClick={() => setTestUrlInput('http://dca.com/unencrypted-endpoint')}
              className="px-2.5 py-1 text-xs font-mono bg-slate-800 hover:bg-slate-700 text-red-300 rounded transition-colors"
            >
              Test Insecure HTTP
            </button>
          </div>
        </div>

        <div>
          <label htmlFor="sandbox-url-input" className="block text-xs text-slate-300 mb-1.5">
            Candidate Destination URL
          </label>
          <input
            id="sandbox-url-input"
            type="text"
            value={testUrlInput}
            onChange={(e) => setTestUrlInput(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-xs font-mono text-slate-100 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div
          className={`rounded-lg border p-4 text-xs ${
            validationOutput.valid
              ? 'bg-emerald-950/30 border-emerald-800/80 text-emerald-200'
              : 'bg-red-950/40 border-red-800/80 text-red-200'
          }`}
        >
          <div className="font-semibold flex items-center gap-2">
            {validationOutput.valid ? (
              <>
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                URL Passed Security & Referrer Compliance Validation
              </>
            ) : (
              <>
                <AlertTriangle className="w-4 h-4 text-red-400" />
                Blocked by URL Security Guardrail
              </>
            )}
          </div>
          <div className="mt-1.5 font-mono">
            {validationOutput.valid
              ? `Normalized Target: ${validationOutput.normalizedUrl} · Verified Host: ${validationOutput.domain}`
              : `Reason: ${validationOutput.error}`}
          </div>
        </div>
      </section>
    </div>
  );
};
