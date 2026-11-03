import { desc, eq, and } from 'drizzle-orm';
import { db } from './index.ts';
import {
  users,
  websites,
  outboundLinks,
  clickEvents,
  privacySettings,
} from './schema.ts';

export async function getOrCreateUser(uid: string, email: string, displayName?: string) {
  try {
    const result = await db
      .insert(users)
      .values({
        uid,
        email,
        displayName: displayName || email.split('@')[0] || 'Network Administrator',
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email,
        },
      })
      .returning();

    return result[0];
  } catch (error) {
    console.error('Database query failed in getOrCreateUser:', error);
    throw new Error('Failed to synchronize user account.', { cause: error });
  }
}

export async function ensureWorkspaceSeeded(uid: string, email = 'ops@referralprivacy.io') {
  try {
    await getOrCreateUser(uid, email);

    const existingSettings = await db
      .select()
      .from(privacySettings)
      .where(eq(privacySettings.userUid, uid));

    if (existingSettings.length === 0) {
      await db
        .insert(privacySettings)
        .values({
          userUid: uid,
          globalDefaultPolicy: 'strict-origin-when-cross-origin',
          enforceHttpsOnly: true,
          preventOpenRedirects: true,
          requireRegisteredDomains: true,
          stripQueryParametersOnCrossOrigin: true,
        })
        .onConflictDoNothing();
    }

    const existingWebsites = await db
      .select()
      .from(websites)
      .where(eq(websites.userUid, uid));

    if (existingWebsites.length === 0) {
      await db.insert(websites).values([
        {
          userUid: uid,
          domain: 'abc.com',
          label: 'ABC Original Adult Portal',
          trafficRole: 'source',
          defaultPolicy: 'no-referrer',
          httpsEnforced: true,
          status: 'active',
        },
        {
          userUid: uid,
          domain: 'bca.com',
          label: 'BCA Intermediate Bridge Site',
          trafficRole: 'intermediate',
          defaultPolicy: 'strict-origin-when-cross-origin',
          httpsEnforced: true,
          status: 'active',
        },
        {
          userUid: uid,
          domain: 'dca.com',
          label: 'DCA Final Destination Store',
          trafficRole: 'destination',
          defaultPolicy: 'origin',
          httpsEnforced: true,
          status: 'active',
        },
        {
          userUid: uid,
          domain: 'xyz-stream.net',
          label: 'XYZ Media Streaming Network',
          trafficRole: 'source',
          defaultPolicy: 'strict-origin',
          httpsEnforced: true,
          status: 'active',
        },
        {
          userUid: uid,
          domain: 'relay-shield.io',
          label: 'RelayShield Transit Domain',
          trafficRole: 'intermediate',
          defaultPolicy: 'no-referrer',
          httpsEnforced: true,
          status: 'active',
        },
      ]);
    }

    const existingLinks = await db
      .select()
      .from(outboundLinks)
      .where(eq(outboundLinks.userUid, uid));

    if (existingLinks.length === 0) {
      const prefix = uid === 'demo-workspace' ? '' : `${uid.slice(0, 6)}-`;
      await db
        .insert(outboundLinks)
        .values([
          {
            userUid: uid,
            slug: `${prefix}abc-bca-dca-vip`,
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
          },
          {
            userUid: uid,
            slug: `${prefix}abc-bca-dca-checkout`,
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
          },
          {
            userUid: uid,
            slug: `${prefix}xyz-relay-dca-app`,
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
          },
          {
            userUid: uid,
            slug: `${prefix}bca-dca-editorial`,
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
          },
          {
            userUid: uid,
            slug: `${prefix}abc-legacy-archive`,
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
          },
        ])
        .onConflictDoNothing();
    }
  } catch (error) {
    console.error('Database query failed in ensureWorkspaceSeeded:', error);
    throw new Error('Failed to initialize workspace data.', { cause: error });
  }
}

export async function getUserProfile(uid: string) {
  try {
    const rows = await db.select().from(users).where(eq(users.uid, uid));
    return rows[0] || null;
  } catch (error) {
    console.error('Database query failed in getUserProfile:', error);
    throw new Error('Failed to load user profile.', { cause: error });
  }
}

