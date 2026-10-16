'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth/auth-context';
import { PageHeader } from '@/components/admin/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { StatusBadge } from '@/components/admin/status-badge';
import { toast } from 'sonner';
import { Save, Loader2, KeyRound, Shield, CheckCircle2 } from 'lucide-react';

export default function ProfilePage() {
  const { profile, refreshProfile } = useAuth();
  const [fullName, setFullName] = useState('');
  const [saving, setSaving] = useState(false);

  // Password Change state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordUpdating, setPasswordUpdating] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
    }
  }, [profile]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.id) return;
    setSaving(true);

    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName.trim() })
      .eq('id', profile.id);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Account profile updated successfully');
      await refreshProfile();
    }
    setSaving(false);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setPasswordUpdating(true);
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      toast.error(`Password update failed: ${error.message}`);
    } else {
      toast.success('Password updated successfully');
      setNewPassword('');
      setConfirmPassword('');
    }
    setPasswordUpdating(false);
  };

  const initials = (profile?.full_name || profile?.email || 'AD')
    .split(' ')
    .map((p) => p[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Admin Profile"
        description="Manage your account profile details and authentication credentials"
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Account Info Card */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Account Overview</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4 py-4 text-center">
            <Avatar className="h-20 w-20 border-2 border-slate-200">
              <AvatarFallback className="text-xl font-bold bg-slate-800 text-white">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <p className="font-semibold text-slate-900">
                {profile?.full_name || 'Administrator'}
              </p>
              <p className="text-xs text-slate-500">{profile?.email}</p>
            </div>
            <StatusBadge
              variant={
                String(profile?.role).toLowerCase() === 'super_admin'
                  ? 'danger'
                  : String(profile?.role).toLowerCase() === 'company_admin'
                  ? 'info'
                  : 'neutral'
              }
            >
              {profile?.role?.replace('_', ' ') || 'COMPANY ADMIN'}
            </StatusBadge>
            <div className="w-full border-t pt-4 text-left text-xs space-y-2 text-slate-600">
              <div className="flex justify-between">
                <span className="text-slate-400">Organization ID:</span>
                <span className="font-mono">{profile?.organization_id?.slice(0, 8)}...</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">User ID:</span>
                <span className="font-mono">{profile?.id?.slice(0, 8)}...</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Edit Profile & Password Cards */}
        <div className="space-y-6 lg:col-span-2">
          {/* Profile Name */}
          <Card>
            <CardHeader>
              <CardTitle>Personal Details</CardTitle>
              <CardDescription>
                Update your full name as shown in the top navigation and audit logs.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveProfile} className="space-y-4 max-w-md">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="profileEmail">Email Address</Label>
                  <Input
                    id="profileEmail"
                    value={profile?.email || ''}
                    disabled
                    className="bg-slate-50 text-slate-500"
                  />
                </div>
                <Button type="submit" disabled={saving}>
                  {saving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Save Profile Details
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Change Password */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-amber-600" />
                Change Password
              </CardTitle>
              <CardDescription>
                Update your login password securely via Supabase Auth.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" disabled={passwordUpdating}>
                  {passwordUpdating ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                  )}
                  Update Password
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
