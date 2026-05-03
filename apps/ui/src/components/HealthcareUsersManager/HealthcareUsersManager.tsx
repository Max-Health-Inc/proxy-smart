import { useState, useEffect, useCallback } from 'react';
import { Button } from '@max-health-inc/shared-ui';
import { useAuth } from '@/stores/authStore';
import { PageLoadingState } from '@/components/ui/page-loading-state';
import { HealthcareUsersHeader } from './HealthcareUsersHeader';
import { HealthcareUsersStats } from './HealthcareUsersStats';
import { HealthcareUserAddForm } from './HealthcareUserAddForm';
import { HealthcareUserEditForm, type PendingIdPOperation } from './HealthcareUserEditForm';
import type { FhirPersonAssociation, HealthcareUserFormData, HealthcareUser } from '@/lib/types/api';
import type { FederatedIdentity, IdentityProviderResponse } from '@/lib/api-client';
import { useFhirServers } from '@/stores/smartStore';
import { AddFhirPersonModal } from './AddFhirPersonModal';
import { HealthcareUsersTable } from './HealthcareUsersTable';
import { PersonResourceLinker } from './PersonResourceLinker';
import { IALSettings } from '../IALSettings';
import { getPersonResourceFull, updatePersonLinks } from '@/service/fhirService';
import type { PersonResource, CustomPersonLink } from '@/lib/fhir-types';
import { useTranslation } from 'react-i18next';
import { config } from '@/config';
import { getStoredToken } from '@/lib/apiClient';

// Extend the API type to include our UI-specific computed properties
type HealthcareUserWithPersons = HealthcareUser & {
  name: string; // Computed from firstName + lastName
  status: 'active' | 'inactive'; // Computed from enabled status
  primaryRole?: string; // Computed from roles
  // Override the object types to be more specific
  clientRoles?: Record<string, string[]>;
  realmRoles?: string[];
};

/**
 * Get primary role from Keycloak roles
 */
function getPrimaryRole(realmRoles: string[] = [], clientRoles: Record<string, string[]> = {}, explicitPrimaryRole?: string): string {
  // If an explicit primary role is set, use it
  if (explicitPrimaryRole) {
    return explicitPrimaryRole;
  }
  
  // Check client roles first (more specific)
  const adminUiRoles = clientRoles['admin-ui'] || []
  if (adminUiRoles.length > 0) {
    return adminUiRoles[0] // Return first client role
  }
  
  // Check realm roles
  const relevantRoles = realmRoles.filter(role => 
    !['default-roles-proxy-smart', 'offline_access', 'uma_authorization'].includes(role)
  )
  
  if (relevantRoles.length > 0) {
    return relevantRoles[0] // Return first relevant realm role
  }
  
  return 'user'
}

/**
 * Fetch client roles for a Keycloak client (e.g., 'admin-ui') from the backend.
 * Uses the new GET /admin/roles/clients/:clientId endpoint.
 */
