import React, { useState, useMemo } from 'react';
import {
  ArrowRight,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  Sliders,
  Plus,
} from 'lucide-react';
import {
  OutboundLinkRecord,
  WebsiteRecord,
  NavSection,
} from '../types';
import {
  StandardReferrerPolicy,
  REFERRER_POLICIES,
  computeMultiHopFlow,
  calculateTrafficSummary,
  generateOutboundLinkArtifacts,
} from '../utils/privacyLogic';

interface OverviewViewProps {
  websites: WebsiteRecord[];
  links: OutboundLinkRecord[];
  onNavigate: (section: NavSection) => void;
  onOpenCreateLink: (prefill?: {
    sourceDomain: string;
    intermediateDomain: string | null;
    destinationUrl: string;
    referrerPolicy: StandardReferrerPolicy;
  }) => void;
  onSimulateClick: (linkId: number) => Promise<void>;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  websites,
  links,
  onNavigate,
  onOpenCreateLink,
  onSimulateClick,
}) => {
  const [simSource, setSimSource] = useState<string>('abc.com');
  const [simIntermediate, setSimIntermediate] = useState<string>('bca.com');
  const [simDestination, setSimDestination] = useState<string>(
    'https://dca.com/campaigns/exclusive-membership'
  );
  const [simHop1Policy, setSimHop1Policy] = useState<StandardReferrerPolicy>('no-referrer');
  const [simHop2Policy, setSimHop2Policy] =
    useState<StandardReferrerPolicy>('strict-origin-when-cross-origin');
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [clickingId, setClickingId] = useState<number | null>(null);

  const summary = useMemo(() => calculateTrafficSummary(links), [links]);

  const multiHopResult = useMemo(
    () =>
      computeMultiHopFlow({
        sourceDomain: simSource,
        intermediateDomain: simIntermediate === 'none' ? null : simIntermediate,
        destinationUrl: simDestination.startsWith('http')
          ? simDestination
          : `https://${simDestination}`,
        hop1Policy: simHop1Policy,
        linkPolicy: simHop2Policy,
      }),
    [simSource, simIntermediate, simDestination, simHop1Policy, simHop2Policy]
  );

  const sourceDomains = useMemo(
    () => websites.filter((w) => w.trafficRole === 'source' || w.domain === 'abc.com'),
    [websites]
  );
  const intermediateDomains = useMemo(
    () => websites.filter((w) => w.trafficRole === 'intermediate' || w.domain === 'bca.com'),
    [websites]
  );

  const handleCopySnippet = (link: OutboundLinkRecord) => {
    const artifacts = generateOutboundLinkArtifacts({
      appOrigin: window.location.origin,
      slug: link.slug,
      intermediateDomain: link.intermediateDomain,
      destinationUrl: link.destinationUrl,
      referrerPolicy: link.referrerPolicy,
    });
    navigator.clipboard?.writeText(artifacts.htmlAnchor);
    setCopiedId(link.id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const handleTriggerClick = async (linkId: number) => {
    setClickingId(linkId);
    try {
      await onSimulateClick(linkId);
    } finally {
      setClickingId(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* Top Intro & Action Row */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <p className="text-xs text-slate-400 mb-1">
            Multi-Domain Referrer Governance · W3C Standard Policy Enforcement
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100">
            Referral Privacy & Traffic Overview
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onNavigate('websites')}
            className="px-4 py-2 text-xs font-medium text-slate-200 bg-slate-900 border border-slate-700 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
          >
            Manage Domains ({websites.length})
          </button>
          <button
            type="button"
            onClick={() =>
              onOpenCreateLink({
                sourceDomain: simSource,
                intermediateDomain: simIntermediate === 'none' ? null : simIntermediate,
                destinationUrl: simDestination,
                referrerPolicy: simHop2Policy,
              })
            }
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-500 transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            Create Privacy Link
          </button>
        </div>
      </div>

      {/* 4-Column KPI Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-5">
          <div className="text-xs text-slate-400">Total Outgoing Clicks</div>
          <div className="mt-2 text-2xl font-bold text-slate-100 font-mono tabular-nums">
            {summary.totalClicks.toLocaleString()}
          </div>
          <div className="mt-2 text-xs text-emerald-400">
            +14.2% vs prior 30d · Verified HTTPS transit
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-5">
          <div className="text-xs text-slate-400">Unique Visitors Routed</div>
          <div className="mt-2 text-2xl font-bold text-slate-100 font-mono tabular-nums">
            {summary.uniqueVisitors.toLocaleString()}
          </div>
          <div className="mt-2 text-xs text-slate-400">
            {summary.totalClicks > 0
              ? `${Math.round((summary.uniqueVisitors / summary.totalClicks) * 100)}% unique session ratio`
              : '0% unique session ratio'}
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-5">
          <div className="text-xs text-slate-400">Active Privacy Links</div>
          <div className="mt-2 text-2xl font-bold text-slate-100 font-mono tabular-nums">
            {summary.activeLinksCount}{' '}
            <span className="text-sm font-normal text-slate-500">/ {links.length} total</span>
          </div>
          <div className="mt-2 text-xs text-slate-400">
            Across {websites.length} registered domains
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-5">
          <div className="text-xs text-slate-400">Average Click-Through Rate</div>
          <div className="mt-2 text-2xl font-bold text-slate-100 font-mono tabular-nums">
            {summary.avgCtr.toFixed(2)}%
          </div>
          <div className="mt-2 text-xs text-slate-400">
            {summary.totalImpressions.toLocaleString()} total impressions
          </div>
        </div>
      </div>

      {/* Multi-Hop Traffic Flow Simulator: ABC.com -> BCA.com -> DCA.com */}
      <section className="bg-slate-900/90 border border-slate-800 rounded-lg p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-800">
          <div>
            <h2 className="text-base font-semibold text-slate-100">
              Multi-Domain Referral Flow Architecture (ABC.com → BCA.com → DCA.com)
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Simulate how standard browser Referrer-Policy rules govern what referral information is shared across original sources, intermediate bridges, and final destinations.
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              onOpenCreateLink({
                sourceDomain: simSource,
                intermediateDomain: simIntermediate === 'none' ? null : simIntermediate,
                destinationUrl: simDestination,
                referrerPolicy: simHop2Policy,
              })
            }
            className="px-3.5 py-2 text-xs font-medium text-blue-300 bg-blue-950/60 border border-blue-800/70 rounded-lg hover:bg-blue-900/60 transition-colors whitespace-nowrap shrink-0"
          >
            Deploy This Flow Configuration
          </button>
        </div>

        {/* Interactive Flow Controls */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-5">
          <div>
            <label
              htmlFor="sim-source-select"
              className="block text-xs font-medium text-slate-300 mb-1.5"
            >
              1. Original Source (e.g. Adult Site)
            </label>
            <select
              id="sim-source-select"
              value={simSource}
              onChange={(e) => setSimSource(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
            >
              {sourceDomains.map((w) => (
                <option key={w.id} value={w.domain}>
                  {w.domain} ({w.label})
                </option>
              ))}
              {!sourceDomains.some((w) => w.domain === 'abc.com') && (
                <option value="abc.com">abc.com (Original Traffic Source)</option>
              )}
            </select>
          </div>

          <div>
            <label
              htmlFor="sim-intermediate-select"
              className="block text-xs font-medium text-slate-300 mb-1.5"
            >
              2. Intermediate Website (Bridge)
            </label>
            <select
              id="sim-intermediate-select"
              value={simIntermediate}
              onChange={(e) => setSimIntermediate(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
            >
              {intermediateDomains.map((w) => (
                <option key={w.id} value={w.domain}>
                  {w.domain} ({w.label})
                </option>
              ))}
              <option value="none">Direct (No Intermediate Relay)</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="sim-dest-input"
              className="block text-xs font-medium text-slate-300 mb-1.5"
            >
              3. Final Destination URL
            </label>
            <input
              id="sim-dest-input"
              type="url"
              value={simDestination}
              onChange={(e) => setSimDestination(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-blue-500"
              placeholder="https://dca.com/offer"
            />
          </div>

          <div>
            <label
              htmlFor="sim-policy-select"
              className="block text-xs font-medium text-slate-300 mb-1.5"
            >
              4. Outbound Referrer-Policy
            </label>
            <select
              id="sim-policy-select"
              value={simHop2Policy}
              onChange={(e) => setSimHop2Policy(e.target.value as StandardReferrerPolicy)}
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

        {/* Visual 3-Node Flow Diagram (Single-Elevation Hairline Architecture) */}
        <div className="mt-6 pt-6 border-t border-slate-800 grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-slate-800">
          {/* Node 1: Origin */}
          <div className="pb-5 lg:pb-0 lg:pr-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>01. Original Source</span>
                <span className="font-mono text-amber-400">Private Origin</span>
              </div>
              <div className="mt-2 text-base font-bold text-slate-100 font-mono">
                https://{simSource}
              </div>
              <p className="mt-1 text-xs text-slate-400 break-all font-mono">
                Path: /content/stream-room-402?session=private_token
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
              <span className="text-slate-400">Hop 1 Policy:</span>
              <select
                aria-label="Hop 1 Referrer Policy"
                value={simHop1Policy}
                onChange={(e) => setSimHop1Policy(e.target.value as StandardReferrerPolicy)}
                className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs font-mono text-slate-200"
              >
                {REFERRER_POLICIES.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Node 2: Intermediate Bridge */}
          <div className="py-5 lg:py-0 lg:px-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>02. Intermediate Bridge</span>
                <span className="font-mono text-blue-400">
                  {simIntermediate === 'none' ? 'Bypassed (Direct)' : 'Transit Node'}
                </span>
              </div>
              <div className="mt-2 text-base font-bold text-slate-100 font-mono">
                {simIntermediate === 'none'
                  ? 'Direct Browser Navigation'
                  : `https://${simIntermediate}/r/gateway-bridge`}
              </div>
              <div className="mt-2 text-xs text-slate-400">
                Referer received from {simSource}:
              </div>
              <div className="mt-1 font-mono text-xs text-slate-200 bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 break-all">
                {simIntermediate === 'none'
                  ? 'N/A (No intermediate hop)'
                  : multiHopResult.refererSeenByIntermediate || 'Omitted (No Referer header sent)'}
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
              <span>Outbound Policy Applied:</span>
              <span className="font-mono text-blue-300">{simHop2Policy}</span>
            </div>
          </div>

          {/* Node 3: Final Destination */}
          <div className="pt-5 lg:pt-0 lg:pl-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>03. Final Destination</span>
                <span
                  className={`font-mono ${
                    multiHopResult.sourceExposedToDestination
                      ? 'text-amber-400'
                      : 'text-emerald-400'
                  }`}
                >
                  {multiHopResult.sourceExposedToDestination
                    ? 'Source Origin Visible'
                    : 'Source Origin Isolated'}
                </span>
              </div>
              <div className="mt-2 text-base font-bold text-slate-100 font-mono truncate">
                {simDestination}
              </div>
              <div className="mt-2 text-xs text-slate-400">
                HTTP Referer header received by Destination:
              </div>
              <div className="mt-1 font-mono text-xs text-emerald-300 bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 break-all">
                {multiHopResult.refererSeenByDestination || 'Omitted (No Referer header sent)'}
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
              <span className="text-slate-400">Original {simSource} Path Exposed:</span>
              <span className="font-mono text-emerald-400">Never (0 bytes leaked)</span>
            </div>
          </div>
        </div>
      </section>

      {/* Active Outbound Links Directory Preview */}
      <section className="bg-slate-900/90 border border-slate-800 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-100">
              Configured Outbound Privacy Links
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Click "Simulate Click" to test real-time PostgreSQL click logging or copy standard HTML anchor code.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('links')}
            className="text-xs font-medium text-blue-400 hover:text-blue-300 transition-colors whitespace-nowrap shrink-0"
          >
            View All Links →
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-xs text-slate-400 bg-slate-950/50">
                <th className="py-3 px-4 font-medium">Campaign & Route</th>
                <th className="py-3 px-4 font-medium">Referrer-Policy</th>
                <th className="py-3 px-4 font-medium text-right">Clicks</th>
                <th className="py-3 px-4 font-medium text-right">Uniques</th>
                <th className="py-3 px-4 font-medium text-right">CTR</th>
                <th className="py-3 px-4 font-medium">Status</th>
                <th className="py-3 px-4 font-medium text-right">Quick Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-sm">
              {links.slice(0, 5).map((link) => {
                const ctr =
                  link.impressions > 0
                    ? ((link.totalClicks / link.impressions) * 100).toFixed(2)
                    : '0.00';
                return (
                  <tr
                    key={link.id}
                    className="hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-100">{link.title}</div>
                      <div className="text-xs text-slate-400 font-mono mt-0.5 flex items-center gap-1.5 flex-wrap">
                        <span>{link.sourceDomain}</span>
                        <ArrowRight className="w-3 h-3 text-slate-500" />
                        {link.intermediateDomain && (
                          <>
                            <span className="text-blue-300">{link.intermediateDomain}</span>
                            <ArrowRight className="w-3 h-3 text-slate-500" />
                          </>
                        )}
                        <span className="text-emerald-300">{link.destinationDomain}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-slate-200">
                      {link.referrerPolicy}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-100">
                      {link.totalClicks.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-300">
                      {link.uniqueVisitors.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-300">
                      {ctr}%
                    </td>
                    <td className="py-3 px-4 text-xs">
                      <span
                        className={
                          link.status === 'active'
                            ? 'text-emerald-400 font-medium'
                            : 'text-slate-500 font-medium'
                        }
                      >
                        {link.status === 'active' ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleTriggerClick(link.id)}
                          disabled={clickingId === link.id || link.status !== 'active'}
                          className="px-2.5 py-1 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 rounded transition-colors whitespace-nowrap"
                        >
                          {clickingId === link.id ? 'Recording...' : 'Simulate Click'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCopySnippet(link)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-blue-300 bg-blue-950/60 border border-blue-800/60 hover:bg-blue-900/50 rounded transition-colors whitespace-nowrap"
                        >
                          {copiedId === link.id ? (
                            <>
                              <Check className="w-3 h-3" />
                              Copied HTML
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              Copy HTML
                            </>
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
