'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth/auth-context';
import { PageHeader } from '@/components/admin/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { StatusBadge, attendanceToVariant, integrityToVariant, reviewToVariant } from '@/components/admin/status-badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Search, CalendarCheck, ChevronLeft, ChevronRight } from 'lucide-react';

type Attendance = {
  id: string;
  check_in_at: string;
  check_out_at: string | null;
  attendance_status: string;
  integrity_status: string;
  review_status: string;
  employees: { full_name: string; employee_code: string } | null;
};

const PAGE_SIZE = 15;

export default function AttendancePage() {
  const { profile } = useAuth();
  const [records, setRecords] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);

  const fetchAttendance = useCallback(async () => {
    if (!profile?.organization_id) return;
    setLoading(true);

    let query = supabase
      .from('attendance_sessions')
      .select(`
        id, check_in_at, check_out_at, attendance_status, integrity_status, review_status,
        employees (full_name, employee_code)
      `, { count: 'exact' })
      .eq('organization_id', profile.organization_id);

    if (search) {
      query = query.ilike('employees.full_name', `%${search}%`);
    }
    if (statusFilter !== 'all') {
      query = query.eq('attendance_status', statusFilter);
    }

    query = query.order('check_in_at', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    const { data, error, count } = await query;
    if (error) {
      console.error('Error:', error);
    } else {
      setRecords((data as unknown as Attendance[]) || []);
      setTotal(count || 0);
    }
    setLoading(false);
  }, [profile?.organization_id, search, statusFilter, page]);

  useEffect(() => {
    const timer = setTimeout(() => fetchAttendance(), 300);
    return () => clearTimeout(timer);
  }, [fetchAttendance]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div>
      <PageHeader title="Attendance" description="View and manage all attendance records" />

      <Card>
        <CardContent className="p-4">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search by employee name..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0); }}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="auto_completed">Auto-completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : records.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <CalendarCheck className="mb-2 h-8 w-8 text-slate-300" />
              <p className="text-sm text-slate-500">No attendance records found</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Check In</TableHead>
                    <TableHead>Check Out</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Integrity</TableHead>
                    <TableHead>Review</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>
                        <Link href={`/attendance/${r.id}`} className="font-medium text-blue-600 hover:underline">
                          {r.employees?.full_name || 'Unknown'}
                        </Link>
                        <span className="ml-2 text-xs text-slate-400">{r.employees?.employee_code}</span>
                      </TableCell>
                      <TableCell className="text-sm">{new Date(r.check_in_at).toLocaleString()}</TableCell>
                      <TableCell className="text-sm">{r.check_out_at ? new Date(r.check_out_at).toLocaleString() : '—'}</TableCell>
                      <TableCell><StatusBadge variant={attendanceToVariant(r.attendance_status)}>{r.attendance_status.replace(/_/g, ' ')}</StatusBadge></TableCell>
                      <TableCell><StatusBadge variant={integrityToVariant(r.integrity_status)}>{r.integrity_status.replace(/_/g, ' ')}</StatusBadge></TableCell>
                      <TableCell><StatusBadge variant={reviewToVariant(r.review_status)}>{r.review_status}</StatusBadge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between">
                  <p className="text-sm text-slate-500">Page {page + 1} of {totalPages} ({total} total)</p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>
                      <ChevronLeft className="h-4 w-4" /> Previous
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}>
                      Next <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
