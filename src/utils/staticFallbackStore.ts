import {
  UserProfile,
  WebsiteRecord,
  OutboundLinkRecord,
  ClickEventRecord,
  PrivacySettingsRecord,
} from '../types';
import {
  validateDestinationUrl,
  normalizeDomainInput,
  StandardReferrerPolicy,
} from './privacyLogic';

const STORAGE_KEY = 'rpm_static_workspace_v1';

interface StaticWorkspaceState {
  profile: UserProfile;
  websites: WebsiteRecord[];
  links: OutboundLinkRecord[];
  recentEvents: ClickEventRecord[];
  privacySettings: PrivacySettingsRecord;
}

const DEFAULT_STATE: StaticWorkspaceState = {
  profile: {
    id: 1,
    uid: 'demo-workspace',
    email: 'ops@referralprivacy.io',
    displayName: 'Alex Rivera',
    organization: 'Apex Traffic & Privacy Ops',
    planTier: 'Enterprise Network',
    billingCycle: 'annual',
    createdAt: '2026-11-03T04:00:00.000Z',
  },
  privacySettings: {
    id: 1,
    userUid: 'demo-workspace',
    globalDefaultPolicy: 'strict-origin-when-cross-origin',
    enforceHttpsOnly: true,
    preventOpenRedirects: true,
    requireRegisteredDomains: true,
    stripQueryParametersOnCrossOrigin: true,
    updatedAt: '2026-11-03T04:00:00.000Z',
  },
  websites: [
    {
      id: 1,
      userUid: 'demo-workspace',
      domain: 'abc.com',
      label: 'ABC Original Adult Portal',
      trafficRole: 'source',
      defaultPolicy: 'no-referrer',
      httpsEnforced: true,
      status: 'active',
      createdAt: '2026-11-03T04:00:00.000Z',
    },
    {
      id: 2,
      userUid: 'demo-workspace',
      domain: 'bca.com',
      label: 'BCA Intermediate Bridge Site',
      trafficRole: 'intermediate',
      defaultPolicy: 'strict-origin-when-cross-origin',
      httpsEnforced: true,
      status: 'active',
      createdAt: '2026-11-03T04:00:00.000Z',
    },
    {
      id: 3,
      userUid: 'demo-workspace',
      domain: 'dca.com',
      label: 'DCA Final Destination Store',
      trafficRole: 'destination',
      defaultPolicy: 'origin',
      httpsEnforced: true,
      status: 'active',
      createdAt: '2026-11-03T04:00:00.000Z',
    },
    {
      id: 4,
      userUid: 'demo-workspace',
      domain: 'xyz-stream.net',
      label: 'XYZ Media Streaming Network',
      trafficRole: 'source',
      defaultPolicy: 'strict-origin',
      httpsEnforced: true,
      status: 'active',
      createdAt: '2026-11-03T04:00:00.000Z',
    },
    {
      id: 5,
      userUid: 'demo-workspace',
      domain: 'relay-shield.io',
      label: 'RelayShield Transit Domain',
      trafficRole: 'intermediate',
      defaultPolicy: 'no-referrer',
      httpsEnforced: true,
      status: 'active',
      createdAt: '2026-11-03T04:00:00.000Z',
    },
  ],
  links: [
    {
      id: 1,
      userUid: 'demo-workspace',
      slug: 'abc-bca-dca-vip',
      title: 'ABC Primary Banner -> BCA Bridge -> DCA VIP Offer',
      sourceDomain: 'abc.com',
      intermediateDomain: 'bca.com',
      destinationUrl: 'https://dca.com/campaigns/exclusive-membership',
      destinationDomain: 'dca.com',
      referrerPolicy: 'no-referrer',
      status: 'active',
      totalClicks: 14820,
      uniqueVisitors: 11340,
      impressions: 194500,
      createdAt: '2026-11-03T04:00:00.000Z',
    },
    {
      id: 2,
      userUid: 'demo-workspace',
      slug: 'abc-bca-dca-checkout',
      title: 'ABC Exit Intent -> BCA Bridge -> DCA Checkout',
      sourceDomain: 'abc.com',
      intermediateDomain: 'bca.com',
      destinationUrl: 'https://dca.com/checkout/vip-tier',
      destinationDomain: 'dca.com',
      referrerPolicy: 'strict-origin',
      status: 'active',
      totalClicks: 8940,
      uniqueVisitors: 7120,
      impressions: 112000,
      createdAt: '2026-11-03T04:00:00.000Z',
    },
    {
      id: 3,
      userUid: 'demo-workspace',
      slug: 'xyz-relay-dca-app',
      title: 'XYZ Video Post-Roll -> RelayShield -> DCA App Suite',
      sourceDomain: 'xyz-stream.net',
      intermediateDomain: 'relay-shield.io',
      destinationUrl: 'https://dca.com/download/mobile-suite',
      destinationDomain: 'dca.com',
      referrerPolicy: 'strict-origin-when-cross-origin',
      status: 'active',
      totalClicks: 6430,
      uniqueVisitors: 5290,
      impressions: 84300,
      createdAt: '2026-11-03T04:00:00.000Z',
    },
    {
      id: 4,
      userUid: 'demo-workspace',
      slug: 'bca-dca-editorial',
      title: 'BCA Native Widget -> DCA Partner Feature',
      sourceDomain: 'bca.com',
      intermediateDomain: null,
      destinationUrl: 'https://dca.com/partners/editorial-feature',
      destinationDomain: 'dca.com',
      referrerPolicy: 'origin',
      status: 'active',
      totalClicks: 4190,
      uniqueVisitors: 3410,
      impressions: 59000,
      createdAt: '2026-11-03T04:00:00.000Z',
    },
    {
      id: 5,
      userUid: 'demo-workspace',
      slug: 'abc-legacy-archive',
      title: 'ABC Legacy Footer -> BCA Bridge -> DCA Promo Archive',
      sourceDomain: 'abc.com',
      intermediateDomain: 'bca.com',
      destinationUrl: 'https://dca.com/archive/2025-promo',
      destinationDomain: 'dca.com',
      referrerPolicy: 'no-referrer',
      status: 'disabled',
      totalClicks: 1850,
      uniqueVisitors: 1490,
      impressions: 32000,
      createdAt: '2026-11-03T04:00:00.000Z',
    },
  ],
  recentEvents: [],
};

