'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Line,
  LineChart,
  Bar,
  BarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { DollarSign, TrendingUp, TrendingDown, UserMinus, Trophy, Download } from 'lucide-react';
import type {
  PlatformStats,
  ChurnedAgency,
  BookingLeaderboardRow,
  GrowthDataPoint,
  AgencyExportRow,
} from '@/lib/supabase/super-admin';

// --- MRR Card ---
export function MRRCard({ stats }: { stats: PlatformStats }) {
  const mrrGrowth =
    stats.previousMRR > 0
      ? ((stats.currentMRR - stats.previousMRR) / stats.previousMRR) * 100
      : stats.currentMRR > 0
        ? 100
        : 0;
  const isGrowing = mrrGrowth >= 0;

  return (
    <Card className="border-zinc-200 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-zinc-500">
          Monthly Recurring Revenue
        </CardTitle>
        <DollarSign className="h-4 w-4 text-emerald-500" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-zinc-900">
          $
          {stats.currentMRR.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </div>
        <div className="flex items-center gap-1 mt-1">
          {isGrowing ? (
            <TrendingUp className="h-3 w-3 text-green-600" />
          ) : (
            <TrendingDown className="h-3 w-3 text-red-600" />
          )}
          <span className={`text-xs font-medium ${isGrowing ? 'text-green-600' : 'text-red-600'}`}>
            {isGrowing ? '+' : ''}
            {mrrGrowth.toFixed(1)}% vs last month
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

// --- Churn Card ---
export function ChurnCard({
  stats,
  churnedAgencies,
}: {
  stats: PlatformStats;
  churnedAgencies: ChurnedAgency[];
}) {
  const churnRate =
    stats.totalAgencies > 0
      ? ((stats.churnedThisMonth / stats.totalAgencies) * 100).toFixed(1)
      : '0.0';

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Churn Tracking</CardTitle>
            <CardDescription>
              {stats.churnedThisMonth} churned this month · {churnRate}% churn rate
            </CardDescription>
          </div>
          <UserMinus className="h-5 w-5 text-red-400" />
        </div>
      </CardHeader>
      <CardContent>
        {churnedAgencies.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No churned agencies yet — great news!
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Agency</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Lost MRR</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {churnedAgencies.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">
                    <div>
                      {a.name}
                      <Badge variant="outline" className="ml-2 text-[10px]">
                        {a.tier}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                    {a.churn_reason || '—'}
                  </TableCell>
                  <TableCell className="text-sm text-red-600">
                    -${a.monthly_price.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(a.churned_at).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

// --- Booking Leaderboard ---
export function BookingLeaderboard({ rows }: { rows: BookingLeaderboardRow[] }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Booking Leaderboard</CardTitle>
            <CardDescription>Top agencies by bookings this month</CardDescription>
          </div>
          <Trophy className="h-5 w-5 text-amber-500" />
        </div>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No bookings this month.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">#</TableHead>
                <TableHead>Agency</TableHead>
                <TableHead className="text-right">Bookings</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.slice(0, 10).map((row, i) => (
                <TableRow key={row.agencyId}>
                  <TableCell className="font-bold text-zinc-400">
                    {i < 3 ? ['🥇', '🥈', '🥉'][i] : i + 1}
                  </TableCell>
                  <TableCell className="font-medium">{row.agencyName}</TableCell>
                  <TableCell className="text-right font-semibold">
                    {row.bookingsThisMonth}
                  </TableCell>
                  <TableCell className="text-right text-emerald-700">
                    $
                    {row.revenueThisMonth.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

// --- Platform Growth Chart ---
export function PlatformGrowthChart({ data }: { data: GrowthDataPoint[] }) {
  const [view, setView] = useState<'agencies' | 'mrr'>('agencies');

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-semibold">Platform Growth (12 months)</CardTitle>
        <div className="flex gap-1">
          <Button
            variant={view === 'agencies' ? 'default' : 'outline'}
            size="sm"
            className="h-7 text-xs"
            onClick={() => setView('agencies')}
          >
            New Agencies
          </Button>
          <Button
            variant={view === 'mrr' ? 'default' : 'outline'}
            size="sm"
            className="h-7 text-xs"
            onClick={() => setView('mrr')}
          >
            MRR
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            {view === 'agencies' ? (
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="month"
                  stroke="#888"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#888"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    borderColor: 'hsl(var(--border))',
                    borderRadius: 'var(--radius)',
                    fontSize: '12px',
                  }}
                  formatter={(value: number) => [value, 'New Agencies']}
                />
                <Bar dataKey="agencies" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            ) : (
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="month"
                  stroke="#888"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#888"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `$${v}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    borderColor: 'hsl(var(--border))',
                    borderRadius: 'var(--radius)',
                    fontSize: '12px',
                  }}
                  formatter={(value: number) => [`$${value.toFixed(2)}`, 'MRR']}
                />
                <Line
                  type="monotone"
                  dataKey="mrr"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

// --- CSV Export Button ---
export function ExportCSVButton({ data }: { data: AgencyExportRow[] }) {
  const handleExport = () => {
    const headers = [
      'Name',
      'Slug',
      'Domain',
      'Status',
      'Tier',
      'Subscription',
      'Monthly Price',
      'Contact Email',
      'Total Bookings',
      'Total Revenue',
      'Created At',
    ];

    const csvRows = [
      headers.join(','),
      ...data.map((row) =>
        [
          `"${row.name.replace(/"/g, '""')}"`,
          row.slug,
          row.domain || '',
          row.status,
          row.tier,
          row.subscription_status,
          row.monthly_price.toFixed(2),
          row.contact_email,
          row.total_bookings,
          row.total_revenue.toFixed(2),
          new Date(row.created_at).toISOString().split('T')[0],
        ].join(',')
      ),
    ];

    const csv = csvRows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `agencies-export-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Button variant="outline" onClick={handleExport} className="gap-2">
      <Download className="h-4 w-4" />
      Export CSV ({data.length} agencies)
    </Button>
  );
}
