import React, { useState } from 'react';
import { Check, LogIn, LogOut, UserCheck, CreditCard } from 'lucide-react';
import { UserProfile } from '../types';
import { useAuth } from '../context/AuthContext';

interface ProfileBillingViewProps {
  mode: 'profile' | 'billing';
  profile: UserProfile | null;
  websitesCount: number;
  linksCount: number;
  totalClicks: number;
  onUpdateProfile: (updates: {
    displayName?: string;
    organization?: string;
    planTier?: string;
    billingCycle?: string;
  }) => Promise<void>;
}

const PRICING_TIERS = [
  {
    name: 'Starter Publisher',
    audience: 'For independent domain owners',
    monthlyPrice: 29,
    annualPrice: 24,
    domainLimit: 'Up to 5 domains',
    linkLimit: '50 active privacy links',
    clickAllowance: '100,000 monthly clicks',
    policies: 'All 4 W3C Referrer-Policy standards',
    analyticsRetention: '30-day traffic analytics retention',
  },
  {
    name: 'Growth Network',
    audience: 'For multi-domain bridge networks',
    monthlyPrice: 79,
    annualPrice: 65,
    domainLimit: 'Up to 25 domains (ABC → BCA → DCA)',
    linkLimit: '500 active privacy links',
    clickAllowance: '1,000,000 monthly clicks',
    policies: 'Per-domain + per-link policy overrides',
    analyticsRetention: '1-year daily/weekly/monthly retention',
  },
  {
    name: 'Enterprise Network',
    audience: 'For high-volume traffic operations',
    monthlyPrice: 199,
    annualPrice: 165,
    domainLimit: 'Unlimited source & bridge domains',
    linkLimit: 'Unlimited outbound privacy links',
    clickAllowance: '10,000,000+ monthly clicks',
    policies: 'Strict open-redirect & HTTPS enforcement SLA',
    analyticsRetention: 'Unlimited audit & telemetry history',
  },
];

