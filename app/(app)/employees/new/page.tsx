'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth/auth-context';
import { PageHeader } from '@/components/admin/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import Link from 'next/link';

type Department = { id: string; name: string };
type Team = { id: string; name: string };
type Shift = { id: string; name: string };

export default function NewEmployeePage() {
  const router = useRouter();
  const { profile } = useAuth();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    employee_code: '',
    full_name: '',
    email: '',
    phone: '',
    designation: '',
    department_id: '',
    team_id: '',
    shift_id: '',
  });

  useEffect(() => {
    if (!profile?.organization_id) return;
    const orgId = profile.organization_id;
    Promise.all([
      supabase.from('departments').select('id, name').eq('organization_id', orgId).eq('is_active', true).order('name'),
      supabase.from('teams').select('id, name').eq('organization_id', orgId).eq('is_active', true).order('name'),
      supabase.from('shifts').select('id, name').eq('organization_id', orgId).eq('is_active', true).order('name'),
    ]).then(([deptRes, teamRes, shiftRes]) => {
      setDepartments(deptRes.data || []);
      setTeams(teamRes.data || []);
      setShifts(shiftRes.data || []);
    });
  }, [profile?.organization_id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.organization_id) return;
    setSaving(true);

    const { data, error } = await supabase
      .from('employees')
      .insert({
        organization_id: profile.organization_id,
        employee_code: form.employee_code,
        full_name: form.full_name,
        email: form.email || null,
        phone: form.phone || null,
        designation: form.designation || null,
        department_id: form.department_id || null,
        team_id: form.team_id || null,
        shift_id: form.shift_id || null,
        employment_status: 'active',
        account_status: 'pending',
      })
      .select('id')
      .single();

    if (error) {
      toast.error(error.message);
      setSaving(false);
    } else {
      toast.success('Employee created successfully');
      router.push(`/employees/${data.id}`);
    }
  };

  return (
    <div>
      <PageHeader title="Add Employee" description="Create a new employee record">
        <Link href="/employees">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </Link>
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle>Employee Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="employee_code">Employee Code *</Label>
              <Input
                id="employee_code"
                required
                value={form.employee_code}
                onChange={(e) => setForm({ ...form, employee_code: e.target.value })}
                placeholder="EMP001"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="full_name">Full Name *</Label>
              <Input
                id="full_name"
                required
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                placeholder="John Doe"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="john@company.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+1 234 567 890"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="designation">Designation</Label>
              <Input
                id="designation"
                value={form.designation}
                onChange={(e) => setForm({ ...form, designation: e.target.value })}
                placeholder="Field Surveyor"
              />
            </div>
            <div className="space-y-2">
              <Label>Department</Label>
              <Select value={form.department_id} onValueChange={(v) => setForm({ ...form, department_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                <SelectContent>
                  {departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Team</Label>
              <Select value={form.team_id} onValueChange={(v) => setForm({ ...form, team_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select team" /></SelectTrigger>
                <SelectContent>
                  {teams.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Shift</Label>
              <Select value={form.shift_id} onValueChange={(v) => setForm({ ...form, shift_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select shift" /></SelectTrigger>
                <SelectContent>
                  {shifts.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-full mt-4 flex justify-end gap-2">
              <Link href="/employees">
                <Button type="button" variant="outline">Cancel</Button>
              </Link>
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save Employee
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
