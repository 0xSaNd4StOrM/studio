import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { getAgencySettings } from '@/lib/supabase/agency-content';
import { WhatsAppChatButton } from '@/components/whatsapp-chat-button';
import { SettingsProvider } from '@/components/providers/settings-provider';

function hexToHsl(hex: string) {
  let c = hex.substring(1).split('');
  if (c.length === 3) {
    c = [c[0], c[0], c[1], c[1], c[2], c[2]];
  }
  const r = parseInt(c[0] + c[1], 16) / 255;
  const g = parseInt(c[2] + c[3], 16) / 255;
  const b = parseInt(c[4] + c[5], 16) / 255;

  const max = Math.max(r, g, b),
    min = Math.min(r, g, b);
  let h = 0,
    s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  // Tailwind uses space separated HSL values without units for the variable
  // e.g. 222.2 47.4% 11.2%
  return `${(h * 360).toFixed(1)} ${(s * 100).toFixed(1)}% ${(l * 100).toFixed(1)}%`;
}

export default async function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const settings = await getAgencySettings();
  const theme = settings?.data?.theme;
  const phoneNumber = settings?.data?.phoneNumber;

  const primaryHsl = theme?.primaryColor ? hexToHsl(theme.primaryColor) : null;
  const secondaryHsl = theme?.secondaryColor ? hexToHsl(theme.secondaryColor) : null;
  const accentHsl = theme?.accentColor ? hexToHsl(theme.accentColor) : null;
  const fontFamily = theme?.fontFamily;
  const headingFont = theme?.headingFont;
  const borderRadius = theme?.borderRadius;

  const radiusMap: Record<string, string> = {
    none: '0',
    sm: '0.25rem',
    md: '0.5rem',
    lg: '0.75rem',
    full: '9999px',
  };

  const settingsValue = settings ? { data: settings.data, logo_url: settings.logo_url } : null;

  return (
    <SettingsProvider value={settingsValue}>
      <div className="flex flex-col min-h-screen">
        <style>{`
          :root {
            ${primaryHsl ? `--primary: ${primaryHsl};` : ''}
            ${secondaryHsl ? `--secondary: ${secondaryHsl};` : ''}
            ${accentHsl ? `--accent: ${accentHsl};` : ''}
            ${fontFamily ? `--font-body: ${fontFamily}, sans-serif;` : ''}
            ${headingFont ? `--font-playfair: ${headingFont}, serif;` : ''}
            ${borderRadius && radiusMap[borderRadius] ? `--radius: ${radiusMap[borderRadius]};` : ''}
          }
        `}</style>
        <Header />
        <main className="flex-grow w-full overflow-x-hidden pt-[84px] md:pt-[134px] pb-8">
          {children}
        </main>
        <Footer />
        {phoneNumber && <WhatsAppChatButton phone={phoneNumber} />}
      </div>
    </SettingsProvider>
  );
}
