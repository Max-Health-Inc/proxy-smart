import React, { useState } from 'react';
import { Button, Checkbox, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@proxy-smart/shared-ui';
import { Plus, Shield, Server, Database, Trash2, Info, ChevronDown, ChevronRight } from 'lucide-react';
import { LoadingButton } from '@/components/ui/loading-button';
import type {
  FhirServer,
  HealthcareUserFormData
} from '@/lib/types/api';
import { createPersonResource } from '@/service/fhirService';
import { useTranslation } from 'react-i18next';
import { roleSubtitle, isPlumbingRoleName, type RolesMeta } from './rolePickerHelpers';

// Persona presets pre-select a sensible role bundle. Only roles that actually
// exist are applied (guarded against missing roles in the realm).
type PersonaId = 'administrator' | 'practitioner' | 'patient';
const PERSONA_BUNDLES: Record<PersonaId, { realm: string[]; adminUi: string[] }> = {
  administrator: { realm: ['admin', 'user'], adminUi: ['admin'] },
  practitioner: { realm: ['user', 'practitioner'], adminUi: ['practitioner'] },
  patient: { realm: ['user'], adminUi: [] },
};

interface HealthcareUserAddFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (formData: HealthcareUserFormData) => Promise<void>;
  submitting: boolean;
  fhirServers: FhirServer[];
  availableRealmRoles: string[];
  availableClientRoles: Record<string, string[]>;
  getAllAvailableRoles: () => string[];
  rolesMeta?: RolesMeta;
}

const initialFormData: HealthcareUserFormData = {
  username: '',
  firstName: '',
  lastName: '',
  email: '',
  enabled: true,
  emailVerified: false,
  organization: '',
  fhirUser: '',
  password: '',
  temporaryPassword: false,
  realmRoles: [],
  clientRoles: {},
  // UI helper fields
  primaryRole: '',
  fhirPersons: [],
};

