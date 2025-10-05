'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import {
  Sidebar, SidebarContent, SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarProvider, SidebarTrigger, SidebarInset
} from '@/components/ui/sidebar';
import {
  Home, Globe, Calendar, Settings, UserCircle, Users, Newspaper, PanelLeft, LayoutDashboard, Tag
} from 'lucide-react';
import { Logo } from '@/components/logo';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

const menuItems = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: Home },
  { href: '/admin/tours', label: 'Tours', icon: Globe },
  { href: '/admin/bookings', label: 'Bookings', icon: Calendar },
  { href: '/admin/customers', label: 'Customers', icon: Users },
  { href: '/admin/blog', label: 'Blog', icon: Newspaper },
  { href: '/admin/home-page-editor', label: 'Home Page Editor', icon: LayoutDashboard },
  { href: '/admin/upsell-items', label: 'Upsell Items', icon: Tag },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
];

const getPageTitle = (pathname: string) => {
  if (pathname.startsWith('/admin/dashboard')) return 'Dashboard';
  if (pathname.startsWith('/admin/tours')) return 'Tours';
  if (pathname.startsWith('/admin/bookings')) return 'Bookings';
  if (pathname.startsWith('/admin/customers')) return 'Customers';
  if (pathname.startsWith('/admin/blog')) return 'Blog';
  if (pathname.startsWith('/admin/home-page-editor')) return 'Home Page Editor';
  if (pathname.startsWith('/admin/settings')) return 'Settings';
  return 'Admin';
};

export function AdminSidebar({ user, handleSignOut, children }: {
  user: any;
  handleSignOut: () => void;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-2">
            <Logo />
            <div className="flex flex-col">
              <span className="font-headline text-lg font-semibold text-foreground">
                Wanderlust Hub
              </span>
              <span className="text-xs text-muted-foreground">Admin Panel</span>
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            {menuItems.map((item, index) => (
              <SidebarMenuItem key={index}>
                <SidebarMenuButton href={item.href} isActive={pathname.startsWith(item.href)}>
                  <item.icon />
                  <span>{item.label}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>
        <div className="p-2 mt-auto">
          <div className="p-2 flex items-center gap-2 rounded-md bg-muted">
            <Avatar className="h-9 w-9">
              <AvatarImage src="" alt="Admin" />
              <AvatarFallback>
                <UserCircle />
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col min-w-0">
              <p className="font-medium text-sm truncate">{user.email}</p>
              <button
                onClick={handleSignOut}
                className="text-xs text-muted-foreground hover:text-primary transition-colors text-left"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </Sidebar>
      <SidebarInset>
        <header className="flex h-14 items-center justify-between border-b bg-background/95 p-4 md:px-6 backdrop-blur-sm sticky top-0">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="md:hidden" />
            <h1 className="text-xl font-semibold">{getPageTitle(pathname)}</h1>
          </div>

        </header>
        <main className="flex-1 p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
