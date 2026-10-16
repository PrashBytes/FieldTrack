'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth/auth-context';
import { PageHeader } from '@/components/admin/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { ArrowLeft, Save, Loader2, UserPlus } from 'lucide-react';
import Link from 'next/link';

export default function NewEmployeePage() {
  const router = useRouter();
  const { profile } = useAuth();
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    employee_code: '',
    full_name: '',
    email: '',
    phone: '',
    department: 'Operations',
    device_identifier: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.organization_id) {
      toast.error('Organization context missing');
      return;
    }
    setSaving(true);

    try {
      // 1. Create a placeholder profile for the employee
      // In Supabase Auth, admin creates or invites users; here we create the profile & employee link
      const newUserId = crypto.randomUUID();

      const { error: profileError } = await supabase.from('profiles').insert({
        id: newUserId,
        organization_id: profile.organization_id,
        role: 'EMPLOYEE',
        full_name: form.full_name.trim(),
      });

      if (profileError) {
        // If foreign key constraint on auth.users requires an auth user, fallback to direct employee profile
        console.warn('Profile creation note:', profileError.message);
      }

      // 2. Insert Employee record
      const { data: empData, error: empError } = await supabase
        .from('employees')
        .insert({
          organization_id: profile.organization_id,
          profile_id: newUserId,
          employee_code: form.employee_code.trim(),
          email: form.email.trim() || null,
          phone: form.phone.trim() || null,
          department: form.department,
          status: 'ACTIVE',
        })
        .select('id')
        .single();

      if (empError) {
        throw empError;
      }

      // 3. Optional initial Device Binding
      if (form.device_identifier.trim() && empData) {
        await supabase.from('devices').insert({
          organization_id: profile.organization_id,
          employee_id: empData.id,
          device_identifier: form.device_identifier.trim(),
          status: 'ACTIVE',
        });
      }

      // 4. Log administrative action
      await supabase.from('audit_logs').insert({
        organization_id: profile.organization_id,
        actor_id: profile.id,
        action: 'EMPLOYEE_CREATED',
        target_type: 'employee',
        target_id: empData.id,
        metadata: {
          employee_code: form.employee_code,
          name: form.full_name,
          department: form.department,
        },
      });

      toast.success('Employee created successfully');
      router.push(`/employees/${empData.id}`);
    } catch (err: any) {
      console.error(err);
      toast.error(`Failed to create employee: ${err.message || 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Add New Employee"
        description="Register a new workforce member and assign tracking parameters"
      >
        <Link href="/employees">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Directory
          </Button>
        </Link>
      </PageHeader>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-blue-600" />
            Employee Details
          </CardTitle>
          <CardDescription>
            Enter full name, company identification code, and mobile hardware details.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="employee_code">Employee ID Code *</Label>
                <Input
                  id="employee_code"
                  required
                  value={form.employee_code}
                  onChange={(e) => setForm({ ...form, employee_code: e.target.value })}
                  placeholder="EMP-104"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name *</Label>
                <Input
                  id="full_name"
                  required
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  placeholder="Jane Smith"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="jane.smith@company.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Contact Phone</Label>
                <Input
                  id="phone"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+1 (555) 234-5678"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <Select
                  value={form.department}
                  onValueChange={(val) => setForm({ ...form, department: val })}
                >
                  <SelectTrigger id="department">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Operations">Operations</SelectItem>
                    <SelectItem value="Fleet Dispatch">Fleet Dispatch</SelectItem>
                    <SelectItem value="Warehouse">Warehouse</SelectItem>
                    <SelectItem value="Field Logistics">Field Logistics</SelectItem>
                    <SelectItem value="Security">Security</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="device_identifier">Initial Device Identifier (Optional)</Label>
                <Input
                  id="device_identifier"
                  value={form.device_identifier}
                  onChange={(e) => setForm({ ...form, device_identifier: e.target.value })}
                  placeholder="android_sec_hw_04"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Link href="/employees">
                <Button type="button" variant="outline" disabled={saving}>
                  Cancel
                </Button>
              </Link>
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Register Employee
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
