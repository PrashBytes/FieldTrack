'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth/auth-context';
import { PageHeader } from '@/components/admin/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge, attendanceToVariant, integrityToVariant, reviewToVariant } from '@/components/admin/status-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Clock, MapPin, Smartphone, Shield } from 'lucide-react';

type Attendance = {
  id: string;
  employee_id: string;
  device_id: string | null;
  check_in_at: string;
  check_out_at: string | null;
  check_in_accuracy: number | null;
  check_out_accuracy: number | null;
  attendance_status: string;
  integrity_status: string;
  review_status: string;
  notes: string | null;
  employees: { full_name: string; employee_code: string } | null;
  devices: { device_name: string | null; device_identifier: string } | null;
  shifts: { name: string; start_time: string; end_time: string } | null;
};

type LocationPoint = {
  id: string;
  captured_at: string;
  location: string;
  accuracy: number | null;
  is_mock: boolean;
  trust_status: string;
};

export default function AttendanceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { profile } = useAuth();
  const [record, setRecord] = useState<Attendance | null>(null);
  const [points, setPoints] = useState<LocationPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.organization_id) return;

    (async () => {
      const [attRes, pointsRes] = await Promise.all([
        supabase
          .from('attendance_sessions')
          .select(`
            id, employee_id, device_id, check_in_at, check_out_at, check_in_accuracy, check_out_accuracy,
            attendance_status, integrity_status, review_status, notes,
            employees (full_name, employee_code),
            devices (device_name, device_identifier),
            shifts (name, start_time, end_time)
          `)
          .eq('id', id)
          .eq('organization_id', profile.organization_id)
          .maybeSingle(),
        supabase
          .from('location_points')
          .select('id, captured_at, location, accuracy, is_mock, trust_status')
          .eq('attendance_session_id', id)
          .order('captured_at', { ascending: true })
          .limit(50),
      ]);

      setRecord(attRes.data as unknown as Attendance | null);
      setPoints(pointsRes.data || []);
      setLoading(false);
    })();
  }, [id, profile?.organization_id]);

  if (loading) {
    return <div><PageHeader title="Attendance Detail" /><Skeleton className="h-64 w-full" /></div>;
  }

  if (!record) {
    return (
      <div>
        <PageHeader title="Attendance Detail" />
        <Card><CardContent className="py-12 text-center text-slate-500">Record not found</CardContent></Card>
      </div>
    );
  }

  const duration = record.check_out_at
    ? Math.round((new Date(record.check_out_at).getTime() - new Date(record.check_in_at).getTime()) / 60000)
    : Math.round((Date.now() - new Date(record.check_in_at).getTime()) / 60000);

  return (
    <div>
      <PageHeader
        title={`${record.employees?.full_name || 'Unknown Employee'}`}
        description={`${record.employees?.employee_code || ''} · ${new Date(record.check_in_at).toLocaleDateString()}`}
      >
        <Link href="/attendance">
          <Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4" />Back</Button>
        </Link>
      </PageHeader>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">Session Info</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Status</span>
                <StatusBadge variant={attendanceToVariant(record.attendance_status)}>{record.attendance_status.replace(/_/g, ' ')}</StatusBadge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Integrity</span>
                <StatusBadge variant={integrityToVariant(record.integrity_status)}>{record.integrity_status.replace(/_/g, ' ')}</StatusBadge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Review</span>
                <StatusBadge variant={reviewToVariant(record.review_status)}>{record.review_status}</StatusBadge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Duration</span>
                <span className="text-sm font-medium">{duration} min</span>
              </div>
              {record.shifts && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500">Shift</span>
                  <span className="text-sm font-medium">{record.shifts.name} ({record.shifts.start_time}–{record.shifts.end_time})</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Clock className="h-4 w-4" />Times</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div>
                <span className="text-xs text-slate-500">Check In</span>
                <p className="text-sm font-medium">{new Date(record.check_in_at).toLocaleString()}</p>
                {record.check_in_accuracy && <p className="text-xs text-slate-400">Accuracy: ±{Math.round(record.check_in_accuracy)}m</p>}
              </div>
              <div>
                <span className="text-xs text-slate-500">Check Out</span>
                <p className="text-sm font-medium">{record.check_out_at ? new Date(record.check_out_at).toLocaleString() : 'Not checked out'}</p>
                {record.check_out_accuracy && <p className="text-xs text-slate-400">Accuracy: ±{Math.round(record.check_out_accuracy)}m</p>}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Smartphone className="h-4 w-4" />Device</CardTitle></CardHeader>
            <CardContent>
              {record.devices ? (
                <div className="space-y-1">
                  <p className="text-sm font-medium">{record.devices.device_name || record.devices.device_identifier.slice(0, 16)}</p>
                  <p className="text-xs text-slate-400">{record.devices.device_identifier}</p>
                </div>
              ) : (
                <p className="text-sm text-slate-500">No device info</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><MapPin className="h-5 w-5" />Location Points ({points.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {points.length === 0 ? (
                <p className="text-sm text-slate-500 py-4 text-center">No location points recorded</p>
              ) : (
                <div className="max-h-96 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-white">
                      <tr className="border-b">
                        <th className="p-2 text-left text-xs text-slate-500">Time</th>
                        <th className="p-2 text-left text-xs text-slate-500">Accuracy</th>
                        <th className="p-2 text-left text-xs text-slate-500">Mock</th>
                        <th className="p-2 text-left text-xs text-slate-500">Trust</th>
                      </tr>
                    </thead>
                    <tbody>
                      {points.map((p) => (
                        <tr key={p.id} className="border-b">
                          <td className="p-2 text-xs">{new Date(p.captured_at).toLocaleTimeString()}</td>
                          <td className="p-2 text-xs">±{p.accuracy ? Math.round(p.accuracy) : '?'}m</td>
                          <td className="p-2">{p.is_mock ? <Shield className="h-3 w-3 text-red-500" /> : '—'}</td>
                          <td className="p-2"><StatusBadge variant={integrityToVariant(p.trust_status)}>{p.trust_status}</StatusBadge></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
