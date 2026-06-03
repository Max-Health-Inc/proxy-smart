import React from 'react';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { createAuthenticatedClientApis } from '@/lib/apiClient';
import type { 
  FhirServerList,
  FhirServerListServersInner,
  HealthcareUser
} from '@/lib/api-client';
interface SmartState {
  // FHIR Servers
  servers: FhirServerListServersInner[];
  serversLoading: boolean;
  serversError: string | null;
  serversLastFetched: number | null;
  
  // Healthcare Users
  healthcareUsers: HealthcareUser[];
  healthcareUsersLoading: boolean;
  healthcareUsersError: string | null;
  healthcareUsersLastFetched: number | null;
  
  // Actions
  fetchServers: () => Promise<void>;
  fetchHealthcareUsers: () => Promise<void>;
  clearServersError: () => void;
  clearHealthcareUsersError: () => void;
  refreshAll: () => Promise<void>;
  updateHealthcareUser: (userId: string, updatedUser: HealthcareUser) => void;
  
  // Cache management
  invalidateServers: () => void;
  invalidateHealthcareUsers: () => void;
  isServersCacheValid: () => boolean;
  isHealthcareUsersCacheValid: () => boolean;
}

// Cache duration: 5 minutes
const CACHE_DURATION = 5 * 60 * 1000;

export const useSmartStore = create<SmartState>()(
  persist(
    (set, get) => ({
      // Initial state
      servers: [],
      serversLoading: false,
      serversError: null,
      serversLastFetched: null,
      
      healthcareUsers: [],
      healthcareUsersLoading: false,
      healthcareUsersError: null,
      healthcareUsersLastFetched: null,

      // Actions
      fetchServers: async () => {
        // Check cache validity first
        if (get().isServersCacheValid() && get().servers.length > 0) {
          console.debug('🎯 Using cached FHIR servers data');
          return;
        }

        set({ serversLoading: true, serversError: null });

        try {
          console.debug('🔄 Fetching FHIR servers from API...');
          const { servers } = await createAuthenticatedClientApis();
          const response: FhirServerList = await servers.getFhirServers();
          
          console.debug('✅ FHIR servers fetched successfully:', {
            totalServers: response.totalServers,
            servers: response.servers.map(s => ({ name: s.name, url: s.url, supported: s.supported }))
          });
          
          set({ 
            servers: response.servers,
            serversLoading: false,
            serversError: null,
            serversLastFetched: Date.now()
          });
        } catch (error) {
          console.error('❌ Failed to fetch FHIR servers:', error);
          const errorMessage = error instanceof Error ? error.message : 'Failed to fetch FHIR servers';
          set({ 
            serversLoading: false, 
            serversError: errorMessage 
          });
          throw error;
        }
      },

      fetchHealthcareUsers: async () => {
        // Check cache validity first
        if (get().isHealthcareUsersCacheValid() && get().healthcareUsers.length > 0) {
          console.debug('🎯 Using cached healthcare users data');
          return;
        }

        set({ healthcareUsersLoading: true, healthcareUsersError: null });

        try {
          console.debug('🔄 Fetching healthcare users from API...');
          const { healthcareUsers } = await createAuthenticatedClientApis();
          const users = await healthcareUsers.getAdminHealthcareUsers();
          
          console.debug('✅ Healthcare users fetched successfully:', {
            totalUsers: users.length,
            usernames: users.map((u: HealthcareUser) => u.username)
          });
          
          set({ 
            healthcareUsers: users,
            healthcareUsersLoading: false,
            healthcareUsersError: null,
            healthcareUsersLastFetched: Date.now()
          });
        } catch (error) {
          console.error('❌ Failed to fetch healthcare users:', error);
          const errorMessage = error instanceof Error ? error.message : 'Failed to fetch healthcare users';
          set({ 
            healthcareUsersLoading: false, 
            healthcareUsersError: errorMessage 
          });
          throw error;
        }
      },

      clearServersError: () => set({ serversError: null }),
      clearHealthcareUsersError: () => set({ healthcareUsersError: null }),

      updateHealthcareUser: (userId: string, updatedUser: HealthcareUser) => {
        const { healthcareUsers } = get();
        const updatedUsers = healthcareUsers.map(user => 
          user.id === userId ? updatedUser : user
        );
        set({ healthcareUsers: updatedUsers });
        console.debug('✅ Healthcare user updated in store:', { userId, username: updatedUser.username });
      },

      refreshAll: async () => {
        console.debug('🔄 Refreshing all FHIR data...');
        const promises = [
          get().fetchServers(),
          get().fetchHealthcareUsers()
        ];
        
        try {
          await Promise.allSettled(promises);
          console.debug('✅ All FHIR data refreshed');
        } catch (error) {
          console.error('❌ Some data failed to refresh:', error);
        }
      },

      // Cache management
      invalidateServers: () => set({ serversLastFetched: null }),
      invalidateHealthcareUsers: () => set({ healthcareUsersLastFetched: null }),

      isServersCacheValid: () => {
        const { serversLastFetched } = get();
        if (!serversLastFetched) return false;
        return Date.now() - serversLastFetched < CACHE_DURATION;
      },

      isHealthcareUsersCacheValid: () => {
        const { healthcareUsersLastFetched } = get();
        if (!healthcareUsersLastFetched) return false;
        return Date.now() - healthcareUsersLastFetched < CACHE_DURATION;
      },
    }),
    {
      name: 'fhir-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        servers: state.servers,
        serversLastFetched: state.serversLastFetched,
        healthcareUsers: state.healthcareUsers,
        healthcareUsersLastFetched: state.healthcareUsersLastFetched,
      }),
    }
  )
);

// Hook for easy access to FHIR servers with auto-fetch
export const useFhirServers = () => {
  const store = useSmartStore();
  
  // Auto-fetch servers if not loaded and not currently loading
  React.useEffect(() => {
    if (!store.isServersCacheValid() && !store.serversLoading && store.servers.length === 0) {
      store.fetchServers().catch(console.error);
    }
  }, [store]);

  return {
    servers: store.servers,
    loading: store.serversLoading,
    error: store.serversError,
    refresh: store.fetchServers,
    clearError: store.clearServersError,
  };
};

// Hook for easy access to healthcare users with auto-fetch
export const useHealthcareUsers = () => {
  const store = useSmartStore();
  
  // Auto-fetch users if not loaded and not currently loading
  React.useEffect(() => {
    if (!store.isHealthcareUsersCacheValid() && !store.healthcareUsersLoading && store.healthcareUsers.length === 0) {
      store.fetchHealthcareUsers().catch(console.error);
    }
  }, [store]);

  return {
    users: store.healthcareUsers,
    loading: store.healthcareUsersLoading,
    error: store.healthcareUsersError,
    refresh: store.fetchHealthcareUsers,
    clearError: store.clearHealthcareUsersError,
    updateUser: store.updateHealthcareUser,
  };
};


