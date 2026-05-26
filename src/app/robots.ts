import type { MetadataRoute } from 'next';
import { getCurrentAgency } from '@/lib/supabase/agencies';

function toBaseUrl(agency: Awaited<ReturnType<typeof getCurrentAgency>>): string {
  const raw =
    agency?.domain?.trim() || process.env.NEXT_PUBLIC_APP_URL?.trim() || 'http://localhost:3000';

  try {
    const url = new URL(raw.startsWith('http') ? raw : `https://${raw}`);
    return url.origin;
  } catch {
    return 'http://localhost:3000';
  }
}

export default async function robots(): Promise<MetadataRoute.Robots> {
  const agency = await getCurrentAgency().catch(() => null);
  const base = toBaseUrl(agency);
  const maintenanceMode = agency?.settings?.modules?.maintenance_mode === true;

  if (maintenanceMode) {
    // Block all crawlers while site is under maintenance
    return {
      rules: {
        userAgent: '*',
        disallow: '/',
      },
    };
  }

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin/', '/super-admin/', '/api/', '/booking/'],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