export function HealthcareUserAddForm({
  isOpen,
  onClose,
  onSubmit,
  submitting,
  fhirServers,
  availableRealmRoles,
  availableClientRoles,
  getAllAvailableRoles,
  rolesMeta
}: HealthcareUserAddFormProps) {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<HealthcareUserFormData>(initialFormData);
  const [persona, setPersona] = useState<PersonaId | ''>('');
  const [showAdvancedRoles, setShowAdvancedRoles] = useState(false);

  const adminUiRoles = availableClientRoles['admin-ui'] ?? [];

  const applyPersona = (id: PersonaId) => {
    const bundle = PERSONA_BUNDLES[id];
    // Only apply roles that exist in the realm / admin-ui client.
    const realmRoles = bundle.realm.filter(r => availableRealmRoles.includes(r));
    const clientRoles = bundle.adminUi.filter(r => adminUiRoles.includes(r));
    const clientRolesMap: Record<string, string[]> = clientRoles.length > 0 ? { 'admin-ui': clientRoles } : {};
    setPersona(id);
    setShowAdvancedRoles(false);
    setFormData(prev => ({
      ...prev,
      realmRoles,
      clientRoles: clientRolesMap,
      primaryRole: clientRoles[0] ?? realmRoles[0] ?? '',
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Pass the form data - the parent will convert it to API format
    await onSubmit(formData);
    setFormData(initialFormData);
    setPersona('');
    setShowAdvancedRoles(false);
  };

  const handleClose = () => {
    setFormData(initialFormData);
    setPersona('');
    setShowAdvancedRoles(false);
    onClose();
  };

  const addFhirPersonAssociation = () => {
    setFormData(prev => ({
      ...prev,
      fhirPersons: [...(prev.fhirPersons || []), {
        serverId: '',
        personId: '',
        display: '',
        created: new Date().toISOString()
      }]
    }));
  };

  const removeFhirPersonAssociation = (index: number) => {
    setFormData(prev => ({
      ...prev,
      fhirPersons: (prev.fhirPersons || []).filter((_, i) => i !== index)
    }));
  };

  const updateFhirPersonAssociation = (index: number, field: keyof NonNullable<HealthcareUserFormData['fhirPersons']>[0], value: string) => {
    setFormData(prev => ({
      ...prev,
      fhirPersons: (prev.fhirPersons || []).map((assoc, i) =>
        i === index ? { ...assoc, [field]: value } : assoc
      )
    }));
  };

  const createPersonInFhir = async (serverId: string, userData: { firstName: string; lastName: string; email: string }) => {
    try {
      // Find the server to get its FHIR version
      const server = fhirServers.find(s => s.id === serverId);
      if (!server) {
        throw new Error(`Server not found: ${serverId}`);
      }
      
      const result = await createPersonResource(serverId, server.fhirVersion, {
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email
      });
      
      return result.id;
    } catch (error) {
      console.error(`Failed to create Person resource in ${serverId}:`, error);
      throw error;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="bg-card/70 backdrop-blur-sm p-8 rounded-2xl border border-border/50 shadow-lg hover:shadow-xl transition-all duration-300">
      <div className="mb-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center shadow-sm">
            <Plus className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-foreground tracking-tight">{t('Add New Healthcare User')}</h3>
            <p className="text-muted-foreground font-medium">{t('Create a new user account for healthcare professionals')}</p>
          </div>
        </div>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <Label htmlFor="username" className="text-sm font-semibold text-foreground">{t('Username')}</Label>
            <Input
              id="username"
              placeholder="e.g., john.smith"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              className="rounded-xl border-border/50 focus:border-primary focus:ring-primary shadow-sm"
              required
            />
          </div>
          <div className="space-y-3">
            <Label htmlFor="email" className="text-sm font-semibold text-foreground">{t('Email Address')}</Label>
            <Input
              id="email"
              type="email"
              placeholder="john.smith@hospital.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="rounded-xl border-border/50 focus:border-primary focus:ring-primary shadow-sm"
              required
            />
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <Label htmlFor="firstName" className="text-sm font-semibold text-foreground">{t('First Name')}</Label>
            <Input
              id="firstName"
              placeholder="e.g., John"
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              className="rounded-xl border-border/50 focus:border-primary focus:ring-primary shadow-sm"
              required
            />
          </div>
          <div className="space-y-3">
            <Label htmlFor="lastName" className="text-sm font-semibold text-foreground">{t('Last Name')}</Label>
            <Input
              id="lastName"
              placeholder="e.g., Smith"
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              className="rounded-xl border-border/50 focus:border-primary focus:ring-primary shadow-sm"
              required
            />
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <Label htmlFor="organization" className="text-sm font-semibold text-foreground">{t('Organization')}</Label>
            <Input
              id="organization"
              placeholder="e.g., Cardiology Department"
              value={formData.organization}
              onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
              className="rounded-xl border-border/50 focus:border-primary focus:ring-primary shadow-sm"
            />
          </div>
          <div className="space-y-3">
            <Label htmlFor="fhirUser" className="text-sm font-semibold text-foreground">{t('FHIR User Identity')}</Label>
            <Input
              id="fhirUser"
              placeholder="e.g., Patient/123 or Practitioner/456"
              value={formData.fhirUser ?? ''}
              onChange={(e) => setFormData({ ...formData, fhirUser: e.target.value })}
              className="rounded-xl border-border/50 focus:border-primary focus:ring-primary shadow-sm"
            />
            <p className="text-xs text-muted-foreground">{t('Maps this user to a FHIR resource (used in SMART fhirUser claim)')}</p>
          </div>
          <div className="space-y-3">
            <Label htmlFor="fhirPersons" className="text-sm font-semibold text-foreground">{t('FHIR Person Associations')}</Label>
            <div className="space-y-4 bg-primary/5 p-4 rounded-xl border border-primary/20">
              {(formData.fhirPersons || []).map((association, index) => (
                <div key={index} className="space-y-3 bg-card p-4 rounded-lg border border-border/50">
                  <div className="flex items-center justify-between">
                    <h5 className="text-sm font-semibold text-foreground">FHIR Server Association #{index + 1}</h5>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFhirPersonAssociation(index)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs font-medium text-muted-foreground">{t('FHIR Server')}</Label>
                      <Select
                        value={association.serverId}
                        onValueChange={(value) => updateFhirPersonAssociation(index, 'serverId', value)}
                      >
                        <SelectTrigger className="rounded-lg">
                          <SelectValue placeholder={t('Select FHIR server')} />
                        </SelectTrigger>
                        <SelectContent>
                          {fhirServers.map(server => (
                            <SelectItem key={server.id} value={server.id}>
                              <div className="flex items-center space-x-2">
                                <Server className="w-4 h-4" />
                                <span>{server.name}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex space-x-2">
                      <div className="flex-1">
                        <Label className="text-xs font-medium text-muted-foreground">{t('Person ID')}</Label>
                        <Input
                          placeholder="e.g., Person/12345"
                          value={association.personId}
                          onChange={(e) => updateFhirPersonAssociation(index, 'personId', e.target.value)}
                          className="rounded-lg"
                        />
                      </div>
                      <div className="flex flex-col justify-end">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            if (association.serverId) {
                              const personId = await createPersonInFhir(association.serverId, {
                                firstName: formData.firstName,
                                lastName: formData.lastName,
                                email: formData.email
                              });
                              updateFhirPersonAssociation(index, 'personId', personId);
                            }
                          }}
                          disabled={!association.serverId}
                          className="rounded-lg"
                        >
                          <Database className="w-4 h-4 mr-1" />
                          {t('Create')}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                onClick={addFhirPersonAssociation}
                className="w-full rounded-lg border-dashed border-primary/30 text-primary hover:bg-primary/10"
              >
                <Plus className="w-4 h-4 mr-2" />
                {t('Add FHIR Server Association')}
              </Button>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <Label htmlFor="password" className="text-sm font-semibold text-foreground">{t('Password (Optional)')}</Label>
            <Input
              id="password"
              type="password"
              placeholder={t('Leave blank for no password')}
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="rounded-xl border-border/50 focus:border-primary focus:ring-primary shadow-sm"
            />
          </div>
          <div className="space-y-3">
            <div className="flex items-center space-x-3 pt-7">
              <Checkbox
                id="temporaryPassword"
                checked={formData.temporaryPassword}
                onCheckedChange={(checked) => setFormData({ ...formData, temporaryPassword: checked === true })}
              />
              <Label htmlFor="temporaryPassword" className="text-sm text-foreground">{t('Temporary password')}</Label>
            </div>
          </div>
        </div>
        
        {/* Role Management Section */}
        <div className="space-y-6 bg-primary/5 p-6 rounded-xl border border-primary/20">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
              <Shield className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h4 className="font-semibold text-foreground">{t('Role Management')}</h4>
              <p className="text-sm text-muted-foreground">{t('Assign roles to control user permissions')}</p>
            </div>
          </div>

          {/* Helper line: roles are admin-console access + clinical-intent labels, not enforced FHIR access. */}
          <div className="flex items-start gap-2 text-xs text-muted-foreground">
            <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
            <span>{t('Roles control access to this admin console and act as labels for clinical intent. They are not enforced as FHIR data access.')}</span>
          </div>

          {/* Persona preset selector */}
          <div>
            <Label className="text-sm font-semibold text-foreground mb-3 block">{t('User type')}</Label>
            <Select value={persona || undefined} onValueChange={(value) => applyPersona(value as PersonaId)}>
              <SelectTrigger>
                <SelectValue placeholder={t('Select a user type to pre-fill roles...')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="administrator">{t('Administrator')}</SelectItem>
                <SelectItem value="practitioner">{t('Practitioner')}</SelectItem>
                <SelectItem value="patient">{t('Patient')}</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-2">{t('Pre-selects a sensible role bundle. Expand the advanced section below to customize.')}</p>
          </div>

          {/* Advanced: customize roles (manual control preserved) */}
          <div className="space-y-4">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowAdvancedRoles(v => !v)}
              className="px-0 text-primary hover:bg-transparent"
            >
              {showAdvancedRoles ? <ChevronDown className="w-4 h-4 mr-1" /> : <ChevronRight className="w-4 h-4 mr-1" />}
              {t('Advanced: customize roles')}
            </Button>

            {showAdvancedRoles && (
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-semibold text-foreground mb-3 block">{t('Primary Role')}</Label>
                  <Select
                    value={formData.primaryRole || undefined}
                    onValueChange={(value) => setFormData({ ...formData, primaryRole: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('Select primary role...')} />
                    </SelectTrigger>
                    <SelectContent>
                      {getAllAvailableRoles().filter(r => !isPlumbingRoleName(r)).map((role) => (
                        <SelectItem key={role} value={role}>
                          {role}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm font-semibold text-foreground mb-3 block">{t('Realm Roles')}</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {availableRealmRoles.filter(r => !isPlumbingRoleName(r)).map((role) => {
                      const meta = rolesMeta?.[role];
                      const subtitle = roleSubtitle(meta, t('No typical scopes set'));
                      return (
                        <div key={role} className="flex items-start space-x-2" title={subtitle}>
                          <Checkbox
                            id={`realm-${role}`}
                            className="mt-0.5"
                            checked={(formData.realmRoles || []).includes(role)}
                            onCheckedChange={(checked) => {
                              if (checked === true) {
                                setFormData({
                                  ...formData,
                                  realmRoles: [...(formData.realmRoles || []), role]
                                });
                              } else {
                                setFormData({
                                  ...formData,
                                  realmRoles: (formData.realmRoles || []).filter(r => r !== role)
                                });
                              }
                            }}
                          />
                          <div className="min-w-0">
                            <Label htmlFor={`realm-${role}`} className="text-sm text-foreground capitalize">
                              {role}
                            </Label>
                            {meta?.description && <p className="text-xs text-muted-foreground truncate">{meta.description}</p>}
                            {(meta?.representedScopes?.length ?? 0) > 0 && (
                              <p className="text-xs text-muted-foreground truncate">{t('Typical scopes')}: {meta!.representedScopes!.join(', ')}</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-semibold text-foreground mb-3 block">{t('Admin UI Roles')}</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {adminUiRoles.map((role) => {
                      const meta = rolesMeta?.[role];
                      const subtitle = roleSubtitle(meta, t('No typical scopes set'));
                      return (
                        <div key={role} className="flex items-start space-x-2" title={subtitle}>
                          <Checkbox
                            id={`client-${role}`}
                            className="mt-0.5"
                            checked={(formData.clientRoles as Record<string, string[]>)?.[`admin-ui`]?.includes(role) || false}
                            onCheckedChange={(checked) => {
                              const currentAdminUiRoles = (formData.clientRoles as Record<string, string[]>)?.[`admin-ui`] || [];
                              if (checked === true) {
                                setFormData({
                                  ...formData,
                                  clientRoles: {
                                    ...(formData.clientRoles as Record<string, string[]>),
                                    'admin-ui': [...currentAdminUiRoles, role]
                                  }
                                });
                              } else {
                                setFormData({
                                  ...formData,
                                  clientRoles: {
                                    ...(formData.clientRoles as Record<string, string[]>),
                                    'admin-ui': currentAdminUiRoles.filter((r: string) => r !== role)
                                  }
                                });
                              }
                            }}
                          />
                          <div className="min-w-0">
                            <Label htmlFor={`client-${role}`} className="text-sm text-foreground capitalize">
                              {role.replace('-', ' ')}
                            </Label>
                            {meta?.description && <p className="text-xs text-muted-foreground truncate">{meta.description}</p>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex gap-4 pt-4">
          <LoadingButton 
            type="submit"
            loading={submitting}
            loadingText={t('Creating...')}
          >
            Add User
          </LoadingButton>
          <Button 
            type="button" 
            variant="outline" 
            onClick={handleClose}
            disabled={submitting}
            className="px-8 py-3 border-border/50 text-foreground font-semibold rounded-xl hover:bg-muted transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t('Cancel')}
          </Button>
        </div>
      </form>
    </div>
  );
}