/**
 * Razorpay Checkout bridge.
 *
 * The backend owns every amount: it creates the order and re-verifies the captured payment
 * against the Razorpay API, so nothing here is trusted. This module only loads the hosted
 * checkout script and turns its callback-based API into a promise.
 */

import { CANONICAL_SITE_ORIGIN } from '@/lib/seo';

const RAZORPAY_CHECKOUT_SRC = 'https://checkout.razorpay.com/v1/checkout.js';
const SCRIPT_ID = 'razorpay-checkout-js';
const CHECKOUT_LOGO_PATH = '/logo.png';

/**
 * Absolute URL for the brand mark Razorpay shows beside the plan name. It must be absolute:
 * the checkout sheet renders inside an api.razorpay.com iframe, so a relative path would
 * resolve against Razorpay's origin and fall back to a generated letter tile.
 *
 * That iframe is https, so an http origin (local dev) would be blocked as mixed content —
 * in that case the identical asset is served from the public site so the logo still shows.
 */
export function resolveCheckoutLogoUrl(): string {
  const origin = typeof window === 'undefined' ? '' : window.location.origin;
  const base = origin.startsWith('https://') ? origin : CANONICAL_SITE_ORIGIN;
  return `${base}${CHECKOUT_LOGO_PATH}`;
}

export interface RazorpayCheckoutPayment {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}

export interface RazorpayCheckoutOptions {
  keyId: string;
  orderId: string;
  amountMinor: number;
  currency: string;
  name: string;
  description?: string;
  /** Overrides the brand logo; defaults to `resolveCheckoutLogoUrl()`. */
  image?: string;
  prefill?: {
    name?: string | null;
    email?: string | null;
    contact?: string | null;
  };
  notes?: Record<string, string>;
  themeColor?: string;
}

export type RazorpayCheckoutOutcome =
  | { status: 'paid'; payment: RazorpayCheckoutPayment }
  | { status: 'dismissed' }
  | { status: 'failed'; message: string; code?: string };

type RazorpayCheckoutHandlerResponse = {
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
  razorpay_signature?: string;
};

type RazorpayFailureResponse = {
  error?: {
    code?: string;
    description?: string;
    reason?: string;
  };
};

type RazorpayInstance = {
  open: () => void;
  close?: () => void;
  on?: (event: string, handler: (response: RazorpayFailureResponse) => void) => void;
};

type RazorpayConstructor = new (options: Record<string, unknown>) => RazorpayInstance;

declare global {
  interface Window {
    Razorpay?: RazorpayConstructor;
  }
}

let scriptPromise: Promise<RazorpayConstructor> | null = null;

export function isRazorpayCheckoutLoaded(): boolean {
  return typeof window !== 'undefined' && typeof window.Razorpay === 'function';
}

/**
 * Loads checkout.js once per page and reuses the same promise for later calls. A failed
 * load clears the cache so a retry can attempt the download again.
 */
export function loadRazorpayCheckout(): Promise<RazorpayConstructor> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Razorpay Checkout can only load in the browser.'));
  }

  if (window.Razorpay) {
    return Promise.resolve(window.Razorpay);
  }

  if (scriptPromise) {
    return scriptPromise;
  }

  scriptPromise = new Promise<RazorpayConstructor>((resolve, reject) => {
    const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    const script = existing || document.createElement('script');

    const handleLoad = () => {
      if (window.Razorpay) {
        resolve(window.Razorpay);
        return;
      }
      reject(new Error('Razorpay Checkout loaded but did not initialise.'));
    };

    const handleError = () => {
      script.remove();
      reject(new Error('Could not load Razorpay Checkout. Check your connection and try again.'));
    };

    script.addEventListener('load', handleLoad, { once: true });
    script.addEventListener('error', handleError, { once: true });

    if (!existing) {
      script.id = SCRIPT_ID;
      script.src = RAZORPAY_CHECKOUT_SRC;
      script.async = true;
      document.body.appendChild(script);
    }
  });

  scriptPromise.catch(() => {
    scriptPromise = null;
  });

  return scriptPromise;
}

function toPayment(
  response: RazorpayCheckoutHandlerResponse
): RazorpayCheckoutPayment | null {
  const razorpayOrderId = response.razorpay_order_id?.trim();
  const razorpayPaymentId = response.razorpay_payment_id?.trim();
  const razorpaySignature = response.razorpay_signature?.trim();

  if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
    return null;
  }

  return { razorpayOrderId, razorpayPaymentId, razorpaySignature };
}

/**
 * Opens the hosted checkout and resolves once the user pays, dismisses, or the payment
 * fails. It never rejects for a user-driven outcome — only when checkout cannot open.
 */
export async function openRazorpayCheckout(
  options: RazorpayCheckoutOptions
): Promise<RazorpayCheckoutOutcome> {
  const Razorpay = await loadRazorpayCheckout();

  return new Promise<RazorpayCheckoutOutcome>((resolve) => {
    // Both `handler` and `modal.ondismiss` can fire for one session, so the first
    // outcome wins and later callbacks are ignored.
    let settled = false;
    const settle = (outcome: RazorpayCheckoutOutcome) => {
      if (settled) return;
      settled = true;
      resolve(outcome);
    };

    const checkout = new Razorpay({
      key: options.keyId,
      order_id: options.orderId,
      amount: options.amountMinor,
      currency: options.currency,
      name: options.name,
      description: options.description,
      image: options.image || resolveCheckoutLogoUrl(),
      prefill: {
        name: options.prefill?.name || undefined,
        email: options.prefill?.email || undefined,
        contact: options.prefill?.contact || undefined,
      },
      notes: options.notes,
      theme: { color: options.themeColor || '#2563eb' },
      retry: { enabled: false },
      handler: (response: RazorpayCheckoutHandlerResponse) => {
        const payment = toPayment(response);
        if (!payment) {
          settle({
            status: 'failed',
            message: 'Razorpay did not return complete payment details.',
          });
          return;
        }
        settle({ status: 'paid', payment });
      },
      modal: {
        escape: false,
        ondismiss: () => settle({ status: 'dismissed' }),
      },
    });

    checkout.on?.('payment.failed', (response) => {
      settle({
        status: 'failed',
        message:
          response.error?.description ||
          response.error?.reason ||
          'The payment could not be completed.',
        code: response.error?.code,
      });
    });

    checkout.open();
  });
}
