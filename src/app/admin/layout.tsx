
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
  LayoutDashboard,
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

import { AdminSidebar } from '@/components/admin/admin-sidebar';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [user, setUser] = React.useState<any>(null);
  // const [loading, setLoading] = React.useState(true);
  const supabase = createClient();

  React.useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/admin';
  };

  // Rely on middleware for auth-based redirects in production.
  // In the layout, simply render login content when no user is present.


  if (!user) {
    return (
        <div className="flex min-h-screen bg-background">
            <main className="flex-1 p-6">{children}</main>
        </div>
    )
  }

  return (
    <AdminSidebar user={user} handleSignOut={handleSignOut}>
      {children}
    </AdminSidebar>
  );
}
