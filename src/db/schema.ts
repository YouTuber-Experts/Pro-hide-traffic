import { relations } from 'drizzle-orm';
import { boolean, integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  displayName: text('display_name').default('Network Administrator'),
  organization: text('organization').default('Apex Digital Media Group'),
  planTier: text('plan_tier').default('Growth Network').notNull(),
  billingCycle: text('billing_cycle').default('monthly').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const websites = pgTable('websites', {
  id: serial('id').primaryKey(),
  userUid: text('user_uid').notNull(),
  domain: text('domain').notNull(),
  label: text('label').notNull(),
  trafficRole: text('traffic_role').notNull(), // 'source' | 'intermediate' | 'destination'
  defaultPolicy: text('default_policy').notNull(), // 'no-referrer' | 'strict-origin' | 'strict-origin-when-cross-origin' | 'origin'
  httpsEnforced: boolean('https_enforced').default(true).notNull(),
  status: text('status').default('active').notNull(), // 'active' | 'paused'
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const outboundLinks = pgTable('outbound_links', {
  id: serial('id').primaryKey(),
  userUid: text('user_uid').notNull(),
  slug: text('slug').notNull().unique(),
  title: text('title').notNull(),
  sourceDomain: text('source_domain').notNull(),
  intermediateDomain: text('intermediate_domain'),
  destinationUrl: text('destination_url').notNull(),
  destinationDomain: text('destination_domain').notNull(),
  referrerPolicy: text('referrer_policy').notNull(), // 'no-referrer' | 'strict-origin' | 'strict-origin-when-cross-origin' | 'origin'
  status: text('status').default('active').notNull(), // 'active' | 'disabled'
  totalClicks: integer('total_clicks').default(0).notNull(),
  uniqueVisitors: integer('unique_visitors').default(0).notNull(),
  impressions: integer('impressions').default(100).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const clickEvents = pgTable('click_events', {
  id: serial('id').primaryKey(),
  linkId: integer('link_id')
    .references(() => outboundLinks.id, { onDelete: 'cascade' })
    .notNull(),
  userUid: text('user_uid').notNull(),
  sourceDomain: text('source_domain').notNull(),
  intermediateDomain: text('intermediate_domain'),
  destinationDomain: text('destination_domain').notNull(),
  referrerPolicyApplied: text('referrer_policy_applied').notNull(),
  deviceType: text('device_type').notNull(), // 'Desktop' | 'Mobile' | 'Tablet'
  browserName: text('browser_name').notNull(), // 'Chrome' | 'Safari' | 'Firefox' | 'Edge'
  isUnique: boolean('is_unique').default(true).notNull(),
  eventDate: text('event_date').notNull(), // YYYY-MM-DD
  clickedAt: timestamp('clicked_at').defaultNow().notNull(),
});

export const privacySettings = pgTable('privacy_settings', {
  id: serial('id').primaryKey(),
  userUid: text('user_uid').notNull().unique(),
  globalDefaultPolicy: text('global_default_policy').default('strict-origin-when-cross-origin').notNull(),
  enforceHttpsOnly: boolean('enforce_https_only').default(true).notNull(),
  preventOpenRedirects: boolean('prevent_open_redirects').default(true).notNull(),
  requireRegisteredDomains: boolean('require_registered_domains').default(true).notNull(),
  stripQueryParametersOnCrossOrigin: boolean('strip_query_parameters_on_cross_origin').default(true).notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const outboundLinksRelations = relations(outboundLinks, ({ many }) => ({
  clicks: many(clickEvents),
}));

export const clickEventsRelations = relations(clickEvents, ({ one }) => ({
  link: one(outboundLinks, {
    fields: [clickEvents.linkId],
    references: [outboundLinks.id],
  }),
}));
