import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { resolveCheckoutLogoUrl } from '../src/lib/payments/razorpay';
import { CANONICAL_SITE_ORIGIN } from '../src/lib/seo';

function source(path: string): string {
  return readFileSync(join(process.cwd(), path), 'utf8').replace(/\r\n/g, '\n');
}

function withWindowOrigin(origin: string | null, run: () => void): void {
  const globalRef = globalThis as { window?: unknown };
  const original = globalRef.window;
  const hadWindow = 'window' in globalRef;

  if (origin === null) {
    delete globalRef.window;
  } else {
    globalRef.window = { location: { origin } };
  }

  try {
    run();
  } finally {
    if (hadWindow) {
      globalRef.window = original;
    } else {
      delete globalRef.window;
    }
  }
}

test('checkout logo is always an absolute https URL Razorpay can load from its iframe', () => {
  withWindowOrigin('https://www.vormex.in', () => {
    assert.equal(resolveCheckoutLogoUrl(), 'https://www.vormex.in/logo.png');
  });

  // Preview deployments serve the same asset from their own https origin.
  withWindowOrigin('https://vormex-web-preview.vercel.app', () => {
    assert.equal(resolveCheckoutLogoUrl(), 'https://vormex-web-preview.vercel.app/logo.png');
  });
});

test('http and server-side origins fall back to the public site instead of a blocked image', () => {
  // An http subresource inside Razorpay's https iframe is blocked as mixed content, which
  // is what makes the checkout render its generated letter tile instead of the brand mark.
  withWindowOrigin('http://localhost:3000', () => {
    assert.equal(resolveCheckoutLogoUrl(), `${CANONICAL_SITE_ORIGIN}/logo.png`);
  });

  withWindowOrigin(null, () => {
    assert.equal(resolveCheckoutLogoUrl(), `${CANONICAL_SITE_ORIGIN}/logo.png`);
  });
});

test('the logo the checkout points at is actually shipped in public/', () => {
  assert.ok(existsSync(join(process.cwd(), 'public/logo.png')));
});

test('checkout options pass the brand logo through to Razorpay', () => {
  const checkout = source('src/lib/payments/razorpay.ts');

  assert.match(checkout, /image: options\.image \|\| resolveCheckoutLogoUrl\(\)/);
});
