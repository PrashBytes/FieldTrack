'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth/auth-context';
import { PageHeader } from '@/components/admin/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/admin/status-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, CalendarCheck, MapPin, ShieldAlert, UserCheck, UserX, Activity, Clock } from 'lucide-react';

type Stats = {
  totalEmployees: number;
  activeEmployees: number;
  presentToday: number;
  currentlyTracking: number;
  notCheckedIn: number;
  checkedOut: number;
  offlineEmployees: number;
  fraudAlertsOpen: number;
};

type RecentAttendance = {
  id: string;
  employee_id: string;
  check_in_at: string;
  check_out_at: string | null;
  attendance_status: string;
  integrity_status: string;
  employees: { full_name: string; employee_code: string } | null;
};

export default function DashboardPage() {
  const { profile } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [recent, setRecent] = useState<RecentAttendance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.organization_id) return;

    const orgId = profile.organization_id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString();

    (async () => {
      setLoading(true);
      try {
        const [
          empCount,
          activeEmpCount,
          todayAttendance,
          activeSessions,
          fraudCount,
        ] = await Promise.all([
          supabase.from('employees').select('id', { count: 'exact', head: true }).eq('organization_id', orgId),
          supabase.from('employees').select('id', { count: 'exact', head: true }).eq('organization_id', orgId).eq('employment_status', 'active'),
          supabase.from('attendance_sessions').select('id, attendance_status').eq('organization_id', orgId).gte('check_in_at', todayISO),
          supabase.from('attendance_sessions').select('id').eq('organization_id', orgId).eq('attendance_status', 'active'),
          supabase.from('fraud_events').select('id', { count: 'exact', head: true }).eq('organization_id', orgId).eq('review_status', 'open'),
        ]);

        const todayCount = todayAttendance.data?.length || 0;
        const activeCount = activeSessions.data?.length || 0;
        const checkedOutCount = todayAttendance.data?.filter((s) => s.attendance_status === 'completed').length || 0;
        const presentCount = todayCount;
        const notCheckedIn = (activeEmpCount.count || 0) - presentCount;

        setStats({
          totalEmployees: empCount.count || 0,
          activeEmployees: activeEmpCount.count || 0,
          presentToday: presentCount,
          currentlyTracking: activeCount,
          notCheckedIn: notCheckedIn > 0 ? notCheckedIn : 0,
          checkedOut: checkedOutCount,
          offlineEmployees: (activeEmpCount.count || 0) - presentCount - activeCount > 0 ? (activeEmpCount.count || 0) - presentCount - activeCount : 0,
          fraudAlertsOpen: fraudCount.count || 0,
        });

        const { data: recentData } = await supabase
          .from('attendance_sessions')
          .select(`
            id, employee_id, check_in_at, check_out_at, attendance_status, integrity_status,
            employees (full_name, employee_code)
          `)
          .eq('organization_id', orgId)
          .order('check_in_at', { ascending: false })
          .limit(10);

        setRecent((recentData as unknown as RecentAttendance[]) || []);
      } catch (err) {
        console.error('Dashboard error:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [profile?.organization_id]);

  const cards = [
    { label: 'Total Employees', value: stats?.totalEmployees, icon: Users, color: 'text-slate-700 bg-slate-100' },
    { label: 'Active Employees', value: stats?.activeEmployees, icon: UserCheck, color: 'text-emerald-700 bg-emerald-100' },
    { label: 'Present Today', value: stats?.presentToday, icon: CalendarCheck, color: 'text-blue-700 bg-blue-100' },
    { label: 'Currently Tracking', value: stats?.currentlyTracking, icon: MapPin, color: 'text-indigo-700 bg-indigo-100' },
    { label: 'Not Checked In', value: stats?.notCheckedIn, icon: UserX, color: 'text-amber-700 bg-amber-100' },
    { label: 'Checked Out', value: stats?.checkedOut, icon: Clock, color: 'text-slate-600 bg-slate-100' },
    { label: 'Offline', value: stats?.offlineEmployees, icon: Activity, color: 'text-slate-500 bg-slate-100' },
    { label: 'Fraud Alerts', value: stats?.fraudAlertsOpen, icon: ShieldAlert, color: 'text-red-700 bg-red-100' },
  ];

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description={`Welcome back, ${profile?.full_name || 'Admin'}. Here's your organization's overview.`}
      />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.label}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-medium text-slate-500">
                  {card.label}
                </CardTitle>
                <div className={`rounded-md p-1.5 ${card.color}`}>
                  <Icon className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <div className="text-2xl font-bold text-slate-900">
                    {card.value ?? 0}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="mt-8">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Recent Attendance</h2>
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="space-y-3 p-6">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : recent.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <CalendarCheck className="mb-2 h-8 w-8 text-slate-300" />
                <p className="text-sm text-slate-500">No attendance records yet today</p>
              </div>
            ) : (
              <div className="divide-y">
                {recent.map((record) => (
                  <div key={record.id} className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-sm font-medium text-slate-600">
                        {(record.employees?.full_name || '?').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900">
                          {record.employees?.full_name || 'Unknown'}
                        </p>
                        <p className="text-xs text-slate-500">
                          {record.employees?.employee_code || ''} · {new Date(record.check_in_at).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge variant={record.attendance_status === 'active' ? 'info' : 'success'}>
                        {record.attendance_status}
                      </StatusBadge>
                      <StatusBadge variant={record.integrity_status === 'trusted' ? 'success' : record.integrity_status === 'high_risk' ? 'danger' : 'neutral'}>
                        {record.integrity_status}
                      </StatusBadge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
