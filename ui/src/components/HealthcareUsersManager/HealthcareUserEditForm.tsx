import React, { useState, useEffect } from 'react';
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
import { Shield, Loader2, Server, Database, Trash2 } from 'lucide-react';
import type { FhirPersonAssociation, FhirServer } from '@/lib/types/api';
import { createPersonResource } from '@/services/fhirService';

interface EditUserFormData {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  organization?: string;
  fhirPersons: FhirPersonAssociation[];
  enabled: boolean;
  primaryRole: string;
  realmRoles: string[];
  clientRoles: Record<string, string[]>;
}

interface HealthcareUserEditFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (formData: EditUserFormData) => Promise<void>;
  submitting: boolean;
  user: EditUserFormData | null;
  fhirServers: FhirServer[];
  availableRealmRoles: string[];
  availableClientRoles: Record<string, string[]>;
  getAllAvailableRoles: () => string[];
}

const initialFormData: EditUserFormData = {
  id: '',
  username: '',
  firstName: '',
  lastName: '',
  email: '',
  organization: '',
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
  getAllAvailableRoles
}: HealthcareUserEditFormProps) {
  const [formData, setFormData] = useState<EditUserFormData>(initialFormData);

  useEffect(() => {
    if (user) {
      setFormData(user);
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
  };

  const handleClose = () => {
    setFormData(initialFormData);
    onClose();
  };

  const addFhirPersonAssociation = () => {
    setFormData(prev => ({
      ...prev,
      fhirPersons: [...prev.fhirPersons, {
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
      fhirPersons: prev.fhirPersons.filter((_, i) => i !== index)
    }));
  };

  const updateFhirPersonAssociation = (index: number, field: keyof FhirPersonAssociation, value: string) => {
    setFormData(prev => ({
      ...prev,
      fhirPersons: prev.fhirPersons.map((assoc, i) =>
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
          <div className="w-12 h-12 bg-violet-500/10 dark:bg-violet-400/20 rounded-xl flex items-center justify-center shadow-sm">
            <Shield className="w-6 h-6 text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-foreground tracking-tight">Edit Healthcare User</h3>
            <p className="text-muted-foreground font-medium">Update user information and permissions</p>
          </div>
        </div>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <Label htmlFor="editUsername" className="text-sm font-semibold text-foreground">Username</Label>
            <Input
              id="editUsername"
              value={formData.username}
              className="rounded-xl border-border bg-muted shadow-sm"
              disabled
            />
            <p className="text-xs text-muted-foreground">Username cannot be changed</p>
          </div>
          <div className="space-y-3">
            <Label htmlFor="editEmail" className="text-sm font-semibold text-foreground">Email Address</Label>
            <Input
              id="editEmail"
              type="email"
              placeholder="john.smith@hospital.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="rounded-xl border-border focus:border-primary focus:ring-primary shadow-sm"
              required
            />
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <Label htmlFor="editFirstName" className="text-sm font-semibold text-foreground">First Name</Label>
            <Input
              id="editFirstName"
              placeholder="e.g., John"
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              className="rounded-xl border-border focus:border-primary focus:ring-primary shadow-sm"
              required
            />
          </div>
          <div className="space-y-3">
            <Label htmlFor="editLastName" className="text-sm font-semibold text-foreground">Last Name</Label>
            <Input
              id="editLastName"
              placeholder="e.g., Smith"
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              className="rounded-xl border-border focus:border-primary focus:ring-primary shadow-sm"
              required
            />
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <Label htmlFor="editOrganization" className="text-sm font-semibold text-foreground">Organization</Label>
            <Input
              id="editOrganization"
              placeholder="e.g., Cardiology Department"
              value={formData.organization}
              onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
              className="rounded-xl border-border focus:border-primary focus:ring-primary shadow-sm"
            />
          </div>
          <div className="space-y-3">
            <Label htmlFor="editFhirPersons" className="text-sm font-semibold text-foreground">FHIR Person Associations</Label>
            <div className="space-y-4 bg-primary/5 p-4 rounded-xl border border-primary/10">
              {formData.fhirPersons.map((association, index) => (
                <div key={index} className="space-y-3 bg-card p-4 rounded-lg border border-border">
                  <div className="flex items-center justify-between">
                    <h5 className="text-sm font-semibold text-foreground">FHIR Server Association #{index + 1}</h5>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFhirPersonAssociation(index)}
                      className="text-destructive hover:text-destructive/80 hover:bg-destructive/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs font-medium text-muted-foreground">FHIR Server</Label>
                      <Select
                        value={association.serverId}
                        onValueChange={(value) => updateFhirPersonAssociation(index, 'serverId', value)}
                      >
                        <SelectTrigger className="rounded-lg">
                          <SelectValue placeholder="Select FHIR server" />
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
                        <Label className="text-xs font-medium text-muted-foreground">Person ID</Label>
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
                          Create
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
                <Database className="w-4 h-4 mr-2" />
                Add FHIR Server Association
              </Button>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <Label htmlFor="editEnabled" className="text-sm font-semibold text-foreground">Account Status</Label>
            <div className="flex items-center space-x-3 pt-2">
              <input
                id="editEnabled"
                type="checkbox"
                checked={formData.enabled}
                onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                className="rounded border-border text-primary focus:ring-primary"
              />
              <Label htmlFor="editEnabled" className="text-sm text-foreground">Account enabled</Label>
            </div>
          </div>
          <div className="space-y-3">
            {/* Empty div for spacing */}
          </div>
        </div>
        
        {/* Role Management Section */}
        <div className="space-y-6 bg-primary/5 p-6 rounded-xl border border-primary/10">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center">
              <Shield className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h4 className="font-semibold text-foreground">Role Management</h4>
              <p className="text-sm text-muted-foreground">Modify user roles and permissions</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-semibold text-foreground mb-3 block">Primary Role</Label>
              <Select
                value={formData.primaryRole || undefined}
                onValueChange={(value) => setFormData({ ...formData, primaryRole: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select primary role..." />
                </SelectTrigger>
                <SelectContent>
                  {getAllAvailableRoles().map((role) => (
                    <SelectItem key={role} value={role}>
                      {role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label className="text-sm font-semibold text-foreground mb-3 block">Realm Roles</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {availableRealmRoles.map((role) => (
                  <div key={role} className="flex items-center space-x-2">
                    <input
                      id={`edit-realm-${role}`}
                      type="checkbox"
                      checked={formData.realmRoles.includes(role)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData({
                            ...formData,
                            realmRoles: [...formData.realmRoles, role]
                          });
                        } else {
                          setFormData({
                            ...formData,
                            realmRoles: formData.realmRoles.filter(r => r !== role)
                          });
                        }
                      }}
                      className="rounded border-border text-primary focus:ring-primary"
                    />
                    <Label htmlFor={`edit-realm-${role}`} className="text-sm text-foreground capitalize">
                      {role}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <Label className="text-sm font-semibold text-foreground mb-3 block">Admin UI Roles</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {availableClientRoles['admin-ui']?.map((role) => (
                  <div key={role} className="flex items-center space-x-2">
                    <input
                      id={`edit-client-${role}`}
                      type="checkbox"
                      checked={formData.clientRoles['admin-ui']?.includes(role) || false}
                      onChange={(e) => {
                        const currentAdminUiRoles = formData.clientRoles['admin-ui'] || [];
                        if (e.target.checked) {
                          setFormData({
                            ...formData,
                            clientRoles: {
                              ...formData.clientRoles,
                              'admin-ui': [...currentAdminUiRoles, role]
                            }
                          });
                        } else {
                          setFormData({
                            ...formData,
                            clientRoles: {
                              ...formData.clientRoles,
                              'admin-ui': currentAdminUiRoles.filter(r => r !== role)
                            }
                          });
                        }
                      }}
                      className="rounded border-border text-primary focus:ring-primary"
                    />
                    <Label htmlFor={`edit-client-${role}`} className="text-sm text-foreground capitalize">
                      {role.replace('-', ' ')}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex gap-4 pt-4">
          <Button 
            type="submit"
            disabled={submitting}
            className="px-8 py-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white font-semibold rounded-xl hover:from-blue-500 hover:via-indigo-500 hover:to-purple-500 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Updating...
              </>
            ) : (
              'Update User'
            )}
          </Button>
          <Button 
            type="button" 
            variant="outline" 
            onClick={handleClose}
            disabled={submitting}
            className="px-8 py-3 border-border text-foreground font-semibold rounded-xl hover:bg-muted transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
