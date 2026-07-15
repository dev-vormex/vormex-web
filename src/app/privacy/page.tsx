import type { Metadata } from 'next';
import Link from 'next/link';
import { PublicDocumentShell } from '@/components/public/PublicDocumentShell';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'How Vormex collects, uses, shares, and protects personal information.',
  alternates: { canonical: '/privacy' },
};

export default function PrivacyPage() {
  return (
    <PublicDocumentShell
      eyebrow="Legal"
      title="Privacy Policy"
      description="This policy explains what information Vormex handles, why we use it, and the controls available to you."
    >
      <section>
        <h2>1. Information we collect</h2>
        <p className="mt-3">We collect information you provide when creating and using a Vormex account, including your name, username, email address, profile image, biography, skills, interests, education, experience, projects, achievements, certificates, approximate location, and collaboration preferences.</p>
        <p className="mt-3">We also process public posts and other content you choose to publish, along with technical and usage information such as device type, browser, IP address, timestamps, interactions, security events, and diagnostic logs.</p>
        <p className="mt-3"><strong>Private messages and private account information are not included in public discovery, public APIs, or Vormex AI/MCP recommendations.</strong></p>
      </section>

      <section>
        <h2>2. How we use information</h2>
        <ul className="mt-3">
          <li>Provide, personalize, maintain, and secure Vormex.</li>
          <li>Recommend relevant people, communities, posts, opportunities, and learning resources.</li>
          <li>Enable communication, collaboration, moderation, and account support.</li>
          <li>Measure service performance, prevent abuse, and improve product features.</li>
          <li>Comply with applicable legal obligations and enforce our Terms.</li>
        </ul>
      </section>

      <section>
        <h2>3. Public profiles, search, and AI discovery</h2>
        <p className="mt-3">Information you mark public may be visible on public Vormex pages and may be indexed by search engines. If AI discovery is enabled for your account, eligible public profile information and public content may also be returned through Vormex&apos;s read-only discovery APIs or compatible AI integrations.</p>
        <p className="mt-3">Vormex limits these systems to information intended to be public. We do not provide private messages, email addresses, phone numbers, precise location, imported contacts, authentication data, or private activity through public discovery tools.</p>
        <p className="mt-3">You can change web and AI discovery preferences in your account settings. After opting out, Vormex removes you from new public discovery results and future sitemap updates; third-party search caches may take additional time to refresh.</p>
      </section>

      <section>
        <h2>4. When information is shared</h2>
        <p className="mt-3">We share information with service providers that help us operate hosting, storage, authentication, analytics, communications, content delivery, security, and customer support. They may process information only for contracted services and subject to appropriate safeguards.</p>
        <p className="mt-3">We may also disclose information when required by law, to protect users or Vormex, to investigate fraud or abuse, or as part of a merger, financing, acquisition, or transfer of assets with appropriate notice and protections.</p>
      </section>

      <section>
        <h2>5. Data retention and security</h2>
        <p className="mt-3">We retain information while your account is active and as needed to provide the service. Some records may be kept longer for security, fraud prevention, dispute resolution, backups, payments, or legal compliance. We use technical and organizational safeguards designed to protect information, but no online service can guarantee absolute security.</p>
      </section>

      <section>
        <h2>6. Your choices and rights</h2>
        <p className="mt-3">Depending on where you live, you may have rights to access, correct, export, restrict, object to, or delete personal information. You can edit many profile fields and discovery settings directly in Vormex. You can request account deletion through our <Link href="/vormex-delete-account">account deletion page</Link>.</p>
      </section>

      <section>
        <h2>7. Children</h2>
        <p className="mt-3">Vormex is not intended for children under 13, or a higher minimum age where required by local law. If we learn that an ineligible child provided personal information, we will take appropriate steps to remove it.</p>
      </section>

      <section>
        <h2>8. Changes and contact</h2>
        <p className="mt-3">We may update this policy as Vormex evolves. Material changes will be communicated through the service or another appropriate channel. Questions or privacy requests can be sent to <a href="mailto:support@vormex.in">support@vormex.in</a>.</p>
      </section>
    </PublicDocumentShell>
  );
}
