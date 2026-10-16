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
import { Save, Loader2, MapPin, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function TrackingSettingsPage() {
  const { profile } = useAuth();
  const [org, setOrg] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const [policy, setPolicy] = useState({
    target_interval_seconds: 30,
    min_interval_seconds: 15,
    max_interval_seconds: 120,
    stationary_interval_seconds: 60,
    accuracy_threshold_meters: 50,
    stationary_speed_threshold_mps: 1.0,
    enforce_geofence_checkin: true,
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
          const track = settings.tracking_policy || {};
          setPolicy({
            target_interval_seconds: track.target_interval_seconds ?? 30,
            min_interval_seconds: track.min_interval_seconds ?? 15,
            max_interval_seconds: track.max_interval_seconds ?? 120,
            stationary_interval_seconds: track.stationary_interval_seconds ?? 60,
            accuracy_threshold_meters: track.accuracy_threshold_meters ?? 50,
            stationary_speed_threshold_mps: track.stationary_speed_threshold_mps ?? 1.0,
            enforce_geofence_checkin: track.enforce_geofence_checkin ?? true,
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
      tracking_policy: policy,
      tracking_interval_seconds: policy.target_interval_seconds,
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
      toast.success('Telemetry & GPS sampling policy saved');
    }
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tracking & Sampling Settings"
        description="Configure GPS ping frequencies, accuracy filters, and stationary battery-saving policies"
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
            <MapPin className="h-5 w-5 text-blue-600" />
            Location Telemetry Rules
          </CardTitle>
          <CardDescription>
            These parameters are synced down to native Android tracking clients upon session check-in.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="targetInt">Target Interval (seconds)</Label>
                <Input
                  id="targetInt"
                  type="number"
                  min={5}
                  max={300}
                  value={policy.target_interval_seconds}
                  onChange={(e) =>
                    setPolicy({
                      ...policy,
                      target_interval_seconds: parseInt(e.target.value) || 30,
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="stationaryInt">Stationary Interval (seconds)</Label>
                <Input
                  id="stationaryInt"
                  type="number"
                  min={15}
                  max={600}
                  value={policy.stationary_interval_seconds}
                  onChange={(e) =>
                    setPolicy({
                      ...policy,
                      stationary_interval_seconds: parseInt(e.target.value) || 60,
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="minInt">Minimum Interval (seconds)</Label>
                <Input
                  id="minInt"
                  type="number"
                  min={5}
                  max={60}
                  value={policy.min_interval_seconds}
                  onChange={(e) =>
                    setPolicy({
                      ...policy,
                      min_interval_seconds: parseInt(e.target.value) || 15,
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxInt">Max Backoff Interval (seconds)</Label>
                <Input
                  id="maxInt"
                  type="number"
                  min={30}
                  max={600}
                  value={policy.max_interval_seconds}
                  onChange={(e) =>
                    setPolicy({
                      ...policy,
                      max_interval_seconds: parseInt(e.target.value) || 120,
                    })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 pt-2">
              <div className="space-y-2">
                <Label htmlFor="accThresh">Max Tolerated Accuracy (meters)</Label>
                <Input
                  id="accThresh"
                  type="number"
                  min={5}
                  max={200}
                  value={policy.accuracy_threshold_meters}
                  onChange={(e) =>
                    setPolicy({
                      ...policy,
                      accuracy_threshold_meters: parseInt(e.target.value) || 50,
                    })
                  }
                />
                <p className="text-xs text-slate-400">Pings with worse accuracy are marked low trust</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="speedThresh">Stationary Speed Cutoff (m/s)</Label>
                <Input
                  id="speedThresh"
                  type="number"
                  step="0.1"
                  min={0.1}
                  max={5.0}
                  value={policy.stationary_speed_threshold_mps}
                  onChange={(e) =>
                    setPolicy({
                      ...policy,
                      stationary_speed_threshold_mps: parseFloat(e.target.value) || 1.0,
                    })
                  }
                />
                <p className="text-xs text-slate-400">Below this speed, device slows GPS polling to conserve battery</p>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-4 mt-2">
              <div>
                <p className="text-sm font-medium">Geofence Check-In Enforcement</p>
                <p className="text-xs text-slate-500">Require staff to be within an authorized geofence radius to begin attendance</p>
              </div>
              <Switch
                checked={policy.enforce_geofence_checkin}
                onCheckedChange={(checked) =>
                  setPolicy({ ...policy, enforce_geofence_checkin: checked })
                }
              />
            </div>

            <div className="pt-2">
              <Button type="submit" disabled={saving || loading}>
                {saving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save Tracking Policy
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
