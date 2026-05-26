import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AuthProvider } from "@/lib/auth/authContext";
import { ThemeProvider } from "@/components/ui/ThemeProvider";
import { AppWarmup } from "@/components/providers/AppWarmup";
import { GoogleAuthProvider } from "@/components/providers/GoogleAuthProvider";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { NotificationToastProvider } from "@/components/notifications/NotificationToast";
import { VormexDock } from "@/components/ui/dock";
import { AgentProvider } from "@/components/agent/AgentContext";
import { AgentSurface } from "@/components/agent/AgentSurface";
import EngagementProvider from "@/components/engagement/EngagementProvider";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const baseUrl = 'https://vormex.in';

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Vormex',
  description: "More than a social network — Vormex helps students connect, collaborate, and grow professionally.",
  url: baseUrl,
  applicationCategory: 'SocialNetworkingApplication',
  operatingSystem: 'Web, Android, iOS',
  offers: { '@type': 'Offer', price: '0' },
  author: {
    '@type': 'Organization',
    name: 'Vormex',
  },
};

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: 'Vormex - Professional Social Networking for Students',
    template: '%s | Vormex',
  },
  description:
    'More than a social network — Vormex helps students connect, collaborate, and grow professionally.',
  keywords:
    'students, social network, professional network, student community, connect students, India, networking, career, collaborate, Vormex',
  authors: [{ name: 'Vormex' }],
  creator: 'Vormex',
  alternates: {
    canonical: baseUrl,
  },
  openGraph: {
    title: 'Vormex - Professional Social Networking for Students',
    description: 'More than a social network — Vormex helps students connect, collaborate, and grow professionally.',
    url: baseUrl,
    siteName: 'Vormex',
    type: 'website',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Vormex - Professional Social Networking for Students' }],
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Vormex - Professional Social Networking for Students',
    description: 'More than a social network — Vormex helps students connect, collaborate, and grow professionally.',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/logo.png" type="image/png" sizes="32x32" />
        <link rel="icon" href="/logo.png" type="image/png" sizes="16x16" />
        <link rel="apple-touch-icon" href="/logo.png" sizes="180x180" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange={false}
        >
          <QueryProvider>
            <GoogleAuthProvider>
              <AuthProvider>
                <AppWarmup />
                <NotificationToastProvider>
                  <AgentProvider>
                    <EngagementProvider>
                      {children}
                    </EngagementProvider>
                    <AgentSurface />
                    <VormexDock />
                  </AgentProvider>
                </NotificationToastProvider>
              </AuthProvider>
            </GoogleAuthProvider>
          </QueryProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
