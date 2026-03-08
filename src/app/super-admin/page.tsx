import { createClient } from '@/lib/supabase/server';
import { getCurrentAgencySlug } from '@/lib/supabase/agencies';
import { getAllBroadcasts } from '@/lib/supabase/broadcasts';
import { cookies } from 'next/headers';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DeployTenantDialog } from '@/components/super-admin/deploy-tenant-dialog';
import { AgencyList } from '@/components/super-admin/agency-list';
import { BroadcastManager } from '@/components/super-admin/broadcast-manager';
import { GlobalRevenueChart } from '@/components/super-admin/global-revenue-chart';
import {
  Building2,
  Activity,
  TrendingUp,
  CalendarPlus,
  ShoppingCart,
  DollarSign,
} from 'lucide-react';
import {
  getPlatformStats,
  getAgencyHealthData,
  getGlobalRevenueData,
} from '@/lib/supabase/super-admin';

export default async function SuperAdminPage() {
  const supabase = await createClient();

  // Fetch all data in parallel
  const [
    { data: agencies, error },
    broadcasts,
    currentSlug,
    cookieStore,
    stats,
    healthData,
    revenue30,
    revenue90,
  ] = await Promise.all([
    supabase.from('agencies').select('*').order('created_at', { ascending: false }),
    getAllBroadcasts(),
    getCurrentAgencySlug(),
    cookies(),
    getPlatformStats(),
    getAgencyHealthData(),
    getGlobalRevenueData(30),
    getGlobalRevenueData(90),
  ]);

  if (error) {
    console.error('Error fetching agencies:', error);
  }

  const isOverridden = !!cookieStore.get('admin_agency_override')?.value;

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-zinc-900">Dashboard</h2>
          <p className="text-zinc-500">Overview of your multi-tenant platform.</p>
        </div>
        <div className="flex items-center gap-2">
          <DeployTenantDialog />
        </div>
      </div>

      {/* KPI Row 1 — Agency Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-zinc-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-zinc-500">Total Agencies</CardTitle>
            <Building2 className="h-4 w-4 text-zinc-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-zinc-900">{stats.totalAgencies}</div>
            <p className="text-xs text-zinc-500">Registered tenants</p>
          </CardContent>
        </Card>
        <Card className="border-zinc-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-zinc-500">Active</CardTitle>
            <Activity className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.activeAgencies}</div>
            <p className="text-xs text-zinc-500">Currently live</p>
          </CardContent>
        </Card>
        <Card className="border-zinc-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-zinc-500">Suspended</CardTitle>
            <Activity className="h-4 w-4 text-red-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.suspendedAgencies}</div>
            <p className="text-xs text-zinc-500">Offline agencies</p>
          </CardContent>
        </Card>
        <Card className="border-zinc-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-zinc-500">New This Month</CardTitle>
            <CalendarPlus className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-zinc-900">{stats.newThisMonth}</div>
            <p className="text-xs text-zinc-500">Signed up this month</p>
          </CardContent>
        </Card>
      </div>

      {/* KPI Row 2 — Platform Metrics */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-zinc-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-zinc-500">Total Bookings</CardTitle>
            <ShoppingCart className="h-4 w-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-zinc-900">{stats.totalBookings}</div>
            <p className="text-xs text-zinc-500">Across all tenants</p>
          </CardContent>
        </Card>
        <Card className="border-zinc-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-zinc-500">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-zinc-900">
              $
              {stats.totalRevenue.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
            <p className="text-xs text-zinc-500">All tenants combined</p>
          </CardContent>
        </Card>
        <Card
          className={`border-zinc-200 shadow-sm ${isOverridden ? 'bg-amber-50 border-amber-200' : ''}`}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-zinc-500">Context Mode</CardTitle>
            <TrendingUp
              className={`h-4 w-4 ${isOverridden ? 'text-amber-600' : 'text-zinc-400'}`}
            />
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${isOverridden ? 'text-amber-700' : 'text-zinc-900'}`}
            >
              {isOverridden ? 'Overridden' : 'Master'}
            </div>
            <p className="text-xs text-zinc-500">
              {isOverridden ? `Viewing: ${currentSlug}` : 'Viewing default scope'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Global Revenue Chart */}
      <GlobalRevenueChart data30={revenue30} data90={revenue90} />

      {/* Main Content Tabs */}
      <Tabs defaultValue="agencies" className="space-y-4">
        <TabsList className="bg-white border shadow-sm h-10 p-1">
          <TabsTrigger
            value="agencies"
            className="data-[state=active]:bg-zinc-100 data-[state=active]:text-zinc-900"
          >
            Agency Management
          </TabsTrigger>
          <TabsTrigger
            value="system"
            className="data-[state=active]:bg-zinc-100 data-[state=active]:text-zinc-900"
          >
            System Broadcasts
          </TabsTrigger>
        </TabsList>

        <TabsContent value="agencies" className="space-y-4">
          <AgencyList agencies={agencies || []} currentSlug={currentSlug} healthData={healthData} />
        </TabsContent>

        <TabsContent value="system" className="space-y-4">
          <BroadcastManager broadcasts={broadcasts} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
