import type { Metadata } from 'next';
import Link from 'next/link';
import { PublicDocumentShell } from '@/components/public/PublicDocumentShell';

export const metadata: Metadata = {
  title: 'Support',
  description: 'Get account, safety, privacy, and technical help with Vormex.',
  alternates: { canonical: '/support' },
};

export default function SupportPage() {
  return (
    <PublicDocumentShell
      eyebrow="Help center"
      title="How can we help?"
      description="Contact Vormex for account, safety, privacy, technical, or AI discovery support."
    >
      <section>
        <h2>Contact support</h2>
        <p className="mt-3">Email <a href="mailto:support@vormex.in">support@vormex.in</a>. Include your Vormex username, the email linked to your account, a short description of the issue, and screenshots when helpful. Never send your password, verification code, access token, or private keys.</p>
        <a
          href="mailto:support@vormex.in?subject=Vormex%20Support%20Request"
          className="mt-5 inline-flex rounded-xl bg-blue-600 px-5 py-3 font-semibold !text-white !no-underline hover:bg-blue-700"
        >
          Email Vormex Support
        </a>
      </section>

      <section>
        <h2>Account access</h2>
        <p className="mt-3">If you cannot sign in, first use the password reset option on the Vormex sign-in screen. If you no longer have access to your registered email, contact support and provide enough non-sensitive account details for us to verify ownership safely.</p>
      </section>

      <section>
        <h2>Safety and reporting</h2>
        <p className="mt-3">Report abusive accounts or content through Vormex when possible. For urgent safety concerns, email support with the relevant profile or content URL. If someone is in immediate danger, contact local emergency services first.</p>
      </section>

      <section>
        <h2>Privacy and AI discovery</h2>
        <p className="mt-3">You can manage public web and AI discovery from your Vormex discovery settings. For privacy questions, access requests, or help removing public information, email support with “Privacy Request” in the subject line. See our <Link href="/privacy">Privacy Policy</Link> for details.</p>
      </section>

      <section>
        <h2>Delete your account</h2>
        <p className="mt-3">To permanently delete your account and eligible associated data, follow the instructions on the <Link href="/vormex-delete-account">Vormex account deletion page</Link>.</p>
      </section>

      <section>
        <h2>Response expectations</h2>
        <p className="mt-3">We review requests in the order received, while prioritizing security and safety issues. Complex requests may require additional time or account verification before we can act.</p>
      </section>
    </PublicDocumentShell>
  );
}