export async function updateUserProfile(
  uid: string,
  updates: { displayName?: string; organization?: string; planTier?: string; billingCycle?: string }
) {
  try {
    const rows = await db
      .update(users)
      .set(updates)
      .where(eq(users.uid, uid))
      .returning();
    return rows[0];
  } catch (error) {
    console.error('Database query failed in updateUserProfile:', error);
    throw new Error('Failed to update user profile.', { cause: error });
  }
}

export async function getWebsitesByUser(uid: string) {
  try {
    return await db
      .select()
      .from(websites)
      .where(eq(websites.userUid, uid))
      .orderBy(desc(websites.createdAt));
  } catch (error) {
    console.error('Database query failed in getWebsitesByUser:', error);
    throw new Error('Failed to fetch websites.', { cause: error });
  }
}

export async function createWebsiteForUser(
  uid: string,
  data: {
    domain: string;
    label: string;
    trafficRole: string;
    defaultPolicy: string;
    httpsEnforced: boolean;
  }
) {
  try {
    const rows = await db
      .insert(websites)
      .values({
        userUid: uid,
        domain: data.domain,
        label: data.label,
        trafficRole: data.trafficRole,
        defaultPolicy: data.defaultPolicy,
        httpsEnforced: data.httpsEnforced,
        status: 'active',
      })
      .returning();
    return rows[0];
  } catch (error) {
    console.error('Database query failed in createWebsiteForUser:', error);
    throw new Error('Failed to add website.', { cause: error });
  }
}

export async function updateWebsiteForUser(
  uid: string,
  id: number,
  updates: {
    label?: string;
    trafficRole?: string;
    defaultPolicy?: string;
    httpsEnforced?: boolean;
    status?: string;
  }
) {
  try {
    const rows = await db
      .update(websites)
      .set(updates)
      .where(and(eq(websites.id, id), eq(websites.userUid, uid)))
      .returning();
    return rows[0] || null;
  } catch (error) {
    console.error('Database query failed in updateWebsiteForUser:', error);
    throw new Error('Failed to update website settings.', { cause: error });
  }
}

export async function deleteWebsiteForUser(uid: string, id: number) {
  try {
    const rows = await db
      .delete(websites)
      .where(and(eq(websites.id, id), eq(websites.userUid, uid)))
      .returning();
    return rows[0] || null;
  } catch (error) {
    console.error('Database query failed in deleteWebsiteForUser:', error);
    throw new Error('Failed to delete website.', { cause: error });
  }
}

export async function getOutboundLinksByUser(uid: string) {
  try {
    return await db
      .select()
      .from(outboundLinks)
      .where(eq(outboundLinks.userUid, uid))
      .orderBy(desc(outboundLinks.createdAt));
  } catch (error) {
    console.error('Database query failed in getOutboundLinksByUser:', error);
    throw new Error('Failed to fetch outbound links.', { cause: error });
  }
}

export async function getOutboundLinkBySlug(slug: string) {
  try {
    const rows = await db
      .select()
      .from(outboundLinks)
      .where(eq(outboundLinks.slug, slug));
    return rows[0] || null;
  } catch (error) {
    console.error('Database query failed in getOutboundLinkBySlug:', error);
    throw new Error('Failed to lookup outbound link.', { cause: error });
  }
}

export async function createOutboundLinkForUser(
  uid: string,
  data: {
    slug: string;
    title: string;
    sourceDomain: string;
    intermediateDomain: string | null;
    destinationUrl: string;
    destinationDomain: string;
    referrerPolicy: string;
    status?: string;
  }
) {
  try {
    const rows = await db
      .insert(outboundLinks)
      .values({
        userUid: uid,
        slug: data.slug,
        title: data.title,
        sourceDomain: data.sourceDomain,
        intermediateDomain: data.intermediateDomain,
        destinationUrl: data.destinationUrl,
        destinationDomain: data.destinationDomain,
        referrerPolicy: data.referrerPolicy,
        status: data.status || 'active',
        totalClicks: 1,
        uniqueVisitors: 1,
        impressions: 20,
      })
      .returning();
    return rows[0];
  } catch (error) {
    console.error('Database query failed in createOutboundLinkForUser:', error);
    throw new Error('Failed to create outbound link.', { cause: error });
  }
}

