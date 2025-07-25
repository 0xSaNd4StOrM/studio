
'use client';

import * as React from 'react';
import { usePathname, redirect } from 'next/navigation';
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
} from '@/components/ui/sidebar';
import {
  Home,
  Globe,
  Calendar,
  Settings,
  UserCircle,
  Users,
  Newspaper,
  PanelLeft,
} from 'lucide-react';
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
import { createClient } from '@/lib/supabase/client';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [user, setUser] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const supabase = createClient();

  React.useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
    };
    getUser();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/admin';
  };

  if (loading) {
    return <div>Loading...</div>; // Or a proper skeleton loader
  }
  
  if (!user && (process.env.NODE_ENV === 'production' || process.env.NEXT_PUBLIC_VERCEL_ENV === 'production')) {
      redirect('/admin');
  }

  if (!user && process.env.NODE_ENV !== 'production' && process.env.NEXT_PUBLIC_VERCEL_ENV !== 'production' && pathname !== '/admin') {
     // Don't redirect in dev, just show the content which will be the login page
  } else if (user && pathname === '/admin') {
     redirect('/admin/dashboard');
  }


  if (!user) {
    return (
        <div className="flex min-h-screen bg-background">
            <main className="flex-1 p-6">{children}</main>
        </div>
    )
  }

  const getPageTitle = () => {
    if (pathname.startsWith('/admin/dashboard')) return 'Dashboard';
    if (pathname.startsWith('/admin/tours')) return 'Tours';
    if (pathname.startsWith('/admin/bookings')) return 'Bookings';
    if (pathname.startsWith('/admin/customers')) return 'Customers';
    if (pathname.startsWith('/admin/blog')) return 'Blog';
    if (pathname.startsWith('/admin/settings')) return 'Settings';
    return 'Admin';
  }

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
            <SidebarMenuItem>
              <SidebarMenuButton href="/admin/dashboard" isActive={pathname === '/admin/dashboard'}>
                <Home />
                <span>Dashboard</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton href="/admin/tours" isActive={pathname.startsWith('/admin/tours')}>
                <Globe />
                <span>Tours</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton href="#" isActive={pathname.startsWith('/admin/bookings')}>
                <Calendar />
                <span>Bookings</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
             <SidebarMenuItem>
              <SidebarMenuButton href="#" isActive={pathname.startsWith('/admin/customers')}>
                <Users />
                <span>Customers</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
             <SidebarMenuItem>
              <SidebarMenuButton href="#" isActive={pathname.startsWith('/admin/blog')}>
                <Newspaper />
                <span>Blog</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton href="/admin/settings" isActive={pathname.startsWith('/admin/settings')}>
                <Settings />
                <span>Settings</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
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
            <h1 className="text-xl font-semibold">{getPageTitle()}</h1>
          </div>
           <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="overflow-hidden rounded-full"
              >
                <Avatar>
                  <AvatarImage src="" alt="Admin" />
                   <AvatarFallback>
                    <UserCircle />
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Settings</DropdownMenuItem>
              <DropdownMenuItem>Support</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut}>Logout</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
