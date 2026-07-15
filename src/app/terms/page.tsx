import type { Metadata } from 'next';
import Link from 'next/link';
import { PublicDocumentShell } from '@/components/public/PublicDocumentShell';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'Terms governing access to and use of Vormex.',
  alternates: { canonical: '/terms' },
};

export default function TermsPage() {
  return (
    <PublicDocumentShell
      eyebrow="Legal"
      title="Terms of Service"
      description="These terms govern your access to Vormex and explain the responsibilities that come with using our community."
    >
      <section>
        <h2>1. Agreement and eligibility</h2>
        <p className="mt-3">By creating an account or using Vormex, you agree to these Terms and our <Link href="/privacy">Privacy Policy</Link>. You must be at least 13 years old, or the minimum age required in your country, and legally able to enter this agreement. If you use Vormex for an organization, you confirm that you are authorized to accept these Terms for it.</p>
      </section>

      <section>
        <h2>2. Your account</h2>
        <p className="mt-3">Provide accurate information, protect your credentials, and promptly tell us about unauthorized access. You are responsible for activity performed through your account. You may not impersonate others, create accounts deceptively, sell account access, or evade enforcement actions.</p>
      </section>

      <section>
        <h2>3. Your content and public discovery</h2>
        <p className="mt-3">You retain ownership of content you submit. You grant Vormex a worldwide, non-exclusive, royalty-free license to host, store, reproduce, display, adapt, and distribute that content as necessary to operate, secure, and improve the service, consistent with your settings.</p>
        <p className="mt-3">Content and profile information you make public may appear on public Vormex pages, in search engines, and—when your discovery settings allow it—in Vormex&apos;s read-only APIs and AI integrations. You are responsible for having the rights needed to publish your content.</p>
      </section>

      <section>
        <h2>4. Acceptable use</h2>
        <p className="mt-3">You may not use Vormex to:</p>
        <ul className="mt-3">
          <li>Harass, threaten, exploit, discriminate against, or endanger others.</li>
          <li>Publish illegal, fraudulent, deceptive, infringing, or malicious content.</li>
          <li>Spam users, scrape or enumerate data, bypass access controls, or misuse public discovery tools.</li>
          <li>Upload malware, interfere with service operation, or probe systems without authorization.</li>
          <li>Use another person&apos;s private or personal information without permission.</li>
        </ul>
      </section>

      <section>
        <h2>5. Vormex rights and intellectual property</h2>
        <p className="mt-3">Vormex and its licensors own the service, software, branding, design, and related intellectual property, excluding your content. These Terms do not grant permission to copy our branding, reverse engineer protected parts of the service, or use Vormex data outside the access and functionality we provide.</p>
      </section>

      <section>
        <h2>6. Moderation, suspension, and termination</h2>
        <p className="mt-3">We may review or remove content and restrict, suspend, or terminate access when reasonably necessary to enforce these Terms, protect people or the service, respond to legal requirements, or address security risks. You may stop using Vormex and request account deletion at any time.</p>
      </section>

      <section>
        <h2>7. Third-party services</h2>
        <p className="mt-3">Vormex may link to or work with third-party services. Their own terms and privacy practices apply, and Vormex is not responsible for third-party content, availability, or actions.</p>
      </section>

      <section>
        <h2>8. Service availability and disclaimers</h2>
        <p className="mt-3">Vormex is provided on an “as is” and “as available” basis. To the extent permitted by law, we disclaim implied warranties, including merchantability, fitness for a particular purpose, and non-infringement. We do not guarantee uninterrupted service, particular recommendations, employment, collaborations, or outcomes from user interactions.</p>
      </section>

      <section>
        <h2>9. Limitation of liability</h2>
        <p className="mt-3">To the maximum extent permitted by law, Vormex will not be liable for indirect, incidental, special, consequential, or punitive damages, lost profits, data, goodwill, or opportunities arising from use of the service. Nothing in these Terms excludes liability that cannot legally be excluded.</p>
      </section>

      <section>
        <h2>10. Changes and contact</h2>
        <p className="mt-3">We may update these Terms and will provide appropriate notice of material changes. Continued use after updated Terms take effect means you accept them. Questions can be sent to <a href="mailto:support@vormex.in">support@vormex.in</a>.</p>
      </section>
    </PublicDocumentShell>
  );
}
