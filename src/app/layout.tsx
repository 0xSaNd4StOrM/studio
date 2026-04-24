import type { Metadata } from 'next';
import { Inter, Playfair_Display, Cairo } from 'next/font/google';
import './globals.css';
import { CartProvider } from '@/hooks/use-cart';
import { WishlistProvider } from '@/hooks/use-wishlist';
import { Toaster } from '@/components/ui/toaster';
import { getAgencySettings } from '@/lib/supabase/agency-content';
import { getCurrentAgency } from '@/lib/supabase/agencies';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
});
const cairo = Cairo({
  subsets: ['arabic', 'latin'],
  variable: '--font-cairo',
  display: 'swap',
});

function toUrl(value: string | undefined | null) {
  if (!value) return null;
  try {
    return new URL(value);
  } catch {
    try {
      return new URL(`https://${value}`);
    } catch {
      return null;
    }
  }
}

function ensureTemplate(value: string, fallback: string) {
  const raw = value?.trim();
  if (!raw) return fallback;
  if (raw.includes('%s')) return raw;
  return `%s | ${raw}`;
}

export async function generateMetadata(): Promise<Metadata> {
  let settings: Awaited<ReturnType<typeof getAgencySettings>> | null = null;
  let agency: Awaited<ReturnType<typeof getCurrentAgency>> | null = null;

  try {
    [settings, agency] = await Promise.all([getAgencySettings(), getCurrentAgency()]);
  } catch {
    settings = null;
    agency = null;
  }

  const site = settings?.data?.seo?.site;
  const siteName = site?.siteName || settings?.data?.agencyName || agency?.name || 'Travel Agency';

  const baseUrl =
    toUrl(agency?.domain) ||
    toUrl(process.env.NEXT_PUBLIC_APP_URL) ||
    toUrl('http://localhost:3000')!;

  const defaultTitle = site?.defaultTitle?.trim() || siteName;
  const template = ensureTemplate(site?.titleTemplate || '', `%s | ${siteName}`);
  const description = site?.description?.trim() || '';

  const keywords = (() => {
    const kw = site?.keywords;
    if (!kw) return undefined;
    const arr = Array.isArray(kw) ? kw : kw.split(',');
    return arr.map((k: string) => k.trim()).filter(Boolean);
  })();

  const ogImageUrl = site?.ogImageUrl?.trim() || undefined;
  const twitterImageUrl = site?.twitterImageUrl?.trim() || ogImageUrl;
  const faviconUrl = site?.faviconUrl?.trim() || undefined;

  return {
    metadataBase: baseUrl,
    title: {
      default: defaultTitle,
      template,
    },
    description,
    keywords,
    icons: faviconUrl
      ? {
          icon: [{ url: faviconUrl }],
          shortcut: [{ url: faviconUrl }],
        }
      : undefined,
    openGraph: {
      title: defaultTitle,
      description,
      url: '/',
      siteName,
      locale: 'en_US',
      type: 'website',
      images: ogImageUrl ? [{ url: ogImageUrl }] : undefined,
    },
    twitter: {
      card: (twitterImageUrl ? 'summary_large_image' : 'summary') as
        | 'summary'
        | 'summary_large_image',
      title: siteName,
      description,
      images: twitterImageUrl ? [twitterImageUrl] : undefined,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
  };
}

import { LanguageProvider } from '@/hooks/use-language';
import { CurrencyProvider } from '@/hooks/use-currency';

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let defaultCurrency: string | undefined;
  try {
    const settings = await getAgencySettings();
    defaultCurrency = settings?.data?.defaultCurrency ?? undefined;
  } catch {
    // proceed without default currency
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${playfair.variable} ${cairo.variable}`}
        suppressHydrationWarning={true}
      >
        <LanguageProvider>
          <CurrencyProvider defaultCurrency={defaultCurrency}>
            <WishlistProvider>
              <CartProvider>
                {children}
                <Toaster />
              </CartProvider>
            </WishlistProvider>
          </CurrencyProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
