'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/auth-context';
import { hasPermission } from '@/lib/auth/permissions';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  LogOut,
  UserCircle,
  Settings as SettingsIcon,
  ChevronDown,
  Search,
  MapPin,
  Bell,
  Radio,
  ExternalLink,
} from 'lucide-react';

export function Topbar() {
  const router = useRouter();
  const { profile, signOut } = useAuth();

  const initials = (profile?.full_name || profile?.email || 'AD')
    .split(' ')
    .map((p) => p[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const roleLabels: Record<string, string> = {
    super_admin: 'Super Admin',
    company_admin: 'Company Admin',
    manager: 'Operations Manager',
    employee: 'Field Staff',
  };

  const canManageSettings = profile?.role
    ? hasPermission(profile.role, 'settings.manage')
    : false;

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (err) {
      console.error('Sign out error:', err);
    } finally {
      window.location.href = '/login';
    }
  };

  return (
    <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center justify-between border-b border-slate-800/80 bg-slate-950/80 px-6 backdrop-blur-md transition-all shadow-sm">
      {/* Left section: Quick Search & Telemetry status */}
      <div className="flex items-center gap-4">
        {/* Telemetry Live Indicator */}
        <div className="hidden sm:flex items-center gap-2 rounded-full bg-slate-900/90 px-3 py-1 border border-slate-800 text-slate-300 shadow-xs">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span className="text-xs font-semibold text-slate-200">Fleet Telemetry Active</span>
          <span className="text-[10px] font-mono text-slate-400 font-semibold">• 2 Devices</span>
        </div>

        {/* Global Search Pill */}
        <div className="relative hidden md:block">
          <div className="flex h-9 w-64 items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/80 px-3 text-xs text-slate-400 hover:border-slate-700 hover:bg-slate-900 transition-all cursor-pointer">
            <Search className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <span className="flex-1 truncate">Search workforce or routes...</span>
            <kbd className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-semibold text-slate-400 border border-slate-700 shadow-xs shrink-0">
              ⌘K
            </kbd>
          </div>
        </div>
      </div>

      {/* Right section: Shortcuts & Profile Dropdown */}
      <div className="flex items-center gap-3">
        {/* Quick Map Link */}
        <Link href="/live-tracking" className="hidden lg:block">
          <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs font-medium border-slate-800 bg-slate-900/80 text-slate-200 hover:bg-slate-800 hover:border-indigo-500/40 hover:text-indigo-300 transition-colors">
            <MapPin className="h-3.5 w-3.5 text-indigo-400" />
            Live Map
          </Button>
        </Link>

        {/* Notification Bell */}
        <Link href="/fraud-alerts">
          <button
            className="relative flex h-8 w-8 items-center justify-center rounded-lg border border-slate-800 bg-slate-900/80 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
            aria-label="Alerts"
          >
            <Bell className="h-4 w-4" />
            <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-slate-950" />
          </button>
        </Link>

        {/* User Profile Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="h-9 gap-2.5 rounded-lg px-2 hover:bg-slate-900/90 transition-colors text-slate-200 border border-transparent hover:border-slate-800"
            >
              <Avatar className="h-7 w-7 ring-2 ring-indigo-500/25">
                <AvatarFallback className="bg-gradient-to-tr from-indigo-600 to-indigo-800 text-white font-bold text-[11px]">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="hidden sm:flex flex-col text-left">
                <span className="text-xs font-semibold leading-tight text-white">
                  {profile?.full_name || 'Admin User'}
                </span>
                <span className="text-[10px] text-slate-400 leading-tight">
                  {roleLabels[profile?.role || 'company_admin'] || 'Company Admin'}
                </span>
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            align="end"
            sideOffset={8}
            collisionPadding={12}
            className="z-[2000] w-64 p-1.5 border border-white/10 bg-[rgba(7,13,29,0.88)] text-slate-100 backdrop-blur-[12px] shadow-[0_16px_36px_-6px_rgba(0,0,0,0.7),0_0_0_1px_rgba(255,255,255,0.06)] rounded-xl max-h-[calc(100vh-5rem)] overflow-y-auto"
            style={{
              backgroundColor: 'rgba(7, 13, 29, 0.88)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
            }}
          >
            <DropdownMenuLabel className="p-2.5">
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-white tracking-tight truncate">
                    {profile?.full_name || 'Administrator'}
                  </span>
                  <Badge
                    variant="outline"
                    className="text-[10px] font-semibold bg-indigo-500/20 text-indigo-300 border-indigo-500/35 px-1.5 py-0 shrink-0"
                  >
                    {roleLabels[profile?.role || 'company_admin'] || 'Company Admin'}
                  </Badge>
                </div>
                <span className="text-[11px] text-slate-300 font-mono truncate">
                  {profile?.email || 'admin@acmelogistics.com'}
                </span>
              </div>
            </DropdownMenuLabel>

            <DropdownMenuSeparator className="bg-white/10 my-1" />

            <DropdownMenuItem
              onClick={() => router.push('/profile')}
              className="text-xs font-medium cursor-pointer rounded-lg py-2 px-2.5 text-slate-200 hover:text-white hover:bg-white/[0.08] focus:bg-white/[0.08] focus:text-white transition-colors flex items-center gap-2.5"
            >
              <UserCircle className="h-4 w-4 text-slate-300 shrink-0" />
              <span>Account Profile</span>
            </DropdownMenuItem>

            {canManageSettings && (
              <DropdownMenuItem
                onClick={() => router.push('/settings')}
                className="text-xs font-medium cursor-pointer rounded-lg py-2 px-2.5 text-slate-200 hover:text-white hover:bg-white/[0.08] focus:bg-white/[0.08] focus:text-white transition-colors flex items-center gap-2.5"
              >
                <SettingsIcon className="h-4 w-4 text-slate-300 shrink-0" />
                <span>Company Settings</span>
              </DropdownMenuItem>
            )}

            <DropdownMenuSeparator className="bg-white/10 my-1" />

            <DropdownMenuItem
              onClick={handleSignOut}
              className="text-xs font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-500/15 focus:text-rose-300 focus:bg-rose-500/15 cursor-pointer rounded-lg py-2 px-2.5 transition-colors flex items-center gap-2.5"
            >
              <LogOut className="h-4 w-4 text-rose-400 shrink-0" />
              <span>Sign Out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
