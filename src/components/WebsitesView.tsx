import React, { useState, useMemo } from 'react';
import { Globe, Plus, Trash2, Shield, CheckCircle2 } from 'lucide-react';
import { WebsiteRecord } from '../types';
import {
  StandardReferrerPolicy,
  REFERRER_POLICIES,
  normalizeDomainInput,
} from '../utils/privacyLogic';

interface WebsitesViewProps {
  websites: WebsiteRecord[];
  onAddWebsite: (data: {
    domain: string;
    label: string;
    trafficRole: 'source' | 'intermediate' | 'destination';
    defaultPolicy: StandardReferrerPolicy;
    httpsEnforced: boolean;
  }) => Promise<void>;
  onUpdateWebsite: (
    id: number,
    updates: Partial<{
      label: string;
      trafficRole: 'source' | 'intermediate' | 'destination';
      defaultPolicy: StandardReferrerPolicy;
      httpsEnforced: boolean;
      status: 'active' | 'paused';
    }>
  ) => Promise<void>;
  onDeleteWebsite: (id: number) => Promise<void>;
}

const ROLE_LABELS: Record<'source' | 'intermediate' | 'destination', string> = {
  source: 'Original Source (e.g. ABC.com)',
  intermediate: 'Intermediate Bridge (e.g. BCA.com)',
  destination: 'Final Destination (e.g. DCA.com)',
};

