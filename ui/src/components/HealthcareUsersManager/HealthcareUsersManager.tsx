import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/stores/authStore';
import { HealthcareUsersHeader } from './HealthcareUsersHeader';
import { HealthcareUsersStats } from './HealthcareUsersStats';
import { HealthcareUserAddForm } from './HealthcareUserAddForm';
import { HealthcareUserEditForm } from './HealthcareUserEditForm';
import type { FhirPersonAssociation, HealthcareUserFormData, HealthcareUser } from '@/lib/types/api';
import { useFhirServers } from '@/stores/smartStore';
import { AddFhirPersonModal } from './AddFhirPersonModal';
import { HealthcareUsersTable } from './HealthcareUsersTable';
import { IALSettings } from '../IALSettings';

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
 * Available realm roles for selection
 */
const AVAILABLE_REALM_ROLES = [
  'nurse',
  'researcher',
  'practitioner',
  'administrator',
  'user'
];

/**
 * Available client roles for admin-ui
 */
const AVAILABLE_CLIENT_ROLES = {
  'admin-ui': [
    'admin',
    'user-manager',
    'viewer'
  ]
};

/**
 * Get all available roles for primary role selection
 */
const getAllAvailableRoles = () => {
  const allRoles = [...AVAILABLE_REALM_ROLES];
  Object.values(AVAILABLE_CLIENT_ROLES).forEach(roles => {
    allRoles.push(...roles);
  });
  return allRoles;
};

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

export function HealthcareUsersManager() {
  const { isAuthenticated, clientApis } = useAuth();
  
  // Store hooks for FHIR servers and healthcare users
  const { servers: fhirServers } = useFhirServers();
  // const { users: healthcareUsersData, loading: usersLoading, error: usersError, refresh: refreshUsers } = useHealthcareUsers();
  
  const [users, setUsers] = useState<HealthcareUserWithPersons[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingUser, setEditingUser] = useState<HealthcareUserWithPersons | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showAddPersonModal, setShowAddPersonModal] = useState(false);
  const [selectedUserForPerson, setSelectedUserForPerson] = useState<HealthcareUserWithPersons | null>(null);

  // Load users from API
  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const apiUsers = await clientApis.healthcareUsers.getAdminHealthcareUsers();
      
      const transformedUsers = apiUsers.map(transformApiUser);
      setUsers(transformedUsers);
    } catch (err) {
      console.error('Failed to load users:', err);
      // Set generic error for non-auth errors
      setError('Failed to load healthcare users. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [clientApis.healthcareUsers]);

  useEffect(() => {
    if (isAuthenticated) {
      loadUsers();
    }
  }, [isAuthenticated, loadUsers]);

  const handleEditUser = (user: HealthcareUserWithPersons) => {
    setEditingUser(user);
    setShowEditForm(true);
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

  return (
    <div className="p-4 sm:p-6 space-y-6 bg-background min-h-full">
      {/* Show loading state */}
      {loading && (
        <div className="flex justify-center items-center p-8">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <span className="ml-2 text-muted-foreground">Loading healthcare users...</span>
        </div>
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
            Dismiss
          </Button>
        </div>
      )}

      {/* Header Section */}
      <HealthcareUsersHeader onAddUser={() => setShowAddForm(true)} />

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
        availableRealmRoles={AVAILABLE_REALM_ROLES}
        availableClientRoles={AVAILABLE_CLIENT_ROLES}
        getAllAvailableRoles={getAllAvailableRoles}
      />

      {/* Edit User Form */}
      <HealthcareUserEditForm
        isOpen={showEditForm}
        onClose={() => {
          setShowEditForm(false);
          setEditingUser(null);
        }}
        onSubmit={async (formData) => {
          try {
            setSubmitting(true);
            setError(null);
            
            const updateRequest = {
              firstName: formData.firstName,
              lastName: formData.lastName,
              email: formData.email,
              enabled: formData.enabled,
              organization: formData.organization || undefined,
              fhirPersons: (formData.fhirPersons && formData.fhirPersons.length > 0) ? formData.fhirPersons : undefined,
              realmRoles: formData.realmRoles.length > 0 ? formData.realmRoles : undefined,
              clientRoles: Object.keys(formData.clientRoles).length > 0 ? formData.clientRoles : undefined,
            };

            const updatedUser = await clientApis.healthcareUsers.putAdminHealthcareUsersByUserId({
              userId: formData.id,
              updateHealthcareUserRequest: updateRequest
            });

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
          fhirPersons: editingUser.fhirPersons || [],
          enabled: editingUser.enabled,
          primaryRole: editingUser.primaryRole || '',
          realmRoles: editingUser.realmRoles || [],
          clientRoles: editingUser.clientRoles || {},
        } : null}
        fhirServers={fhirServers}
        availableRealmRoles={AVAILABLE_REALM_ROLES}
        availableClientRoles={AVAILABLE_CLIENT_ROLES}
        getAllAvailableRoles={getAllAvailableRoles}
      />

      {/* Users Table */}
      {!loading && (
        <HealthcareUsersTable
          users={users.map(user => ({
            id: user.id,
            name: user.name,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            organization: user.organization,
            enabled: user.enabled,
            realmRoles: user.realmRoles || [],
            clientRoles: user.clientRoles || {},
            primaryRole: user.primaryRole || getPrimaryRole(user.realmRoles || [], user.clientRoles || {}),
            fhirPersons: user.fhirPersons || [],
            createdAt: user.createdTimestamp ? new Date(user.createdTimestamp).toISOString() : new Date().toISOString(),
            lastLogin: user.lastLogin ? new Date(user.lastLogin).toISOString() : undefined
          }))}
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
        />
      )}

      {/* Add FHIR Person Modal */}
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
