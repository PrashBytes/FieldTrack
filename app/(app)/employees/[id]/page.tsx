'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth/auth-context';
import { PageHeader } from '@/components/admin/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/admin/status-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Smartphone, CalendarCheck, ShieldAlert, MapPin } from 'lucide-react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';

type Employee = {
  id: string;
  employee_code: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  designation: string | null;
  employment_status: string;
  account_status: string;
  created_at: string;
  departments: { name: string } | null;
  teams: { name: string } | null;
  shifts: { name: string; start_time: string; end_time: string } | null;
};

type Device = {
  id: string;
  device_identifier: string;
  device_name: string | null;
  platform: string;
  is_active: boolean;
  registered_at: string;
  last_seen_at: string | null;
};

type Attendance = {
  id: string;
  check_in_at: string;
  check_out_at: string | null;
  attendance_status: string;
  integrity_status: string;
};

type FraudEvent = {
  id: string;
  event_type: string;
  severity: string;
  review_status: string;
  created_at: string;
};

export default function EmployeeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { profile } = useAuth();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [devices, setDevices] = useState<Device[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [fraudEvents, setFraudEvents] = useState<FraudEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  useEffect(() => {
    if (!profile?.organization_id) return;

    (async () => {
      const [empRes, devRes, attRes, fraudRes] = await Promise.all([
        supabase
          .from('employees')
          .select(`
            id, employee_code, full_name, email, phone, designation, employment_status, account_status, created_at,
            departments (name),
            teams (name),
            shifts (name, start_time, end_time)
          `)
          .eq('id', id)
          .eq('organization_id', profile.organization_id)
          .maybeSingle(),
        supabase.from('devices').select('*').eq('employee_id', id).order('registered_at', { ascending: false }),
        supabase.from('attendance_sessions').select('id, check_in_at, check_out_at, attendance_status, integrity_status')
          .eq('employee_id', id).order('check_in_at', { ascending: false }).limit(10),
        supabase.from('fraud_events').select('id, event_type, severity, review_status, created_at')
          .eq('employee_id', id).order('created_at', { ascending: false }).limit(5),
      ]);

      setEmployee(empRes.data as unknown as Employee | null);
      setDevices(devRes.data || []);
      setAttendance(attRes.data || []);
      setFraudEvents(fraudRes.data || []);
      setLoading(false);
    })();
  }, [id, profile?.organization_id]);

  const revokeDevice = async (deviceId: string) => {
    setRevokingId(deviceId);
    const { error } = await supabase
      .from('devices')
      .update({ is_active: false, revoked_at: new Date().toISOString() })
      .eq('id', deviceId);
    if (error) {
      console.error('Revoke error:', error);
    } else {
      setDevices(devices.map((d) => d.id === deviceId ? { ...d, is_active: false } : d));
    }
    setRevokingId(null);
  };

  if (loading) {
    return (
      <div>
        <PageHeader title="Employee Details" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!employee) {
    return (
      <div>
        <PageHeader title="Employee Details" />
        <Card><CardContent className="py-12 text-center text-slate-500">Employee not found</CardContent></Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title={employee.full_name} description={`${employee.employee_code} · ${employee.designation || 'No designation'}`}>
        <Link href="/employees">
          <Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4" />Back</Button>
        </Link>
      </PageHeader>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader><CardTitle>Profile</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between"><span className="text-sm text-slate-500">Email</span><span className="text-sm font-medium">{employee.email || '—'}</span></div>
            <div className="flex justify-between"><span className="text-sm text-slate-500">Phone</span><span className="text-sm font-medium">{employee.phone || '—'}</span></div>
            <div className="flex justify-between"><span className="text-sm text-slate-500">Department</span><span className="text-sm font-medium">{employee.departments?.name || '—'}</span></div>
            <div className="flex justify-between"><span className="text-sm text-slate-500">Team</span><span className="text-sm font-medium">{employee.teams?.name || '—'}</span></div>
            <div className="flex justify-between"><span className="text-sm text-slate-500">Shift</span><span className="text-sm font-medium">{employee.shifts?.name || '—'}</span></div>
            <div className="flex justify-between items-center"><span className="text-sm text-slate-500">Employment</span>
              <StatusBadge variant={employee.employment_status === 'active' ? 'success' : 'danger'}>{employee.employment_status.replace('_', ' ')}</StatusBadge>
            </div>
            <div className="flex justify-between items-center"><span className="text-sm text-slate-500">Account</span>
              <StatusBadge variant={employee.account_status === 'active' ? 'success' : employee.account_status === 'pending' ? 'warning' : 'danger'}>{employee.account_status}</StatusBadge>
            </div>
            <div className="flex justify-between"><span className="text-sm text-slate-500">Joined</span><span className="text-sm font-medium">{new Date(employee.created_at).toLocaleDateString()}</span></div>
          </CardContent>
        </Card>

        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Smartphone className="h-5 w-5" />Registered Devices</CardTitle>
            </CardHeader>
            <CardContent>
              {devices.length === 0 ? (
                <p className="text-sm text-slate-500 py-4 text-center">No devices registered</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Device</TableHead>
                      <TableHead>Platform</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last seen</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {devices.map((d) => (
                      <TableRow key={d.id}>
                        <TableCell className="text-sm">{d.device_name || d.device_identifier.slice(0, 12)}</TableCell>
                        <TableCell className="text-sm">{d.platform}</TableCell>
                        <TableCell>
                          <StatusBadge variant={d.is_active ? 'success' : 'danger'}>
                            {d.is_active ? 'Active' : 'Revoked'}
                          </StatusBadge>
                        </TableCell>
                        <TableCell className="text-sm text-slate-500">
                          {d.last_seen_at ? new Date(d.last_seen_at).toLocaleString() : 'Never'}
                        </TableCell>
                        <TableCell>
                          {d.is_active && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => revokeDevice(d.id)}
                              disabled={revokingId === d.id}
                            >
                              Revoke
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><CalendarCheck className="h-5 w-5" />Recent Attendance</CardTitle>
            </CardHeader>
            <CardContent>
              {attendance.length === 0 ? (
                <p className="text-sm text-slate-500 py-4 text-center">No attendance records</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Check In</TableHead>
                      <TableHead>Check Out</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Integrity</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attendance.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell className="text-sm">{new Date(a.check_in_at).toLocaleString()}</TableCell>
                        <TableCell className="text-sm">{a.check_out_at ? new Date(a.check_out_at).toLocaleString() : '—'}</TableCell>
                        <TableCell><StatusBadge variant={a.attendance_status === 'active' ? 'info' : 'success'}>{a.attendance_status}</StatusBadge></TableCell>
                        <TableCell><StatusBadge variant={a.integrity_status === 'trusted' ? 'success' : a.integrity_status === 'high_risk' ? 'danger' : 'neutral'}>{a.integrity_status}</StatusBadge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {fraudEvents.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><ShieldAlert className="h-5 w-5" />Recent Fraud Events</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fraudEvents.map((f) => (
                      <TableRow key={f.id}>
                        <TableCell className="text-sm">{f.event_type.replace(/_/g, ' ')}</TableCell>
                        <TableCell><StatusBadge variant={f.severity === 'critical' ? 'danger' : f.severity === 'high' ? 'warning' : 'neutral'}>{f.severity}</StatusBadge></TableCell>
                        <TableCell><StatusBadge variant={f.review_status === 'open' ? 'warning' : 'info'}>{f.review_status.replace(/_/g, ' ')}</StatusBadge></TableCell>
                        <TableCell className="text-sm text-slate-500">{new Date(f.created_at).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
