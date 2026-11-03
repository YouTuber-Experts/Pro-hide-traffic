import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateDestinationUrl,
  computeReferrerHeader,
  computeMultiHopFlow,
  calculateTrafficSummary,
  normalizeDomainInput,
} from './privacyLogic';
import { handleStaticApiFallback } from './staticFallbackStore';

test('validateDestinationUrl enforces HTTPS and rejects open redirects', () => {
  const valid = validateDestinationUrl('https://www.dca.com/offers/summer?utm_source=bca');
  assert.equal(valid.valid, true);
  assert.equal(valid.domain, 'dca.com');

  const httpBlocked = validateDestinationUrl('http://dca.com/insecure', { enforceHttpsOnly: true });
  assert.equal(httpBlocked.valid, false);

  const openRedirectBlocked = validateDestinationUrl(
    'https://dca.com/login?redirect=https://malicious.example.com',
    { enforceHttpsOnly: true, preventOpenRedirects: true }
  );
  assert.equal(openRedirectBlocked.valid, false);

  const credentialsBlocked = validateDestinationUrl('https://admin:secret@dca.com/path');
  assert.equal(credentialsBlocked.valid, false);
});

test('computeReferrerHeader follows W3C Referrer-Policy specifications', () => {
  const src = 'https://abc.com/adult-category/stream-99?token=xyz';
  const crossDest = 'https://dca.com/landing';
  const downgradeDest = 'http://dca.com/landing';

  const noRef = computeReferrerHeader(src, crossDest, 'no-referrer');
  assert.equal(noRef.refererHeader, null);

  const strictOriginCross = computeReferrerHeader(src, crossDest, 'strict-origin');
  assert.equal(strictOriginCross.refererHeader, 'https://abc.com/');

  const strictOriginDowngrade = computeReferrerHeader(src, downgradeDest, 'strict-origin');
  assert.equal(strictOriginDowngrade.refererHeader, null);

  const sowcoSame = computeReferrerHeader(src, 'https://abc.com/profile', 'strict-origin-when-cross-origin');
  assert.equal(sowcoSame.refererHeader, src);

  const sowcoCross = computeReferrerHeader(src, crossDest, 'strict-origin-when-cross-origin');
  assert.equal(sowcoCross.refererHeader, 'https://abc.com/');
});

test('computeMultiHopFlow isolates ABC.com source when routed via BCA.com to DCA.com', () => {
  const flow = computeMultiHopFlow({
    sourceDomain: 'abc.com',
    intermediateDomain: 'bca.com',
    destinationUrl: 'https://dca.com/offer',
    hop1Policy: 'no-referrer',
    linkPolicy: 'strict-origin-when-cross-origin',
  });

  assert.equal(flow.refererSeenByIntermediate, null);
  assert.equal(flow.refererSeenByDestination, 'https://bca.com/');
  assert.equal(flow.sourceExposedToDestination, false);
});

test('calculateTrafficSummary aggregates clicks, unique visitors, and CTR accurately', () => {
  const summary = calculateTrafficSummary([
    {
      status: 'active',
      totalClicks: 1000,
      uniqueVisitors: 800,
      impressions: 10000,
      destinationDomain: 'dca.com',
    },
    {
      status: 'disabled',
      totalClicks: 500,
      uniqueVisitors: 400,
      impressions: 5000,
      destinationDomain: 'dca.com',
    },
  ]);

  assert.equal(summary.totalClicks, 1500);
  assert.equal(summary.uniqueVisitors, 1200);
  assert.equal(summary.activeLinksCount, 1);
  assert.equal(summary.avgCtr, 10);
  assert.equal(summary.destinationBreakdown.length, 1);
  assert.equal(summary.destinationBreakdown[0].sharePercent, 100);
});

test('normalizeDomainInput cleans domains properly', () => {
  assert.deepEqual(normalizeDomainInput('https://www.ABC.com/path'), {
    valid: true,
    domain: 'abc.com',
  });
  assert.equal(normalizeDomainInput('invalid_domain').valid, false);
});

test('handleStaticApiFallback returns seeded workspace data for GitHub Pages static deployment', () => {
  const bootstrap = handleStaticApiFallback('/api/bootstrap', { method: 'GET' });
  assert.equal(Array.isArray(bootstrap.websites), true);
  assert.equal(bootstrap.websites.length >= 5, true);
  assert.equal(Array.isArray(bootstrap.links), true);
  assert.equal(bootstrap.links.length >= 5, true);
});