function loadState(): StaticWorkspaceState {
  if (typeof window === 'undefined') return DEFAULT_STATE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.websites) && Array.isArray(parsed.links)) {
        return parsed;
      }
    }
  } catch {
    // Ignore storage access errors
  }
  return structuredClone(DEFAULT_STATE);
}

function saveState(state: StaticWorkspaceState) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage quota errors
  }
}

/**
 * Handles API requests client-side when deployed to static hosts like GitHub Pages
 * where the Express /api/* backend is not running.
 */
export function handleStaticApiFallback(path: string, options: RequestInit = {}): any {
  const state = loadState();
  const method = (options.method || 'GET').toUpperCase();
  const body = options.body ? JSON.parse(String(options.body)) : {};

  if (path === '/api/bootstrap' && method === 'GET') {
    saveState(state);
    return state;
  }

  if (path === '/api/websites' && method === 'POST') {
    const domainCheck = normalizeDomainInput(body.domain);
    if (!domainCheck.valid || !domainCheck.domain) {
      throw new Error(domainCheck.error || 'Invalid domain name.');
    }
    const created: WebsiteRecord = {
      id: Date.now(),
      userUid: 'demo-workspace',
      domain: domainCheck.domain,
      label: String(body.label || domainCheck.domain).trim(),
      trafficRole: body.trafficRole || 'source',
      defaultPolicy: (body.defaultPolicy || 'strict-origin-when-cross-origin') as StandardReferrerPolicy,
      httpsEnforced: body.httpsEnforced !== false,
      status: 'active',
      createdAt: new Date().toISOString(),
    };
    state.websites = [created, ...state.websites];
    saveState(state);
    return created;
  }

  if (path.startsWith('/api/websites/') && method === 'PATCH') {
    const id = Number(path.split('/').pop());
    const idx = state.websites.findIndex((w) => w.id === id);
    if (idx === -1) throw new Error('Website not found.');
    state.websites[idx] = { ...state.websites[idx], ...body };
    saveState(state);
    return state.websites[idx];
  }

  if (path.startsWith('/api/websites/') && method === 'DELETE') {
    const id = Number(path.split('/').pop());
    state.websites = state.websites.filter((w) => w.id !== id);
    saveState(state);
    return { deleted: true, id };
  }

  if (path === '/api/links' && method === 'POST') {
    const urlCheck = validateDestinationUrl(body.destinationUrl, {
      enforceHttpsOnly: state.privacySettings.enforceHttpsOnly,
      preventOpenRedirects: state.privacySettings.preventOpenRedirects,
    });
    if (!urlCheck.valid || !urlCheck.normalizedUrl || !urlCheck.domain) {
      throw new Error(urlCheck.error || 'Invalid destination URL.');
    }
    const srcCheck = normalizeDomainInput(body.sourceDomain || 'abc.com');
    const cleanSource = srcCheck.domain || 'abc.com';
    const cleanSlug =
      (body.slug && String(body.slug).trim().toLowerCase().replace(/[^a-z0-9-_]/g, '-')) ||
      `${cleanSource.split('.')[0]}-${urlCheck.domain.split('.')[0]}-${Math.random()
        .toString(36)
        .slice(2, 7)}`;

    const created: OutboundLinkRecord = {
      id: Date.now(),
      userUid: 'demo-workspace',
      slug: cleanSlug,
      title: String(body.title || 'Outbound Campaign').trim(),
      sourceDomain: cleanSource,
      intermediateDomain:
        body.intermediateDomain && body.intermediateDomain !== 'none'
          ? body.intermediateDomain
          : null,
      destinationUrl: urlCheck.normalizedUrl,
      destinationDomain: urlCheck.domain,
      referrerPolicy: (body.referrerPolicy || 'no-referrer') as StandardReferrerPolicy,
      status: 'active',
      totalClicks: 1,
      uniqueVisitors: 1,
      impressions: 20,
      createdAt: new Date().toISOString(),
    };
    state.links = [created, ...state.links];
    saveState(state);
    return created;
  }

  if (path.endsWith('/click') && method === 'POST') {
    const parts = path.split('/');
    const id = Number(parts[parts.length - 2]);
    const idx = state.links.findIndex((l) => l.id === id);
    if (idx === -1) throw new Error('Outbound link not found.');
    const link = state.links[idx];
    const updated: OutboundLinkRecord = {
      ...link,
      totalClicks: link.totalClicks + 1,
      uniqueVisitors: link.uniqueVisitors + 1,
      impressions: link.impressions + 4,
    };
    state.links[idx] = updated;
    saveState(state);
    return updated;
  }

  if (path.startsWith('/api/links/') && method === 'PATCH') {
    const id = Number(path.split('/').pop());
    const idx = state.links.findIndex((l) => l.id === id);
    if (idx === -1) throw new Error('Outbound link not found.');
    state.links[idx] = { ...state.links[idx], ...body };
    saveState(state);
    return state.links[idx];
  }

  if (path.startsWith('/api/links/') && method === 'DELETE') {
    const id = Number(path.split('/').pop());
    state.links = state.links.filter((l) => l.id !== id);
    saveState(state);
    return { deleted: true, id };
  }

  if (path === '/api/privacy-settings' && method === 'PUT') {
    state.privacySettings = {
      ...state.privacySettings,
      ...body,
      updatedAt: new Date().toISOString(),
    };
    saveState(state);
    return state.privacySettings;
  }

  if (path === '/api/profile' && method === 'PUT') {
    state.profile = {
      ...state.profile,
      ...body,
    };
    saveState(state);
    return state.profile;
  }

  return state;
}
