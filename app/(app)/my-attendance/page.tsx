'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth/auth-context';
import { PageHeader } from '@/components/admin/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge, attendanceToVariant, integrityToVariant } from '@/components/admin/status-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { CalendarCheck } from 'lucide-react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';

type Attendance = {
  id: string;
  check_in_at: string;
  check_out_at: string | null;
  attendance_status: string;
  integrity_status: string;
};

export default function MyAttendancePage() {
  const { profile } = useAuth();
  const [records, setRecords] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.id) return;

    supabase
      .from('employees')
      .select('id')
      .eq('profile_id', profile.id)
      .maybeSingle()
      .then(({ data: emp }) => {
        if (!emp) { setLoading(false); return; }
        supabase
          .from('attendance_sessions')
          .select('id, check_in_at, check_out_at, attendance_status, integrity_status')
          .eq('employee_id', emp.id)
          .order('check_in_at', { ascending: false })
          .limit(30)
          .then(({ data }) => {
            setRecords(data || []);
            setLoading(false);
          });
      });
  }, [profile?.id]);

  return (
    <div>
      <PageHeader title="My Attendance" description="Your recent attendance history" />

      <Card>
        <CardContent className="p-4">
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : records.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <CalendarCheck className="mb-2 h-8 w-8 text-slate-300" />
              <p className="text-sm text-slate-500">No attendance records</p>
            </div>
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
                {records.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-sm">{new Date(r.check_in_at).toLocaleString()}</TableCell>
                    <TableCell className="text-sm">{r.check_out_at ? new Date(r.check_out_at).toLocaleString() : '—'}</TableCell>
                    <TableCell><StatusBadge variant={attendanceToVariant(r.attendance_status)}>{r.attendance_status.replace(/_/g, ' ')}</StatusBadge></TableCell>
                    <TableCell><StatusBadge variant={integrityToVariant(r.integrity_status)}>{r.integrity_status.replace(/_/g, ' ')}</StatusBadge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
