import React, { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard,
  Globe,
  Link2,
  BarChart3,
  Shield,
  User,
  CreditCard,
  Menu,
  X,
  Plus,
} from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import {
  NavSection,
  UserProfile,
  WebsiteRecord,
  OutboundLinkRecord,
  ClickEventRecord,
  PrivacySettingsRecord,
} from './types';
import { StandardReferrerPolicy, calculateTrafficSummary } from './utils/privacyLogic';
import { OverviewView } from './components/OverviewView';
import { WebsitesView } from './components/WebsitesView';
import { LinksView } from './components/LinksView';
import { AnalyticsView } from './components/AnalyticsView';
import { PrivacySettingsView } from './components/PrivacySettingsView';
import { ProfileBillingView } from './components/ProfileBillingView';

const NAV_ITEMS: { id: NavSection; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'websites', label: 'Websites', icon: Globe },
  { id: 'links', label: 'Outbound Links', icon: Link2 },
  { id: 'analytics', label: 'Traffic Analytics', icon: BarChart3 },
  { id: 'privacy', label: 'Privacy Settings', icon: Shield },
  { id: 'profile', label: 'User Profile', icon: User },
  { id: 'billing', label: 'Subscription & Billing', icon: CreditCard },
];

const SECTION_TITLES: Record<NavSection, string> = {
  overview: 'Overview Dashboard',
  websites: 'Website Management',
  links: 'Outbound Link Management',
  analytics: 'Traffic Analytics',
  privacy: 'Privacy Settings',
  profile: 'User Profile',
  billing: 'Subscription & Billing',
};

