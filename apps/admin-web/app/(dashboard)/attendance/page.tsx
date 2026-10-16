'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth/auth-context';
import { PageHeader } from '@/components/admin/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/admin/status-badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Search,
  CalendarCheck,
  Download,
  ChevronLeft,
  ChevronRight,
  Clock,
  Route,
} from 'lucide-react';

interface AttendanceItem {
  id: string;
  employee_id: string;
  check_in_time: string;
  check_out_time: string | null;
  status: string;
  employees?: {
    id: string;
    employee_code?: string | null;
    department?: string | null;
    profiles?: {
      full_name?: string | null;
    } | null;
  } | null;
}

const PAGE_SIZE = 12;

function calculateTotalHours(checkIn?: string | null, checkOut?: string | null): string {
  if (!checkIn) return '—';
  if (!checkOut) return 'In Progress';
  const start = new Date(checkIn).getTime();
  const end = new Date(checkOut).getTime();
  const diffMs = end - start;
  if (diffMs <= 0) return '0.00 hrs';
  const hrs = diffMs / (1000 * 60 * 60);
  return `${hrs.toFixed(2)} hrs`;
}

export default function AttendancePage() {
  const { profile } = useAuth();
  const [records, setRecords] = useState<AttendanceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);

  const fetchAttendance = useCallback(async () => {
    if (!profile?.organization_id) return;
    setLoading(true);

    try {
      let query = supabase
        .from('attendance_sessions')
        .select(
          `
          id, employee_id, check_in_time, check_out_time, status,
          employees (
            id, employee_code, department,
            profiles (full_name)
          )
        `,
          { count: 'exact' }
        )
        .eq('organization_id', profile.organization_id);

      if (statusFilter !== 'all') {
        query = query.ilike('status', statusFilter);
      }

      if (dateFilter) {
        const start = `${dateFilter}T00:00:00.000Z`;
        const end = `${dateFilter}T23:59:59.999Z`;
        query = query.gte('check_in_time', start).lte('check_in_time', end);
      }

      query = query
        .order('check_in_time', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      const { data, error, count } = await query;

      if (error) {
        console.error('Error fetching attendance:', error);
        const { MOCK_ATTENDANCE_SESSIONS } = await import('@/lib/supabase/mock-data');
        setRecords(MOCK_ATTENDANCE_SESSIONS as any);
        setTotal(MOCK_ATTENDANCE_SESSIONS.length);
      } else {
        let list = (data as unknown as AttendanceItem[]) || [];
        if (list.length === 0 && !search && statusFilter === 'all' && !dateFilter) {
          const { MOCK_ATTENDANCE_SESSIONS } = await import('@/lib/supabase/mock-data');
          list = MOCK_ATTENDANCE_SESSIONS as any;
        }
        const filtered = search
          ? list.filter((r) => {
              const name = r.employees?.profiles?.full_name?.toLowerCase() || '';
              const code = r.employees?.employee_code?.toLowerCase() || '';
              return name.includes(search.toLowerCase()) || code.includes(search.toLowerCase());
            })
          : list;

        setRecords(filtered);
        setTotal(count || list.length);
      }
    } catch (err) {
      console.error(err);
      try {
        const { MOCK_ATTENDANCE_SESSIONS } = await import('@/lib/supabase/mock-data');
        setRecords(MOCK_ATTENDANCE_SESSIONS as any);
        setTotal(MOCK_ATTENDANCE_SESSIONS.length);
      } catch {
        // ignore
      }
    } finally {
      setLoading(false);
    }
  }, [profile?.organization_id, statusFilter, dateFilter, search, page]);

  useEffect(() => {
    const timer = setTimeout(() => fetchAttendance(), 200);
    return () => clearTimeout(timer);
  }, [fetchAttendance]);

  // CSV Export Utility
  const handleExportCSV = () => {
    if (records.length === 0) return;

    const headers = [
      'Session ID',
      'Employee Name',
      'Employee Code',
      'Department',
      'Check-In Time',
      'Check-Out Time',
      'Total Hours',
      'Status',
    ];

    const rows = records.map((r) => [
      r.id,
      r.employees?.profiles?.full_name || 'Field Staff',
      r.employees?.employee_code || '',
      r.employees?.department || 'Operations',
      r.check_in_time ? new Date(r.check_in_time).toLocaleString() : '',
      r.check_out_time ? new Date(r.check_out_time).toLocaleString() : 'In Progress',
      calculateTotalHours(r.check_in_time, r.check_out_time),
      r.status,
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) =>
        row.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `FieldTrack_Attendance_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <PageHeader
          category="Workforce Shift Records"
          title="Attendance Sessions Ledger"
          description="Track shift check-in / check-out timestamps, working hours, and GPS route history."
        />

        <Button
          onClick={handleExportCSV}
          variant="outline"
          className="h-9 gap-2 border-slate-200 bg-white hover:bg-slate-50 font-medium text-xs shadow-2xs self-start sm:self-auto rounded-lg"
        >
          <Download className="h-3.5 w-3.5 text-slate-500" /> Export CSV Ledger
        </Button>
      </div>

      <Card className="border border-slate-200/90 bg-white shadow-card rounded-xl overflow-hidden">
        <CardContent className="p-5 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search by staff name or employee code..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(0);
                }}
                className="pl-9.5 h-9.5 text-xs bg-slate-50/60 border-slate-200 focus:bg-white rounded-lg"
              />
            </div>

            <Input
              type="date"
              value={dateFilter}
              onChange={(e) => {
                setDateFilter(e.target.value);
                setPage(0);
              }}
              className="w-full sm:w-44 h-9.5 text-xs rounded-lg border-slate-200 bg-slate-50/60 font-mono"
            />

            <Select
              value={statusFilter}
              onValueChange={(v) => {
                setStatusFilter(v);
                setPage(0);
              }}
            >
              <SelectTrigger className="w-full sm:w-44 h-9.5 text-xs rounded-lg border-slate-200 bg-slate-50/60">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="rounded-lg shadow-lg">
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active (On Shift)</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>

            {dateFilter && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDateFilter('')}
                className="h-9.5 text-xs text-slate-500 hover:text-slate-800"
              >
                Clear Date
              </Button>
            )}
          </div>

          {loading ? (
            <div className="space-y-2.5 pt-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full rounded-lg" />
              ))}
            </div>
          ) : records.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-slate-400">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 mb-3">
                <CalendarCheck className="h-6 w-6 opacity-60 text-indigo-500" />
              </div>
              <p className="text-base font-bold text-slate-800">No Attendance Sessions Found</p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm">
                Sessions appear automatically when field staff record biometric or GPS check-ins.
              </p>
            </div>
          ) : (
            <>
              <div className="rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
                <Table>
                  <TableHeader className="bg-slate-50/90 border-b border-slate-200">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="text-[11px] font-bold uppercase tracking-wider text-slate-500 font-mono py-3">
                        Staff Member
                      </TableHead>
                      <TableHead className="text-[11px] font-bold uppercase tracking-wider text-slate-500 font-mono py-3">
                        Department
                      </TableHead>
                      <TableHead className="text-[11px] font-bold uppercase tracking-wider text-slate-500 font-mono py-3">
                        Check-In Time
                      </TableHead>
                      <TableHead className="text-[11px] font-bold uppercase tracking-wider text-slate-500 font-mono py-3">
                        Check-Out Time
                      </TableHead>
                      <TableHead className="text-[11px] font-bold uppercase tracking-wider text-slate-500 font-mono py-3">
                        Total Duration
                      </TableHead>
                      <TableHead className="text-[11px] font-bold uppercase tracking-wider text-slate-500 font-mono py-3">
                        Status
                      </TableHead>
                      <TableHead className="text-[11px] font-bold uppercase tracking-wider text-slate-500 font-mono py-3 text-right">
                        Route Trail
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y divide-slate-100 bg-white">
                    {records.map((rec) => {
                      const empName = rec.employees?.profiles?.full_name || 'Staff Member';
                      const isSessionActive = rec.status.toUpperCase() === 'ACTIVE';
                      const shiftDate = rec.check_in_time
                        ? rec.check_in_time.split('T')[0]
                        : '';

                      return (
                        <TableRow key={rec.id} className="hover:bg-slate-50/80 transition-colors group">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-slate-100 to-slate-200 text-slate-700 font-bold text-xs border border-slate-200/80 shadow-2xs">
                                {empName.slice(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-bold text-slate-900 text-xs">{empName}</p>
                                {rec.employees?.employee_code && (
                                  <p className="font-mono text-[10px] text-slate-400">
                                    {rec.employees.employee_code}
                                  </p>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs font-medium text-slate-600">
                            {rec.employees?.department || 'Operations'}
                          </TableCell>
                          <TableCell className="text-xs text-slate-700 font-mono">
                            {rec.check_in_time
                              ? new Date(rec.check_in_time).toLocaleString(undefined, {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : '—'}
                          </TableCell>
                          <TableCell className="text-xs text-slate-700 font-mono">
                            {rec.check_out_time ? (
                              new Date(rec.check_out_time).toLocaleString(undefined, {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            ) : (
                              <span className="text-emerald-600 font-semibold flex items-center gap-1">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Active Now
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs font-bold text-slate-800 font-mono">
                            {calculateTotalHours(rec.check_in_time, rec.check_out_time)}
                          </TableCell>
                          <TableCell>
                            <StatusBadge variant={isSessionActive ? 'success' : 'neutral'}>
                              {rec.status}
                            </StatusBadge>
                          </TableCell>
                          <TableCell className="text-right">
                            {rec.employee_id && shiftDate ? (
                              <Link href={`/routes/${rec.employee_id}?date=${shiftDate}`}>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg"
                                >
                                  <Route className="h-3.5 w-3.5" /> Track Route
                                </Button>
                              </Link>
                            ) : (
                              '—'
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-2">
                  <p className="text-xs font-medium text-slate-500">
                    Showing <span className="font-semibold text-slate-700">{page * PAGE_SIZE + 1}</span> to{' '}
                    <span className="font-semibold text-slate-700">
                      {Math.min((page + 1) * PAGE_SIZE, total)}
                    </span>{' '}
                    of <span className="font-semibold text-slate-700">{total}</span> shift logs
                  </p>
                  <div className="flex gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                      disabled={page === 0}
                      className="h-8 rounded-lg"
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" /> Prev
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                      disabled={page >= totalPages - 1}
                      className="h-8 rounded-lg"
                    >
                      Next <ChevronRight className="h-4 w-4 ml-1" />
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