export const WebsitesView: React.FC<WebsitesViewProps> = ({
  websites,
  onAddWebsite,
  onUpdateWebsite,
  onDeleteWebsite,
}) => {
  const [roleFilter, setRoleFilter] = useState<'all' | 'source' | 'intermediate' | 'destination'>(
    'all'
  );
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [domainInput, setDomainInput] = useState<string>('');
  const [labelInput, setLabelInput] = useState<string>('');
  const [trafficRole, setTrafficRole] = useState<'source' | 'intermediate' | 'destination'>(
    'source'
  );
  const [defaultPolicy, setDefaultPolicy] = useState<StandardReferrerPolicy>(
    'strict-origin-when-cross-origin'
  );
  const [httpsEnforced, setHttpsEnforced] = useState<boolean>(true);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const filteredWebsites = useMemo(() => {
    if (roleFilter === 'all') return websites;
    return websites.filter((w) => w.trafficRole === roleFilter);
  }, [websites, roleFilter]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const domainCheck = normalizeDomainInput(domainInput);
    if (!domainCheck.valid || !domainCheck.domain) {
      setFormError(domainCheck.error || 'Enter a valid domain name (e.g. media-portal.com).');
      return;
    }

    if (!labelInput.trim()) {
      setFormError('Enter a descriptive website label.');
      return;
    }

    setSubmitting(true);
    try {
      await onAddWebsite({
        domain: domainCheck.domain,
        label: labelInput.trim(),
        trafficRole,
        defaultPolicy,
        httpsEnforced,
      });
      setDomainInput('');
      setLabelInput('');
      setShowAddForm(false);
    } catch (err: any) {
      setFormError(err.message || 'Failed to add website.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <p className="text-xs text-slate-400 mb-1">
            Centralized Domain Registry · Per-Domain Referrer Policy Defaults
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100">
            Website & Domain Management
          </h1>
        </div>
        <button
          type="button"
          onClick={() => setShowAddForm((prev) => !prev)}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-500 transition-colors whitespace-nowrap shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          {showAddForm ? 'Cancel' : 'Add Website Domain'}
        </button>
      </div>

      {/* Add Website Form Panel */}
      {showAddForm && (
        <form
          onSubmit={handleCreate}
          className="bg-slate-900 border border-slate-800 rounded-lg p-6 space-y-4"
        >
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h2 className="text-sm font-semibold text-slate-100">
              Register New Domain in Traffic Network
            </h2>
            <span className="text-xs text-slate-400">HTTPS Verification Enabled</span>
          </div>

          {formError && (
            <div
              role="alert"
              className="bg-red-950/60 border border-red-800 text-red-200 text-xs rounded-lg px-4 py-2.5"
            >
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label
                htmlFor="new-website-domain"
                className="block text-xs font-medium text-slate-300 mb-1.5"
              >
                Domain Name
              </label>
              <input
                id="new-website-domain"
                type="text"
                value={domainInput}
                onChange={(e) => setDomainInput(e.target.value)}
                placeholder="e.g. gateway-hub.net"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label
                htmlFor="new-website-label"
                className="block text-xs font-medium text-slate-300 mb-1.5"
              >
                Website Label / Description
              </label>
              <input
                id="new-website-label"
                type="text"
                value={labelInput}
                onChange={(e) => setLabelInput(e.target.value)}
                placeholder="e.g. Regional Transit Portal"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label
                htmlFor="new-website-role"
                className="block text-xs font-medium text-slate-300 mb-1.5"
              >
                Traffic Architecture Role
              </label>
              <select
                id="new-website-role"
                value={trafficRole}
                onChange={(e) =>
                  setTrafficRole(e.target.value as 'source' | 'intermediate' | 'destination')
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
              >
                <option value="source">Original Source (e.g. ABC.com)</option>
                <option value="intermediate">Intermediate Bridge (e.g. BCA.com)</option>
                <option value="destination">Final Destination (e.g. DCA.com)</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="new-website-policy"
                className="block text-xs font-medium text-slate-300 mb-1.5"
              >
                Default Referrer-Policy
              </label>
              <select
                id="new-website-policy"
                value={defaultPolicy}
                onChange={(e) => setDefaultPolicy(e.target.value as StandardReferrerPolicy)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-blue-500"
              >
                {REFERRER_POLICIES.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
            <label className="inline-flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={httpsEnforced}
                onChange={(e) => setHttpsEnforced(e.target.checked)}
                className="rounded border-slate-700 bg-slate-950 text-blue-600 focus:ring-blue-500"
              />
              Enforce strict HTTPS transport for all links associated with this domain
            </label>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 text-xs font-medium text-slate-300 bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-500 disabled:opacity-50 transition-colors"
              >
                {submitting ? 'Registering...' : 'Register Website'}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Segmented Filter Control */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="inline-flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-lg">
          {(
            [
              { id: 'all', label: `All Domains (${websites.length})` },
              {
                id: 'source',
                label: `Original Sources (${websites.filter((w) => w.trafficRole === 'source').length})`,
              },
              {
                id: 'intermediate',
                label: `Intermediate Bridges (${websites.filter((w) => w.trafficRole === 'intermediate').length})`,
              },
              {
                id: 'destination',
                label: `Final Destinations (${websites.filter((w) => w.trafficRole === 'destination').length})`,
              },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setRoleFilter(tab.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                roleFilter === tab.id
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="text-xs text-slate-400">
          Each domain can enforce an independent default W3C Referrer-Policy.
        </div>
      </div>

      {/* Websites Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-xs text-slate-400 bg-slate-950/50">
                <th className="py-3 px-4 font-medium">Domain & Description</th>
                <th className="py-3 px-4 font-medium">Traffic Flow Role</th>
                <th className="py-3 px-4 font-medium">Default Referrer-Policy</th>
                <th className="py-3 px-4 font-medium">HTTPS Enforcement</th>
                <th className="py-3 px-4 font-medium">Added Date</th>
                <th className="py-3 px-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-sm">
              {filteredWebsites.map((site) => (
                <tr key={site.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="font-mono font-semibold text-slate-100">
                      https://{site.domain}
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">{site.label}</div>
                  </td>

                  <td className="py-3.5 px-4 text-xs text-slate-300">
                    <select
                      aria-label={`Traffic role for ${site.domain}`}
                      value={site.trafficRole}
                      onChange={(e) =>
                        onUpdateWebsite(site.id, {
                          trafficRole: e.target.value as
                            | 'source'
                            | 'intermediate'
                            | 'destination',
                        })
                      }
                      className="bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                    >
                      <option value="source">{ROLE_LABELS.source}</option>
                      <option value="intermediate">{ROLE_LABELS.intermediate}</option>
                      <option value="destination">{ROLE_LABELS.destination}</option>
                    </select>
                  </td>

                  <td className="py-3.5 px-4">
                    <select
                      aria-label={`Default referrer policy for ${site.domain}`}
                      value={site.defaultPolicy}
                      onChange={(e) =>
                        onUpdateWebsite(site.id, {
                          defaultPolicy: e.target.value as StandardReferrerPolicy,
                        })
                      }
                      className="bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs font-mono text-blue-300 focus:outline-none focus:border-blue-500"
                    >
                      {REFERRER_POLICIES.map((p) => (
                        <option key={p.value} value={p.value}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                  </td>

                  <td className="py-3.5 px-4 text-xs">
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateWebsite(site.id, { httpsEnforced: !site.httpsEnforced })
                      }
                      className={`font-medium transition-colors ${
                        site.httpsEnforced
                          ? 'text-emerald-400 hover:text-emerald-300'
                          : 'text-amber-400 hover:text-amber-300'
                      }`}
                    >
                      {site.httpsEnforced ? 'HTTPS Strictly Enforced' : 'Standard Transport'}
                    </button>
                  </td>

                  <td className="py-3.5 px-4 text-xs font-mono tabular-nums text-slate-400">
                    {new Date(site.createdAt || Date.now()).toISOString().slice(0, 10)}
                  </td>

                  <td className="py-3.5 px-4 text-right">
                    <button
                      type="button"
                      aria-label={`Delete website ${site.domain}`}
                      onClick={() => onDeleteWebsite(site.id)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-red-400 hover:text-red-300 hover:bg-red-950/40 rounded transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
              {filteredWebsites.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-xs text-slate-400">
                    No websites registered in this role category yet. Click "Add Website Domain" above to register one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
