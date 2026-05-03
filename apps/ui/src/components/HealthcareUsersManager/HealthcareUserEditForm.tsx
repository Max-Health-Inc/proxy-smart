import React, { useState } from 'react';
import {
  Badge,
  Button,
  Input,
  Label,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  UserProfileFormFields,
  type UserProfileData,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@proxy-smart/shared-ui';
import { Checkbox } from '@/components/ui/checkbox';
import { Shield, Server, Database, Trash2, Link2, Unlink, Plus, Undo2 } from 'lucide-react';
import { LoadingButton } from '@/components/ui/loading-button';
import type { FhirPersonAssociation, FhirServer } from '@/lib/types/api';
import type { FederatedIdentity, IdentityProviderResponse } from '@/lib/api-client';
import { createPersonResource } from '@/service/fhirService';
import { useTranslation } from 'react-i18next';

export interface EditUserFormData {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  organization?: string;
  fhirUser?: string;
  fhirPersons: FhirPersonAssociation[];
  enabled: boolean;
  primaryRole: string;
  realmRoles: string[];
  clientRoles: Record<string, string[]>;
}

/** Pending IdP operations collected during form editing, executed on save */
export type PendingIdPLink = {
  type: 'link';
  provider: string;
  idpUserId: string;
  userName: string;
};

export type PendingIdPUnlink = {
  type: 'unlink';
  provider: string;
};

export type PendingIdPOperation = PendingIdPLink | PendingIdPUnlink;

interface HealthcareUserEditFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (formData: EditUserFormData, pendingIdPOps: PendingIdPOperation[]) => Promise<void>;
  submitting: boolean;
  user: EditUserFormData | null;
  fhirServers: FhirServer[];
  availableRealmRoles: string[];
  availableClientRoles: Record<string, string[]>;
  getAllAvailableRoles: () => string[];
  federatedIdentities?: FederatedIdentity[];
  availableIdPs?: IdentityProviderResponse[];
}

const initialFormData: EditUserFormData = {
  id: '',
  username: '',
  firstName: '',
  lastName: '',
  email: '',
  organization: '',
  fhirUser: '',
  fhirPersons: [],
  enabled: true,
  primaryRole: '',
  realmRoles: [],
  clientRoles: {},
};

