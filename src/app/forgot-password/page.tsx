'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { authAPI } from '@/lib/api/auth';
import { forgotPasswordSchema } from '@/lib/validations/auth';
import { handleApiError } from '@/lib/utils/errorHandler';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import Link from 'next/link';
import '../login/login.css';

function ForgotPasswordContent() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const prefilledEmail = searchParams.get('email')?.trim() ?? '';
    if (prefilledEmail) {
      setEmail(prefilledEmail);
    }
  }, [searchParams]);

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Validate email
      const validationResult = forgotPasswordSchema.safeParse({ email });
      if (!validationResult.success) {
        const firstError = validationResult.error.issues[0];
        setError(firstError.message);
        setIsLoading(false);
        return;
      }

      await authAPI.forgotPassword(validationResult.data.email);
      setSuccess('If the email exists, a password reset link has been sent to your inbox.');
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-page-wrapper">
      <div className="fixed top-4 right-4 z-50">
        <ThemeToggle />
      </div>
      <div className="main" style={{ maxWidth: '500px', width: '100%', minWidth: 'auto' }}>
        <form className="form" onSubmit={handleForgotPassword}>
          <h2 className="form_title title">Forgot Password</h2>
          <p className="description" style={{ marginBottom: '20px' }}>
            Enter your email address and we&apos;ll send you a link to reset your password.
          </p>
          <label className="form__field" htmlFor="forgot-email">
            <span className="form__label">Email</span>
            <input
              id="forgot-email"
              name="email"
              autoComplete="email"
              className="form__input"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}
          <button type="submit" className="button" disabled={isLoading}>
            {isLoading ? 'Sending...' : 'Send Reset Link'}
          </button>
          <p className="description auth-provider-hint">
            Created your account with Google? Return to sign in and choose Continue with Google instead.
          </p>
          <Link href="/login" className="form__link" style={{ marginTop: '20px' }}>
            Back to Login
          </Link>
        </form>
      </div>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={
      <div className="auth-page-wrapper">
        <div className="main" style={{ maxWidth: '500px', width: '100%', minWidth: 'auto' }}>
          <div className="form">
            <h2 className="form_title title">Forgot Password</h2>
            <p className="description">Loading...</p>
          </div>
        </div>
      </div>
    }>
      <ForgotPasswordContent />
    </Suspense>
  );
}
