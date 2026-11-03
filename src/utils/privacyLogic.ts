export type StandardReferrerPolicy =
  | 'no-referrer'
  | 'strict-origin'
  | 'strict-origin-when-cross-origin'
  | 'origin';

export const REFERRER_POLICIES: {
  value: StandardReferrerPolicy;
  label: string;
  summary: string;
  crossOriginHeader: string;
  sameOriginHeader: string;
  downgradeHeader: string;
  privacyLevel: 'Maximum' | 'High' | 'Balanced' | 'Standard';
}[] = [
  {
    value: 'no-referrer',
    label: 'no-referrer',
    summary: 'The Referer header will be omitted entirely. No referrer information is sent along with requests to any origin.',
    crossOriginHeader: 'Omitted (None)',
    sameOriginHeader: 'Omitted (None)',
    downgradeHeader: 'Omitted (None)',
    privacyLevel: 'Maximum',
  },
  {
    value: 'strict-origin',
    label: 'strict-origin',
    summary: 'Sends only the origin when the protocol security level stays the same (HTTPS→HTTPS). Omits header on HTTPS→HTTP downgrade.',
    crossOriginHeader: 'Origin only (https://bca.com/)',
    sameOriginHeader: 'Origin only (https://bca.com/)',
    downgradeHeader: 'Omitted (Blocked on downgrade)',
    privacyLevel: 'High',
  },
  {
    value: 'strict-origin-when-cross-origin',
    label: 'strict-origin-when-cross-origin',
    summary: 'Browser default standard. Sends full URL on same-origin, only origin on cross-origin HTTPS→HTTPS, and nothing on HTTP downgrade.',
    crossOriginHeader: 'Origin only (https://bca.com/)',
    sameOriginHeader: 'Full URL (https://bca.com/bridge/path)',
    downgradeHeader: 'Omitted (Blocked on downgrade)',
    privacyLevel: 'Balanced',
  },
  {
    value: 'origin',
    label: 'origin',
    summary: 'Sends only the ASCII serialization of the origin of the referring document (scheme, host, port), stripping path and query parameters.',
    crossOriginHeader: 'Origin only (https://bca.com/)',
    sameOriginHeader: 'Origin only (https://bca.com/)',
    downgradeHeader: 'Origin only (https://bca.com/)',
    privacyLevel: 'Standard',
  },
];

export interface UrlValidationOptions {
  enforceHttpsOnly?: boolean;
  preventOpenRedirects?: boolean;
}

export interface UrlValidationResult {
  valid: boolean;
  normalizedUrl?: string;
  domain?: string;
  error?: string;
}

const OPEN_REDIRECT_PARAM_KEYS = new Set([
  'redirect',
  'redirect_uri',
  'redirect_url',
  'url',
  'next',
  'dest',
  'destination',
  'return',
  'return_to',
  'continue',
  'goto',
  'target',
]);

/**
 * Validates destination URLs against open-redirect patterns, protocol downgrades,
 * embedded credentials, and malformed hostnames.
 */
export function validateDestinationUrl(
  rawInput: string,
  options: UrlValidationOptions = { enforceHttpsOnly: true, preventOpenRedirects: true }
): UrlValidationResult {
  const trimmed = (rawInput || '').trim();
  if (!trimmed) {
    return { valid: false, error: 'Destination URL is required.' };
  }

  if (trimmed.startsWith('//') || trimmed.includes('\\')) {
    return {
      valid: false,
      error: 'Protocol-relative paths and backslashes are blocked to prevent open redirects.',
    };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { valid: false, error: 'Enter a valid full URL including https:// scheme.' };
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return {
      valid: false,
      error: `Unsupported URL scheme "${parsed.protocol}". Only standard web protocols are allowed.`,
    };
  }

  if (options.enforceHttpsOnly !== false && parsed.protocol !== 'https:') {
    return {
      valid: false,
      error: 'HTTPS is strictly enforced. Destination URL must begin with https://.',
    };
  }

  if (parsed.username || parsed.password) {
    return {
      valid: false,
      error: 'Embedded credentials in URLs are prohibited to prevent phishing and redirect spoofing.',
    };
  }

  const hostname = parsed.hostname.toLowerCase();
  if (!hostname || !hostname.includes('.') || hostname.startsWith('.') || hostname.endsWith('.')) {
    return {
      valid: false,
      error: 'Destination URL must contain a valid fully-qualified domain name (e.g. dca.com).',
    };
  }

  if (options.preventOpenRedirects !== false) {
    for (const [key, val] of parsed.searchParams.entries()) {
      const lowerKey = key.toLowerCase();
      const lowerVal = val.trim().toLowerCase();
      if (
        OPEN_REDIRECT_PARAM_KEYS.has(lowerKey) &&
        (lowerVal.startsWith('http://') ||
          lowerVal.startsWith('https://') ||
          lowerVal.startsWith('//') ||
          lowerVal.startsWith('javascript:'))
      ) {
        return {
          valid: false,
          error: `Query parameter "${key}" contains an external redirect target, which is blocked by Open Redirect Protection.`,
        };
      }
    }
  }

  return {
    valid: true,
    normalizedUrl: parsed.toString(),
    domain: hostname.replace(/^www\./, ''),
  };
}

