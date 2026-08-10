// SPDX-FileCopyrightText: Max Health Inc.
// SPDX-License-Identifier: AGPL-3.0-or-later OR LicenseRef-Commercial

import { useEffect, useState } from 'react';
import {
  Alert,
  AlertDescription,
  Badge,
  Button,
  Input,
  Label,
  UserProfileFormFields,
  type UserProfileData,
} from '@proxy-smart/shared-ui';
import { LoadingButton } from '@/components/ui/loading-button';
import { User, KeyRound, Info, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/stores/authStore';
import { useTranslation } from 'react-i18next';
import { logger } from '@/lib/logger';

interface Profile {
  id: string;
  username: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  emailVerified: boolean;
  fhirUser?: string;
  organization?: string;
  federated: boolean;
}

const MIN_PASSWORD_LENGTH = 8;

export function ProfileSettings() {
  const { t } = useTranslation();
  const { isAuthenticated, clientApis } = useAuth();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [form, setForm] = useState<UserProfileData>({ firstName: '', lastName: '', email: '' });
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; key: string } | null>(null);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    if (!isAuthenticated) return;
    clientApis.admin
      .getAdminProfile()
      .then((p: unknown) => {
        const loaded = p as unknown as Profile;
        setProfile(loaded);
        setForm({
          firstName: loaded.firstName ?? '',
          lastName: loaded.lastName ?? '',
          email: loaded.email ?? '',
        });
      })
      .catch((err: unknown) => {
        logger.error('Failed to load profile', err);
        setMessage({ kind: 'error', key: 'Could not load your profile.' });
      })
      .finally(() => setLoading(false));
    // `t` is deliberately absent: it is not stable across renders, and this effect
    // sets state on failure — depending on it re-fires the request on every error.
  }, [isAuthenticated, clientApis.admin]);

  const handleProfileChange = (field: keyof UserProfileData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const saveProfile = async () => {
    setSavingProfile(true);
    setMessage(null);
    try {
      const updated = (await clientApis.admin.putAdminProfile({
        putAdminProfileRequest: {
          firstName: form.firstName || undefined,
          lastName: form.lastName || undefined,
          email: form.email || undefined,
        },
      })) as unknown as Profile;
      setProfile(updated);
      setMessage({ kind: 'ok', key: 'Profile updated.' });
    } catch (err) {
      logger.error('Failed to update profile', err);
      setMessage({ kind: 'error', key: 'Could not update your profile.' });
    } finally {
      setSavingProfile(false);
    }
  };

  const passwordProblem =
    newPassword.length > 0 && newPassword.length < MIN_PASSWORD_LENGTH
      ? t('Password must be at least {{n}} characters.', { n: MIN_PASSWORD_LENGTH })
      : confirmPassword.length > 0 && newPassword !== confirmPassword
        ? t('Passwords do not match.')
        : null;

  const canSubmitPassword =
    newPassword.length >= MIN_PASSWORD_LENGTH && newPassword === confirmPassword && !savingPassword;

  const changePassword = async () => {
    setSavingPassword(true);
    setMessage(null);
    try {
      await clientApis.admin.putAdminProfilePassword({
        putAdminProfilePasswordRequest: { newPassword },
      });
      setNewPassword('');
      setConfirmPassword('');
      setMessage({ kind: 'ok', key: 'Password changed.' });
    } catch (err) {
      logger.error('Failed to change password', err);
      // The realm password policy is enforced by Keycloak, so the reason comes back from it.
      setMessage({ kind: 'error', key: 'Could not change your password. It may not meet the password policy.' });
    } finally {
      setSavingPassword(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-muted-foreground">{t('Loading your profile...')}</div>;
  }

  return (
    <div className="p-6 sm:p-8 space-y-8">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <User className="w-6 h-6 text-primary" />
          {t('My Profile')}
        </h2>
        <p className="text-muted-foreground mt-1">
          {t('Manage your own account details and password.')}
        </p>
      </div>

      {message && (
        <Alert variant={message.kind === 'error' ? 'destructive' : 'default'}>
          <AlertDescription>{t(message.key)}</AlertDescription>
        </Alert>
      )}

      {/* Identity summary */}
      <div className="bg-primary/5 p-4 rounded-xl border border-primary/10 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold">{profile?.username}</span>
          {profile?.emailVerified && (
            <Badge variant="secondary" className="gap-1">
              <ShieldCheck className="w-3 h-3" />
              {t('Email verified')}
            </Badge>
          )}
          {profile?.federated && <Badge variant="outline">{t('Identity provider')}</Badge>}
        </div>
        {profile?.fhirUser && (
          <p className="text-xs text-muted-foreground">
            {t('FHIR identity')}: {profile.fhirUser}
          </p>
        )}
      </div>

      {/* Details */}
      <div className="space-y-4">
        <h3 className="font-semibold">{t('Details')}</h3>
        <UserProfileFormFields
          values={form}
          onChange={handleProfileChange}
          labels={{
            firstName: t('First Name'),
            lastName: t('Last Name'),
            email: t('Email Address'),
          }}
        />
        <div className="flex items-start gap-2 text-xs text-muted-foreground">
          <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
          <span>{t('Changing your email address means it must be verified again.')}</span>
        </div>
        <LoadingButton loading={savingProfile} onClick={saveProfile}>
          {t('Save changes')}
        </LoadingButton>
      </div>

      {/* Password */}
      <div className="space-y-4 border-t border-border/60 pt-6">
        <h3 className="font-semibold flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-primary" />
          {t('Password')}
        </h3>

        {profile?.federated ? (
          <Alert>
            <AlertDescription>
              {t('You sign in through an identity provider, so your password is managed there.')}
            </AlertDescription>
          </Alert>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="profile-new-password" className="mb-2 block">{t('New password')}</Label>
                <Input
                  id="profile-new-password"
                  type="password"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="profile-confirm-password" className="mb-2 block">{t('Confirm new password')}</Label>
                <Input
                  id="profile-confirm-password"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            </div>
            {passwordProblem && <p className="text-xs text-destructive">{passwordProblem}</p>}
            <div className="flex items-center gap-3">
              <LoadingButton loading={savingPassword} disabled={!canSubmitPassword} onClick={changePassword}>
                {t('Change password')}
              </LoadingButton>
              {(newPassword || confirmPassword) && (
                <Button
                  variant="ghost"
                  onClick={() => { setNewPassword(''); setConfirmPassword(''); }}
                >
                  {t('Cancel')}
                </Button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
