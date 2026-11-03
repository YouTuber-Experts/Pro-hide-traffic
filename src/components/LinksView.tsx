import React, { useState, useMemo, useEffect } from 'react';
import {
  Plus,
  Search,
  ArrowRight,
  Copy,
  Check,
  Edit3,
  Trash2,
  Code2,
  Power,
  X,
} from 'lucide-react';
import { OutboundLinkRecord, WebsiteRecord } from '../types';
import {
  StandardReferrerPolicy,
  REFERRER_POLICIES,
  validateDestinationUrl,
  generateOutboundLinkArtifacts,
  computeMultiHopFlow,
} from '../utils/privacyLogic';

interface LinksViewProps {
  links: OutboundLinkRecord[];
  websites: WebsiteRecord[];
  initialPrefill?: {
    sourceDomain: string;
    intermediateDomain: string | null;
    destinationUrl: string;
    referrerPolicy: StandardReferrerPolicy;
  } | null;
  onClearPrefill?: () => void;
  onCreateLink: (data: {
    title: string;
    slug?: string;
    sourceDomain: string;
    intermediateDomain: string | null;
    destinationUrl: string;
    referrerPolicy: StandardReferrerPolicy;
  }) => Promise<void>;
  onUpdateLink: (
    id: number,
    updates: Partial<{
      title: string;
      sourceDomain: string;
      intermediateDomain: string | null;
      destinationUrl: string;
      referrerPolicy: StandardReferrerPolicy;
      status: 'active' | 'disabled';
    }>
  ) => Promise<void>;
  onDeleteLink: (id: number) => Promise<void>;
  onSimulateClick: (linkId: number) => Promise<void>;
}

