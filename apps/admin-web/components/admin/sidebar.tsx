'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth/auth-context';
import { hasPermission, type Permission } from '@/lib/auth/permissions';
import { supabase } from '@/lib/supabase/client';
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
  ChevronRight,
  UserCircle,
  Radio,
  Building2,
  ChevronDown,
} from 'lucide-react';

type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  permission?: Permission;
  badge?: string;
  badgeColor?: string;
};

type NavGroup = {
  title: string;
  items: NavItem[];
};

const NAV_GROUPS: NavGroup[] = [
  {
    title: 'Operations',
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      {
        label: 'Live Tracking',
        href: '/live-tracking',
        icon: MapPin,
        permission: 'tracking.live',
        badge: 'LIVE',
        badgeColor: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
      },
      { label: 'Route History', href: '/routes', icon: Route, permission: 'routes.read' },
      { label: 'Geofences', href: '/geofences', icon: Hexagon, permission: 'geofences.manage' },
    ],
  },
  {
    title: 'Workforce',
    items: [
      { label: 'Employees', href: '/employees', icon: Users, permission: 'employees.read' },
      { label: 'Attendance', href: '/attendance', icon: CalendarCheck, permission: 'attendance.read' },
    ],
  },
  {
    title: 'Security & Intelligence',
    items: [
      {
        label: 'Fraud Alerts',
        href: '/fraud-alerts',
        icon: ShieldAlert,
        permission: 'fraud.read',
      },
      { label: 'Audit Logs', href: '/audit-logs', icon: ScrollText, permission: 'audit.read' },
      { label: 'Reports', href: '/reports', icon: FileBarChart, permission: 'reports.export' },
    ],
  },
  {
    title: 'Management',
    items: [
      { label: 'Settings', href: '/settings', icon: Settings, permission: 'settings.manage' },
    ],
  },
];

interface SidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
}

