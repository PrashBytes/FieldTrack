'use client';

import { ReactNode, useEffect, useState } from 'react';
import { Sidebar } from '@/components/admin/sidebar';
import { Topbar } from '@/components/admin/topbar';
import { useAuth } from '@/lib/auth/auth-context';
import { supabase, shouldBypassNetwork } from '@/lib/supabase/client';
import { Loader2 } from 'lucide-react';

export function AdminLayout({ children }: { children: ReactNode }) {
  const { loading, profile, user } = useAuth();
  const [profileRetry, setProfileRetry] = useState(false);
  const isBypass = typeof window !== 'undefined' ? shouldBypassNetwork() : false;

  // Shared persistent sidebar state across all authenticated routes
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('fieldtrack_sidebar_collapsed');
      if (saved !== null) {
        setSidebarCollapsed(saved === 'true');
      }
    }
  }, []);

  const toggleSidebar = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem('fieldtrack_sidebar_collapsed', String(next));
      }
      return next;
    });
  };

  useEffect(() => {
    if (!loading && user && !profile && !profileRetry && !isBypass) {
      const timer = setTimeout(() => setProfileRetry(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [loading, user, profile, profileRetry, isBypass]);

  useEffect(() => {
    if (profileRetry && user && !profile && !isBypass) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          // fresh session check
        }
      });
    }
  }, [profileRetry, user, profile, isBypass]);

  if (!isBypass && (loading || (user && !profile && !profileRetry))) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
      </div>
    );
  }

  if (!profile && !isBypass) {
    if (typeof window !== 'undefined') {
      if (user) {
        window.location.href = '/login?error=no_profile';
      } else {
        window.location.href = '/login';
      }
    }
    return null;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950 font-sans antialiased text-slate-100">
      <Sidebar collapsed={sidebarCollapsed} onToggle={toggleSidebar} />
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        <Topbar />
        <main className="flex-1 overflow-y-auto p-6 lg:p-8 bg-slate-950">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
