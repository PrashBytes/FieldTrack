'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth/auth-context';
import { PageHeader } from '@/components/admin/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Save, Loader2, Building2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function CompanySettingsPage() {
  const { profile } = useAuth();
  const [org, setOrg] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    name: '',
    timezone: 'UTC',
    working_hours_start: '09:00',
    working_hours_end: '18:00',
    workdays: 'Mon-Fri',
  });

  useEffect(() => {
    if (!profile?.organization_id) return;
    supabase
      .from('organizations')
      .select('*')
      .eq('id', profile.organization_id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (data) {
          setOrg(data);
          const settings = data.settings || {};
          setForm({
            name: data.name || '',
            timezone: settings.timezone || 'UTC',
            working_hours_start: settings.working_hours_start || '09:00',
            working_hours_end: settings.working_hours_end || '18:00',
            workdays: settings.workdays || 'Mon-Fri',
          });
        }
        setLoading(false);
      });
  }, [profile?.organization_id]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!org) return;
    setSaving(true);

    const updatedSettings = {
      ...(org.settings || {}),
      timezone: form.timezone,
      working_hours_start: form.working_hours_start,
      working_hours_end: form.working_hours_end,
      workdays: form.workdays,
    };

    const { error } = await supabase
      .from('organizations')
      .update({
        name: form.name.trim(),
        settings: updatedSettings,
      })
      .eq('id', org.id);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Company profile & working hours saved successfully');
    }
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Company Settings"
        description="Manage organization name, operational timezone, and official working hours"
      >
        <Link href="/settings">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            All Settings
          </Button>
        </Link>
      </PageHeader>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-blue-600" />
            Organization Profile
          </CardTitle>
          <CardDescription>
            These settings determine default shift calculation and attendance baselines.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="companyName">Organization Name *</Label>
              <Input
                id="companyName"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Acme Logistics"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="timezone">Operational Timezone</Label>
              <Input
                id="timezone"
                value={form.timezone}
                onChange={(e) => setForm({ ...form, timezone: e.target.value })}
                placeholder="America/New_York or Asia/Kolkata"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="startTime">Working Hours Start</Label>
                <Input
                  id="startTime"
                  type="time"
                  value={form.working_hours_start}
                  onChange={(e) => setForm({ ...form, working_hours_start: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endTime">Working Hours End</Label>
                <Input
                  id="endTime"
                  type="time"
                  value={form.working_hours_end}
                  onChange={(e) => setForm({ ...form, working_hours_end: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="workdays">Operating Schedule</Label>
              <Input
                id="workdays"
                value={form.workdays}
                onChange={(e) => setForm({ ...form, workdays: e.target.value })}
                placeholder="Mon - Fri, or 24/7 Shift"
              />
            </div>

            <div className="pt-2">
              <Button type="submit" disabled={saving || loading}>
                {saving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save Company Settings
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