async function fetchClientRoles(clientId: string): Promise<string[]> {
  const token = await getStoredToken();
  if (!token) return [];
  try {
    const res = await fetch(`${config.api.baseUrl}/admin/roles/clients/${encodeURIComponent(clientId)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return [];
    const roles: { name?: string }[] = await res.json();
    return roles.map(r => r.name).filter((n): n is string => !!n);
  } catch {
    return [];
  }
}

/**
 * Transform API user data to our internal format
 */
function transformApiUser(apiUser: HealthcareUser): HealthcareUserWithPersons {
  const attributes = apiUser.attributes as Record<string, string[]> || {};
  const clientRoles = apiUser.clientRoles as Record<string, string[]> || {};
  const realmRoles = apiUser.realmRoles || [];
  
  // Calculate the primary role using the existing function
  const primaryRole = getPrimaryRole(realmRoles, clientRoles);
  
  return {
    ...apiUser,
    name: `${apiUser.firstName} ${apiUser.lastName}`.trim(),
    status: apiUser.enabled ? 'active' : 'inactive',
    primaryRole: primaryRole,
    realmRoles: realmRoles,
    clientRoles: clientRoles,
    attributes: attributes
  }
}

export function HealthcareUsersManager({ embedded, addUserOpen, onAddUserOpenChange }: { embedded?: boolean; addUserOpen?: boolean; onAddUserOpenChange?: (open: boolean) => void } = {}) {
  const { t } = useTranslation();
  const { isAuthenticated, clientApis } = useAuth();
  
  // Store hooks for FHIR servers and healthcare users
  const { servers: fhirServers } = useFhirServers();
  // const { users: healthcareUsersData, loading: usersLoading, error: usersError, refresh: refreshUsers } = useHealthcareUsers();
  
  const [users, setUsers] = useState<HealthcareUserWithPersons[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddFormInternal, setShowAddFormInternal] = useState(false);
  const showAddForm = addUserOpen ?? showAddFormInternal;
  const setShowAddForm = onAddUserOpenChange ?? setShowAddFormInternal;
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingUser, setEditingUser] = useState<HealthcareUserWithPersons | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showAddPersonModal, setShowAddPersonModal] = useState(false);
  const [selectedUserForPerson, setSelectedUserForPerson] = useState<HealthcareUserWithPersons | null>(null);
  const [showLinkerModal, setShowLinkerModal] = useState(false);
  const [linkerPersons, setLinkerPersons] = useState<PersonResource[]>([]);
  const [_linkerUser, setLinkerUser] = useState<HealthcareUserWithPersons | null>(null);

  // Dynamic roles fetched from Keycloak
  const [availableRealmRoles, setAvailableRealmRoles] = useState<string[]>([]);
  const [availableClientRoles, setAvailableClientRoles] = useState<Record<string, string[]>>({ 'admin-ui': [] });

  // Identity providers and per-user federated identities
  const [availableIdPs, setAvailableIdPs] = useState<IdentityProviderResponse[]>([]);
  const [editingUserFederatedIdentities, setEditingUserFederatedIdentities] = useState<FederatedIdentity[]>([]);

  const getAllAvailableRoles = useCallback(() => {
    const allRoles = [...availableRealmRoles];
    Object.values(availableClientRoles).forEach(roles => {
      allRoles.push(...roles);
    });
    return [...new Set(allRoles)];
  }, [availableRealmRoles, availableClientRoles]);

  useEffect(() => {
    if (!isAuthenticated) return;

    // Load users
    clientApis.healthcareUsers.getAdminHealthcareUsers()
      .then(apiUsers => {
        setUsers(apiUsers.map(transformApiUser));
        setError(null);
      })
      .catch(err => {
        console.error('Failed to load users:', err);
        setError('Failed to load healthcare users. Please try again.');
      })
      .finally(() => setLoading(false));

    // Load roles and identity providers
    Promise.all([
      clientApis.roles.getAdminRoles().catch(() => []),
      fetchClientRoles('admin-ui'),
      clientApis.identityProviders.getAdminIdps().catch(() => []),
    ])
      .then(([realmRoles, adminUiRoles, idps]) => {
        const realmRoleNames = realmRoles
          .map(r => r.name)
          .filter((n): n is string => !!n)
          .filter(n => !n.startsWith('default-roles-'));
        setAvailableRealmRoles(realmRoleNames);
        setAvailableClientRoles({ 'admin-ui': adminUiRoles });
        setAvailableIdPs(idps);
      })
      .catch(() => { /* Fallback: leave empty */ });
  }, [isAuthenticated, clientApis.healthcareUsers, clientApis.roles, clientApis.identityProviders]);

  const handleEditUser = (user: HealthcareUserWithPersons) => {
    setEditingUser(user);
    setShowEditForm(true);
    // Load federated identities for this user
    setEditingUserFederatedIdentities(user.federatedIdentities ?? []);
    if (user.id) {
      clientApis.healthcareUsers.getAdminHealthcareUsersByUserIdFederatedIdentities({ userId: user.id })
        .then(setEditingUserFederatedIdentities)
        .catch(() => setEditingUserFederatedIdentities(user.federatedIdentities ?? []));
    }
  };

  const toggleUserStatus = async (id: string, currentStatus: 'active' | 'inactive') => {
    try {
      const newEnabled = currentStatus === 'inactive';
      
      await clientApis.healthcareUsers.putAdminHealthcareUsersByUserId({
        userId: id,
        updateHealthcareUserRequest: {
          enabled: newEnabled
        }
      });

      // Update local state
      setUsers(users.map(user => 
        user.id === id 
          ? { ...user, status: newEnabled ? 'active' : 'inactive', enabled: newEnabled }
          : user
      ));
    } catch (err) {
      console.error('Failed to toggle user status:', err);
      setError('Failed to update user status. Please try again.');
    }
  };

  const deleteUser = async (id: string) => {
    try {
      await clientApis.healthcareUsers.deleteAdminHealthcareUsersByUserId({ userId: id });
      
      // Remove user from local state
      setUsers(users.filter(user => user.id !== id));
    } catch (err) {
      console.error('Failed to delete user:', err);
      setError('Failed to delete healthcare user. Please try again.');
    }
  };

  // Handle opening the Add FHIR Person modal
  const handleAddFhirPerson = (user: HealthcareUserWithPersons) => {
    setSelectedUserForPerson(user);
    setShowAddPersonModal(true);
  };

  // Handle when a new Person association is added
  const handlePersonAdded = (association: FhirPersonAssociation) => {
    if (!selectedUserForPerson) return;

    const updatedUser = {
      ...selectedUserForPerson,
      fhirPersons: [...(selectedUserForPerson.fhirPersons || []), association]
    };

    // Update the user in the local state
    setUsers(users.map(u => u.id === selectedUserForPerson.id ? updatedUser : u));
    
    // Close modal and reset state
    setShowAddPersonModal(false);
    setSelectedUserForPerson(null);
  };

  // Handle opening the Person Resource Linker for IAL management
  const handleManageLinks = async (user: HealthcareUserWithPersons) => {
    if (!user.fhirPersons?.length) return;
    setLinkerUser(user);

    const persons: PersonResource[] = [];
    for (const assoc of user.fhirPersons) {
      const server = fhirServers.find(s => s.id === assoc.serverId);
      if (!server) continue;
      try {
        const person = await getPersonResourceFull(
          server.name,
          server.fhirVersion || 'R4',
          assoc.personId,
          {
            serverName: server.name,
            version: server.fhirVersion || 'R4',
            baseUrl: `${config.api.baseUrl}/proxy/${server.name}/${server.fhirVersion || 'R4'}`,
            fhirVersion: server.fhirVersion
          }
        );
        persons.push(person);
      } catch (err) {
        console.error(`Failed to load Person ${assoc.personId}:`, err);
      }
    }
    setLinkerPersons(persons);
    setShowLinkerModal(true);
  };

  // Handle Person link updates from the linker
  const handlePersonLinkUpdate = async (personId: string, updatedLinks: CustomPersonLink[]) => {
    const person = linkerPersons.find(p => (p.id || p.display) === personId);
    if (!person) return;

    try {
      await updatePersonLinks(
        person.serverInfo.serverName,
        person.serverInfo.fhirVersion || person.serverInfo.version,
        person.id,
        updatedLinks
      );
      // Update local state
      setLinkerPersons(prev => prev.map(p =>
        (p.id || p.display) === personId ? { ...p, links: updatedLinks } : p
      ));
    } catch (err) {
      console.error('Failed to update Person links:', err);
      setError('Failed to update Person links on the FHIR server.');
    }
  };

  return (
    <div className={embedded ? "space-y-6" : "p-4 sm:p-6 space-y-6 bg-background min-h-full"}>
      {/* Show loading state */}
      {loading && (
        <PageLoadingState message="Loading healthcare users..." className="min-h-[200px]" />
      )}

      {/* Show error state */}
      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 mb-6">
          <div className="text-destructive font-medium">{error}</div>
          <Button
            variant="ghost"
            onClick={() => setError(null)}
            className="text-destructive hover:text-destructive/80 text-sm mt-2"
          >
            {t('Dismiss')}
          </Button>
        </div>
      )}

      {/* Header Section */}
      {!embedded && (
        <HealthcareUsersHeader onAddUser={() => setShowAddForm(true)} />
      )}

      {/* Statistics Cards */}
      {!loading && (
        <HealthcareUsersStats users={users} />
      )}

      {/* Add New User Form */}
      <HealthcareUserAddForm
        isOpen={showAddForm}
        onClose={() => setShowAddForm(false)}
        onSubmit={async (formData: HealthcareUserFormData) => {
          try {
            setSubmitting(true);
            setError(null);
            
            const createRequest = {
              username: formData.username,
              email: formData.email,
              firstName: formData.firstName,
              lastName: formData.lastName,
              organization: formData.organization || undefined,
              fhirUser: formData.fhirUser || undefined,
              fhirPersons: (formData.fhirPersons && formData.fhirPersons.length > 0) ? formData.fhirPersons : undefined,
              password: formData.password || undefined,
              temporaryPassword: formData.temporaryPassword,
              realmRoles: (formData.realmRoles && formData.realmRoles.length > 0) ? formData.realmRoles : undefined,
              clientRoles: (formData.clientRoles && Object.keys(formData.clientRoles).length > 0) ? formData.clientRoles : undefined,
            };

            const createdUser = await clientApis.healthcareUsers.postAdminHealthcareUsers({
              createHealthcareUserRequest: createRequest
            });

            // Add the new user to the list
            const transformedUser = transformApiUser(createdUser);
            setUsers([...users, transformedUser]);
            setShowAddForm(false);
          } catch (err) {
            console.error('Failed to create user:', err);
            setError('Failed to create healthcare user. Please try again.');
          } finally {
            setSubmitting(false);
          }
        }}
        submitting={submitting}
        fhirServers={fhirServers}
        availableRealmRoles={availableRealmRoles}
        availableClientRoles={availableClientRoles}
        getAllAvailableRoles={getAllAvailableRoles}
      />

      {/* Edit User Form */}
      <HealthcareUserEditForm
        key={editingUser?.id ?? 'new'}
        isOpen={showEditForm}
        onClose={() => {
          setShowEditForm(false);
          setEditingUser(null);
        }}
        onSubmit={async (formData, pendingIdPOps) => {
          try {
            setSubmitting(true);
            setError(null);
            
            const updateRequest = {
              firstName: formData.firstName,
              lastName: formData.lastName,
              email: formData.email,
              enabled: formData.enabled,
              organization: formData.organization || undefined,
              fhirUser: formData.fhirUser || undefined,
              fhirPersons: (formData.fhirPersons && formData.fhirPersons.length > 0) ? formData.fhirPersons : undefined,
              realmRoles: formData.realmRoles.length > 0 ? formData.realmRoles : undefined,
              clientRoles: Object.keys(formData.clientRoles).length > 0 ? formData.clientRoles : undefined,
            };

            const updatedUser = await clientApis.healthcareUsers.putAdminHealthcareUsersByUserId({
              userId: formData.id,
              updateHealthcareUserRequest: updateRequest
            });

            // Execute pending IdP operations after successful user update
            for (const op of pendingIdPOps) {
              if (op.type === 'unlink') {
                await clientApis.healthcareUsers.deleteAdminHealthcareUsersByUserIdFederatedIdentitiesByProvider({
                  userId: formData.id,
                  provider: op.provider,
                });
              } else if (op.type === 'link') {
                await clientApis.healthcareUsers.postAdminHealthcareUsersByUserIdFederatedIdentitiesByProvider({
                  userId: formData.id,
                  provider: op.provider,
                  linkFederatedIdentityRequest: { userId: op.idpUserId, userName: op.userName },
                });
              }
            }

            // Refresh federated identities if any IdP ops were executed
            if (pendingIdPOps.length > 0) {
              const updatedIdentities = await clientApis.healthcareUsers.getAdminHealthcareUsersByUserIdFederatedIdentities({ userId: formData.id });
              setEditingUserFederatedIdentities(updatedIdentities);
            }

            // Update the user in the local state
            const transformedUser = transformApiUser(updatedUser);
            setUsers(users.map(user => 
              user.id === formData.id ? transformedUser : user
            ));
            
            // Reset form and close modal
            setShowEditForm(false);
            setEditingUser(null);
          } catch (err) {
            console.error('Failed to update user:', err);
            setError('Failed to update healthcare user. Please try again.');
          } finally {
            setSubmitting(false);
          }
        }}
        submitting={submitting}
        user={editingUser ? {
          id: editingUser.id,
          username: editingUser.username,
          firstName: editingUser.firstName,
          lastName: editingUser.lastName,
          email: editingUser.email,
          organization: editingUser.organization,
          fhirUser: editingUser.fhirUser,
          fhirPersons: editingUser.fhirPersons || [],
          enabled: editingUser.enabled,
          primaryRole: editingUser.primaryRole || '',
          realmRoles: editingUser.realmRoles || [],
          clientRoles: editingUser.clientRoles || {},
        } : null}
        fhirServers={fhirServers}
        availableRealmRoles={availableRealmRoles}
        availableClientRoles={availableClientRoles}
        getAllAvailableRoles={getAllAvailableRoles}
        federatedIdentities={editingUserFederatedIdentities}
        availableIdPs={availableIdPs}
      />

      {/* Users Table */}
      {!loading && (
        <HealthcareUsersTable
          users={users}
          fhirServers={fhirServers}
          onEditUser={(user) => {
            const originalUser = users.find(u => u.id === user.id);
            if (originalUser) {
              handleEditUser(originalUser);
            }
          }}
          onToggleStatus={(userId, currentStatus) => {
            toggleUserStatus(userId, currentStatus);
          }}
          onDeleteUser={deleteUser}
          onAddFhirPerson={(user) => {
            const originalUser = users.find(u => u.id === user.id);
            if (originalUser) {
              handleAddFhirPerson(originalUser);
            }
          }}
          onManageLinks={(user) => {
            const originalUser = users.find(u => u.id === user.id);
            if (originalUser) {
              handleManageLinks(originalUser);
            }
          }}
        />
      )}

      {/* Person Resource Linker for IAL management */}
      <PersonResourceLinker
        isOpen={showLinkerModal}
        onClose={() => {
          setShowLinkerModal(false);
          setLinkerUser(null);
          setLinkerPersons([]);
        }}
        availablePersons={linkerPersons}
        onPersonUpdate={handlePersonLinkUpdate}
      />

      {/* ─── IAL Settings (Identity Assurance) ─── */}
      <IALSettings />

      {selectedUserForPerson && (() => {
        const mappedServers = fhirServers.map(server => ({
          id: server.id,
          name: server.name,
          baseUrl: server.url,
          status: server.supported ? 'active' : 'inactive',
          fhirVersion: server.fhirVersion
        }));
      
        
        return (
          <AddFhirPersonModal
            isOpen={showAddPersonModal}
            onClose={() => {
              setShowAddPersonModal(false);
              setSelectedUserForPerson(null);
            }}
            user={selectedUserForPerson}
            onPersonAdded={handlePersonAdded}
            availableServers={mappedServers}
          />
        );
      })()}
    </div>
  );
}