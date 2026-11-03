import React, { useState, useMemo } from 'react';
import { OutboundLinkRecord, ClickEventRecord } from '../types';
import { calculateTrafficSummary } from '../utils/privacyLogic';

interface AnalyticsViewProps {
  links: OutboundLinkRecord[];
  recentEvents: ClickEventRecord[];
  onSimulateClickWithTelemetry: (
    linkId: number,
    meta: {
      deviceType: 'Desktop' | 'Mobile' | 'Tablet';
      browserName: 'Chrome' | 'Safari' | 'Firefox' | 'Edge';
    }
  ) => Promise<void>;
}

const DAILY_SERIES = [
  { label: 'Oct 28', clicks: 4120, uniques: 3190 },
  { label: 'Oct 29', clicks: 4680, uniques: 3580 },
  { label: 'Oct 30', clicks: 4490, uniques: 3420 },
  { label: 'Oct 31', clicks: 5210, uniques: 4050 },
  { label: 'Nov 01', clicks: 5890, uniques: 4510 },
  { label: 'Nov 02', clicks: 6140, uniques: 4720 },
  { label: 'Nov 03', clicks: 5700, uniques: 4380 },
];

const WEEKLY_SERIES = [
  { label: 'Wk 39', clicks: 24800, uniques: 19100 },
  { label: 'Wk 40', clicks: 27400, uniques: 21200 },
  { label: 'Wk 41', clicks: 29150, uniques: 22600 },
  { label: 'Wk 42', clicks: 31900, uniques: 24800 },
  { label: 'Wk 43', clicks: 34200, uniques: 26900 },
  { label: 'Wk 44', clicks: 36230, uniques: 28650 },
];

