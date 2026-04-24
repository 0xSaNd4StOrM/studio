import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, Package, ShoppingCart, Users } from 'lucide-react';
import { OverviewChart } from '@/components/admin/overview-chart';
import { RecentSales } from '@/components/admin/recent-sales';
import { PeriodSelector } from '@/components/admin/period-selector';
import { GettingStarted } from '@/components/admin/getting-started';
import { AiCommandCenter } from '@/components/admin/ai-command-center';
import { getBookings } from '@/lib/supabase/bookings';
import { getCustomers } from '@/lib/supabase/customers';
import { getTours } from '@/lib/supabase/tours';
import { getCurrentAgency } from '@/lib/supabase/agencies';
import { getAgencySettings } from '@/lib/supabase/agency-content';
import { getAdminT } from '@/lib/admin-i18n';
import { Suspense } from 'react';

function formatRevenue(value: number, currency: string) {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `${currency} ${Math.round(value)}`;
  }
}

function getPeriodDays(period: string): number | null {
  if (period === '7') return 7;
  if (period === '90') return 90;
  if (period === 'all') return null;
  return 30; // default
}

function buildChartData(
  bookings: Awaited<ReturnType<typeof getBookings>>,
  days: number | null
): { name: string; total: number }[] {
  if (days === null) {
    // All-time: last 12 months grouped by month
    const now = new Date();
    const labels: string[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      labels.push(d.toLocaleString('en-US', { month: 'short', year: '2-digit' }));
    }
    const totals: Record<string, number> = Object.fromEntries(labels.map((l) => [l, 0]));
    for (const b of bookings) {
      const d = b.bookingDate ? new Date(b.bookingDate) : new Date();
      const label = d.toLocaleString('en-US', { month: 'short', year: '2-digit' });
      if (totals[label] !== undefined) totals[label] += b.totalPrice ?? 0;
    }
    return labels.map((l) => ({ name: l, total: totals[l] }));
  }

  // Daily data for the selected period
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days + 1);
  startDate.setHours(0, 0, 0, 0);

  const points: { date: Date; label: string }[] = [];
  for (const cur = new Date(startDate); cur <= today; cur.setDate(cur.getDate() + 1)) {
    const label =
      days <= 7
        ? cur.toLocaleString('en-US', { weekday: 'short' })
        : cur.toLocaleString('en-US', { month: 'short', day: 'numeric' });
    points.push({ date: new Date(cur), label });
  }

  const totals: Record<string, number> = Object.fromEntries(points.map((p) => [p.label, 0]));
  const dateToLabel: Record<string, string> = {};
  for (const p of points) dateToLabel[p.date.toDateString()] = p.label;

  for (const b of bookings) {
    const d = b.bookingDate ? new Date(b.bookingDate) : new Date();
    if (d >= startDate && d <= today) {
      const label = dateToLabel[d.toDateString()];
      if (label !== undefined) totals[label] += b.totalPrice ?? 0;
    }
  }

  return points.map((p) => ({ name: p.label, total: totals[p.label] }));
}

