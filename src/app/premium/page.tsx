'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  BadgeCheck,
  Bot,
  Check,
  Crown,
  Loader2,
  Rocket,
  ShieldCheck,
  Sparkles,
  Zap,
} from 'lucide-react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { premiumAPI, type CreatorProState, type PremiumPlanOption, type PremiumSubscription } from '@/lib/api/premium';

type BusyAction = 'checkout' | 'cancel' | 'boost' | 'premium-override' | 'creator-override' | null;

function formatDate(value?: string | null): string {
  if (!value) return 'Not scheduled';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not scheduled';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function getPlanKey(plan: PremiumPlanOption): string {
  return `${plan.billingCycle}-${plan.amountMinor}`;
}

function getPlanLabel(plan: PremiumPlanOption): string {
  return plan.billingCycle === 'yearly' ? 'Yearly' : 'Monthly';
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900">
      <p className="text-xs font-medium uppercase text-gray-500 dark:text-neutral-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-gray-950 dark:text-white">{value}</p>
    </div>
  );
}

function FeatureList({ items }: { items: string[] }) {
  return (
    <div className="grid gap-2">
      {items.map((item) => (
        <div key={item} className="flex items-start gap-2 text-sm text-gray-700 dark:text-neutral-300">
          <Check className="mt-0.5 h-4 w-4 flex-none text-emerald-500" />
          <span>{item}</span>
        </div>
      ))}
    </div>
  );
}

