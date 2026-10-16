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
import { Save, Loader2, Shield, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function SecuritySettingsPage() {
  const { profile } = useAuth();
  const [org, setOrg] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const [security, setSecurity] = useState({
    session_timeout_hours: 12,
    single_device_binding: true,
    require_play_integrity: true,
    detect_mock_locations: true,
    disallow_rooted_devices: true,
    max_devices_per_employee: 1,
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
          const settings = data.settings || {};
          const sec = settings.security_policy || {};
          setSecurity({
            session_timeout_hours: sec.session_timeout_hours ?? 12,
            single_device_binding: sec.single_device_binding ?? true,
            require_play_integrity: sec.require_play_integrity ?? true,
            detect_mock_locations: sec.detect_mock_locations ?? true,
            disallow_rooted_devices: sec.disallow_rooted_devices ?? true,
            max_devices_per_employee: sec.max_devices_per_employee ?? 1,
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
      security_policy: security,
    };

    const { error } = await supabase
      .from('organizations')
      .update({
        settings: updatedSettings,
      })
      .eq('id', org.id);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Security & device binding policies saved');
    }
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Security & Device Policies"
        description="Session timeout rules, device binding enforcement, and hardware anti-tamper controls"
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
            <Shield className="h-5 w-5 text-red-600" />
            Authentication & Device Restrictions
          </CardTitle>
          <CardDescription>
            Enforce corporate security baselines across employee mobile clients.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="sessionTimeout">Shift Auto-Checkout Timeout (hours)</Label>
                <Input
                  id="sessionTimeout"
                  type="number"
                  min={1}
                  max={24}
                  value={security.session_timeout_hours}
                  onChange={(e) =>
                    setSecurity({
                      ...security,
                      session_timeout_hours: parseInt(e.target.value) || 12,
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxDevices">Max Active Devices Per Employee</Label>
                <Input
                  id="maxDevices"
                  type="number"
                  min={1}
                  max={5}
                  value={security.max_devices_per_employee}
                  onChange={(e) =>
                    setSecurity({
                      ...security,
                      max_devices_per_employee: parseInt(e.target.value) || 1,
                    })
                  }
                />
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <p className="text-sm font-medium">Device Binding Policy</p>
                  <p className="text-xs text-slate-500">Prevent logins from unregistered devices without admin authorization</p>
                </div>
                <Switch
                  checked={security.single_device_binding}
                  onCheckedChange={(checked) =>
                    setSecurity({ ...security, single_device_binding: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <p className="text-sm font-medium">Google Play Integrity Attestation</p>
                  <p className="text-xs text-slate-500">Verify device hardware and bootloader integrity on each check-in</p>
                </div>
                <Switch
                  checked={security.require_play_integrity}
                  onCheckedChange={(checked) =>
                    setSecurity({ ...security, require_play_integrity: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <p className="text-sm font-medium">Mock Location Detection & Auto-Flagging</p>
                  <p className="text-xs text-slate-500">Automatically flag GPS spoofers or emulator mock providers</p>
                </div>
                <Switch
                  checked={security.detect_mock_locations}
                  onCheckedChange={(checked) =>
                    setSecurity({ ...security, detect_mock_locations: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <p className="text-sm font-medium">Block Rooted / Jailbroken Devices</p>
                  <p className="text-xs text-slate-500">Refuse telemetry ingestion from modified OS builds</p>
                </div>
                <Switch
                  checked={security.disallow_rooted_devices}
                  onCheckedChange={(checked) =>
                    setSecurity({ ...security, disallow_rooted_devices: checked })
                  }
                />
              </div>
            </div>

            <div className="pt-2">
              <Button type="submit" disabled={saving || loading}>
                {saving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save Security Policy
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
