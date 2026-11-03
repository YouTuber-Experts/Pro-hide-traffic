import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import * as dotenv from 'dotenv';
import { requireAuth, AuthRequest } from './src/middleware/auth.ts';
import {
  ensureWorkspaceSeeded,
  getUserProfile,
  updateUserProfile,
  getWebsitesByUser,
  createWebsiteForUser,
  updateWebsiteForUser,
  deleteWebsiteForUser,
  getOutboundLinksByUser,
  getOutboundLinkBySlug,
  createOutboundLinkForUser,
  updateOutboundLinkForUser,
  deleteOutboundLinkForUser,
  recordLinkClickForUser,
  getPrivacySettingsForUser,
  updatePrivacySettingsForUser,
  getRecentClickEventsForUser,
} from './src/db/repository.ts';
import {
  validateDestinationUrl,
  normalizeDomainInput,
  StandardReferrerPolicy,
} from './src/utils/privacyLogic.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ALLOWED_POLICIES = new Set<StandardReferrerPolicy>([
  'no-referrer',
  'strict-origin',
  'strict-origin-when-cross-origin',
  'origin',
]);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Security headers
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    next();
  });

  // Bootstrap endpoint: loads or initializes workspace state from PostgreSQL
  app.get('/api/bootstrap', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.workspaceUid || 'demo-workspace';
      const email = req.user?.email || 'ops@referralprivacy.io';
      await ensureWorkspaceSeeded(uid, email);

      const [profile, websites, links, privacySettings, recentEvents] = await Promise.all([
        getUserProfile(uid),
        getWebsitesByUser(uid),
        getOutboundLinksByUser(uid),
        getPrivacySettingsForUser(uid),
        getRecentClickEventsForUser(uid),
      ]);

      res.json({
        profile,
        websites,
        links,
        privacySettings,
        recentEvents,
      });
    } catch (error: any) {
      console.error('Failed to bootstrap workspace:', error);
      res.status(500).json({ error: error.message || 'Failed to load workspace data' });
    }
  });

  // Websites CRUD
  app.post('/api/websites', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.workspaceUid || 'demo-workspace';
      const { domain, label, trafficRole, defaultPolicy, httpsEnforced } = req.body;

      const domainCheck = normalizeDomainInput(domain);
      if (!domainCheck.valid || !domainCheck.domain) {
        return res.status(400).json({ error: domainCheck.error || 'Invalid domain name.' });
      }

      if (!label || !String(label).trim()) {
        return res.status(400).json({ error: 'Website label is required.' });
      }

      if (!ALLOWED_POLICIES.has(defaultPolicy)) {
        return res.status(400).json({ error: 'Invalid standard referrer policy.' });
      }

      const created = await createWebsiteForUser(uid, {
        domain: domainCheck.domain,
        label: String(label).trim(),
        trafficRole: trafficRole || 'source',
        defaultPolicy,
        httpsEnforced: httpsEnforced !== false,
      });

      res.status(201).json(created);
    } catch (error: any) {
      console.error('Failed to create website:', error);
      res.status(500).json({ error: error.message || 'Failed to create website' });
    }
  });

  app.patch('/api/websites/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.workspaceUid || 'demo-workspace';
      const id = Number(req.params.id);
      if (!Number.isFinite(id)) {
        return res.status(400).json({ error: 'Invalid website ID.' });
      }

      const updated = await updateWebsiteForUser(uid, id, req.body);
      if (!updated) {
        return res.status(404).json({ error: 'Website not found.' });
      }
      res.json(updated);
    } catch (error: any) {
      console.error('Failed to update website:', error);
      res.status(500).json({ error: error.message || 'Failed to update website' });
    }
  });

  app.delete('/api/websites/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.workspaceUid || 'demo-workspace';
      const id = Number(req.params.id);
      const deleted = await deleteWebsiteForUser(uid, id);
      if (!deleted) {
        return res.status(404).json({ error: 'Website not found.' });
      }
      res.json({ deleted: true, id });
    } catch (error: any) {
      console.error('Failed to delete website:', error);
      res.status(500).json({ error: error.message || 'Failed to delete website' });
    }
  });

  // Outbound Links CRUD
  app.post('/api/links', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.workspaceUid || 'demo-workspace';
      const {
        title,
        slug,
        sourceDomain,
        intermediateDomain,
        destinationUrl,
        referrerPolicy,
      } = req.body;

      if (!title || !String(title).trim()) {
        return res.status(400).json({ error: 'Link title is required.' });
      }

      if (!ALLOWED_POLICIES.has(referrerPolicy)) {
        return res.status(400).json({ error: 'Unsupported browser referrer policy.' });
      }

      const settings = await getPrivacySettingsForUser(uid);
      const urlCheck = validateDestinationUrl(destinationUrl, {
        enforceHttpsOnly: settings ? settings.enforceHttpsOnly : true,
        preventOpenRedirects: settings ? settings.preventOpenRedirects : true,
      });

      if (!urlCheck.valid || !urlCheck.normalizedUrl || !urlCheck.domain) {
        return res.status(400).json({ error: urlCheck.error || 'Invalid destination URL.' });
      }

      const srcCheck = normalizeDomainInput(sourceDomain || 'abc.com');
      if (!srcCheck.valid || !srcCheck.domain) {
        return res.status(400).json({ error: 'Valid source website domain is required.' });
      }

      let cleanIntermediate: string | null = null;
      if (intermediateDomain && String(intermediateDomain).trim() !== '' && intermediateDomain !== 'none') {
        const intCheck = normalizeDomainInput(intermediateDomain);
        if (!intCheck.valid || !intCheck.domain) {
          return res.status(400).json({ error: 'Invalid intermediate website domain.' });
        }
        cleanIntermediate = intCheck.domain;
      }

      const cleanSlug =
        (slug && String(slug).trim().toLowerCase().replace(/[^a-z0-9-_]/g, '-')) ||
        `${srcCheck.domain.split('.')[0]}-${urlCheck.domain.split('.')[0]}-${Math.random().toString(36).slice(2, 7)}`;

      const created = await createOutboundLinkForUser(uid, {
        slug: cleanSlug,
        title: String(title).trim(),
        sourceDomain: srcCheck.domain,
        intermediateDomain: cleanIntermediate,
        destinationUrl: urlCheck.normalizedUrl,
        destinationDomain: urlCheck.domain,
        referrerPolicy,
        status: 'active',
      });

      res.status(201).json(created);
    } catch (error: any) {
      console.error('Failed to create outbound link:', error);
      res.status(500).json({ error: error.message || 'Failed to create outbound link' });
    }
  });

  app.patch('/api/links/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.workspaceUid || 'demo-workspace';
      const id = Number(req.params.id);
      if (!Number.isFinite(id)) {
        return res.status(400).json({ error: 'Invalid link ID.' });
      }

      const updates: Record<string, any> = {};
      if (req.body.title !== undefined) updates.title = String(req.body.title).trim();
      if (req.body.status !== undefined) updates.status = req.body.status;
      if (req.body.referrerPolicy !== undefined) {
        if (!ALLOWED_POLICIES.has(req.body.referrerPolicy)) {
          return res.status(400).json({ error: 'Invalid referrer policy.' });
        }
        updates.referrerPolicy = req.body.referrerPolicy;
      }
      if (req.body.sourceDomain !== undefined) {
        const check = normalizeDomainInput(req.body.sourceDomain);
        if (!check.valid || !check.domain) {
          return res.status(400).json({ error: 'Invalid source domain.' });
        }
        updates.sourceDomain = check.domain;
      }
      if (req.body.intermediateDomain !== undefined) {
        if (!req.body.intermediateDomain || req.body.intermediateDomain === 'none') {
          updates.intermediateDomain = null;
        } else {
          const check = normalizeDomainInput(req.body.intermediateDomain);
          if (!check.valid || !check.domain) {
            return res.status(400).json({ error: 'Invalid intermediate domain.' });
          }
          updates.intermediateDomain = check.domain;
        }
      }
      if (req.body.destinationUrl !== undefined) {
        const settings = await getPrivacySettingsForUser(uid);
        const urlCheck = validateDestinationUrl(req.body.destinationUrl, {
          enforceHttpsOnly: settings ? settings.enforceHttpsOnly : true,
          preventOpenRedirects: settings ? settings.preventOpenRedirects : true,
        });
        if (!urlCheck.valid || !urlCheck.normalizedUrl || !urlCheck.domain) {
          return res.status(400).json({ error: urlCheck.error || 'Invalid destination URL.' });
        }
        updates.destinationUrl = urlCheck.normalizedUrl;
        updates.destinationDomain = urlCheck.domain;
      }

      const updated = await updateOutboundLinkForUser(uid, id, updates);
      if (!updated) {
        return res.status(404).json({ error: 'Outbound link not found.' });
      }
      res.json(updated);
    } catch (error: any) {
      console.error('Failed to update outbound link:', error);
      res.status(500).json({ error: error.message || 'Failed to update outbound link' });
    }
  });

  app.delete('/api/links/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.workspaceUid || 'demo-workspace';
      const id = Number(req.params.id);
      const deleted = await deleteOutboundLinkForUser(uid, id);
      if (!deleted) {
        return res.status(404).json({ error: 'Outbound link not found.' });
      }
      res.json({ deleted: true, id });
    } catch (error: any) {
      console.error('Failed to delete outbound link:', error);
      res.status(500).json({ error: error.message || 'Failed to delete outbound link' });
    }
  });

  // Record outgoing click & return updated link
  app.post('/api/links/:id/click', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.workspaceUid || 'demo-workspace';
      const id = Number(req.params.id);
      const deviceType = req.body.deviceType || 'Desktop';
      const browserName = req.body.browserName || 'Chrome';
      const isUnique = req.body.isUnique !== false;

      const updated = await recordLinkClickForUser(uid, id, {
        deviceType,
        browserName,
        isUnique,
      });
      res.json(updated);
    } catch (error: any) {
      console.error('Failed to record click:', error);
      res.status(500).json({ error: error.message || 'Failed to record click' });
    }
  });

  // Update Global Privacy Settings
  app.put('/api/privacy-settings', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.workspaceUid || 'demo-workspace';
      const updated = await updatePrivacySettingsForUser(uid, req.body);
      res.json(updated);
    } catch (error: any) {
      console.error('Failed to update privacy settings:', error);
      res.status(500).json({ error: error.message || 'Failed to update privacy settings' });
    }
  });

  // Update User Profile & Subscription Plan
  app.put('/api/profile', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.workspaceUid || 'demo-workspace';
      const updated = await updateUserProfile(uid, req.body);
      res.json(updated);
    } catch (error: any) {
      console.error('Failed to update user profile:', error);
      res.status(500).json({ error: error.message || 'Failed to update user profile' });
    }
  });

  // Standards-compliant Referrer-Policy Outbound Gateway Endpoint
  app.get('/go/:slug', async (req, res) => {
    try {
      const link = await getOutboundLinkBySlug(req.params.slug);
      if (!link) {
        return res.status(404).send('Outbound privacy link not found.');
      }
      if (link.status !== 'active') {
        return res.status(410).send('This outbound link is currently disabled by the domain owner.');
      }

      const urlCheck = validateDestinationUrl(link.destinationUrl, {
        enforceHttpsOnly: true,
        preventOpenRedirects: true,
      });
      if (!urlCheck.valid || !urlCheck.normalizedUrl) {
        return res.status(400).send('Destination URL failed security validation.');
      }

      res.setHeader('Referrer-Policy', link.referrerPolicy);
      res.setHeader('Cache-Control', 'no-store, max-age=0');

      const relValue = link.referrerPolicy === 'no-referrer' ? 'noreferrer noopener' : 'noopener';
      res.status(200).send(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="referrer" content="${link.referrerPolicy}" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Referral Privacy Transit — ${link.referrerPolicy}</title>
  <style>
    body { background: #0b0f19; color: #f8fafc; font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 24px; }
    .card { max-width: 520px; width: 100%; background: #111827; border: 1px solid #1e293b; border-radius: 12px; padding: 28px; }
    .kicker { font-size: 12px; color: #94a3b8; margin-bottom: 8px; }
    h1 { font-size: 18px; margin: 0 0 12px; }
    .meta { font-family: monospace; font-size: 13px; background: #0b0f19; border: 1px solid #1e293b; padding: 12px; border-radius: 8px; color: #38bdf8; margin-bottom: 20px; word-break: break-all; }
    .btn { display: inline-block; background: #2563eb; color: #fff; text-decoration: none; padding: 10px 18px; border-radius: 8px; font-size: 14px; font-weight: 600; }
  </style>
</head>
<body>
  <div class="card">
    <div class="kicker">W3C Standard Referrer-Policy Gateway</div>
    <h1>Routing via ${link.intermediateDomain || link.sourceDomain} to ${link.destinationDomain}</h1>
    <div class="meta">
      HTTP Header: Referrer-Policy: ${link.referrerPolicy}<br/>
      Destination: ${urlCheck.normalizedUrl}
    </div>
    <a class="btn" href="${urlCheck.normalizedUrl}" referrerpolicy="${link.referrerPolicy}" rel="${relValue}">
      Proceed to ${link.destinationDomain}
    </a>
  </div>
</body>
</html>`);
    } catch (error) {
      console.error('Error in /go/:slug gateway:', error);
      res.status(500).send('Gateway error');
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Referral Privacy Manager server running on http://localhost:${PORT}`);
  });
}

startServer();
