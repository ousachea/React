import type { Metadata, Viewport } from 'next';
import Script from 'next/script';

export const metadata: Metadata = {
  metadataBase: new URL('https://ousachea.com'),
  title: 'Ousa Chea — Project Manager & UX/UI Designer | Phnom Penh',
  description:
    'Ousa Chea is a digital product manager and UX/UI designer based in Phnom Penh, Cambodia — specialising in end-to-end product delivery across banking, NGOs, and hospitality.',
  keywords:
    'Ousa Chea, project manager, UX/UI designer, web designer, Phnom Penh, Cambodia, digital product, Webflow, Figma, product management',
  authors: [{ name: 'Ousa Chea' }],
  robots: 'index, follow',
  alternates: { canonical: 'https://ousachea.com' },
  icons: {
    icon: { url: '/favicon.svg', type: 'image/svg+xml' },
    apple: '/favicon.svg',
  },
  openGraph: {
    type: 'website',
    url: 'https://ousachea.com',
    title: 'Ousa Chea — Project Manager & UX/UI Designer',
    description:
      'Designing, building, and delivering digital products end to end — based in Phnom Penh, Cambodia.',
    siteName: 'Ousa Chea',
    locale: 'en_US',
    images: [{ url: 'https://ousachea.com/og-image.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Ousa Chea — Project Manager & UX/UI Designer',
    description:
      'Designing, building, and delivering digital products end to end — based in Phnom Penh, Cambodia.',
    images: ['https://ousachea.com/og-image.png'],
  },
};

export const viewport: Viewport = {
  themeColor: '#080810',
};

const personJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Person',
  name: 'Ousa Chea',
  url: 'https://ousachea.com',
  jobTitle: 'Project Manager & UX/UI Designer',
  description:
    'Digital product manager and UX/UI designer specialising in end-to-end product delivery across banking, NGOs, and hospitality.',
  address: {
    '@type': 'PostalAddress',
    addressLocality: 'Phnom Penh',
    addressCountry: 'KH',
  },
  sameAs: ['https://www.linkedin.com/in/ousachea'],
  knowsAbout: [
    'Project Management',
    'UX/UI Design',
    'Web Design',
    'Webflow',
    'Figma',
    'Digital Product Delivery',
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;1,9..40,300;1,9..40,400&family=DM+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }}
        />
      </head>
      <body>
        {children}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-NXW4RX9JD7"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-NXW4RX9JD7');
          `}
        </Script>
      </body>
    </html>
  );
}