export const ProfileBillingView: React.FC<ProfileBillingViewProps> = ({
  mode,
  profile,
  websitesCount,
  linksCount,
  totalClicks,
  onUpdateProfile,
}) => {
  const { firebaseUser, authError, signInWithGoogle, logout } = useAuth();

  const [displayName, setDisplayName] = useState<string>(
    profile?.displayName || 'Alex Rivera'
  );
  const [organization, setOrganization] = useState<string>(
    profile?.organization || 'Apex Traffic & Privacy Ops'
  );
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>(
    (profile?.billingCycle as 'monthly' | 'annual') || 'annual'
  );
  const [saving, setSaving] = useState<boolean>(false);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavedNotice(null);
    try {
      await onUpdateProfile({
        displayName: displayName.trim(),
        organization: organization.trim(),
      });
      setSavedNotice('Account profile updated in PostgreSQL.');
      setTimeout(() => setSavedNotice(null), 2500);
    } finally {
      setSaving(false);
    }
  };

  const handleSelectPlan = async (planName: string) => {
    setSaving(true);
    setSavedNotice(null);
    try {
      await onUpdateProfile({
        planTier: planName,
        billingCycle,
      });
      setSavedNotice(`Subscription updated to ${planName} (${billingCycle}).`);
      setTimeout(() => setSavedNotice(null), 2500);
    } finally {
      setSaving(false);
    }
  };

  if (mode === 'profile') {
    return (
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <p className="text-xs text-slate-400 mb-1">
              Firebase Google Authentication · Organization Workspace Identity
            </p>
            <h1 className="text-2xl font-bold tracking-tight text-slate-100">
              User Profile & Authentication
            </h1>
          </div>
          {savedNotice && (
            <div className="text-xs font-medium text-emerald-400">{savedNotice}</div>
          )}
        </div>

        {/* Google Authentication Card */}
        <section className="bg-slate-900/90 border border-slate-800 rounded-lg p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-slate-100">
                Authentication Session Status
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                {firebaseUser
                  ? `Signed in with Google as ${firebaseUser.email} (UID: ${firebaseUser.uid.slice(0, 10)}...)`
                  : 'Currently operating in pre-seeded Enterprise Workspace mode. Sign in with Google via Firebase Auth to bind records to your personal Google account.'}
              </p>
              {authError && (
                <p className="text-xs text-red-400 mt-1.5">{authError}</p>
              )}
            </div>

            <div>
              {firebaseUser ? (
                <button
                  type="button"
                  onClick={logout}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors whitespace-nowrap"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sign Out
                </button>
              ) : (
                <button
                  type="button"
                  onClick={signInWithGoogle}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors whitespace-nowrap"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  Sign In with Google
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Profile Form */}
        <form
          onSubmit={handleSaveProfile}
          className="bg-slate-900/90 border border-slate-800 rounded-lg p-6 space-y-5"
        >
          <div>
            <h2 className="text-base font-semibold text-slate-100">
              Administrator Profile & Organization
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Changes are persisted directly to your Cloud SQL PostgreSQL profile record.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="profile-display-name"
                className="block text-xs font-medium text-slate-300 mb-1.5"
              >
                Administrator Full Name
              </label>
              <input
                id="profile-display-name"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label
                htmlFor="profile-organization"
                className="block text-xs font-medium text-slate-300 mb-1.5"
              >
                Organization / Network Name
              </label>
              <input
                id="profile-organization"
                type="text"
                value={organization}
                onChange={(e) => setOrganization(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label
                htmlFor="profile-email-readonly"
                className="block text-xs font-medium text-slate-300 mb-1.5"
              >
                Primary Account Email
              </label>
              <input
                id="profile-email-readonly"
                type="email"
                readOnly
                value={firebaseUser?.email || profile?.email || 'ops@referralprivacy.io'}
                className="w-full bg-slate-950/60 border border-slate-800 rounded-lg px-3.5 py-2 text-xs font-mono text-slate-400"
              />
            </div>

            <div>
              <label
                htmlFor="profile-tier-readonly"
                className="block text-xs font-medium text-slate-300 mb-1.5"
              >
                Active Subscription Plan
              </label>
              <input
                id="profile-tier-readonly"
                type="text"
                readOnly
                value={`${profile?.planTier || 'Enterprise Network'} (${
                  profile?.billingCycle || 'annual'
                })`}
                className="w-full bg-slate-950/60 border border-slate-800 rounded-lg px-3.5 py-2 text-xs font-mono text-emerald-400"
              />
            </div>
          </div>

          <div className="flex justify-end pt-3 border-t border-slate-800">
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-500 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving Profile...' : 'Save Profile Settings'}
            </button>
          </div>
        </form>
      </div>
    );
  }

  // Subscription & Billing View
  const currentPlan = profile?.planTier || 'Enterprise Network';

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <p className="text-xs text-slate-400 mb-1">
            Plan Quotas · Multi-Domain Capacity · Billing Cadence
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100">
            Subscription & Billing Management
          </h1>
        </div>

        {/* Billing Cadence Segmented Switch */}
        <div className="inline-flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-lg">
          <button
            type="button"
            onClick={() => setBillingCycle('monthly')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              billingCycle === 'monthly'
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Monthly Billing
          </button>
          <button
            type="button"
            onClick={() => setBillingCycle('annual')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              billingCycle === 'annual'
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Annual Billing (Save 18%)
          </button>
        </div>
      </div>

      {savedNotice && (
        <div className="bg-emerald-950/40 border border-emerald-800 text-emerald-200 text-xs rounded-lg px-4 py-3">
          {savedNotice}
        </div>
      )}

      {/* Current Usage Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-5">
          <div className="text-xs text-slate-400">Active Subscription Tier</div>
          <div className="mt-2 text-xl font-bold text-slate-100">{currentPlan}</div>
          <div className="mt-1 text-xs text-emerald-400">
            Active · {billingCycle === 'annual' ? 'Billed Annually' : 'Billed Monthly'}
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-5">
          <div className="text-xs text-slate-400">Managed Domains & Links</div>
          <div className="mt-2 text-xl font-bold text-slate-100 font-mono tabular-nums">
            {websitesCount} domains · {linksCount} links
          </div>
          <div className="mt-1 text-xs text-slate-400">
            Within plan allowance
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-5">
          <div className="text-xs text-slate-400">Monthly Outbound Click Volume</div>
          <div className="mt-2 text-xl font-bold text-slate-100 font-mono tabular-nums">
            {totalClicks.toLocaleString()} / 10,000,000
          </div>
          <div className="mt-1 text-xs text-slate-400">
            {((totalClicks / 10000000) * 100).toFixed(2)}% of monthly quota utilized
          </div>
        </div>
      </div>

      {/* Pricing Tier Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {PRICING_TIERS.map((tier) => {
          const isCurrent = currentPlan === tier.name;
          const price =
            billingCycle === 'annual' ? tier.annualPrice : tier.monthlyPrice;

          return (
            <div
              key={tier.name}
              className={`rounded-lg border p-6 flex flex-col justify-between ${
                isCurrent
                  ? 'bg-slate-900 border-blue-500'
                  : 'bg-slate-900/80 border-slate-800'
              }`}
            >
              <div>
                <div className="text-xs text-blue-400 font-medium">{tier.audience}</div>
                <h2 className="text-lg font-bold text-slate-100 mt-1">{tier.name}</h2>

                <div className="mt-4 flex items-baseline gap-1 font-mono tabular-nums">
                  <span className="text-3xl font-bold text-slate-100">${price}</span>
                  <span className="text-xs text-slate-400">/ month</span>
                </div>

                <div className="mt-6 pt-5 border-t border-slate-800 space-y-3 text-xs text-slate-300">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Domain Registry:</span>
                    <span className="font-mono text-slate-100">{tier.domainLimit}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Outbound Links:</span>
                    <span className="font-mono text-slate-100">{tier.linkLimit}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Traffic Volume:</span>
                    <span className="font-mono text-slate-100">{tier.clickAllowance}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Policy Controls:</span>
                    <span className="text-right text-slate-200">{tier.policies}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Retention:</span>
                    <span className="text-right text-slate-200">
                      {tier.analyticsRetention}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  disabled={isCurrent || saving}
                  onClick={() => handleSelectPlan(tier.name)}
                  className={`w-full py-2.5 px-4 rounded-lg text-xs font-semibold transition-colors ${
                    isCurrent
                      ? 'bg-slate-800 text-emerald-400 cursor-default'
                      : 'bg-blue-600 text-white hover:bg-blue-500'
                  }`}
                >
                  {isCurrent ? 'Current Active Plan' : `Switch to ${tier.name}`}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
