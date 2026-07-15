'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { authAPI } from '@/lib/api/auth';
import { useAuth } from '@/lib/auth/useAuth';
import { handleApiError } from '@/lib/utils/errorHandler';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import Link from 'next/link';
import '../login/login.css';

function VerifyEmailContent() {
  const router = useRouter();
  const { setAuth } = useAuth();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const email = searchParams.get('email')?.trim().toLowerCase() ?? '';
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(Boolean(token));
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      return;
    }

    const verifyEmail = async () => {
      try {
        await authAPI.verifyEmail(token);
        setSuccess('Email verified successfully! You can now login.');
        setTimeout(() => router.push('/login'), 2000);
      } catch (err) {
        setError(handleApiError(err));
      } finally {
        setIsLoading(false);
      }
    };

    verifyEmail();
  }, [token, router]);

  const handleOtpVerification = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedCode = code.replace(/\D/g, '');

    if (!email) {
      setError('Email address is missing. Please return to sign up and try again.');
      return;
    }

    if (normalizedCode.length !== 6) {
      setError('Enter the 6-digit verification code.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const authResponse = await authAPI.verifyEmailOtp(email, normalizedCode);
      setAuth(authResponse);
      setSuccess('Email verified successfully! Redirecting you to Vormex...');
      setTimeout(() => router.push('/'), 1200);
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email) return;
    setIsResending(true);
    setError(null);
    setSuccess(null);
    try {
      await authAPI.resendVerification(email);
      setSuccess('A new verification code has been sent to your inbox.');
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="auth-page-wrapper">
      <div className="fixed top-4 right-4 z-50">
        <ThemeToggle />
      </div>
      <div className="main" style={{ maxWidth: '500px', width: '100%', minWidth: 'auto' }}>
        {email && !token ? (
          <form className="form" onSubmit={handleOtpVerification}>
            <h2 className="form_title title">Verify Your Email</h2>
            <p className="description" style={{ marginBottom: '20px' }}>
              Enter the 6-digit code sent to {email}.
            </p>
            <input
              className="form__input"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              aria-label="6-digit verification code"
              placeholder="Verification code"
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
              maxLength={6}
              required
              autoFocus
            />
            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}
            <button type="submit" className="button" disabled={isLoading || code.length !== 6}>
              {isLoading ? 'Verifying...' : 'Verify Email'}
            </button>
            <button
              type="button"
              className="form__link"
              onClick={handleResend}
              disabled={isResending}
              style={{ marginTop: '20px', border: 0, background: 'transparent', cursor: 'pointer' }}
            >
              {isResending ? 'Sending...' : 'Resend code'}
            </button>
            <Link href="/login" className="form__link" style={{ marginTop: '12px' }}>
              Back to Login
            </Link>
          </form>
        ) : (
        <div className="form">
          <h2 className="form_title title">Email Verification</h2>
          {isLoading && <p className="description">Verifying your email...</p>}
          {error && (
            <>
              <div className="error-message">{error}</div>
              <Link href="/login" className="form__link" style={{ marginTop: '20px' }}>
                Back to Login
              </Link>
            </>
          )}
          {success && (
            <>
              <div className="success-message">{success}</div>
              <p className="description">Redirecting to login...</p>
            </>
          )}
          {!token && !email && (
            <>
              <div className="error-message">Verification details are missing.</div>
              <Link href="/login" className="form__link" style={{ marginTop: '20px' }}>
                Back to Login
              </Link>
            </>
          )}
        </div>
        )}
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="auth-page-wrapper">
        <div className="fixed top-4 right-4 z-50">
          <ThemeToggle />
        </div>
        <div className="main" style={{ maxWidth: '500px', width: '100%', minWidth: 'auto' }}>
          <div className="form">
            <h2 className="form_title title">Email Verification</h2>
            <p className="description">Loading...</p>
          </div>
        </div>
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}