/**
 * Validates a clean domain name (e.g. "abc.com" or "https://abc.com")
 */
export function normalizeDomainInput(input: string): { valid: boolean; domain?: string; error?: string } {
  const raw = (input || '').trim().toLowerCase();
  if (!raw) {
    return { valid: false, error: 'Domain name is required.' };
  }
  const candidate = raw.startsWith('http://') || raw.startsWith('https://') ? raw : `https://${raw}`;
  try {
    const url = new URL(candidate);
    const cleanHost = url.hostname.replace(/^www\./, '');
    if (!cleanHost || !cleanHost.includes('.') || cleanHost.includes('..')) {
      return { valid: false, error: 'Enter a valid domain such as abc.com or bca.com.' };
    }
    return { valid: true, domain: cleanHost };
  } catch {
    return { valid: false, error: 'Enter a valid domain name (e.g. abc.com).' };
  }
}

/**
 * Computes the exact HTTP `Referer` header sent by a standards-compliant browser
 * given a source URL, destination URL, and W3C Referrer-Policy.
 */
export function computeReferrerHeader(
  sourceUrlStr: string,
  destinationUrlStr: string,
  policy: StandardReferrerPolicy
): {
  refererHeader: string | null;
  isSameOrigin: boolean;
  isDowngrade: boolean;
  explanation: string;
} {
  const sourceUrl = new URL(sourceUrlStr);
  const destUrl = new URL(destinationUrlStr);

  const isSameOrigin = sourceUrl.origin === destUrl.origin;
  const isDowngrade = sourceUrl.protocol === 'https:' && destUrl.protocol === 'http:';
  const originHeader = `${sourceUrl.origin}/`;

  switch (policy) {
    case 'no-referrer':
      return {
        refererHeader: null,
        isSameOrigin,
        isDowngrade,
        explanation: 'Policy "no-referrer" strips the Referer header completely on all requests.',
      };

    case 'origin':
      return {
        refererHeader: originHeader,
        isSameOrigin,
        isDowngrade,
        explanation: 'Policy "origin" sends only the origin (scheme + host) and strips path and query string.',
      };

    case 'strict-origin':
      if (isDowngrade) {
        return {
          refererHeader: null,
          isSameOrigin,
          isDowngrade,
          explanation: 'Policy "strict-origin" blocks the Referer header because the request downgrades from HTTPS to HTTP.',
        };
      }
      return {
        refererHeader: originHeader,
        isSameOrigin,
        isDowngrade,
        explanation: 'Policy "strict-origin" sends only the origin over secure HTTPS transport, hiding internal page paths.',
      };

    case 'strict-origin-when-cross-origin':
      if (isDowngrade) {
        return {
          refererHeader: null,
          isSameOrigin,
          isDowngrade,
          explanation: 'Policy "strict-origin-when-cross-origin" omits Referer on HTTPS→HTTP downgrade.',
        };
      }
      if (isSameOrigin) {
        return {
          refererHeader: sourceUrl.toString(),
          isSameOrigin,
          isDowngrade,
          explanation: 'Same-origin request preserves full URL path and query parameters.',
        };
      }
      return {
        refererHeader: originHeader,
        isSameOrigin,
        isDowngrade,
        explanation: 'Cross-origin HTTPS request sends only the origin and strips internal path & query string.',
      };
  }
}

export interface MultiHopSimulation {
  sourceUrl: string;
  intermediateUrl: string | null;
  destinationUrl: string;
  hop1Policy: StandardReferrerPolicy;
  hop2Policy: StandardReferrerPolicy;
  refererSeenByIntermediate: string | null;
  refererSeenByDestination: string | null;
  sourceExposedToDestination: boolean;
}

/**
 * Computes how referral information flows across a 2-hop or 3-hop topology
 * (e.g. ABC.com -> BCA.com -> DCA.com).
 */