export function HealthcareUserEditForm({
  isOpen,
  onClose,
  onSubmit,
  submitting,
  user,
  fhirServers,
  availableRealmRoles,
  availableClientRoles,
  getAllAvailableRoles,
  federatedIdentities,
  availableIdPs,
}: HealthcareUserEditFormProps) {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<EditUserFormData>(user ?? initialFormData);
  const [pendingIdPOps, setPendingIdPOps] = useState<PendingIdPOperation[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData, pendingIdPOps);
  };

  const handleClose = () => {
    setFormData(initialFormData);
    setPendingIdPOps([]);
    onClose();
  };

  // ── FHIR Person helpers ─────────────────────────────────────────────────
  const addFhirPersonAssociation = () => {
    setFormData(prev => ({
      ...prev,
      fhirPersons: [...prev.fhirPersons, { serverId: '', personId: '', display: '', created: new Date().toISOString() }],
    }));
  };

  const removeFhirPersonAssociation = (index: number) => {
    setFormData(prev => ({ ...prev, fhirPersons: prev.fhirPersons.filter((_, i) => i !== index) }));
  };

  const updateFhirPersonAssociation = (index: number, field: keyof FhirPersonAssociation, value: string) => {
    setFormData(prev => ({
      ...prev,
      fhirPersons: prev.fhirPersons.map((a, i) => (i === index ? { ...a, [field]: value } : a)),
    }));
  };

  const createPersonInFhir = async (serverId: string, userData: { firstName: string; lastName: string; email: string }) => {
    const server = fhirServers.find(s => s.id === serverId);
    if (!server) throw new Error(`Server not found: ${serverId}`);
    const result = await createPersonResource(serverId, server.fhirVersion, userData);
    return result.id;
  };

  // ── Shared profile data bridge ──────────────────────────────────────────
  const profileData: UserProfileData = {
    firstName: formData.firstName,
    lastName: formData.lastName,
    email: formData.email,
  };

  const handleProfileChange = (field: keyof UserProfileData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-violet-600 dark:text-violet-400" />
            {t('Edit Healthcare User')}
          </DialogTitle>
          <DialogDescription>{t('Update user information and permissions')}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Username (read-only) */}
          <div className="space-y-2">
            <Label htmlFor="editUsername">{t('Username')}</Label>
            <Input id="editUsername" value={formData.username} disabled />
            <p className="text-xs text-muted-foreground">{t('Username cannot be changed')}</p>
          </div>

          {/* Shared profile fields (first name, last name, email) */}
          <UserProfileFormFields
            values={profileData}
            onChange={handleProfileChange}
            labels={{
              firstName: t('First Name'),
              lastName: t('Last Name'),
              email: t('Email Address'),
            }}
          />

          {/* Organization */}
          <div className="space-y-2">
            <Label htmlFor="editOrganization">{t('Organization')}</Label>
            <Input
              id="editOrganization"
              placeholder="e.g., Cardiology Department"
              value={formData.organization ?? ''}
              onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
            />
          </div>

          {/* FHIR User Identity */}
          <div className="space-y-2">
            <Label htmlFor="editFhirUser">{t('FHIR User Identity')}</Label>
            <Input
              id="editFhirUser"
              placeholder="e.g., Patient/123 or Practitioner/456"
              value={formData.fhirUser ?? ''}
              onChange={(e) => setFormData({ ...formData, fhirUser: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">{t('Maps this user to a FHIR resource (used in SMART fhirUser claim)')}</p>
          </div>

          {/* FHIR Person Associations */}
          <FhirPersonSection
            t={t}
            fhirPersons={formData.fhirPersons}
            fhirServers={fhirServers}
            formData={formData}
            onAdd={addFhirPersonAssociation}
            onRemove={removeFhirPersonAssociation}
            onUpdate={updateFhirPersonAssociation}
            onCreatePerson={createPersonInFhir}
          />

          {/* Account Status */}
          <div className="flex items-center space-x-3">
            <Checkbox
              id="editEnabled"
              checked={formData.enabled}
              onCheckedChange={(checked) => setFormData({ ...formData, enabled: checked === true })}
            />
            <Label htmlFor="editEnabled">{t('Account enabled')}</Label>
          </div>

          {/* Federated Identity Links */}
          {(federatedIdentities || availableIdPs) && (
            <FederatedIdentitySection
              t={t}
              userId={formData.id}
              federatedIdentities={federatedIdentities ?? []}
              availableIdPs={availableIdPs ?? []}
              pendingOps={pendingIdPOps}
              onPendingOpsChange={setPendingIdPOps}
            />
          )}

          {/* Role Management */}
          <RoleManagementSection
            t={t}
            formData={formData}
            setFormData={setFormData}
            availableRealmRoles={availableRealmRoles}
            availableClientRoles={availableClientRoles}
            getAllAvailableRoles={getAllAvailableRoles}
          />

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={submitting}>
              {t('Cancel')}
            </Button>
            <LoadingButton type="submit" loading={submitting} loadingText={t('Updating...')}>
              {t('Update User')}
            </LoadingButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Sub-components (admin-specific sections) ────────────────────────────────

function FederatedIdentitySection({
  t,
  userId,
  federatedIdentities,
  availableIdPs,
  pendingOps,
  onPendingOpsChange,
}: {
  t: (key: string) => string;
  userId: string;
  federatedIdentities: FederatedIdentity[];
  availableIdPs: IdentityProviderResponse[];
  pendingOps: PendingIdPOperation[];
  onPendingOpsChange: (ops: PendingIdPOperation[]) => void;
}) {
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState('');
  const [linkUserId, setLinkUserId] = useState('');
  const [linkUserName, setLinkUserName] = useState('');

  // Derive effective state from original identities + pending operations
  const pendingUnlinks = new Set(
    pendingOps.filter((op): op is PendingIdPUnlink => op.type === 'unlink').map(op => op.provider)
  );
  const pendingLinks = pendingOps.filter((op): op is PendingIdPLink => op.type === 'link');

  // IdPs already linked (not pending unlink) + pending links = effectively linked
  const effectiveLinkedAliases = new Set([
    ...federatedIdentities.filter(fi => !pendingUnlinks.has(fi.identityProvider)).map(fi => fi.identityProvider),
    ...pendingLinks.map(op => op.provider),
  ]);
  const availableToLink = availableIdPs.filter(idp => idp.alias && !effectiveLinkedAliases.has(idp.alias));

  const handlePendingUnlink = (provider: string) => {
    onPendingOpsChange([...pendingOps, { type: 'unlink', provider }]);
  };

  const handleUndoUnlink = (provider: string) => {
    onPendingOpsChange(pendingOps.filter(op => !(op.type === 'unlink' && op.provider === provider)));
  };

  const handlePendingLink = () => {
    if (!selectedProvider || !linkUserId || !linkUserName) return;
    onPendingOpsChange([...pendingOps, {
      type: 'link',
      provider: selectedProvider,
      idpUserId: linkUserId,
      userName: linkUserName,
    }]);
    setShowLinkForm(false);
    setSelectedProvider('');
    setLinkUserId('');
    setLinkUserName('');
  };

  const handleUndoLink = (provider: string) => {
    onPendingOpsChange(pendingOps.filter(op => !(op.type === 'link' && op.provider === provider)));
  };

  const hasPendingChanges = pendingOps.length > 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2">
          <Link2 className="w-4 h-4 text-primary" />
          {t('Identity Provider Links')}
          {hasPendingChanges && (
            <Badge variant="outline" className="text-xs bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/20">
              {t('unsaved changes')}
            </Badge>
          )}
        </Label>
        {availableToLink.length > 0 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowLinkForm(!showLinkForm)}
          >
            <Plus className="w-3 h-3 mr-1" />
            {t('Link IdP')}
          </Button>
        )}
      </div>

      <div className="bg-primary/5 p-4 rounded-xl border border-primary/10 space-y-3">
        {/* Existing linked identities */}
        {federatedIdentities.length === 0 && pendingLinks.length === 0 && !showLinkForm && (
          <p className="text-sm text-muted-foreground text-center py-2">
            {t('No identity providers linked to this user')}
          </p>
        )}

        {federatedIdentities.map((fi) => {
          const idp = availableIdPs.find(p => p.alias === fi.identityProvider);
          const isPendingUnlink = pendingUnlinks.has(fi.identityProvider);
          return (
            <div
              key={fi.identityProvider}
              className={`flex items-center justify-between bg-card p-3 rounded-lg border ${
                isPendingUnlink
                  ? 'border-destructive/30 bg-destructive/5 opacity-60'
                  : 'border-border/50'
              }`}
            >
              <div className={`flex items-center gap-3 min-w-0 ${isPendingUnlink ? 'line-through' : ''}`}>
                <div className="flex-shrink-0">
                  <Badge variant="outline" className="text-xs bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-500/20">
                    {idp?.displayName || fi.identityProvider}
                  </Badge>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{fi.userName}</p>
                  <p className="text-xs text-muted-foreground truncate">{fi.userId}</p>
                </div>
                {isPendingUnlink && (
                  <Badge variant="outline" className="text-xs bg-destructive/10 text-destructive border-destructive/20">
                    {t('will be removed')}
                  </Badge>
                )}
              </div>
              {isPendingUnlink ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleUndoUnlink(fi.identityProvider)}
                  className="text-primary hover:text-primary/80 flex-shrink-0"
                  title={t('Undo removal')}
                >
                  <Undo2 className="w-4 h-4" />
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handlePendingUnlink(fi.identityProvider)}
                  className="text-destructive hover:text-destructive/80 flex-shrink-0"
                >
                  <Unlink className="w-4 h-4" />
                </Button>
              )}
            </div>
          );
        })}

        {/* Pending new links */}
        {pendingLinks.map((op) => {
          const idp = availableIdPs.find(p => p.alias === op.provider);
          return (
            <div
              key={`pending-${op.provider}`}
              className="flex items-center justify-between bg-card p-3 rounded-lg border border-green-300/50 bg-green-50/50 dark:bg-green-500/5"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex-shrink-0">
                  <Badge variant="outline" className="text-xs bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400 border-green-200 dark:border-green-500/20">
                    {idp?.displayName || op.provider}
                  </Badge>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{op.userName}</p>
                  <p className="text-xs text-muted-foreground truncate">{op.idpUserId}</p>
                </div>
                <Badge variant="outline" className="text-xs bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400 border-green-200 dark:border-green-500/20">
                  {t('will be added')}
                </Badge>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleUndoLink(op.provider)}
                className="text-primary hover:text-primary/80 flex-shrink-0"
                title={t('Undo link')}
              >
                <Undo2 className="w-4 h-4" />
              </Button>
            </div>
          );
        })}

        {/* Link new IdP form */}
        {showLinkForm && (
          <div className="bg-card p-4 rounded-lg border border-dashed border-primary/30 space-y-3">
            <h5 className="text-sm font-semibold">{t('Link New Identity Provider')}</h5>
            <div>
              <Label className="text-xs text-muted-foreground">{t('Identity Provider')}</Label>
              <Select value={selectedProvider} onValueChange={setSelectedProvider}>
                <SelectTrigger><SelectValue placeholder={t('Select identity provider')} /></SelectTrigger>
                <SelectContent>
                  {availableToLink.map(idp => (
                    <SelectItem key={idp.alias!} value={idp.alias!}>
                      {idp.displayName || idp.alias}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">{t('User ID at IdP')}</Label>
                <Input
                  placeholder="e.g., user-uuid-from-idp"
                  value={linkUserId}
                  onChange={(e) => setLinkUserId(e.target.value)}
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">{t('Username at IdP')}</Label>
                <Input
                  placeholder="e.g., john@external.com"
                  value={linkUserName}
                  onChange={(e) => setLinkUserName(e.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowLinkForm(false);
                  setSelectedProvider('');
                  setLinkUserId('');
                  setLinkUserName('');
                }}
              >
                {t('Cancel')}
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handlePendingLink}
                disabled={!selectedProvider || !linkUserId || !linkUserName}
              >
                <Link2 className="w-3 h-3 mr-1" />
                {t('Link')}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function FhirPersonSection({
  t,
  fhirPersons,
  fhirServers,
  formData,
  onAdd,
  onRemove,
  onUpdate,
  onCreatePerson,
}: {
  t: (key: string) => string;
  fhirPersons: FhirPersonAssociation[];
  fhirServers: FhirServer[];
  formData: EditUserFormData;
  onAdd: () => void;
  onRemove: (index: number) => void;
  onUpdate: (index: number, field: keyof FhirPersonAssociation, value: string) => void;
  onCreatePerson: (serverId: string, userData: { firstName: string; lastName: string; email: string }) => Promise<string>;
}) {
  return (
    <div className="space-y-3">
      <Label>{t('FHIR Person Associations')}</Label>
      <div className="space-y-3 bg-primary/5 p-4 rounded-xl border border-primary/10">
        {fhirPersons.map((association, index) => (
          <div key={index} className="space-y-3 bg-card p-4 rounded-lg border border-border/50">
            <div className="flex items-center justify-between">
              <h5 className="text-sm font-semibold">{t('FHIR Server Association')} #{index + 1}</h5>
              <Button type="button" variant="ghost" size="sm" onClick={() => onRemove(index)} className="text-destructive hover:text-destructive/80">
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">{t('FHIR Server')}</Label>
                <Select value={association.serverId} onValueChange={(v) => onUpdate(index, 'serverId', v)}>
                  <SelectTrigger><SelectValue placeholder={t('Select FHIR server')} /></SelectTrigger>
                  <SelectContent>
                    {fhirServers.map(server => (
                      <SelectItem key={server.id} value={server.id}>
                        <div className="flex items-center gap-2"><Server className="w-4 h-4" />{server.name}</div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Label className="text-xs text-muted-foreground">{t('Person ID')}</Label>
                  <Input placeholder="e.g., Person/12345" value={association.personId} onChange={(e) => onUpdate(index, 'personId', e.target.value)} />
                </div>
                <div className="flex flex-col justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      if (!association.serverId) return;
                      const personId = await onCreatePerson(association.serverId, {
                        firstName: formData.firstName,
                        lastName: formData.lastName,
                        email: formData.email,
                      });
                      onUpdate(index, 'personId', personId);
                    }}
                    disabled={!association.serverId}
                  >
                    <Database className="w-4 h-4 mr-1" />
                    {t('Create')}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ))}
        <Button type="button" variant="outline" onClick={onAdd} className="w-full border-dashed border-primary/30 text-primary hover:bg-primary/10">
          <Database className="w-4 h-4 mr-2" />
          {t('Add FHIR Server Association')}
        </Button>
      </div>
    </div>
  );
}

function RoleManagementSection({
  t,
  formData,
  setFormData,
  availableRealmRoles,
  availableClientRoles,
  getAllAvailableRoles,
}: {
  t: (key: string) => string;
  formData: EditUserFormData;
  setFormData: React.Dispatch<React.SetStateAction<EditUserFormData>>;
  availableRealmRoles: string[];
  availableClientRoles: Record<string, string[]>;
  getAllAvailableRoles: () => string[];
}) {
  return (
    <div className="space-y-4 bg-primary/5 p-4 rounded-xl border border-primary/10">
      <div className="flex items-center gap-2">
        <Shield className="w-4 h-4 text-primary" />
        <h4 className="font-semibold">{t('Role Management')}</h4>
      </div>

      {/* Primary Role */}
      <div>
        <Label className="mb-2 block">{t('Primary Role')}</Label>
        <Select value={formData.primaryRole || undefined} onValueChange={(v) => setFormData(prev => ({ ...prev, primaryRole: v }))}>
          <SelectTrigger><SelectValue placeholder={t('Select primary role...')} /></SelectTrigger>
          <SelectContent>
            {getAllAvailableRoles().map((role) => <SelectItem key={role} value={role}>{role}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Realm Roles */}
      <div>
        <Label className="mb-2 block">{t('Realm Roles')}</Label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {availableRealmRoles.map((role) => (
            <div key={role} className="flex items-center space-x-2">
              <Checkbox
                id={`edit-realm-${role}`}
                checked={formData.realmRoles.includes(role)}
                onCheckedChange={(checked) => {
                  setFormData(prev => ({
                    ...prev,
                    realmRoles: checked === true ? [...prev.realmRoles, role] : prev.realmRoles.filter(r => r !== role),
                  }));
                }}
              />
              <Label htmlFor={`edit-realm-${role}`} className="text-sm capitalize">{role}</Label>
            </div>
          ))}
        </div>
      </div>

      {/* Client Roles */}
      <div>
        <Label className="mb-2 block">{t('Admin UI Roles')}</Label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {availableClientRoles['admin-ui']?.map((role) => (
            <div key={role} className="flex items-center space-x-2">
              <Checkbox
                id={`edit-client-${role}`}
                checked={formData.clientRoles['admin-ui']?.includes(role) || false}
                onCheckedChange={(checked) => {
                  const current = formData.clientRoles['admin-ui'] || [];
                  setFormData(prev => ({
                    ...prev,
                    clientRoles: {
                      ...prev.clientRoles,
                      'admin-ui': checked === true ? [...current, role] : current.filter(r => r !== role),
                    },
                  }));
                }}
              />
              <Label htmlFor={`edit-client-${role}`} className="text-sm capitalize">{role.replace('-', ' ')}</Label>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}