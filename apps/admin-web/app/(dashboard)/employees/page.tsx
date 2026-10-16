'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { supabase, shouldBypassNetwork } from '@/lib/supabase/client';
import { MOCK_EMPLOYEES } from '@/lib/supabase/mock-data';
import { useAuth } from '@/lib/auth/auth-context';
import { PageHeader } from '@/components/admin/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { UserPlus, Search, ChevronLeft, ChevronRight, Users } from 'lucide-react';

interface EmployeeItem {
  id: string;
  employee_code?: string | null;
  department: string;
  status: string;
  created_at: string;
  profiles?: {
    full_name?: string | null;
    email?: string | null;
  } | null;
}

const PAGE_SIZE = 10;

export default function EmployeesPage() {
  const { profile } = useAuth();
  const [employees, setEmployees] = useState<EmployeeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);

  const fetchEmployees = useCallback(async () => {
    // 1. Short-circuit: if in local development or mock mode, render immediately
    if (shouldBypassNetwork() || !profile?.organization_id) {
      let rows = [...MOCK_EMPLOYEES] as any;
      if (statusFilter !== 'all') {
        rows = rows.filter((emp: any) => emp.status?.toUpperCase() === statusFilter.toUpperCase());
      }
      if (search) {
        const q = search.toLowerCase();
        rows = rows.filter(
          (emp: any) =>
            emp.profiles?.full_name?.toLowerCase().includes(q) ||
            emp.employee_code?.toLowerCase().includes(q) ||
            emp.department?.toLowerCase().includes(q)
        );
      }
      setTotal(rows.length);
      const start = page * PAGE_SIZE;
      setEmployees(rows.slice(start, start + PAGE_SIZE));
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      let query = supabase
        .from('employees')
        .select(
          `
          id, employee_code, department, status, created_at,
          profiles (full_name)
        `,
          { count: 'exact' }
        )
        .eq('organization_id', profile.organization_id);

      if (statusFilter !== 'all') {
        query = query.ilike('status', statusFilter);
      }

      query = query
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      const { data, error, count } = await query;

      if (error) {
        console.error('Error fetching employees:', error);
        const { MOCK_EMPLOYEES } = await import('@/lib/supabase/mock-data');
        setEmployees(MOCK_EMPLOYEES as any);
        setTotal(MOCK_EMPLOYEES.length);
      } else {
        let rows = (data as unknown as EmployeeItem[]) || [];
        if (rows.length === 0 && !search && statusFilter === 'all') {
          const { MOCK_EMPLOYEES } = await import('@/lib/supabase/mock-data');
          rows = MOCK_EMPLOYEES as any;
        }
        // Apply client-side search filtering on full_name, employee_code, or department
        const filtered = search
          ? rows.filter((emp) => {
              const name = emp.profiles?.full_name?.toLowerCase() || '';
              const code = emp.employee_code?.toLowerCase() || '';
              const dept = emp.department?.toLowerCase() || '';
              const q = search.toLowerCase();
              return name.includes(q) || code.includes(q) || dept.includes(q);
            })
          : rows;

        setEmployees(filtered);
        setTotal(count || rows.length);
      }
    } catch (err) {
      console.error('Unexpected error loading employees:', err);
      try {
        const { MOCK_EMPLOYEES } = await import('@/lib/supabase/mock-data');
        setEmployees(MOCK_EMPLOYEES as any);
        setTotal(MOCK_EMPLOYEES.length);
      } catch {
        // ignore
      }
    } finally {
      setLoading(false);
    }
  }, [profile?.organization_id, search, statusFilter, page]);

  useEffect(() => {
    const timer = setTimeout(() => fetchEmployees(), 200);
    return () => clearTimeout(timer);
  }, [fetchEmployees]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-6">
      <PageHeader
        category="Workforce Directory"
        title="Active Personnel & Fleet Staff"
        description="Search, inspect, and manage field personnel credentials, tracking hardware, and shift assignments."
      >
        <Link href="/employees/new">
          <Button className="h-9 gap-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-500/20 font-medium">
            <UserPlus className="h-4 w-4" />
            Add Employee
          </Button>
        </Link>
      </PageHeader>

      <Card className="border border-slate-800/80 bg-slate-900/80 text-slate-100 shadow-xl rounded-xl">
        <CardContent className="p-5 space-y-4">
          {/* Search & Filter Toolbar */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-1 flex-col gap-2.5 sm:flex-row sm:items-center">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <Input
                  placeholder="Search by name, employee code, or department..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(0);
                  }}
                  className="pl-10 h-10 text-xs bg-slate-950/70 border-slate-800 text-slate-100 placeholder:text-slate-500 focus:border-indigo-500 focus:bg-slate-950 rounded-lg"
                />
              </div>
              <Select
                value={statusFilter}
                onValueChange={(v) => {
                  setStatusFilter(v);
                  setPage(0);
                }}
              >
                <SelectTrigger className="w-full sm:w-44 h-10 text-xs rounded-lg border-slate-800 bg-slate-950/70 text-slate-200 focus:border-indigo-500">
                  <SelectValue placeholder="Filter status" />
                </SelectTrigger>
                <SelectContent className="rounded-lg shadow-xl border-slate-800 bg-slate-900 text-slate-200">
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="on_leave">On Leave</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                  <SelectItem value="terminated">Terminated</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <span className="rounded-md bg-slate-800/80 px-2.5 py-1 text-xs font-semibold text-slate-300 font-mono border border-slate-700/60">
                {total} Staff Enrolled
              </span>
            </div>
          </div>

          {loading ? (
            <div className="space-y-2.5 pt-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full rounded-lg bg-slate-800/60" />
              ))}
            </div>
          ) : employees.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-800/80 text-slate-400 mb-3 border border-slate-700/60">
                <Users className="h-6 w-6 opacity-60" />
              </div>
              <p className="text-base font-bold text-white">No employees found</p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm">
                {search ? 'No personnel match the query. Try adjusting your search keywords.' : 'Get started by enrolling field dispatchers and tracking devices.'}
              </p>
              <Link href="/employees/new" className="mt-4">
                <Button variant="outline" size="sm" className="h-8.5 rounded-lg border-slate-700 text-slate-200 hover:bg-slate-800 hover:text-white">
                  Enroll Employee
                </Button>
              </Link>
            </div>
          ) : (
            <>
              <div className="rounded-xl border border-slate-800/80 overflow-x-auto shadow-2xs bg-slate-950/40">
                <Table>
                  <TableHeader className="bg-slate-950/80 border-b border-slate-800">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-mono py-3">
                        Employee ID
                      </TableHead>
                      <TableHead className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-mono py-3">
                        Staff Member
                      </TableHead>
                      <TableHead className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-mono py-3">
                        Department
                      </TableHead>
                      <TableHead className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-mono py-3">
                        Operational Status
                      </TableHead>
                      <TableHead className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-mono py-3">
                        Enrolled Date
                      </TableHead>
                      <TableHead className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-mono py-3 text-right">
                        Action
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y divide-slate-800/60 bg-transparent">
                    {employees.map((emp) => {
                      const empName = emp.profiles?.full_name || 'Staff Member';
                      const isStatusActive = emp.status.toUpperCase() === 'ACTIVE';

                      return (
                        <TableRow key={emp.id} className="hover:bg-slate-800/40 transition-colors group">
                          <TableCell>
                            <span className="font-mono text-xs font-semibold bg-slate-800/90 text-slate-200 px-2 py-0.5 rounded-md border border-slate-700/60">
                              {emp.employee_code || emp.id.slice(0, 8)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-indigo-950 to-indigo-800 text-indigo-300 font-bold text-xs border border-indigo-500/30 shadow-2xs shrink-0">
                                {empName.slice(0, 2).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <Link
                                  href={`/employees/${emp.id}`}
                                  className="font-bold text-white group-hover:text-indigo-400 transition-colors text-xs truncate block"
                                >
                                  {empName}
                                </Link>
                                <p className="text-[11px] text-slate-400 truncate">
                                  {emp.profiles?.email || 'Field Staff'}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs font-medium text-slate-300">
                            {emp.department || 'Operations'}
                          </TableCell>
                          <TableCell>
                            <StatusBadge
                              variant={
                                isStatusActive
                                  ? 'success'
                                  : emp.status.toUpperCase() === 'ON_LEAVE'
                                  ? 'info'
                                  : 'danger'
                              }
                            >
                              {emp.status}
                            </StatusBadge>
                          </TableCell>
                          <TableCell className="text-xs text-slate-400 font-mono">
                            {new Date(emp.created_at).toLocaleDateString(undefined, {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </TableCell>
                          <TableCell className="text-right">
                            <Link
                              href={`/employees/${emp.id}`}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-400 hover:text-indigo-300 hover:underline"
                            >
                              Profile
                              <ChevronRight className="h-3.5 w-3.5" />
                            </Link>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-2">
                  <p className="text-xs font-medium text-slate-400">
                    Showing <span className="font-semibold text-slate-200">{page * PAGE_SIZE + 1}</span> to{' '}
                    <span className="font-semibold text-slate-200">
                      {Math.min((page + 1) * PAGE_SIZE, total)}
                    </span>{' '}
                    of <span className="font-semibold text-slate-200">{total}</span> staff members
                  </p>
                  <div className="flex gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                      disabled={page === 0}
                      className="h-8 rounded-lg border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white"
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" /> Prev
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                      disabled={page >= totalPages - 1}
                      className="h-8 rounded-lg border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white"
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