export const LinksView: React.FC<LinksViewProps> = ({
  links,
  websites,
  initialPrefill,
  onClearPrefill,
  onCreateLink,
  onUpdateLink,
  onDeleteLink,
  onSimulateClick,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'disabled'>('all');
  const [policyFilter, setPolicyFilter] = useState<'all' | StandardReferrerPolicy>('all');

  const [showForm, setShowForm] = useState<boolean>(false);
  const [editingLink, setEditingLink] = useState<OutboundLinkRecord | null>(null);
  const [inspectingLink, setInspectingLink] = useState<OutboundLinkRecord | null>(null);

  const [titleInput, setTitleInput] = useState<string>('');
  const [slugInput, setSlugInput] = useState<string>('');
  const [sourceDomain, setSourceDomain] = useState<string>('abc.com');
  const [intermediateDomain, setIntermediateDomain] = useState<string>('bca.com');
  const [destinationUrl, setDestinationUrl] = useState<string>('');
  const [referrerPolicy, setReferrerPolicy] = useState<StandardReferrerPolicy>('no-referrer');
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    if (initialPrefill) {
      setEditingLink(null);
      setTitleInput(
        `${initialPrefill.sourceDomain.toUpperCase()} → ${
          initialPrefill.intermediateDomain
            ? `${initialPrefill.intermediateDomain.toUpperCase()} → `
            : ''
        }Destination Campaign`
      );
      setSlugInput('');
      setSourceDomain(initialPrefill.sourceDomain);
      setIntermediateDomain(initialPrefill.intermediateDomain || 'none');
      setDestinationUrl(initialPrefill.destinationUrl);
      setReferrerPolicy(initialPrefill.referrerPolicy);
      setShowForm(true);
      onClearPrefill?.();
    }
  }, [initialPrefill, onClearPrefill]);

  const filteredLinks = useMemo(() => {
    return links.filter((link) => {
      if (statusFilter !== 'all' && link.status !== statusFilter) return false;
      if (policyFilter !== 'all' && link.referrerPolicy !== policyFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          link.title.toLowerCase().includes(q) ||
          link.slug.toLowerCase().includes(q) ||
          link.sourceDomain.toLowerCase().includes(q) ||
          (link.intermediateDomain || '').toLowerCase().includes(q) ||
          link.destinationDomain.toLowerCase().includes(q) ||
          link.destinationUrl.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [links, statusFilter, policyFilter, searchQuery]);

  const handleOpenNew = () => {
    setEditingLink(null);
    setTitleInput('');
    setSlugInput('');
    setSourceDomain(websites.find((w) => w.trafficRole === 'source')?.domain || 'abc.com');
    setIntermediateDomain(
      websites.find((w) => w.trafficRole === 'intermediate')?.domain || 'bca.com'
    );
    setDestinationUrl('https://dca.com/special-offer');
    setReferrerPolicy('no-referrer');
    setFormError(null);
    setShowForm(true);
  };

  const handleOpenEdit = (link: OutboundLinkRecord) => {
    setEditingLink(link);
    setTitleInput(link.title);
    setSlugInput(link.slug);
    setSourceDomain(link.sourceDomain);
    setIntermediateDomain(link.intermediateDomain || 'none');
    setDestinationUrl(link.destinationUrl);
    setReferrerPolicy(link.referrerPolicy);
    setFormError(null);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!titleInput.trim()) {
      setFormError('Link campaign title is required.');
      return;
    }

    const urlValidation = validateDestinationUrl(destinationUrl, {
      enforceHttpsOnly: true,
      preventOpenRedirects: true,
    });
    if (!urlValidation.valid || !urlValidation.normalizedUrl) {
      setFormError(urlValidation.error || 'Destination URL failed security validation.');
      return;
    }

    setSubmitting(true);
    try {
      if (editingLink) {
        await onUpdateLink(editingLink.id, {
          title: titleInput.trim(),
          sourceDomain,
          intermediateDomain: intermediateDomain === 'none' ? null : intermediateDomain,
          destinationUrl: urlValidation.normalizedUrl,
          referrerPolicy,
        });
      } else {
        await onCreateLink({
          title: titleInput.trim(),
          slug: slugInput.trim() || undefined,
          sourceDomain,
          intermediateDomain: intermediateDomain === 'none' ? null : intermediateDomain,
          destinationUrl: urlValidation.normalizedUrl,
          referrerPolicy,
        });
      }
      setShowForm(false);
      setEditingLink(null);
    } catch (err: any) {
      setFormError(err.message || 'Failed to save outbound link.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyText = (key: string, text: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedField(key);
    setTimeout(() => setCopiedField(null), 1800);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <p className="text-xs text-slate-400 mb-1">
            Outbound Link Governance · Open-Redirect Protection · W3C Referrer-Policy Controls
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100">
            Outbound Link Management
          </h1>
        </div>
        <button
          type="button"
          onClick={handleOpenNew}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-500 transition-colors whitespace-nowrap shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          New Outbound Link
        </button>
      </div>

      {/* Create / Edit Link Panel */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-slate-900 border border-slate-800 rounded-lg p-6 space-y-4"
        >
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h2 className="text-sm font-semibold text-slate-100">
              {editingLink
                ? `Edit Outbound Link: ${editingLink.title}`
                : 'Create Privacy-Configured Outbound Link'}
            </h2>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setEditingLink(null);
              }}
              aria-label="Close link form"
              className="text-slate-400 hover:text-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {formError && (
            <div
              role="alert"
              className="bg-red-950/60 border border-red-800 text-red-200 text-xs rounded-lg px-4 py-2.5"
            >
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label
                htmlFor="link-title-input"
                className="block text-xs font-medium text-slate-300 mb-1.5"
              >
                Link Campaign Title
              </label>
              <input
                id="link-title-input"
                type="text"
                value={titleInput}
                onChange={(e) => setTitleInput(e.target.value)}
                placeholder="e.g. ABC Banner -> BCA Relay -> DCA Promo"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label
                htmlFor="link-source-select"
                className="block text-xs font-medium text-slate-300 mb-1.5"
              >
                Source Website (Origin)
              </label>
              <select
                id="link-source-select"
                value={sourceDomain}
                onChange={(e) => setSourceDomain(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-blue-500"
              >
                {websites.map((w) => (
                  <option key={w.id} value={w.domain}>
                    {w.domain} ({w.trafficRole})
                  </option>
                ))}
                {!websites.some((w) => w.domain === 'abc.com') && (
                  <option value="abc.com">abc.com (source)</option>
                )}
              </select>
            </div>

            <div>
              <label
                htmlFor="link-intermediate-select"
                className="block text-xs font-medium text-slate-300 mb-1.5"
              >
                Intermediate Website (Bridge)
              </label>
              <select
                id="link-intermediate-select"
                value={intermediateDomain}
                onChange={(e) => setIntermediateDomain(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-blue-500"
              >
                <option value="none">Direct (No Intermediate Website)</option>
                {websites.map((w) => (
                  <option key={w.id} value={w.domain}>
                    {w.domain} ({w.trafficRole})
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label
                htmlFor="link-destination-input"
                className="block text-xs font-medium text-slate-300 mb-1.5"
              >
                Destination URL (HTTPS Validated · Open-Redirect Protected)
              </label>
              <input
                id="link-destination-input"
                type="text"
                value={destinationUrl}
                onChange={(e) => setDestinationUrl(e.target.value)}
                placeholder="https://dca.com/campaigns/summer-offer"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label
                htmlFor="link-policy-select"
                className="block text-xs font-medium text-slate-300 mb-1.5"
              >
                W3C Referrer-Policy
              </label>
              <select
                id="link-policy-select"
                value={referrerPolicy}
                onChange={(e) => setReferrerPolicy(e.target.value as StandardReferrerPolicy)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-blue-500"
              >
                {REFERRER_POLICIES.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label} ({p.privacyLevel})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setEditingLink(null);
              }}
              className="px-4 py-2 text-xs font-medium text-slate-300 bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-500 disabled:opacity-50 transition-colors"
            >
              {submitting
                ? 'Saving...'
                : editingLink
                ? 'Save Link Changes'
                : 'Generate Privacy Link'}
            </button>
          </div>
        </form>
      )}

      {/* Search & Filter Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            aria-label="Search outbound links"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title, slug, source, or destination domain..."
            className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Status Segmented Control */}
          <div className="inline-flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-lg">
            {(
              [
                { id: 'all', label: `All (${links.length})` },
                {
                  id: 'active',
                  label: `Active (${links.filter((l) => l.status === 'active').length})`,
                },
                {
                  id: 'disabled',
                  label: `Disabled (${links.filter((l) => l.status === 'disabled').length})`,
                },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  statusFilter === tab.id
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Policy Filter Select */}
          <select
            aria-label="Filter by Referrer Policy"
            value={policyFilter}
            onChange={(e) => setPolicyFilter(e.target.value as 'all' | StandardReferrerPolicy)}
            className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-blue-500"
          >
            <option value="all">All Referrer Policies</option>
            {REFERRER_POLICIES.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Links Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-xs text-slate-400 bg-slate-950/50">
                <th className="py-3 px-4 font-medium">Outbound Link & Route Topology</th>
                <th className="py-3 px-4 font-medium">Referrer-Policy</th>
                <th className="py-3 px-4 font-medium text-right">Clicks / CTR</th>
                <th className="py-3 px-4 font-medium">Created</th>
                <th className="py-3 px-4 font-medium">Status</th>
                <th className="py-3 px-4 font-medium text-right">Controls</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-sm">
              {filteredLinks.map((link) => {
                const ctr =
                  link.impressions > 0
                    ? ((link.totalClicks / link.impressions) * 100).toFixed(2)
                    : '0.00';

                return (
                  <tr key={link.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-slate-100">{link.title}</div>
                      <div className="mt-1 flex items-center gap-1.5 text-xs font-mono text-slate-400 flex-wrap">
                        <span>{link.sourceDomain}</span>
                        <ArrowRight className="w-3 h-3 text-slate-500" />
                        {link.intermediateDomain && (
                          <>
                            <span className="text-blue-300">{link.intermediateDomain}</span>
                            <ArrowRight className="w-3 h-3 text-slate-500" />
                          </>
                        )}
                        <span className="text-emerald-300">{link.destinationDomain}</span>
                        <span className="text-slate-600">·</span>
                        <span className="text-slate-500">/go/{link.slug}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <select
                        aria-label={`Referrer policy for ${link.title}`}
                        value={link.referrerPolicy}
                        onChange={(e) =>
                          onUpdateLink(link.id, {
                            referrerPolicy: e.target.value as StandardReferrerPolicy,
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

                    <td className="py-3.5 px-4 text-right font-mono tabular-nums">
                      <div className="text-slate-100 font-medium">
                        {link.totalClicks.toLocaleString()}
                      </div>
                      <div className="text-xs text-slate-400">
                        {link.uniqueVisitors.toLocaleString()} uniq · {ctr}% CTR
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-xs font-mono tabular-nums text-slate-400">
                      {new Date(link.createdAt || Date.now()).toISOString().slice(0, 10)}
                    </td>

                    <td className="py-3.5 px-4 text-xs">
                      <button
                        type="button"
                        aria-label={`Toggle status for ${link.title}`}
                        onClick={() =>
                          onUpdateLink(link.id, {
                            status: link.status === 'active' ? 'disabled' : 'active',
                          })
                        }
                        className={`inline-flex items-center gap-1.5 font-medium transition-colors ${
                          link.status === 'active'
                            ? 'text-emerald-400 hover:text-emerald-300'
                            : 'text-slate-500 hover:text-slate-300'
                        }`}
                      >
                        <Power className="w-3.5 h-3.5" />
                        {link.status === 'active' ? 'Active (Enabled)' : 'Disabled'}
                      </button>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setInspectingLink(link)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-blue-300 bg-blue-950/60 border border-blue-800/60 hover:bg-blue-900/50 rounded transition-colors whitespace-nowrap"
                        >
                          <Code2 className="w-3.5 h-3.5" />
                          Code & Gateway
                        </button>
                        <button
                          type="button"
                          onClick={() => onSimulateClick(link.id)}
                          disabled={link.status !== 'active'}
                          className="px-2.5 py-1 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 rounded transition-colors whitespace-nowrap"
                        >
                          +1 Click
                        </button>
                        <button
                          type="button"
                          aria-label={`Edit ${link.title}`}
                          onClick={() => handleOpenEdit(link)}
                          className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded transition-colors"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          aria-label={`Delete ${link.title}`}
                          onClick={() => onDeleteLink(link.id)}
                          className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-950/40 rounded transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredLinks.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-xs text-slate-400">
                    No outbound links match your active search or filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Outbound Link Code & Header Inspector Modal */}
      {inspectingLink && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="inspector-dialog-title"
          className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4"
        >
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-2xl w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <p className="text-xs text-blue-400 font-mono">
                  Outbound Privacy Integration Artifacts
                </p>
                <h2 id="inspector-dialog-title" className="text-lg font-bold text-slate-100 mt-0.5">
                  {inspectingLink.title}
                </h2>
              </div>
              <button
                type="button"
                aria-label="Close code inspector"
                onClick={() => setInspectingLink(null)}
                className="text-slate-400 hover:text-slate-100 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {(() => {
              const artifacts = generateOutboundLinkArtifacts({
                appOrigin: window.location.origin,
                slug: inspectingLink.slug,
                intermediateDomain: inspectingLink.intermediateDomain,
                destinationUrl: inspectingLink.destinationUrl,
                referrerPolicy: inspectingLink.referrerPolicy,
              });
              const flow = computeMultiHopFlow({
                sourceDomain: inspectingLink.sourceDomain,
                intermediateDomain: inspectingLink.intermediateDomain,
                destinationUrl: inspectingLink.destinationUrl,
                hop1Policy: 'no-referrer',
                linkPolicy: inspectingLink.referrerPolicy,
              });

              return (
                <div className="space-y-4 text-xs">
                  <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 space-y-1.5">
                    <div className="text-slate-400">
                      Effective HTTP Referer Header Sent to{' '}
                      <span className="font-mono text-slate-200">
                        {inspectingLink.destinationDomain}
                      </span>
                      :
                    </div>
                    <div className="font-mono text-emerald-300 text-sm">
                      {flow.refererSeenByDestination || 'Omitted (No Referer header transmitted)'}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-medium text-slate-300">
                        1. Standard HTML Anchor Tag (Recommended for {inspectingLink.sourceDomain})
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopyText('html', artifacts.htmlAnchor)}
                        className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300"
                      >
                        {copiedField === 'html' ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            Copy Snippet
                          </>
                        )}
                      </button>
                    </div>
                    <pre className="bg-slate-950 border border-slate-800 rounded-lg p-3 font-mono text-slate-200 overflow-x-auto">
                      {artifacts.htmlAnchor}
                    </pre>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-medium text-slate-300">
                        2. Privacy Gateway Transit URL
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopyText('url', artifacts.gatewayUrl)}
                        className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300"
                      >
                        {copiedField === 'url' ? 'Copied' : 'Copy URL'}
                      </button>
                    </div>
                    <pre className="bg-slate-950 border border-slate-800 rounded-lg p-3 font-mono text-blue-300 overflow-x-auto">
                      {artifacts.gatewayUrl}
                    </pre>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <span className="block font-medium text-slate-300 mb-1.5">
                        3. HTTP Response Header
                      </span>
                      <pre className="bg-slate-950 border border-slate-800 rounded-lg p-3 font-mono text-slate-200 overflow-x-auto">
                        {artifacts.httpHeader}
                      </pre>
                    </div>
                    <div>
                      <span className="block font-medium text-slate-300 mb-1.5">
                        4. Document Meta Tag
                      </span>
                      <pre className="bg-slate-950 border border-slate-800 rounded-lg p-3 font-mono text-slate-200 overflow-x-auto">
                        {artifacts.metaTag}
                      </pre>
                    </div>
                  </div>
                </div>
              );
            })()}

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setInspectingLink(null)}
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-500 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