const MONTHLY_SERIES = [
  { label: 'Jun 2026', clicks: 94200, uniques: 73400 },
  { label: 'Jul 2026', clicks: 108500, uniques: 84100 },
  { label: 'Aug 2026', clicks: 119400, uniques: 92800 },
  { label: 'Sep 2026', clicks: 131200, uniques: 101900 },
  { label: 'Oct 2026', clicks: 144800, uniques: 112600 },
  { label: 'Nov 2026', clicks: 36230, uniques: 28650 },
];

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  links,
  recentEvents,
  onSimulateClickWithTelemetry,
}) => {
  const [timeframe, setTimeframe] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [selectedLinkId, setSelectedLinkId] = useState<number>(
    links.find((l) => l.status === 'active')?.id || (links[0]?.id ?? 0)
  );
  const [simDevice, setSimDevice] = useState<'Desktop' | 'Mobile' | 'Tablet'>('Desktop');
  const [simBrowser, setSimBrowser] = useState<'Chrome' | 'Safari' | 'Firefox' | 'Edge'>('Chrome');
  const [recording, setRecording] = useState<boolean>(false);

  const summary = useMemo(() => calculateTrafficSummary(links), [links]);

  // Adjust the latest bar dynamically as live clicks are added
  const baselineClicks = 36230;
  const liveDelta = Math.max(0, summary.totalClicks - baselineClicks);

  const chartSeries = useMemo(() => {
    const base =
      timeframe === 'daily'
        ? DAILY_SERIES
        : timeframe === 'weekly'
        ? WEEKLY_SERIES
        : MONTHLY_SERIES;
    return base.map((item, idx) =>
      idx === base.length - 1
        ? {
            ...item,
            clicks: item.clicks + liveDelta,
            uniques: item.uniques + liveDelta,
          }
        : item
    );
  }, [timeframe, liveDelta]);

  const maxChartClicks = useMemo(
    () => Math.max(...chartSeries.map((d) => d.clicks), 1),
    [chartSeries]
  );

  // Compute device and browser distributions combining baseline + live events
  const deviceStats = useMemo(() => {
    const counts = {
      Desktop: 19420,
      Mobile: 13840,
      Tablet: 2970,
    };
    for (const ev of recentEvents) {
      if (ev.deviceType in counts) {
        counts[ev.deviceType as keyof typeof counts] += 1;
      }
    }
    const total = counts.Desktop + counts.Mobile + counts.Tablet;
    return (['Desktop', 'Mobile', 'Tablet'] as const).map((name) => ({
      name,
      count: counts[name],
      percent: ((counts[name] / total) * 100).toFixed(1),
    }));
  }, [recentEvents]);

  const browserStats = useMemo(() => {
    const counts = {
      Chrome: 20150,
      Safari: 9840,
      Firefox: 3920,
      Edge: 2320,
    };
    for (const ev of recentEvents) {
      if (ev.browserName in counts) {
        counts[ev.browserName as keyof typeof counts] += 1;
      }
    }
    const total = counts.Chrome + counts.Safari + counts.Firefox + counts.Edge;
    return (['Chrome', 'Safari', 'Firefox', 'Edge'] as const).map((name) => ({
      name,
      count: counts[name],
      percent: ((counts[name] / total) * 100).toFixed(1),
    }));
  }, [recentEvents]);

  const handleTriggerLiveClick = async () => {
    const targetId = selectedLinkId || links[0]?.id;
    if (!targetId) return;
    setRecording(true);
    try {
      await onSimulateClickWithTelemetry(targetId, {
        deviceType: simDevice,
        browserName: simBrowser,
      });
    } finally {
      setRecording(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <p className="text-xs text-slate-400 mb-1">
            Outbound Telemetry · Destination-Wise Breakdown · Device & Browser Analytics
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100">
            Traffic & Referral Analytics
          </h1>
        </div>

        {/* Timeframe Segmented Control */}
        <div className="inline-flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-lg">
          {(
            [
              { id: 'daily', label: 'Daily Traffic' },
              { id: 'weekly', label: 'Weekly Traffic' },
              { id: 'monthly', label: 'Monthly Traffic' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setTimeframe(tab.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                timeframe === tab.id
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-5">
          <div className="text-xs text-slate-400">Total Outgoing Clicks</div>
          <div className="mt-2 text-2xl font-bold text-slate-100 font-mono tabular-nums">
            {summary.totalClicks.toLocaleString()}
          </div>
          <div className="mt-2 text-xs text-emerald-400">
            All clicks governed by W3C Referrer-Policy
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-5">
          <div className="text-xs text-slate-400">Unique Visitors</div>
          <div className="mt-2 text-2xl font-bold text-slate-100 font-mono tabular-nums">
            {summary.uniqueVisitors.toLocaleString()}
          </div>
          <div className="mt-2 text-xs text-slate-400">
            De-duplicated session dispatches
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-5">
          <div className="text-xs text-slate-400">Network Click-Through Rate</div>
          <div className="mt-2 text-2xl font-bold text-slate-100 font-mono tabular-nums">
            {summary.avgCtr.toFixed(2)}%
          </div>
          <div className="mt-2 text-xs text-slate-400">
            Across {summary.totalImpressions.toLocaleString()} impressions
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-5">
          <div className="text-xs text-slate-400">Active Destination Domains</div>
          <div className="mt-2 text-2xl font-bold text-slate-100 font-mono tabular-nums">
            {summary.destinationBreakdown.length}
          </div>
          <div className="mt-2 text-xs text-slate-400">
            Primary target: {summary.destinationBreakdown[0]?.domain || 'dca.com'}
          </div>
        </div>
      </div>

      {/* Interactive Time-Series Chart */}
      <section className="bg-slate-900/90 border border-slate-800 rounded-lg p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-800">
          <div>
            <h2 className="text-base font-semibold text-slate-100">
              {timeframe === 'daily'
                ? 'Daily Outgoing Traffic & Unique Visitors (Last 7 Days)'
                : timeframe === 'weekly'
                ? 'Weekly Outgoing Traffic & Unique Visitors (Last 6 Weeks)'
                : 'Monthly Outgoing Traffic & Unique Visitors (6-Month Trend)'}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Blue bars represent Total Outgoing Clicks · Cyan bars represent Unique Visitors
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs text-slate-300">
            <span>Total Clicks (Blue)</span>
            <span>·</span>
            <span>Unique Visitors (Cyan)</span>
          </div>
        </div>

        {/* SVG Bar Chart + Tabular Data */}
        <div className="mt-6">
          <div className="grid grid-cols-6 sm:grid-cols-7 gap-3 items-end h-52 pt-6 px-2 border-b border-slate-800">
            {chartSeries.map((point) => {
              const clickHeightPercent = Math.max(
                10,
                Math.round((point.clicks / maxChartClicks) * 100)
              );
              const uniqueHeightPercent = Math.max(
                8,
                Math.round((point.uniques / maxChartClicks) * 100)
              );
              return (
                <div
                  key={point.label}
                  className="flex flex-col items-center justify-end h-full gap-2"
                >
                  <div className="text-[11px] font-mono tabular-nums text-slate-300">
                    {point.clicks.toLocaleString()}
                  </div>
                  <div className="w-full max-w-[52px] flex items-end justify-center gap-1.5 h-36">
                    <div
                      style={{ height: `${clickHeightPercent}%` }}
                      className="w-1/2 bg-blue-600 rounded-t transition-all"
                      title={`Total Clicks: ${point.clicks.toLocaleString()}`}
                    />
                    <div
                      style={{ height: `${uniqueHeightPercent}%` }}
                      className="w-1/2 bg-cyan-400/80 rounded-t transition-all"
                      title={`Unique Visitors: ${point.uniques.toLocaleString()}`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="grid grid-cols-6 sm:grid-cols-7 gap-3 pt-3 px-2 text-center">
            {chartSeries.map((point) => (
              <div key={point.label} className="text-xs font-mono text-slate-400">
                <div>{point.label}</div>
                <div className="text-[11px] text-slate-500">
                  {point.uniques.toLocaleString()} uniq
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Live Outbound Click Telemetry Simulator */}
      <section className="bg-slate-900/90 border border-slate-800 rounded-lg p-6 space-y-4">
        <div className="space-y-1">
          <h2 className="text-sm font-semibold text-slate-100">
            Live Traffic Telemetry Tester (PostgreSQL Event Dispatch)
          </h2>
          <p className="text-xs text-slate-400">
            Simulate an outbound visitor click with specific device and browser parameters to verify real-time analytics aggregation.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
          <div>
            <label
              htmlFor="telemetry-link-select"
              className="block text-xs text-slate-400 mb-1"
            >
              Outbound Link
            </label>
            <select
              id="telemetry-link-select"
              value={selectedLinkId}
              onChange={(e) => setSelectedLinkId(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 truncate focus:outline-none focus:border-blue-500"
            >
              {links.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.title} ({l.referrerPolicy})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="telemetry-device-select"
              className="block text-xs text-slate-400 mb-1"
            >
              Device Type
            </label>
            <select
              id="telemetry-device-select"
              value={simDevice}
              onChange={(e) =>
                setSimDevice(e.target.value as 'Desktop' | 'Mobile' | 'Tablet')
              }
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
            >
              <option value="Desktop">Desktop</option>
              <option value="Mobile">Mobile</option>
              <option value="Tablet">Tablet</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="telemetry-browser-select"
              className="block text-xs text-slate-400 mb-1"
            >
              Browser Engine
            </label>
            <select
              id="telemetry-browser-select"
              value={simBrowser}
              onChange={(e) =>
                setSimBrowser(
                  e.target.value as 'Chrome' | 'Safari' | 'Firefox' | 'Edge'
                )
              }
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
            >
              <option value="Chrome">Chrome</option>
              <option value="Safari">Safari</option>
              <option value="Firefox">Firefox</option>
              <option value="Edge">Edge</option>
            </select>
          </div>

          <button
            type="button"
            onClick={handleTriggerLiveClick}
            disabled={recording}
            className="w-full px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-500 disabled:opacity-50 transition-colors whitespace-nowrap"
          >
            {recording ? 'Recording Click...' : 'Record Outbound Click'}
          </button>
        </div>
      </section>

      {/* Destination-Wise Traffic + Device & Browser Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Destination-Wise Traffic */}
        <div className="lg:col-span-2 bg-slate-900/90 border border-slate-800 rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-800">
            <h2 className="text-base font-semibold text-slate-100">
              Destination-Wise Outbound Traffic
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Aggregated clicks, unique visitors, and click-through rate grouped by final destination domain.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-xs text-slate-400 bg-slate-950/50">
                  <th className="py-3 px-4 font-medium">Destination Domain</th>
                  <th className="py-3 px-4 font-medium text-right">Links</th>
                  <th className="py-3 px-4 font-medium text-right">Outgoing Clicks</th>
                  <th className="py-3 px-4 font-medium text-right">Unique Visitors</th>
                  <th className="py-3 px-4 font-medium text-right">CTR</th>
                  <th className="py-3 px-4 font-medium text-right">Traffic Share</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-sm">
                {summary.destinationBreakdown.map((dest) => (
                  <tr key={dest.domain} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-semibold text-emerald-300">
                      https://{dest.domain}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums text-slate-300">
                      {dest.linkCount}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums text-slate-100">
                      {dest.clicks.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums text-slate-300">
                      {dest.uniques.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums text-slate-300">
                      {dest.ctr.toFixed(2)}%
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums text-blue-300">
                      {dest.sharePercent}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Device & Browser Statistics */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-6 space-y-6">
          <div>
            <h2 className="text-base font-semibold text-slate-100">
              Device & Browser Statistics
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Client user-agent distribution across outbound privacy links.
            </p>
          </div>

          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-slate-300">Device Distribution</h3>
            {deviceStats.map((d) => (
              <div key={d.name} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-200">{d.name}</span>
                  <span className="font-mono tabular-nums text-slate-400">
                    {d.count.toLocaleString()} ({d.percent}%)
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-950 rounded overflow-hidden">
                  <div
                    style={{ width: `${d.percent}%` }}
                    className="h-full bg-blue-500 rounded"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-3 pt-4 border-t border-slate-800">
            <h3 className="text-xs font-semibold text-slate-300">Browser Breakdown</h3>
            {browserStats.map((b) => (
              <div key={b.name} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-200">{b.name}</span>
                  <span className="font-mono tabular-nums text-slate-400">
                    {b.count.toLocaleString()} ({b.percent}%)
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-950 rounded overflow-hidden">
                  <div
                    style={{ width: `${b.percent}%` }}
                    className="h-full bg-cyan-500 rounded"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
