'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarProvider,
  SidebarTrigger,
  SidebarInset,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
} from '@/components/ui/sidebar';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Home,
  Globe,
  Calendar,
  Settings,
  UserCircle,
  Users,
  Newspaper,
  LayoutDashboard,
  Tag,
  Mail,
  Percent,
  LogOut,
  MessageCircle,
  Building2,
  Star,
  ChevronRight,
  Bot,
  Sparkles,
  ScrollText,
} from 'lucide-react';
import { AdminCommandBarTrigger } from '@/components/admin/command-bar';
import { Logo } from '@/components/logo';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { User } from '@supabase/supabase-js';
import { AgencySettings } from '@/types/agency';
import { NotificationBell } from '@/components/admin/notification-bell';
import type { AgencyNotification } from '@/lib/supabase/notifications';
import { useAdminLanguage } from '@/hooks/use-admin-language';

const getPageTitle = (pathname: string, t: (k: string) => string) => {
  if (pathname.startsWith('/admin/dashboard')) return t('admin.dashboard');
  if (pathname.startsWith('/admin/tours')) return t('admin.tours');
  if (pathname.startsWith('/admin/hotels/bookings')) return t('admin.hotelBookings');
  if (pathname.startsWith('/admin/hotels/rooms')) return t('admin.roomTypes');
  if (pathname.startsWith('/admin/hotels/pricing-rules')) return t('admin.pricingRules');
  if (pathname.startsWith('/admin/hotels/availability')) return t('admin.availabilityRates');
  if (pathname.startsWith('/admin/hotels')) return t('admin.hotelsDashboard');
  if (pathname.startsWith('/admin/bookings')) return t('admin.bookings');
  if (pathname.startsWith('/admin/customers')) return t('admin.customers');
  if (pathname.startsWith('/admin/blog')) return t('admin.blog');
  if (pathname.startsWith('/admin/home-page-editor')) return t('admin.homePageEditor');
  if (pathname.startsWith('/admin/upsell-items')) return t('admin.upsellItems');
  if (pathname.startsWith('/admin/promotions')) return t('admin.promotions');
  if (pathname.startsWith('/admin/reviews')) return t('admin.reviews');
  if (pathname.startsWith('/admin/contact-messages')) return t('admin.contactMessages');
  if (pathname.startsWith('/admin/ai/concierge')) return 'AI Concierge';
  if (pathname.startsWith('/admin/ai/skills')) return 'AI Skills';
  if (pathname.startsWith('/admin/ai/audit')) return 'AI Audit';
  if (pathname.startsWith('/admin/ai')) return 'AI';
  if (pathname.startsWith('/admin/settings')) return t('admin.settings');
  return t('admin.admin');
};