export function computeMultiHopFlow(params: {
  sourceDomain: string;
  sourcePath?: string;
  intermediateDomain?: string | null;
  destinationUrl: string;
  hop1Policy?: StandardReferrerPolicy;
  linkPolicy: StandardReferrerPolicy;
}): MultiHopSimulation {
  const cleanSourcePath = params.sourcePath || '/content/stream-room-402?session=private_token';
  const sourceUrl = `https://${params.sourceDomain}${cleanSourcePath.startsWith('/') ? cleanSourcePath : `/${cleanSourcePath}`}`;
  const hop1Policy = params.hop1Policy || 'no-referrer';
  const hop2Policy = params.linkPolicy;

  if (!params.intermediateDomain) {
    const direct = computeReferrerHeader(sourceUrl, params.destinationUrl, hop2Policy);
    return {
      sourceUrl,
      intermediateUrl: null,
      destinationUrl: params.destinationUrl,
      hop1Policy: hop2Policy,
      hop2Policy,
      refererSeenByIntermediate: null,
      refererSeenByDestination: direct.refererHeader,
      sourceExposedToDestination: Boolean(
        direct.refererHeader && direct.refererHeader.includes(params.sourceDomain)
      ),
    };
  }

  const intermediateUrl = `https://${params.intermediateDomain}/r/gateway-bridge`;
  const hop1 = computeReferrerHeader(sourceUrl, intermediateUrl, hop1Policy);
  const hop2 = computeReferrerHeader(intermediateUrl, params.destinationUrl, hop2Policy);

  return {
    sourceUrl,
    intermediateUrl,
    destinationUrl: params.destinationUrl,
    hop1Policy,
    hop2Policy,
    refererSeenByIntermediate: hop1.refererHeader,
    refererSeenByDestination: hop2.refererHeader,
    sourceExposedToDestination: Boolean(
      hop2.refererHeader && hop2.refererHeader.includes(params.sourceDomain)
    ),
  };
}

export function generateOutboundLinkArtifacts(params: {
  appOrigin: string;
  slug: string;
  intermediateDomain?: string | null;
  destinationUrl: string;
  referrerPolicy: StandardReferrerPolicy;
}) {
  const gatewayUrl = `${params.appOrigin.replace(/\/$/, '')}/go/${params.slug}`;
  const relAttr = params.referrerPolicy === 'no-referrer' ? 'noreferrer noopener' : 'noopener';
  const htmlAnchor = `<a href="${gatewayUrl}" referrerpolicy="${params.referrerPolicy}" rel="${relAttr}">Continue to Destination</a>`;
  const directHtmlAnchor = `<a href="${params.destinationUrl}" referrerpolicy="${params.referrerPolicy}" rel="${relAttr}">Visit Partner</a>`;
  const httpHeader = `Referrer-Policy: ${params.referrerPolicy}`;
  const metaTag = `<meta name="referrer" content="${params.referrerPolicy}" />`;

  return {
    gatewayUrl,
    htmlAnchor,
    directHtmlAnchor,
    httpHeader,
    metaTag,
  };
}

export interface LinkMetricItem {
  status: string;
  totalClicks: number;
  uniqueVisitors: number;
  impressions: number;
  destinationDomain: string;
}

export function calculateTrafficSummary(links: LinkMetricItem[]) {
  let totalClicks = 0;
  let uniqueVisitors = 0;
  let totalImpressions = 0;
  let activeLinksCount = 0;

  const destinationMap = new Map<
    string,
    { domain: string; clicks: number; uniques: number; impressions: number; linkCount: number }
  >();

  for (const link of links) {
    totalClicks += Number(link.totalClicks) || 0;
    uniqueVisitors += Number(link.uniqueVisitors) || 0;
    totalImpressions += Number(link.impressions) || 0;
    if (link.status === 'active') {
      activeLinksCount += 1;
    }

    const existing = destinationMap.get(link.destinationDomain) || {
      domain: link.destinationDomain,
      clicks: 0,
      uniques: 0,
      impressions: 0,
      linkCount: 0,
    };
    existing.clicks += Number(link.totalClicks) || 0;
    existing.uniques += Number(link.uniqueVisitors) || 0;
    existing.impressions += Number(link.impressions) || 0;
    existing.linkCount += 1;
    destinationMap.set(link.destinationDomain, existing);
  }

  const avgCtr =
    totalImpressions > 0 ? Number(((totalClicks / totalImpressions) * 100).toFixed(2)) : 0;

  const destinationBreakdown = Array.from(destinationMap.values())
    .map((item) => ({
      ...item,
      ctr: item.impressions > 0 ? Number(((item.clicks / item.impressions) * 100).toFixed(2)) : 0,
      sharePercent: totalClicks > 0 ? Number(((item.clicks / totalClicks) * 100).toFixed(1)) : 0,
    }))
    .sort((a, b) => b.clicks - a.clicks);

  return {
    totalClicks,
    uniqueVisitors,
    totalImpressions,
    activeLinksCount,
    avgCtr,
    destinationBreakdown,
  };
}