export default async function AdminDashboard({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const { period: periodParam } = await searchParams;
  const period = periodParam ?? '30';
  const periodDays = getPeriodDays(period);

  const [allBookings, customers, tours, agency, agencySettings] = await Promise.all([
    getBookings(),
    getCustomers(),
    getTours({ skipTranslation: true }),
    getCurrentAgency(),
    getAgencySettings({ skipTranslation: true }),
  ]);

  const defaultCurrency = agencySettings?.data?.defaultCurrency ?? 'USD';
  const t = getAdminT(agencySettings?.data?.adminLanguage ?? 'en');

  // Filter bookings by period
  const now = new Date();
  const periodBookings =
    periodDays === null
      ? allBookings
      : allBookings.filter((b) => {
          const d = b.bookingDate ? new Date(b.bookingDate) : new Date();
          const cutoff = new Date(now);
          cutoff.setDate(cutoff.getDate() - periodDays);
          return d >= cutoff;
        });

  const totalRevenue = periodBookings.reduce((sum, b) => sum + (b.totalPrice ?? 0), 0);
  const totalBookings = periodBookings.length;

  const newCustomers = customers.filter((c) => {
    if (periodDays === null) return true;
    const created = c.createdAt ? new Date(c.createdAt) : new Date();
    const cutoff = new Date(now);
    cutoff.setDate(cutoff.getDate() - periodDays);
    return created >= cutoff;
  }).length;

  const activeTours = tours.filter((t) => t.availability).length;
  const chartData = buildChartData(allBookings, periodDays);

  // Onboarding state
  const onboardingDismissed = !!agency?.settings?.onboarding_dismissed;
  const onboardingSteps = [
    {
      id: 'logo',
      label: t('admin.uploadLogo'),
      description: t('admin.uploadLogoDesc'),
      href: '/admin/settings',
      completed: !!agency?.settings?.theme?.logoUrl,
    },
    {
      id: 'contact',
      label: t('admin.configureContact'),
      description: t('admin.configureContactDesc'),
      href: '/admin/settings',
      completed: !!(agency?.settings?.contact?.email || agency?.settings?.contact?.phone),
    },
    {
      id: 'tour',
      label: t('admin.createFirstTour'),
      description: t('admin.createFirstTourDesc'),
      href: '/admin/tours',
      completed: tours.length > 0,
    },
    {
      id: 'homepage',
      label: t('admin.setupHomepage'),
      description: t('admin.setupHomepageDesc'),
      href: '/admin/home-page-editor',
      completed: !!(
        agency?.settings?.theme?.primaryColor ||
        agency?.settings?.social?.facebook ||
        agency?.settings?.social?.instagram
      ),
    },
    {
      id: 'booking',
      label: t('admin.receiveFirstBooking'),
      description: t('admin.receiveFirstBookingDesc'),
      href: '/admin/bookings',
      completed: allBookings.length > 0,
    },
  ];
  const showOnboarding = !onboardingDismissed && !onboardingSteps.every((s) => s.completed);

  const periodLabel =
    period === '7'
      ? t('admin.last7Days')
      : period === '90'
        ? t('admin.last90Days')
        : period === 'all'
          ? t('admin.allTime')
          : t('admin.last30Days');

  const recentItems = periodBookings.slice(0, 5).map((b) => ({
    user: b.customerName ?? b.customerEmail ?? 'Customer',
    email: b.customerEmail ?? '',
    amount: `+${formatRevenue(b.totalPrice ?? 0, defaultCurrency)}`,
    avatar: undefined,
  }));

  return (
    <div className="space-y-6">
      {showOnboarding && <GettingStarted steps={onboardingSteps} />}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{t('admin.dashboard')}</h1>
          <p className="text-sm text-muted-foreground capitalize">
            {t('admin.showingStatsFor')} {periodLabel}
          </p>
        </div>
        <Suspense fallback={null}>
          <PeriodSelector currentPeriod={period} />
        </Suspense>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="rounded-lg shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('admin.totalRevenue')}</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatRevenue(totalRevenue, defaultCurrency)}</div>
            <p className="text-xs text-muted-foreground capitalize">{periodLabel}</p>
          </CardContent>
        </Card>
        <Card className="rounded-lg shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('admin.totalBookings')}</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalBookings}</div>
            <p className="text-xs text-muted-foreground capitalize">{periodLabel}</p>
          </CardContent>
        </Card>
        <Card className="rounded-lg shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('admin.newCustomers')}</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{newCustomers}</div>
            <p className="text-xs text-muted-foreground capitalize">{periodLabel}</p>
          </CardContent>
        </Card>
        <Card className="rounded-lg shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('admin.activeTours')}</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeTours}</div>
            <p className="text-xs text-muted-foreground">{t('admin.currentlyAvailable')}</p>
          </CardContent>
        </Card>
      </div>

      <AiCommandCenter />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-7">
        <Card className="lg:col-span-4 rounded-lg shadow-sm">
          <CardHeader>
            <CardTitle>{t('admin.revenueTrend')}</CardTitle>
            <CardDescription className="capitalize">{periodLabel}</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <OverviewChart data={chartData} />
          </CardContent>
        </Card>
        <Card className="lg:col-span-3 rounded-lg shadow-sm">
          <CardHeader>
            <CardTitle>{t('admin.recentBookings')}</CardTitle>
            <CardDescription className="capitalize">{periodLabel}</CardDescription>
          </CardHeader>
          <CardContent>
            <RecentSales items={recentItems} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
