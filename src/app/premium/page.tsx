'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  BadgeCheck,
  Bot,
  Check,
  Crown,
  Loader2,
  Lock,
  Rocket,
  Sparkles,
  Zap,
} from 'lucide-react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { premiumAPI, type CreatorProState, type PremiumPlanOption, type PremiumSubscription } from '@/lib/api/premium';
import { openRazorpayCheckout } from '@/lib/payments/razorpay';

type BusyAction = 'checkout' | 'cancel' | 'boost' | null;
type CheckoutStage = 'idle' | 'creating' | 'awaiting-payment' | 'verifying';
type PremiumTier = 'premium' | 'creator_pro';

const CHECKOUT_STAGE_LABEL: Record<Exclude<CheckoutStage, 'idle'>, string> = {
  creating: 'Starting secure checkout...',
  'awaiting-payment': 'Waiting for payment...',
  verifying: 'Verifying payment...',
};

function formatDate(value?: string | null): string {
  if (!value) return 'Not scheduled';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not scheduled';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function getPlanLabel(plan: PremiumPlanOption): string {
  return plan.billingCycle === 'yearly' ? 'Yearly' : 'Monthly';
}

function readErrorMessage(err: unknown, fallback: string): string {
  const response = (err as { response?: { data?: { error?: string } } })?.response;
  return response?.data?.error || (err as Error)?.message || fallback;
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
  const [selectedTier, setSelectedTier] = useState<PremiumTier>('premium');
  const [selectedBillingCycle, setSelectedBillingCycle] = useState<string>('monthly');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState<BusyAction>(null);
  const [checkoutStage, setCheckoutStage] = useState<CheckoutStage>('idle');
  // Only the first load picks a tier for the member; later refreshes must not override
  // whatever tab they are looking at.
  const tierInitializedRef = useRef(false);

  const tierPlans = useMemo<PremiumPlanOption[]>(() => {
    if (!subscription) return [];
    return selectedTier === 'creator_pro'
      ? subscription.creatorPro?.planOptions || []
      : subscription.planOptions || [];
  }, [selectedTier, subscription]);

  const selectedPlan = useMemo(() => {
    return tierPlans.find((plan) => plan.billingCycle === selectedBillingCycle) || tierPlans[0];
  }, [selectedBillingCycle, tierPlans]);

  const loadPremium = useCallback(async () => {
    setError(null);
    try {
      const [nextSubscription, nextCreatorPro] = await Promise.all([
        premiumAPI.getSubscription(),
        premiumAPI.getCreatorPro().catch(() => null),
      ]);
      setSubscription(nextSubscription);
      setCreatorPro(nextCreatorPro);
      // Premium members are already past the base tier, so Creator Pro is the useful default.
      if (!tierInitializedRef.current) {
        tierInitializedRef.current = true;
        setSelectedTier(
          nextSubscription.isPremium && !nextSubscription.isCreatorPro ? 'creator_pro' : 'premium'
        );
      }
    } catch (err: unknown) {
      setError(readErrorMessage(err, 'Could not load premium state.'));
    } finally {
      setLoading(false);
    }
  }, []);

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
    } catch (err: unknown) {
      setError(readErrorMessage(err, 'Action failed.'));
    } finally {
      setBusyAction(null);
    }
  };

  const tierAlreadyActive =
    selectedTier === 'creator_pro'
      ? Boolean(subscription?.isCreatorPro)
      : Boolean(subscription?.isPremium);
  const checkoutDisabled =
    !subscription?.checkoutEnabled ||
    tierAlreadyActive ||
    !selectedPlan ||
    busyAction !== null;

  const startCheckout = async () => {
    if (!selectedPlan || tierAlreadyActive) return;

    setBusyAction('checkout');
    setMessage(null);
    setError(null);

    let checkoutOpened = false;

    try {
      setCheckoutStage('creating');
      const checkout = await premiumAPI.createCheckout({
        plan: selectedTier,
        billingCycle: selectedPlan.billingCycle,
      });

      if (!checkout.orderId || !checkout.keyId) {
        throw new Error('Checkout could not be started. Please try again.');
      }

      setCheckoutStage('awaiting-payment');
      checkoutOpened = true;
      const outcome = await openRazorpayCheckout({
        keyId: checkout.keyId,
        orderId: checkout.orderId,
        amountMinor: checkout.amountMinor ?? selectedPlan.amountMinor,
        currency: checkout.currency || selectedPlan.currency,
        name: checkout.title || 'Vormex',
        description: checkout.description,
        prefill: checkout.prefill,
      });

      if (outcome.status === 'dismissed') {
        setMessage('Payment cancelled. You have not been charged.');
        return;
      }

      if (outcome.status === 'failed') {
        setError(outcome.message);
        return;
      }

      setCheckoutStage('verifying');
      const verified = await premiumAPI.verifyCheckout(outcome.payment);
      setMessage(verified.message || 'Payment successful. Your plan is now active.');
    } catch (err: unknown) {
      setError(readErrorMessage(err, 'Payment could not be completed.'));
    } finally {
      setCheckoutStage('idle');
      setBusyAction(null);
      // The Razorpay webhook can activate the plan even when the browser step fails, so
      // always resync before deciding what the member sees.
      if (checkoutOpened) {
        await loadPremium();
      }
    }
  };

  const checkoutCtaLabel = (() => {
    if (checkoutStage !== 'idle') return CHECKOUT_STAGE_LABEL[checkoutStage];
    if (!subscription?.checkoutEnabled) return 'Checkout unavailable';
    if (selectedTier === 'creator_pro') {
      return subscription?.isCreatorPro ? 'Creator Pro active' : 'Upgrade to Creator Pro';
    }
    return subscription?.isPremium ? 'Premium active' : 'Go Premium';
  })();

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
                  role="status"
                  aria-live="polite"
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
                      {subscription?.isPremium && subscription?.provider && (
                        <p className="text-xs text-gray-500 dark:text-neutral-500">
                          via {subscription.provider === 'razorpay' ? 'Razorpay' : subscription.provider}
                        </p>
                      )}
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

                  <div className="mt-4 grid grid-cols-2 gap-2 rounded-lg bg-gray-100 p-1 dark:bg-neutral-950">
                    {(['premium', 'creator_pro'] as PremiumTier[]).map((tier) => (
                      <button
                        key={tier}
                        type="button"
                        onClick={() => setSelectedTier(tier)}
                        aria-pressed={selectedTier === tier}
                        className={`rounded-md px-3 py-2 text-sm font-semibold transition ${
                          selectedTier === tier
                            ? 'bg-white text-gray-950 shadow-sm dark:bg-neutral-800 dark:text-white'
                            : 'text-gray-600 hover:text-gray-900 dark:text-neutral-400 dark:hover:text-white'
                        }`}
                      >
                        {tier === 'creator_pro' ? 'Creator Pro' : 'Premium'}
                      </button>
                    ))}
                  </div>

                  <div className="mt-3 grid gap-2">
                    {tierPlans.map((plan) => {
                      const selected = selectedPlan?.billingCycle === plan.billingCycle;
                      return (
                        <button
                          key={`${selectedTier}-${plan.billingCycle}`}
                          type="button"
                          onClick={() => setSelectedBillingCycle(plan.billingCycle)}
                          aria-pressed={selected}
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
                    type="button"
                    onClick={startCheckout}
                    disabled={checkoutDisabled}
                    className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {busyAction === 'checkout' ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Rocket className="h-4 w-4" />
                    )}
                    {checkoutCtaLabel}
                  </button>

                  {subscription?.checkoutEnabled ? (
                    <p className="mt-2 flex items-center justify-center gap-1.5 text-xs text-gray-500 dark:text-neutral-500">
                      <Lock className="h-3 w-3" />
                      Secure payment by Razorpay
                    </p>
                  ) : (
                    <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                      Payments are not available right now. Please try again later.
                    </p>
                  )}

                  {subscription?.canManageInGooglePlay && (
                    <p className="mt-2 text-xs text-gray-500 dark:text-neutral-500">
                      This plan was bought in the Android app. Manage or cancel it in Google Play.
                    </p>
                  )}

                  {subscription?.canCancel && (
                    <button
                      type="button"
                      onClick={() => runAction('cancel', async () => (await premiumAPI.cancelSubscription()).message || null)}
                      disabled={busyAction !== null}
                      className="mt-2 w-full rounded-md border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
                    >
                      {busyAction === 'cancel' ? 'Cancelling...' : 'Cancel premium'}
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
                    Status:{' '}
                    <span className="font-semibold">
                      {creatorPro?.access.canUseCreatorPro ? 'Unlocked' : 'Not active'}
                    </span>
                  </div>
                  {!subscription?.isCreatorPro && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedTier('creator_pro');
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md border border-violet-300 px-4 py-2.5 text-sm font-semibold text-violet-700 hover:bg-violet-50 dark:border-violet-800 dark:text-violet-300 dark:hover:bg-violet-950/30"
                    >
                      <Sparkles className="h-4 w-4" />
                      See Creator Pro pricing
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
                    type="button"
                    onClick={() => runAction('boost', async () => (await premiumAPI.activateProfileBoost(24)).message || null)}
                    disabled={!subscription?.isPremium || busyAction !== null}
                    className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {busyAction === 'boost' ? <Loader2 className="h-4 w-4 animate-spin" /> : <BadgeCheck className="h-4 w-4" />}
                    Activate 24h Boost
                  </button>
                  {!subscription?.isPremium && (
                    <p className="mt-2 text-xs text-gray-500 dark:text-neutral-500">
                      Profile boosts need an active premium plan.
                    </p>
                  )}
                </div>
              </section>
            </>
          )}
        </div>
      </main>
    </ProtectedRoute>
  );
}
