'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth/auth-context';
import { PageHeader } from '@/components/admin/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import {
  Save,
  Loader2,
  Building2,
  Shield,
  MapPin,
  ExternalLink,
} from 'lucide-react';

export default function SettingsHubPage() {
  const { profile } = useAuth();
  const [org, setOrg] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const [companyForm, setCompanyForm] = useState({
    name: '',
    timezone: 'UTC',
    working_hours_start: '09:00',
    working_hours_end: '18:00',
  });

  const [trackingForm, setTrackingForm] = useState({
    target_interval: 30,
    min_interval: 15,
    max_interval: 120,
    stationary_interval: 60,
  });

  const [securityForm, setSecurityForm] = useState({
    session_timeout_hours: 12,
    single_device_binding: true,
    require_play_integrity: true,
    detect_mock_locations: true,
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
          const s = data.settings || {};
          const track = s.tracking_policy || {};
          const sec = s.security_policy || {};

          setCompanyForm({
            name: data.name || '',
            timezone: s.timezone || 'UTC',
            working_hours_start: s.working_hours_start || '09:00',
            working_hours_end: s.working_hours_end || '18:00',
          });

          setTrackingForm({
            target_interval: track.target_interval_seconds || s.tracking_interval_seconds || 30,
            min_interval: track.min_interval_seconds || 15,
            max_interval: track.max_interval_seconds || 120,
            stationary_interval: track.stationary_interval_seconds || 60,
          });

          setSecurityForm({
            session_timeout_hours: sec.session_timeout_hours || 12,
            single_device_binding: sec.single_device_binding ?? true,
            require_play_integrity: sec.require_play_integrity ?? true,
            detect_mock_locations: sec.detect_mock_locations ?? true,
          });
        }
        setLoading(false);
      });
  }, [profile?.organization_id]);

  const handleSaveCompany = async () => {
    if (!org) return;
    setSaving(true);
    const updatedSettings = {
      ...(org.settings || {}),
      timezone: companyForm.timezone,
      working_hours_start: companyForm.working_hours_start,
      working_hours_end: companyForm.working_hours_end,
    };

    const { error } = await supabase
      .from('organizations')
      .update({
        name: companyForm.name.trim(),
        settings: updatedSettings,
      })
      .eq('id', org.id);

    if (error) toast.error(error.message);
    else toast.success('Company settings updated');
    setSaving(false);
  };

  const handleSaveTracking = async () => {
    if (!org) return;
    setSaving(true);
    const updatedSettings = {
      ...(org.settings || {}),
      tracking_interval_seconds: trackingForm.target_interval,
      tracking_policy: {
        target_interval_seconds: trackingForm.target_interval,
        min_interval_seconds: trackingForm.min_interval,
        max_interval_seconds: trackingForm.max_interval,
        stationary_interval_seconds: trackingForm.stationary_interval,
      },
    };

    const { error } = await supabase
      .from('organizations')
      .update({ settings: updatedSettings })
      .eq('id', org.id);

    if (error) toast.error(error.message);
    else toast.success('Tracking policy updated');
    setSaving(false);
  };

  const handleSaveSecurity = async () => {
    if (!org) return;
    setSaving(true);
    const updatedSettings = {
      ...(org.settings || {}),
      security_policy: securityForm,
    };

    const { error } = await supabase
      .from('organizations')
      .update({ settings: updatedSettings })
      .eq('id', org.id);

    if (error) toast.error(error.message);
    else toast.success('Security settings updated');
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings & Policies"
        description="Configure your organization's operational profile, tracking cadence, and security rules"
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-2">
        <Link href="/settings/company">
          <Card className="hover:border-blue-500 transition-colors cursor-pointer">
            <CardHeader className="p-4">
              <CardTitle className="text-sm font-semibold flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-blue-600" /> Company Profile
                </span>
                <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
              </CardTitle>
              <CardDescription className="text-xs">
                Timezone, working hours, and organization branding
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/settings/tracking">
          <Card className="hover:border-blue-500 transition-colors cursor-pointer">
            <CardHeader className="p-4">
              <CardTitle className="text-sm font-semibold flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-blue-600" /> GPS & Telemetry
                </span>
                <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
              </CardTitle>
              <CardDescription className="text-xs">
                Sampling intervals, accuracy thresholds, and stationary mode
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/settings/security">
          <Card className="hover:border-blue-500 transition-colors cursor-pointer">
            <CardHeader className="p-4">
              <CardTitle className="text-sm font-semibold flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-red-600" /> Security Policies
                </span>
                <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
              </CardTitle>
              <CardDescription className="text-xs">
                Device binding, mock GPS detection, and shift timeout
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </div>

      <Tabs defaultValue="company" className="space-y-4">
        <TabsList>
          <TabsTrigger value="company">
            <Building2 className="mr-2 h-4 w-4" /> Company
          </TabsTrigger>
          <TabsTrigger value="tracking">
            <MapPin className="mr-2 h-4 w-4" /> Tracking
          </TabsTrigger>
          <TabsTrigger value="security">
            <Shield className="mr-2 h-4 w-4" /> Security
          </TabsTrigger>
        </TabsList>

        <TabsContent value="company">
          <Card>
            <CardHeader>
              <CardTitle>Company Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 max-w-lg">
              <div className="space-y-2">
                <Label>Company Name</Label>
                <Input
                  value={companyForm.name}
                  onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Timezone</Label>
                <Input
                  value={companyForm.timezone}
                  onChange={(e) => setCompanyForm({ ...companyForm, timezone: e.target.value })}
                  placeholder="UTC or Asia/Kolkata"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Hour</Label>
                  <Input
                    type="time"
                    value={companyForm.working_hours_start}
                    onChange={(e) => setCompanyForm({ ...companyForm, working_hours_start: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>End Hour</Label>
                  <Input
                    type="time"
                    value={companyForm.working_hours_end}
                    onChange={(e) => setCompanyForm({ ...companyForm, working_hours_end: e.target.value })}
                  />
                </div>
              </div>
              <Button onClick={handleSaveCompany} disabled={saving || loading}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save Changes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tracking">
          <Card>
            <CardHeader>
              <CardTitle>Location Sampling Policy</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 max-w-lg">
              <div className="space-y-2">
                <Label>Target Interval (seconds)</Label>
                <Input
                  type="number"
                  value={trackingForm.target_interval}
                  onChange={(e) => setTrackingForm({ ...trackingForm, target_interval: parseInt(e.target.value) || 30 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Minimum Interval (seconds)</Label>
                <Input
                  type="number"
                  value={trackingForm.min_interval}
                  onChange={(e) => setTrackingForm({ ...trackingForm, min_interval: parseInt(e.target.value) || 15 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Stationary Interval (seconds)</Label>
                <Input
                  type="number"
                  value={trackingForm.stationary_interval}
                  onChange={(e) => setTrackingForm({ ...trackingForm, stationary_interval: parseInt(e.target.value) || 60 })}
                />
              </div>
              <Button onClick={handleSaveTracking} disabled={saving || loading}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save Tracking Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 max-w-lg">
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <p className="text-sm font-medium">Device Binding Required</p>
                  <p className="text-xs text-slate-500">Employees must use a registered device</p>
                </div>
                <Switch
                  checked={securityForm.single_device_binding}
                  onCheckedChange={(checked) => setSecurityForm({ ...securityForm, single_device_binding: checked })}
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <p className="text-sm font-medium">Play Integrity Verification</p>
                  <p className="text-xs text-slate-500">Verify device integrity on check-in</p>
                </div>
                <Switch
                  checked={securityForm.require_play_integrity}
                  onCheckedChange={(checked) => setSecurityForm({ ...securityForm, require_play_integrity: checked })}
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <p className="text-sm font-medium">Mock Location Detection</p>
                  <p className="text-xs text-slate-500">Flag GPS spoofing signals</p>
                </div>
                <Switch
                  checked={securityForm.detect_mock_locations}
                  onCheckedChange={(checked) => setSecurityForm({ ...securityForm, detect_mock_locations: checked })}
                />
              </div>
              <Button onClick={handleSaveSecurity} disabled={saving || loading}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save Security Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