export default function PremiumPage() {
  const [subscription, setSubscription] = useState<PremiumSubscription | null>(null);
  const [creatorPro, setCreatorPro] = useState<CreatorProState | null>(null);
  const [selectedPlanKey, setSelectedPlanKey] = useState<string>('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState<BusyAction>(null);

  const selectedPlan = useMemo(() => {
    return subscription?.planOptions.find((plan) => getPlanKey(plan) === selectedPlanKey) || subscription?.planOptions[0];
  }, [selectedPlanKey, subscription]);

  const loadPremium = useCallback(async () => {
    setError(null);
    try {
      const [nextSubscription, nextCreatorPro] = await Promise.all([
        premiumAPI.getSubscription(),
        premiumAPI.getCreatorPro().catch(() => null),
      ]);
      setSubscription(nextSubscription);
      setCreatorPro(nextCreatorPro);
      if (!selectedPlanKey && nextSubscription.planOptions.length > 0) {
        setSelectedPlanKey(getPlanKey(nextSubscription.planOptions[0]));
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Could not load premium state.');
    } finally {
      setLoading(false);
    }
  }, [selectedPlanKey]);

  useEffect(() => {
    loadPremium();
  }, [loadPremium]);

  const runAction = async (action: BusyAction, fn: () => Promise<string | null>) => {
    setBusyAction(action);
    setMessage(null);
    setError(null);
    try {
      const nextMessage = await fn();
      setMessage(nextMessage || 'Premium state updated.');
      await loadPremium();
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Action failed.');
    } finally {
      setBusyAction(null);
    }
  };

  const startCheckout = () => {
    if (!selectedPlan) return;
    runAction('checkout', async () => {
      const checkout = await premiumAPI.createCheckout({
        plan: subscription?.plan === 'creator_pro' ? 'creator_pro' : 'premium',
        billingCycle: selectedPlan.billingCycle,
      });
      if (checkout.orderId) {
        return `Checkout order created: ${checkout.orderId}. Browser payment capture is ready to wire to Razorpay Checkout.`;
      }
      return 'Checkout request created.';
    });
  };

  return (
    <ProtectedRoute>
      <main className="min-h-screen bg-gray-50 pb-24 text-gray-950 dark:bg-neutral-950 dark:text-white">
        <div className="sticky top-0 z-20 border-b border-gray-200 bg-white/95 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/95">
          <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-4">
            <Link
              href="/more"
              className="inline-flex h-9 w-9 items-center justify-center rounded-md text-gray-600 hover:bg-gray-100 dark:text-neutral-300 dark:hover:bg-neutral-900"
              aria-label="Back"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-xl font-bold">Vormex+</h1>
              <p className="text-sm text-gray-500 dark:text-neutral-400">Premium access, Creator Pro, and profile boosts</p>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-5xl space-y-5 px-4 py-5">
          {loading ? (
            <div className="flex min-h-[320px] items-center justify-center rounded-lg border border-gray-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
              <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
            </div>
          ) : (
            <>
              {(message || error) && (
                <div
                  className={`rounded-lg border px-4 py-3 text-sm ${
                    error
                      ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300'
                      : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300'
                  }`}
                >
                  {error || message}
                </div>
              )}

              <section className="grid gap-4 lg:grid-cols-[1.4fr_0.9fr]">
                <div className="rounded-lg border border-gray-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                        <Crown className="h-4 w-4" />
                        {subscription?.status || 'inactive'}
                      </div>
                      <h2 className="text-2xl font-bold">{subscription?.title || 'Premium'}</h2>
                      <p className="mt-2 max-w-2xl text-sm text-gray-600 dark:text-neutral-400">
                        {subscription?.description || 'Unlock premium Vormex capabilities.'}
                      </p>
                    </div>
                    <div className="text-left lg:text-right">
                      <p className="text-sm text-gray-500 dark:text-neutral-500">Current plan</p>
                      <p className="text-lg font-semibold">{subscription?.plan || 'free'}</p>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    <MetricCard label="Agent" value={subscription?.canUseAgent ? 'Unlocked' : 'Limited'} />
                    <MetricCard label="Renewal" value={subscription?.renewalModeLabel || 'Manual'} />
                    <MetricCard label="Ends" value={formatDate(subscription?.premiumEndsAt)} />
                  </div>

                  <div className="mt-5">
                    <FeatureList items={subscription?.features || []} />
                  </div>
                </div>

                <div className="rounded-lg border border-gray-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
                  <h3 className="flex items-center gap-2 text-lg font-semibold">
                    <Sparkles className="h-5 w-5 text-blue-500" />
                    Choose Plan
                  </h3>
                  <div className="mt-4 grid gap-2">
                    {(subscription?.planOptions || []).map((plan) => {
                      const planKey = getPlanKey(plan);
                      const selected = selectedPlanKey === planKey;
                      return (
                        <button
                          key={planKey}
                          onClick={() => setSelectedPlanKey(planKey)}
                          className={`rounded-lg border p-3 text-left transition ${
                            selected
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30'
                              : 'border-gray-200 hover:bg-gray-50 dark:border-neutral-800 dark:hover:bg-neutral-800'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <span className="font-semibold">{getPlanLabel(plan)}</span>
                            <span className="font-bold">{plan.displayAmount}</span>
                          </div>
                          {plan.savingsLabel && (
                            <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">{plan.savingsLabel}</p>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    onClick={startCheckout}
                    disabled={!subscription?.checkoutEnabled || busyAction !== null}
                    className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {busyAction === 'checkout' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
                    {subscription?.checkoutEnabled ? subscription?.ctaLabel || 'Go Premium' : 'Checkout unavailable'}
                  </button>

                  {subscription?.canCancel && (
                    <button
                      onClick={() => runAction('cancel', async () => (await premiumAPI.cancelSubscription()).message || null)}
                      disabled={busyAction !== null}
                      className="mt-2 w-full rounded-md border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
                    >
                      Cancel premium
                    </button>
                  )}
                </div>
              </section>

              <section className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-lg border border-gray-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
                  <h3 className="flex items-center gap-2 text-lg font-semibold">
                    <Bot className="h-5 w-5 text-violet-500" />
                    Creator Pro
                  </h3>
                  <p className="mt-2 text-sm text-gray-600 dark:text-neutral-400">
                    {creatorPro?.access.description || subscription?.creatorPro.description}
                  </p>
                  <div className="mt-4">
                    <FeatureList items={creatorPro?.access.features || subscription?.creatorPro.features || []} />
                  </div>
                  <div className="mt-4 rounded-lg bg-gray-50 p-3 text-sm dark:bg-neutral-950">
                    Status: <span className="font-semibold">{creatorPro?.access.canUseCreatorPro ? 'Unlocked' : 'Premium required'}</span>
                  </div>
                  {subscription?.developerPremiumOverrideAvailable && (
                    <button
                      onClick={() =>
                        runAction('creator-override', async () => {
                          const response = await premiumAPI.setDeveloperCreatorProOverride(!subscription?.isCreatorPro);
                          return response.message || null;
                        })
                      }
                      disabled={busyAction !== null}
                      className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md border border-violet-300 px-4 py-2.5 text-sm font-semibold text-violet-700 hover:bg-violet-50 disabled:opacity-60 dark:border-violet-800 dark:text-violet-300 dark:hover:bg-violet-950/30"
                    >
                      <ShieldCheck className="h-4 w-4" />
                      {subscription?.isCreatorPro ? 'Disable Creator Pro Test Mode' : 'Enable Creator Pro Test Mode'}
                    </button>
                  )}
                </div>

                <div className="rounded-lg border border-gray-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
                  <h3 className="flex items-center gap-2 text-lg font-semibold">
                    <Zap className="h-5 w-5 text-amber-500" />
                    Profile Boost
                  </h3>
                  <p className="mt-2 text-sm text-gray-600 dark:text-neutral-400">
                    Push your profile higher in discovery and matching while the boost is active.
                  </p>
                  <div className="mt-4 rounded-lg bg-gray-50 p-3 text-sm dark:bg-neutral-950">
                    Boost status:{' '}
                    <span className="font-semibold">
                      {subscription?.profileBoost?.isActive || subscription?.profileBoost?.active ? 'Active' : 'Inactive'}
                    </span>
                    <br />
                    Ends: <span className="font-semibold">{formatDate(subscription?.profileBoost?.endsAt)}</span>
                  </div>
                  <button
                    onClick={() => runAction('boost', async () => (await premiumAPI.activateProfileBoost(24)).message || null)}
                    disabled={!subscription?.isPremium || busyAction !== null}
                    className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {busyAction === 'boost' ? <Loader2 className="h-4 w-4 animate-spin" /> : <BadgeCheck className="h-4 w-4" />}
                    Activate 24h Boost
                  </button>
                </div>
              </section>

              {subscription?.developerPremiumOverrideAvailable && (
                <section className="rounded-lg border border-dashed border-blue-300 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950/20">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="font-semibold text-blue-950 dark:text-blue-100">Developer Premium Override</h3>
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        Test premium flows locally without a payment provider.
                      </p>
                    </div>
                    <button
                      onClick={() =>
                        runAction('premium-override', async () => {
                          const response = await premiumAPI.setDeveloperPremiumOverride(!subscription.developerPremiumOverrideActive);
                          return response.message || null;
                        })
                      }
                      disabled={busyAction !== null}
                      className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                    >
                      {subscription.developerPremiumOverrideActive ? 'Disable Test Premium' : 'Enable Test Premium'}
                    </button>
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </main>
    </ProtectedRoute>
  );
}
