'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth/auth-context';
import { PageHeader } from '@/components/admin/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Save, Loader2, Building2, Shield, MapPin } from 'lucide-react';

export default function SettingsPage() {
  const { profile } = useAuth();
  const [org, setOrg] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '', timezone: 'UTC', privacy_contact: '', data_retention_days: 90,
  });
  const [tracking, setTracking] = useState({
    target_interval: 30, min_interval: 15, max_interval: 120, stationary_interval: 60,
  });

  useEffect(() => {
    if (!profile?.organization_id) return;
    supabase
      .from('organizations')
      .select('*')
      .eq('id', profile.organization_id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setOrg(data);
          setForm({
            name: data.name, timezone: data.timezone,
            privacy_contact: data.privacy_contact || '',
            data_retention_days: data.data_retention_days,
          });
          const sp = data.location_sampling_policy || {};
          setTracking({
            target_interval: sp.target_interval_seconds || 30,
            min_interval: sp.min_interval_seconds || 15,
            max_interval: sp.max_interval_seconds || 120,
            stationary_interval: sp.stationary_interval_seconds || 60,
          });
        }
      });
  }, [profile?.organization_id]);

  const handleSaveOrg = async () => {
    if (!org) return;
    setSaving(true);
    const { error } = await supabase
      .from('organizations')
      .update({
        name: form.name,
        timezone: form.timezone,
        privacy_contact: form.privacy_contact || null,
        data_retention_days: form.data_retention_days,
      })
      .eq('id', org.id);

    if (error) toast.error(error.message);
    else toast.success('Company settings saved');
    setSaving(false);
  };

  const handleSaveTracking = async () => {
    if (!org) return;
    setSaving(true);
    const { error } = await supabase
      .from('organizations')
      .update({
        location_sampling_policy: {
          target_interval_seconds: tracking.target_interval,
          min_interval_seconds: tracking.min_interval,
          max_interval_seconds: tracking.max_interval,
          stationary_interval_seconds: tracking.stationary_interval,
        },
      })
      .eq('id', org.id);

    if (error) toast.error(error.message);
    else toast.success('Tracking settings saved');
    setSaving(false);
  };

  return (
    <div>
      <PageHeader title="Settings" description="Configure your organization's preferences" />

      <Tabs defaultValue="company">
        <TabsList>
          <TabsTrigger value="company"><Building2 className="mr-2 h-4 w-4" />Company</TabsTrigger>
          <TabsTrigger value="tracking"><MapPin className="mr-2 h-4 w-4" />Tracking</TabsTrigger>
          <TabsTrigger value="security"><Shield className="mr-2 h-4 w-4" />Security</TabsTrigger>
        </TabsList>

        <TabsContent value="company">
          <Card>
            <CardHeader><CardTitle>Company Information</CardTitle></CardHeader>
            <CardContent className="space-y-4 max-w-lg">
              <div className="space-y-2">
                <Label>Company Name</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Timezone</Label>
                <Input value={form.timezone} onChange={(e) => setForm({ ...form, timezone: e.target.value })} placeholder="UTC" />
              </div>
              <div className="space-y-2">
                <Label>Privacy Contact</Label>
                <Input value={form.privacy_contact} onChange={(e) => setForm({ ...form, privacy_contact: e.target.value })} placeholder="privacy@company.com" />
              </div>
              <div className="space-y-2">
                <Label>Data Retention (days)</Label>
                <Input type="number" value={form.data_retention_days} onChange={(e) => setForm({ ...form, data_retention_days: parseInt(e.target.value) || 90 })} />
              </div>
              <Button onClick={handleSaveOrg} disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save Changes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tracking">
          <Card>
            <CardHeader><CardTitle>Location Sampling Policy</CardTitle></CardHeader>
            <CardContent className="space-y-4 max-w-lg">
              <div className="space-y-2">
                <Label>Target Interval (seconds)</Label>
                <Input type="number" value={tracking.target_interval} onChange={(e) => setTracking({ ...tracking, target_interval: parseInt(e.target.value) || 30 })} />
              </div>
              <div className="space-y-2">
                <Label>Minimum Interval (seconds)</Label>
                <Input type="number" value={tracking.min_interval} onChange={(e) => setTracking({ ...tracking, min_interval: parseInt(e.target.value) || 15 })} />
              </div>
              <div className="space-y-2">
                <Label>Maximum Interval (seconds)</Label>
                <Input type="number" value={tracking.max_interval} onChange={(e) => setTracking({ ...tracking, max_interval: parseInt(e.target.value) || 120 })} />
              </div>
              <div className="space-y-2">
                <Label>Stationary Interval (seconds)</Label>
                <Input type="number" value={tracking.stationary_interval} onChange={(e) => setTracking({ ...tracking, stationary_interval: parseInt(e.target.value) || 60 })} />
              </div>
              <Button onClick={handleSaveTracking} disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save Tracking Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader><CardTitle>Security Settings</CardTitle></CardHeader>
            <CardContent className="space-y-4 max-w-lg">
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <p className="text-sm font-medium">Require MFA for Admins</p>
                  <p className="text-xs text-slate-500">Enforce multi-factor authentication for admin accounts</p>
                </div>
                <Switch />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <p className="text-sm font-medium">Device Binding Required</p>
                  <p className="text-xs text-slate-500">Employees must use a registered device</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <p className="text-sm font-medium">Play Integrity Verification</p>
                  <p className="text-xs text-slate-500">Verify device integrity on check-in</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <p className="text-sm font-medium">Mock Location Detection</p>
                  <p className="text-xs text-slate-500">Flag GPS spoofing signals</p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
