'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { authAPI } from '@/lib/api/auth';
import { applyReferralCode } from '@/lib/api/referrals';
import { useAuthContext } from '@/lib/auth/authContext';
import { setPendingUser } from '@/lib/auth/authHelpers';
import { handleApiError } from '@/lib/utils/errorHandler';
import '../../../login/login.css';

function GoogleCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setAuth } = useAuthContext();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get authorization code and state from URL
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const errorParam = searchParams.get('error');

        // Check for OAuth errors
        if (errorParam) {
          setError(`Google OAuth error: ${errorParam}`);
          setIsLoading(false);
          setTimeout(() => router.push('/login'), 3000);
          return;
        }

        // Validate state (CSRF protection)
        const storedState = sessionStorage.getItem('oauth_state');
        if (!state || state !== storedState) {
        setError('Invalid state parameter. Please try again.');
        setIsLoading(false);
        sessionStorage.removeItem('oauth_state');
        sessionStorage.removeItem('oauth_code_verifier');
        setTimeout(() => router.push('/login'), 3000);
        return;
      }

      if (!code) {
        setError('Authorization code not found. Please try again.');
        setIsLoading(false);
        sessionStorage.removeItem('oauth_state');
        sessionStorage.removeItem('oauth_code_verifier');
        setTimeout(() => router.push('/login'), 3000);
        return;
      }

        // Exchange the authorization code through the backend so Google secrets stay server-side.
        const redirectUri = `${window.location.origin}/auth/google/callback`;
        const codeVerifier = sessionStorage.getItem('oauth_code_verifier');
        
        if (!codeVerifier) {
          throw new Error('Code verifier not found. Please try signing in again.');
        }

        const authResponse = await authAPI.googleCodeSignIn({
          code,
          codeVerifier,
          redirectUri,
        });

        setAuth(authResponse);
        setPendingUser(authResponse.user);

        const referralCode = sessionStorage.getItem('oauth_referral_code');
        if (referralCode) {
          try {
            await applyReferralCode(referralCode);
          } catch (referralError) {
            console.error('Failed to apply referral code after Google sign-in:', referralError);
          }
        }

        sessionStorage.removeItem('oauth_state');
        sessionStorage.removeItem('oauth_code_verifier');
        sessionStorage.removeItem('oauth_referral_code');

        window.location.replace('/');
      } catch (err) {
        console.error('Google OAuth callback error:', err);
        setError(handleApiError(err));
        setIsLoading(false);
        sessionStorage.removeItem('oauth_state');
        sessionStorage.removeItem('oauth_code_verifier');
        sessionStorage.removeItem('oauth_referral_code');
        setTimeout(() => router.push('/login'), 3000);
      }
    };

    handleCallback();
  }, [searchParams, router, setAuth]);

  return (
    <div className="auth-page-wrapper">
      <div className="main" style={{ maxWidth: '500px', width: '100%' }}>
        <div className="form">
          <h2 className="form_title title">Signing in with Google...</h2>
          {isLoading && (
            <p className="description" style={{ marginTop: '20px' }}>
              Please wait while we complete your sign-in.
            </p>
          )}
          {error && (
            <>
              <div className="error-message" style={{ marginTop: '20px' }}>
                {error}
              </div>
              <p className="description" style={{ marginTop: '10px' }}>
                Redirecting to login page...
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function GoogleCallbackPage() {
  return (
    <Suspense fallback={
      <div className="auth-page-wrapper">
        <div className="main" style={{ maxWidth: '500px', width: '100%' }}>
          <div className="form">
            <h2 className="form_title title">Signing in with Google...</h2>
            <p className="description" style={{ marginTop: '20px' }}>
              Loading...
            </p>
          </div>
        </div>
      </div>
    }>
      <GoogleCallbackContent />
    </Suspense>
  );
}
