'use client';

import { ReactNode, useEffect, useState } from 'react';
import { Sidebar } from '@/components/admin/sidebar';
import { Topbar } from '@/components/admin/topbar';
import { useAuth } from '@/lib/auth/auth-context';
import { supabase } from '@/lib/supabase/client';
import { Loader2 } from 'lucide-react';

export function AdminLayout({ children }: { children: ReactNode }) {
  const { loading, profile, user } = useAuth();
  const [profileRetry, setProfileRetry] = useState(false);

  // If auth finished loading and we have a user but no profile, the profile
  // row might not be visible yet (e.g. just created via edge function). Retry
  // once before redirecting, instead of immediately bouncing to /login.
  useEffect(() => {
    if (!loading && user && !profile && !profileRetry) {
      const timer = setTimeout(() => setProfileRetry(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [loading, user, profile, profileRetry]);

  useEffect(() => {
    if (profileRetry && user && !profile) {
      // Force a fresh session check which re-triggers fetchProfile
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          // The onAuthStateChange or getSession path should have fetched it.
          // If still no profile after retry, redirect.
        }
      });
    }
  }, [profileRetry, user, profile]);

  if (loading || (user && !profile && !profileRetry)) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!profile) {
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
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