export function Sidebar({ collapsed: controlledCollapsed, onToggle }: SidebarProps = {}) {
  const pathname = usePathname();
  const { profile } = useAuth();
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const [unresolvedAlerts, setUnresolvedAlerts] = useState<number | null>(null);
  const [hasCriticalAlert, setHasCriticalAlert] = useState<boolean>(false);

  const collapsed = controlledCollapsed !== undefined ? controlledCollapsed : internalCollapsed;
  const handleToggle = onToggle || (() => setInternalCollapsed(!internalCollapsed));

  useEffect(() => {
    if (!profile?.organization_id) return;

    let isMounted = true;
    const fetchAlertsCount = async () => {
      try {
        const { data } = await supabase
          .from('fraud_events')
          .select('severity, status')
          .eq('organization_id', profile.organization_id);

        if (data && isMounted) {
          const unresolved = data.filter((e: any) => {
            const s = (e.status || '').toUpperCase();
            return s === 'PENDING' || s === 'INVESTIGATING';
          });
          setUnresolvedAlerts(unresolved.length);
          setHasCriticalAlert(
            unresolved.some((e: any) => (e.severity || '').toUpperCase() === 'CRITICAL')
          );
        }
      } catch {
        // ignore
      }
    };

    fetchAlertsCount();
    return () => {
      isMounted = false;
    };
  }, [profile?.organization_id, pathname]);

  return (
    <aside
      className={cn(
        'relative flex h-screen flex-col border-r border-slate-800/80 bg-slate-950 text-slate-300 transition-all duration-300 select-none z-20 shadow-xl shrink-0',
        collapsed ? 'w-20' : 'w-[268px]'
      )}
    >
      {/* Persistent Border Expand/Collapse Toggle Button (Always visible on edge) */}
      <button
        type="button"
        onClick={handleToggle}
        className="absolute -right-3.5 top-5 z-30 flex h-7 w-7 items-center justify-center rounded-full border border-slate-700 bg-slate-900 text-slate-300 shadow-md hover:bg-slate-800 hover:text-white hover:scale-110 active:scale-95 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? (
          <ChevronRight className="h-4 w-4" />
        ) : (
          <ChevronLeft className="h-4 w-4" />
        )}
      </button>

      {/* Brand Header */}
      <div className={cn(
        "flex h-16 shrink-0 items-center border-b border-slate-800/80 transition-all",
        collapsed ? "justify-center px-2" : "justify-between px-4"
      )}>
        {!collapsed ? (
          <Link href="/dashboard" className="flex items-center gap-2.5 group min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 text-white shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold tracking-tight text-white font-mono">FieldTrack</span>
                <span className="rounded-full bg-indigo-500/20 px-1.5 py-0.2 text-[9px] font-semibold text-indigo-400 border border-indigo-500/30">
                  PRO
                </span>
              </div>
              <span className="text-[10px] text-slate-400 font-medium tracking-wide truncate">
                Workforce Telematics
              </span>
            </div>
          </Link>
        ) : (
          <Link href="/dashboard" className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-400 text-white shadow-lg hover:scale-105 transition-transform" title="FieldTrack Dashboard">
            <ShieldCheck className="h-5 w-5" />
          </Link>
        )}

        {!collapsed && (
          <button
            type="button"
            onClick={handleToggle}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800/80 hover:text-white transition-colors cursor-pointer"
            aria-label="Collapse sidebar"
            title="Collapse sidebar"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Organization Switcher Badge */}
      {!collapsed && (
        <div className="px-3 pt-3.5 pb-1">
          <div className="flex items-center justify-between rounded-lg bg-slate-900/80 px-3 py-2 border border-slate-800/60 shadow-inner">
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-indigo-500/10 text-indigo-400">
                <Building2 className="h-3.5 w-3.5" />
              </div>
              <div className="truncate">
                <p className="truncate text-xs font-semibold text-slate-200">Acme Logistics Inc.</p>
                <div className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[10px] text-slate-400">Primary Tenant</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Groups */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
        {NAV_GROUPS.map((group) => {
          const visibleItems = group.items.filter(
            (item) => !item.permission || hasPermission(profile?.role, item.permission)
          );

          if (visibleItems.length === 0) return null;

          return (
            <div key={group.title} className="space-y-1">
              {!collapsed && (
                <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                  {group.title}
                </p>
              )}
              <ul className="space-y-0.5">
                {visibleItems.map((item) => {
                  const isActive =
                    pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
                  const Icon = item.icon;

                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={cn(
                          'group relative flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium transition-all duration-150',
                          isActive
                            ? 'bg-gradient-to-r from-indigo-600/20 to-indigo-600/5 text-white font-semibold border-l-2 border-indigo-400 pl-2.5 shadow-sm'
                            : 'text-slate-400 hover:bg-slate-900/80 hover:text-slate-200',
                          collapsed && 'justify-center px-0'
                        )}
                        title={collapsed ? item.label : undefined}
                      >
                        <Icon
                          className={cn(
                            'h-4 w-4 shrink-0 transition-colors',
                            isActive ? 'text-indigo-400' : 'text-slate-400 group-hover:text-slate-300'
                          )}
                        />
                        {!collapsed && (() => {
                          const isFraudAlerts = item.href === '/fraud-alerts';
                          const displayBadge = isFraudAlerts
                            ? unresolvedAlerts !== null && unresolvedAlerts > 0
                              ? String(unresolvedAlerts)
                              : undefined
                            : item.badge;

                          const displayBadgeColor = isFraudAlerts
                            ? hasCriticalAlert
                              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                              : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            : item.badgeColor;

                          return (
                            <div className="flex flex-1 items-center justify-between truncate">
                              <span className="truncate">{item.label}</span>
                              {displayBadge && (
                                <span
                                  className={cn(
                                    'rounded-full px-1.5 py-0.2 text-[9px] font-bold tracking-tight',
                                    displayBadgeColor || 'bg-slate-800 text-slate-300'
                                  )}
                                >
                                  {displayBadge}
                                </span>
                              )}
                            </div>
                          );
                        })()}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      {/* Telemetry Heartbeat Widget */}
      {!collapsed && (
        <div className="px-3 py-2 border-t border-slate-800/80 bg-slate-950/40">
          <div className="flex items-center justify-between rounded-lg bg-emerald-950/20 px-3 py-2 border border-emerald-900/30">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <div>
                <p className="text-[11px] font-semibold text-emerald-400 leading-none">Telemetry Linked</p>
                <p className="text-[9px] text-slate-400 mt-0.5">GPS Ingestion Active</p>
              </div>
            </div>
            <Radio className="h-3.5 w-3.5 text-emerald-500/70" />
          </div>
        </div>
      )}

      {/* User Profile Footer */}
      <div className="border-t border-slate-800/80 p-2.5 bg-slate-950">
        <Link
          href="/profile"
          className={cn(
            'flex items-center gap-3 rounded-lg p-2 text-xs text-slate-300 hover:bg-slate-900 transition-colors group',
            collapsed && 'justify-center p-1'
          )}
          title={collapsed ? 'Profile' : undefined}
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-tr from-indigo-700 to-indigo-900 text-white font-semibold text-xs border border-indigo-500/30">
            {(profile?.full_name || profile?.email || 'AD').slice(0, 2).toUpperCase()}
          </div>
          {!collapsed && (
            <div className="flex-1 truncate">
              <p className="truncate font-semibold text-slate-200 group-hover:text-white">
                {profile?.full_name || 'Admin User'}
              </p>
              <p className="truncate text-[10px] text-slate-400 capitalize">
                {profile?.role?.replace('_', ' ') || 'Company Admin'}
              </p>
            </div>
          )}
        </Link>
      </div>
    </aside>
  );
}
