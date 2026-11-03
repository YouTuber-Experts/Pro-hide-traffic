import { StandardReferrerPolicy } from './utils/privacyLogic';

export type NavSection =
  | 'overview'
  | 'websites'
  | 'links'
  | 'analytics'
  | 'privacy'
  | 'profile'
  | 'billing';

export interface UserProfile {
  id: number;
  uid: string;
  email: string;
  displayName: string;
  organization: string;
  planTier: string;
  billingCycle: string;
  createdAt: string;
}

export interface WebsiteRecord {
  id: number;
  userUid: string;
  domain: string;
  label: string;
  trafficRole: 'source' | 'intermediate' | 'destination';
  defaultPolicy: StandardReferrerPolicy;
  httpsEnforced: boolean;
  status: 'active' | 'paused';
  createdAt: string;
}

export interface OutboundLinkRecord {
  id: number;
  userUid: string;
  slug: string;
  title: string;
  sourceDomain: string;
  intermediateDomain: string | null;
  destinationUrl: string;
  destinationDomain: string;
  referrerPolicy: StandardReferrerPolicy;
  status: 'active' | 'disabled';
  totalClicks: number;
  uniqueVisitors: number;
  impressions: number;
  createdAt: string;
}

export interface ClickEventRecord {
  id: number;
  linkId: number;
  userUid: string;
  sourceDomain: string;
  intermediateDomain: string | null;
  destinationDomain: string;
  referrerPolicyApplied: StandardReferrerPolicy;
  deviceType: 'Desktop' | 'Mobile' | 'Tablet';
  browserName: 'Chrome' | 'Safari' | 'Firefox' | 'Edge';
  isUnique: boolean;
  eventDate: string;
  clickedAt: string;
}

export interface PrivacySettingsRecord {
  id: number;
  userUid: string;
  globalDefaultPolicy: StandardReferrerPolicy;
  enforceHttpsOnly: boolean;
  preventOpenRedirects: boolean;
  requireRegisteredDomains: boolean;
  stripQueryParametersOnCrossOrigin: boolean;
  updatedAt: string;
}