function DashboardShell() {
  const { apiFetch, firebaseUser } = useAuth();

  const [activeSection, setActiveSection] = useState<NavSection>('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  const [loading, setLoading] = useState<boolean>(true);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [websites, setWebsites] = useState<WebsiteRecord[]>([]);
  const [links, setLinks] = useState<OutboundLinkRecord[]>([]);
  const [recentEvents, setRecentEvents] = useState<ClickEventRecord[]>([]);
  const [privacySettings, setPrivacySettings] = useState<PrivacySettingsRecord | null>(null);

  const [linkPrefill, setLinkPrefill] = useState<{
    sourceDomain: string;
    intermediateDomain: string | null;
    destinationUrl: string;
    referrerPolicy: StandardReferrerPolicy;
  } | null>(null);

  const loadBootstrap = useCallback(async () => {
    setErrorBanner(null);
    try {
      const data = await apiFetch('/api/bootstrap');
      if (data.profile) setProfile(data.profile);
      if (Array.isArray(data.websites)) setWebsites(data.websites);
      if (Array.isArray(data.links)) setLinks(data.links);
      if (Array.isArray(data.recentEvents)) setRecentEvents(data.recentEvents);
      if (data.privacySettings) setPrivacySettings(data.privacySettings);
    } catch (err: any) {
      console.error('Workspace bootstrap error:', err);
      setErrorBanner(err.message || 'Unable to synchronize workspace data.');
    } finally {
      setLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => {
    loadBootstrap();
  }, [loadBootstrap, firebaseUser]);

  // Handlers for Websites
  const handleAddWebsite = async (payload: {
    domain: string;
    label: string;
    trafficRole: 'source' | 'intermediate' | 'destination';
    defaultPolicy: StandardReferrerPolicy;
    httpsEnforced: boolean;
  }) => {
    const created = await apiFetch<WebsiteRecord>('/api/websites', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    setWebsites((prev) => [created, ...prev]);
  };

  const handleUpdateWebsite = async (
    id: number,
    updates: Partial<{
      label: string;
      trafficRole: 'source' | 'intermediate' | 'destination';
      defaultPolicy: StandardReferrerPolicy;
      httpsEnforced: boolean;
      status: 'active' | 'paused';
    }>
  ) => {
    const updated = await apiFetch<WebsiteRecord>(`/api/websites/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
    setWebsites((prev) => prev.map((w) => (w.id === id ? updated : w)));
  };

  const handleDeleteWebsite = async (id: number) => {
    await apiFetch(`/api/websites/${id}`, { method: 'DELETE' });
    setWebsites((prev) => prev.filter((w) => w.id !== id));
  };

  // Handlers for Outbound Links
  const handleCreateLink = async (payload: {
    title: string;
    slug?: string;
    sourceDomain: string;
    intermediateDomain: string | null;
    destinationUrl: string;
    referrerPolicy: StandardReferrerPolicy;
  }) => {
    const created = await apiFetch<OutboundLinkRecord>('/api/links', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    setLinks((prev) => [created, ...prev]);
  };

  const handleUpdateLink = async (
    id: number,
    updates: Partial<{
      title: string;
      sourceDomain: string;
      intermediateDomain: string | null;
      destinationUrl: string;
      referrerPolicy: StandardReferrerPolicy;
      status: 'active' | 'disabled';
    }>
  ) => {
    const updated = await apiFetch<OutboundLinkRecord>(`/api/links/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
    setLinks((prev) => prev.map((l) => (l.id === id ? updated : l)));
  };

  const handleDeleteLink = async (id: number) => {
    await apiFetch(`/api/links/${id}`, { method: 'DELETE' });
    setLinks((prev) => prev.filter((l) => l.id !== id));
  };

  const handleSimulateClick = async (
    linkId: number,
    meta: {
      deviceType: 'Desktop' | 'Mobile' | 'Tablet';
      browserName: 'Chrome' | 'Safari' | 'Firefox' | 'Edge';
    } = { deviceType: 'Desktop', browserName: 'Chrome' }
  ) => {
    const updated = await apiFetch<OutboundLinkRecord>(`/api/links/${linkId}/click`, {
      method: 'POST',
      body: JSON.stringify({ ...meta, isUnique: true }),
    });
    setLinks((prev) => prev.map((l) => (l.id === linkId ? updated : l)));
    setRecentEvents((prev) => [
      {
        id: Date.now(),
        linkId,
        userUid: updated.userUid,
        sourceDomain: updated.sourceDomain,
        intermediateDomain: updated.intermediateDomain,
        destinationDomain: updated.destinationDomain,
        referrerPolicyApplied: updated.referrerPolicy,
        deviceType: meta.deviceType,
        browserName: meta.browserName,
        isUnique: true,
        eventDate: new Date().toISOString().slice(0, 10),
        clickedAt: new Date().toISOString(),
      },
      ...prev,
    ]);
  };

  // Handlers for Privacy Settings & Profile
  const handleSavePrivacySettings = async (updates: Partial<PrivacySettingsRecord>) => {
    const updated = await apiFetch<PrivacySettingsRecord>('/api/privacy-settings', {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    setPrivacySettings(updated);
  };

  const handleUpdateProfile = async (updates: {
    displayName?: string;
    organization?: string;
    planTier?: string;
    billingCycle?: string;
  }) => {
    const updated = await apiFetch<UserProfile>('/api/profile', {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    setProfile(updated);
  };

  const handleOpenCreateLink = (prefill?: {
    sourceDomain: string;
    intermediateDomain: string | null;
    destinationUrl: string;
    referrerPolicy: StandardReferrerPolicy;
  }) => {
    if (prefill) {
      setLinkPrefill(prefill);
    } else {
      setLinkPrefill({
        sourceDomain: websites.find((w) => w.trafficRole === 'source')?.domain || 'abc.com',
        intermediateDomain:
          websites.find((w) => w.trafficRole === 'intermediate')?.domain || 'bca.com',
        destinationUrl: 'https://dca.com/campaigns/exclusive-membership',
        referrerPolicy: privacySettings?.globalDefaultPolicy || 'no-referrer',
      });
    }
    setActiveSection('links');
  };

  const trafficSummary = calculateTrafficSummary(links);

  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-100 flex">
      {/* Desktop Sidebar Navigation (256px width) */}
      <aside
        aria-label="Sidebar Navigation"
        className="hidden lg:flex lg:flex-col lg:w-64 lg:shrink-0 border-r border-slate-800/90 bg-[#0D1322]"
      >
        <div className="h-16 px-6 flex items-center border-b border-slate-800/90">
          <button
            type="button"
            onClick={() => setActiveSection('overview')}
            className="text-base font-bold tracking-tight text-slate-100 whitespace-nowrap shrink-0 text-left"
          >
            Referral Privacy Manager
          </button>
        </div>

        <nav className="flex-1 px-3 py-5 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveSection(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800/90 text-xs text-slate-400 space-y-1">
          <div className="font-medium text-slate-200 truncate">
            {firebaseUser?.email || profile?.displayName || 'Alex Rivera'}
          </div>
          <div className="text-slate-500 truncate">
            {profile?.organization || 'Apex Traffic & Privacy Ops'}
          </div>
          <div className="font-mono text-[11px] text-blue-400 pt-1">
            {profile?.planTier || 'Enterprise Network'}
          </div>
        </div>
      </aside>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/70"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="relative z-10 w-64 max-w-[80vw] bg-[#0D1322] border-r border-slate-800 flex flex-col">
            <div className="h-14 px-4 flex items-center justify-between border-b border-slate-800">
              <span className="text-sm font-bold text-slate-100">
                Referral Privacy Manager
              </span>
              <button
                type="button"
                aria-label="Close navigation menu"
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 px-3 py-4 space-y-1">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setActiveSection(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                      isActive
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar Contract: 3 Zones separated by responsive gap */}
        <header className="h-14 lg:h-16 px-3 sm:px-6 lg:px-8 border-b border-slate-800/90 bg-[#0B0F19] flex items-center justify-between gap-2 sm:gap-8">
          {/* Zone 1: Brand / Contextual Breadcrumb */}
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              aria-label="Open navigation menu"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-1.5 text-slate-300 hover:text-white rounded-lg shrink-0"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="text-xs sm:text-sm font-semibold text-slate-200 truncate">
              Workspace / {SECTION_TITLES[activeSection]}
            </span>
          </div>

          {/* Zone 2: 4 Concise Single-Line Navigation Links */}
          <nav
            aria-label="Primary Top Navigation"
            className="hidden md:flex items-center gap-6 text-xs font-medium text-slate-400"
          >
            <button
              type="button"
              onClick={() => setActiveSection('overview')}
              className={`hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 ${
                activeSection === 'overview' ? 'text-slate-100 underline underline-offset-4' : ''
              }`}
            >
              Overview
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('websites')}
              className={`hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 ${
                activeSection === 'websites' ? 'text-slate-100 underline underline-offset-4' : ''
              }`}
            >
              Websites
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('links')}
              className={`hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 ${
                activeSection === 'links' ? 'text-slate-100 underline underline-offset-4' : ''
              }`}
            >
              Outbound Links
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('analytics')}
              className={`hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 ${
                activeSection === 'analytics' ? 'text-slate-100 underline underline-offset-4' : ''
              }`}
            >
              Analytics
            </button>
          </nav>

          {/* Zone 3: 1 Primary Action Button */}
          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={() => handleOpenCreateLink()}
              className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-500 transition-colors whitespace-nowrap shrink-0"
            >
              New Outbound Link
            </button>
          </div>
        </header>

        {/* Main Viewport */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {errorBanner && (
            <div
              role="alert"
              className="mb-6 bg-red-950/60 border border-red-800 text-red-200 text-xs rounded-lg px-4 py-3 flex items-center justify-between"
            >
              <span>{errorBanner}</span>
              <button
                type="button"
                onClick={loadBootstrap}
                className="underline font-medium hover:text-white ml-4"
              >
                Retry Sync
              </button>
            </div>
          )}

          {loading ? (
            <div className="space-y-6" aria-busy="true">
              <div className="h-14 bg-slate-900 border border-slate-800 rounded-lg animate-pulse" />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((n) => (
                  <div
                    key={n}
                    className="h-28 bg-slate-900 border border-slate-800 rounded-lg animate-pulse"
                  />
                ))}
              </div>
              <div className="h-80 bg-slate-900 border border-slate-800 rounded-lg animate-pulse" />
            </div>
          ) : (
            <>
              {activeSection === 'overview' && (
                <OverviewView
                  websites={websites}
                  links={links}
                  onNavigate={setActiveSection}
                  onOpenCreateLink={handleOpenCreateLink}
                  onSimulateClick={(linkId) => handleSimulateClick(linkId)}
                />
              )}

              {activeSection === 'websites' && (
                <WebsitesView
                  websites={websites}
                  onAddWebsite={handleAddWebsite}
                  onUpdateWebsite={handleUpdateWebsite}
                  onDeleteWebsite={handleDeleteWebsite}
                />
              )}

              {activeSection === 'links' && (
                <LinksView
                  links={links}
                  websites={websites}
                  initialPrefill={linkPrefill}
                  onClearPrefill={() => setLinkPrefill(null)}
                  onCreateLink={handleCreateLink}
                  onUpdateLink={handleUpdateLink}
                  onDeleteLink={handleDeleteLink}
                  onSimulateClick={(linkId) => handleSimulateClick(linkId)}
                />
              )}

              {activeSection === 'analytics' && (
                <AnalyticsView
                  links={links}
                  recentEvents={recentEvents}
                  onSimulateClickWithTelemetry={handleSimulateClick}
                />
              )}

              {activeSection === 'privacy' && (
                <PrivacySettingsView
                  settings={privacySettings}
                  onSaveSettings={handleSavePrivacySettings}
                />
              )}

              {(activeSection === 'profile' || activeSection === 'billing') && (
                <ProfileBillingView
                  mode={activeSection}
                  profile={profile}
                  websitesCount={websites.length}
                  linksCount={links.length}
                  totalClicks={trafficSummary.totalClicks}
                  onUpdateProfile={handleUpdateProfile}
                />
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <DashboardShell />
    </AuthProvider>
  );
}
