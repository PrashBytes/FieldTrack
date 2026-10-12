'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth/auth-context';
import { PageHeader } from '@/components/admin/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/admin/status-badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { UserPlus, Search, ChevronLeft, ChevronRight, Users } from 'lucide-react';

type Employee = {
  id: string;
  employee_code: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  employment_status: string;
  account_status: string;
  designation: string | null;
  departments: { name: string } | null;
  teams: { name: string } | null;
  created_at: string;
};

const PAGE_SIZE = 10;

export default function EmployeesPage() {
  const { profile } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);

  const fetchEmployees = useCallback(async () => {
    if (!profile?.organization_id) return;
    setLoading(true);

    let query = supabase
      .from('employees')
      .select(`
        id, employee_code, full_name, email, phone, employment_status, account_status, designation, created_at,
        departments (name),
        teams (name)
      `, { count: 'exact' })
      .eq('organization_id', profile.organization_id);

    if (search) {
      query = query.or(`full_name.ilike.%${search}%,employee_code.ilike.%${search}%,email.ilike.%${search}%`);
    }
    if (statusFilter !== 'all') {
      query = query.eq('employment_status', statusFilter);
    }

    query = query.order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching employees:', error);
    } else {
      setEmployees((data as unknown as Employee[]) || []);
      setTotal(count || 0);
    }
    setLoading(false);
  }, [profile?.organization_id, search, statusFilter, page]);

  useEffect(() => {
    const timer = setTimeout(() => fetchEmployees(), 300);
    return () => clearTimeout(timer);
  }, [fetchEmployees]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div>
      <PageHeader title="Employees" description="Manage your organization's field workforce">
        <Link href="/employees/new">
          <Button>
            <UserPlus className="mr-2 h-4 w-4" />
            Add Employee
          </Button>
        </Link>
      </PageHeader>

      <Card>
        <CardContent className="p-4">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search by name, code, or email..."
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
                <SelectItem value="on_leave">On leave</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
                <SelectItem value="terminated">Terminated</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : employees.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="mb-2 h-8 w-8 text-slate-300" />
              <p className="text-sm text-slate-500">No employees found</p>
              <Link href="/employees/new" className="mt-2 text-sm text-blue-600 hover:underline">
                Add your first employee
              </Link>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Team</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.map((emp) => (
                    <TableRow key={emp.id}>
                      <TableCell className="font-mono text-xs">{emp.employee_code}</TableCell>
                      <TableCell>
                        <Link href={`/employees/${emp.id}`} className="font-medium text-blue-600 hover:underline">
                          {emp.full_name}
                        </Link>
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">{emp.departments?.name || '—'}</TableCell>
                      <TableCell className="text-sm text-slate-600">{emp.teams?.name || '—'}</TableCell>
                      <TableCell>
                        <StatusBadge variant={emp.employment_status === 'active' ? 'success' : emp.employment_status === 'on_leave' ? 'info' : 'danger'}>
                          {emp.employment_status.replace('_', ' ')}
                        </StatusBadge>
                      </TableCell>
                      <TableCell>
                        <StatusBadge variant={emp.account_status === 'active' ? 'success' : emp.account_status === 'pending' ? 'warning' : 'danger'}>
                          {emp.account_status}
                        </StatusBadge>
                      </TableCell>
                      <TableCell className="text-sm text-slate-500">
                        {new Date(emp.created_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between">
                  <p className="text-sm text-slate-500">
                    Page {page + 1} of {totalPages} ({total} total)
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                      disabled={page === 0}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                      disabled={page >= totalPages - 1}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
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
