'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth/auth-context';
import { hasPermission, isAdmin, type Permission } from '@/lib/auth/permissions';
import {
  ShieldCheck,
  LayoutDashboard,
  Users,
  CalendarCheck,
  MapPin,
  Route,
  Hexagon,
  ShieldAlert,
  ScrollText,
  FileBarChart,
  Settings,
  ChevronLeft,
  UserCircle,
} from 'lucide-react';

type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  permission?: Permission;
};

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Employees', href: '/employees', icon: Users, permission: 'employees.read' },
  { label: 'Attendance', href: '/attendance', icon: CalendarCheck, permission: 'attendance.read' },
  { label: 'Live Tracking', href: '/live-tracking', icon: MapPin, permission: 'tracking.live' },
  { label: 'Route History', href: '/routes', icon: Route, permission: 'routes.read' },
  { label: 'Geofences', href: '/geofences', icon: Hexagon, permission: 'geofences.manage' },
  { label: 'Fraud Alerts', href: '/fraud-alerts', icon: ShieldAlert, permission: 'fraud.read' },
  { label: 'Audit Logs', href: '/audit-logs', icon: ScrollText, permission: 'audit.read' },
  { label: 'Reports', href: '/reports', icon: FileBarChart, permission: 'reports.export' },
  { label: 'Settings', href: '/settings', icon: Settings, permission: 'settings.manage' },
];

export function Sidebar() {
  const pathname = usePathname();
  const { profile } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.permission || hasPermission(profile?.role, item.permission)
  );

  return (
    <aside
      className={cn(
        'flex h-screen flex-col border-r bg-slate-900 text-slate-200 transition-all duration-200',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      <div className="flex h-14 items-center justify-between border-b border-slate-800 px-4">
        {!collapsed && (
          <Link href="/dashboard" className="flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-emerald-400" />
            <span className="text-sm font-bold tracking-tight text-white">FieldTrack</span>
          </Link>
        )}
        {collapsed && <ShieldCheck className="h-6 w-6 text-emerald-400" />}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
          aria-label="Toggle sidebar"
        >
          <ChevronLeft className={cn('h-4 w-4 transition-transform', collapsed && 'rotate-180')} />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto py-2">
        <ul className="space-y-1 px-2">
          {visibleItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-slate-800 text-white'
                      : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200',
                    collapsed && 'justify-center'
                  )}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-slate-800 p-2">
        <Link
          href="/profile"
          className={cn(
            'flex items-center gap-3 rounded-md px-3 py-2 text-sm text-slate-400 hover:bg-slate-800/50 hover:text-slate-200',
            collapsed && 'justify-center'
          )}
          title={collapsed ? 'Profile' : undefined}
        >
          <UserCircle className="h-4 w-4 shrink-0" />
          {!collapsed && <span className="truncate">{profile?.full_name || 'Profile'}</span>}
        </Link>
      </div>
    </aside>
  );
}