export async function updateOutboundLinkForUser(
  uid: string,
  id: number,
  updates: {
    title?: string;
    sourceDomain?: string;
    intermediateDomain?: string | null;
    destinationUrl?: string;
    destinationDomain?: string;
    referrerPolicy?: string;
    status?: string;
  }
) {
  try {
    const rows = await db
      .update(outboundLinks)
      .set(updates)
      .where(and(eq(outboundLinks.id, id), eq(outboundLinks.userUid, uid)))
      .returning();
    return rows[0] || null;
  } catch (error) {
    console.error('Database query failed in updateOutboundLinkForUser:', error);
    throw new Error('Failed to update outbound link.', { cause: error });
  }
}

export async function deleteOutboundLinkForUser(uid: string, id: number) {
  try {
    const rows = await db
      .delete(outboundLinks)
      .where(and(eq(outboundLinks.id, id), eq(outboundLinks.userUid, uid)))
      .returning();
    return rows[0] || null;
  } catch (error) {
    console.error('Database query failed in deleteOutboundLinkForUser:', error);
    throw new Error('Failed to delete outbound link.', { cause: error });
  }
}

export async function recordLinkClickForUser(
  uid: string,
  linkId: number,
  meta: {
    deviceType: string;
    browserName: string;
    isUnique: boolean;
  }
) {
  try {
    const existingRows = await db
      .select()
      .from(outboundLinks)
      .where(and(eq(outboundLinks.id, linkId), eq(outboundLinks.userUid, uid)));

    const link = existingRows[0];
    if (!link) {
      throw new Error('Outbound link not found.');
    }

    const updatedRows = await db
      .update(outboundLinks)
      .set({
        totalClicks: link.totalClicks + 1,
        uniqueVisitors: link.uniqueVisitors + (meta.isUnique ? 1 : 0),
        impressions: link.impressions + 4,
      })
      .where(eq(outboundLinks.id, linkId))
      .returning();

    const todayStr = new Date().toISOString().slice(0, 10);
    await db.insert(clickEvents).values({
      linkId: link.id,
      userUid: uid,
      sourceDomain: link.sourceDomain,
      intermediateDomain: link.intermediateDomain,
      destinationDomain: link.destinationDomain,
      referrerPolicyApplied: link.referrerPolicy,
      deviceType: meta.deviceType,
      browserName: meta.browserName,
      isUnique: meta.isUnique,
      eventDate: todayStr,
    });

    return updatedRows[0];
  } catch (error) {
    console.error('Database query failed in recordLinkClickForUser:', error);
    throw new Error('Failed to record outbound link click.', { cause: error });
  }
}

export async function getPrivacySettingsForUser(uid: string) {
  try {
    const rows = await db
      .select()
      .from(privacySettings)
      .where(eq(privacySettings.userUid, uid));
    return rows[0] || null;
  } catch (error) {
    console.error('Database query failed in getPrivacySettingsForUser:', error);
    throw new Error('Failed to fetch privacy settings.', { cause: error });
  }
}

export async function updatePrivacySettingsForUser(
  uid: string,
  updates: {
    globalDefaultPolicy?: string;
    enforceHttpsOnly?: boolean;
    preventOpenRedirects?: boolean;
    requireRegisteredDomains?: boolean;
    stripQueryParametersOnCrossOrigin?: boolean;
  }
) {
  try {
    const rows = await db
      .update(privacySettings)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(privacySettings.userUid, uid))
      .returning();
    return rows[0] || null;
  } catch (error) {
    console.error('Database query failed in updatePrivacySettingsForUser:', error);
    throw new Error('Failed to update privacy settings.', { cause: error });
  }
}

export async function getRecentClickEventsForUser(uid: string) {
  try {
    return await db
      .select()
      .from(clickEvents)
      .where(eq(clickEvents.userUid, uid))
      .orderBy(desc(clickEvents.clickedAt))
      .limit(50);
  } catch (error) {
    console.error('Database query failed in getRecentClickEventsForUser:', error);
    throw new Error('Failed to load click events.', { cause: error });
  }
}