export function AdminSidebar({
  user,
  handleSignOut,
  children,
  settings,
  pendingBookingsCount,
  agencyId,
  unreadNotificationCount,
  notifications,
}: {
  user: User;
  handleSignOut: () => void;
  children: React.ReactNode;
  settings?: AgencySettings;
  pendingBookingsCount?: number;
  agencyId?: string;
  unreadNotificationCount?: number;
  notifications?: AgencyNotification[];
}) {
  const pathname = usePathname();
  const { t } = useAdminLanguage();

  // Filter menu items based on settings.modules
  const modules = settings?.modules || {
    blog: true,
    upsell: true,
    contact: true,
    tours: true,
    hotels: true,
  };

  // Menu items grouped by category.
  //
  // Grouping principle: organize by *what the agency is trying to do*, not by
  // database tables. Operations (bookings/customers/reviews) live closer to
  // the dashboard since that's the daily-driver work. Inventory (the things
  // you sell) is its own block. Setup is pushed last.
  //
  // `keepOpen` pins a group expanded by default. Other groups auto-collapse
  // unless the user has the active page inside them.
  const groups = [
    {
      label: t('admin.overview'),
      keepOpen: true,
      items: [{ href: '/admin/dashboard', label: t('admin.dashboard'), icon: Home }],
    },
    {
      label: 'Operations',
      keepOpen: true,
      items: [
        { href: '/admin/bookings', label: t('admin.bookings'), icon: Calendar },
        { href: '/admin/hotels/bookings', label: t('admin.hotelBookings'), icon: Calendar },
        { href: '/admin/customers', label: t('admin.customers'), icon: Users },
        { href: '/admin/reviews', label: t('admin.reviews'), icon: Star },
        { href: '/admin/contact-messages', label: t('admin.contactMessages'), icon: Mail },
      ],
    },
    {
      label: 'Inventory',
      items: [
        { href: '/admin/tours', label: t('admin.tours'), icon: Globe },
        { href: '/admin/hotels', label: t('admin.hotelsDashboard'), icon: Building2 },
        { href: '/admin/hotels/rooms', label: t('admin.roomTypes'), icon: LayoutDashboard },
        { href: '/admin/upsell-items', label: t('admin.upsellItems'), icon: Tag },
      ],
    },
    {
      label: 'Pricing & rates',
      items: [
        { href: '/admin/hotels/pricing-rules', label: t('admin.pricingRules'), icon: Percent },
        { href: '/admin/hotels/availability', label: t('admin.availability'), icon: Calendar },
        { href: '/admin/promotions', label: t('admin.promotions'), icon: Percent },
      ],
    },
    {
      label: t('admin.content'),
      items: [
        {
          href: '/admin/home-page-editor',
          label: t('admin.homePageEditor'),
          icon: LayoutDashboard,
        },
        { href: '/admin/blog', label: t('admin.blog'), icon: Newspaper },
      ],
    },
    {
      label: 'AI',
      items: [
        { href: '/admin/ai/concierge', label: 'AI Concierge', icon: Bot },
        { href: '/admin/ai/skills', label: 'AI Skills', icon: Sparkles },
        { href: '/admin/ai/audit', label: 'AI Audit', icon: ScrollText },
      ],
    },
    {
      label: 'Setup',
      items: [{ href: '/admin/settings', label: t('admin.settings'), icon: Settings }],
    },
  ];

  const shouldShowItem = (href: string) => {
    if (href === '/admin/blog' && modules.blog === false) return false;
    if (href === '/admin/upsell-items' && modules.upsell === false) return false;
    if (href === '/admin/contact-messages' && modules.contact === false) return false;
    if (href === '/admin/reviews' && modules.reviews === false) return false;
    if (href === '/admin/tours' && modules.tours === false) return false;
    if (
      [
        '/admin/hotels',
        '/admin/hotels/rooms',
        '/admin/hotels/pricing-rules',
        '/admin/hotels/availability',
        '/admin/hotels/bookings',
      ].includes(href) &&
      modules.hotels === false
    )
      return false;
    return true;
  };

  const visibleGroups = groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => shouldShowItem(item.href)),
    }))
    .filter((group) => group.items.length > 0);
  const activeMenuHref = visibleGroups
    .flatMap((group) => group.items.map((item) => item.href))
    .filter((href) => pathname === href || pathname.startsWith(`${href}/`))
    .sort((a, b) => b.length - a.length)[0];

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-3 px-1 py-2">
            <Logo />
            <div className="flex flex-col">
              <span className="font-headline text-lg font-semibold text-foreground">Tourista</span>
              <span className="text-xs text-muted-foreground">{t('admin.panel')}</span>
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent>
          {/* Quick search trigger — opens the global command bar (⌘K) */}
          <div className="px-2 pt-2">
            <AdminCommandBarTrigger variant="search-pill" />
          </div>
          {visibleGroups.map((group) => {
            const groupHasActive = group.items.some(
              (item) => activeMenuHref === item.href
            );
            const defaultOpen = group.keepOpen === true || groupHasActive;
            return (
              <Collapsible
                key={group.label}
                defaultOpen={defaultOpen}
                className="group/collapsible"
              >
                <SidebarGroup>
                  <CollapsibleTrigger asChild>
                    <SidebarGroupLabel
                      asChild
                      className="cursor-pointer group/label hover:bg-sidebar-accent/40 rounded-md"
                    >
                      <button
                        type="button"
                        className="flex w-full items-center justify-between"
                      >
                        <span>{group.label}</span>
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                      </button>
                    </SidebarGroupLabel>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarGroupContent>
                      <SidebarMenu>
                        {group.items.map((item) => {
                          const isPendingBookings =
                            item.href === '/admin/bookings' &&
                            !!pendingBookingsCount &&
                            pendingBookingsCount > 0;
                          return (
                            <SidebarMenuItem key={item.href}>
                              <SidebarMenuButton
                                href={item.href}
                                isActive={activeMenuHref === item.href}
                              >
                                <item.icon />
                                <span>{item.label}</span>
                                {isPendingBookings && (
                                  <Badge
                                    variant="destructive"
                                    className="ml-auto h-5 min-w-5 px-1 text-xs"
                                  >
                                    {pendingBookingsCount}
                                  </Badge>
                                )}
                              </SidebarMenuButton>
                            </SidebarMenuItem>
                          );
                        })}
                      </SidebarMenu>
                    </SidebarGroupContent>
                  </CollapsibleContent>
                </SidebarGroup>
              </Collapsible>
            );
          })}
        </SidebarContent>
      </Sidebar>
      <SidebarInset>
        <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b bg-background/95 px-4 backdrop-blur-sm sm:h-16 sm:px-6">
          <div className="flex min-w-0 items-center gap-4">
            <SidebarTrigger className="md:hidden" />
            <h1 className="truncate text-lg font-semibold">{getPageTitle(pathname, t)}</h1>
          </div>
          <div className="flex items-center gap-2">
            {/* Header search icon — opens the same command bar as the sidebar pill */}
            <AdminCommandBarTrigger variant="icon" className="md:hidden" />
            {agencyId && (
              <NotificationBell
                agencyId={agencyId}
                initialCount={unreadNotificationCount || 0}
                initialNotifications={notifications || []}
              />
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src="" alt="Admin" />
                    <AvatarFallback>
                      <UserCircle />
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{t('admin.adminUser')}</p>
                    <p className="text-xs leading-none text-muted-foreground truncate">
                      {user.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <a
                    href="https://wa.me/201095280572"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="cursor-pointer w-full flex items-center"
                  >
                    <MessageCircle className="mr-2 h-4 w-4" />
                    <span>{t('admin.support')}</span>
                  </a>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleSignOut}
                  className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>{t('admin.signOut')}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
