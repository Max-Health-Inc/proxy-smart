import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import i18n, { supportedLanguages } from '../lib/i18n';

// Get the initial language from browser or default to 'en'
const getInitialLanguage = (): string => {
  const browserLanguage = navigator.language.split("-")[0];
  const selectedLanguage = supportedLanguages.includes(browserLanguage) ? browserLanguage : "en";
  return selectedLanguage;
};

interface AppState {
  // Language settings
  language: string;
  setLanguage: (language: string) => Promise<void>;
  
  // UI preferences
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  
  // Navigation state
  activeTab: string;
  setActiveTab: (tab: string) => void;
  
  // Smart Apps Manager tab state
  smartAppsManagerTab: string;
  setSmartAppsManagerTab: (tab: string) => void;
  
  // Notification preferences
  notificationsEnabled: boolean;
  setNotificationsEnabled: (enabled: boolean) => void;
  
  // AI Assistant state
  isAIAssistantEnabled: boolean;
  setIsAIAssistantEnabled: (enabled: boolean) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // Language settings
      language: getInitialLanguage(),
      setLanguage: async (language: string) => {
        
        try {
          console.debug('🔄 Attempting to change i18n language to:', language);
          await i18n.changeLanguage(language);
          console.debug('✅ i18n language changed successfully to:', i18n.language);
          
          // Update store state
          set({ language });
          window.dispatchEvent(new CustomEvent('languageChanged', { detail: { language } }));
        } catch (error) {
          console.error('❌ Failed to change language:', error);
        }
      },
      
      // UI preferences
      sidebarCollapsed: false,
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      
      // Navigation state
      activeTab: 'dashboard',
      setActiveTab: (tab) => set({ activeTab: tab }),
      
      // Smart Apps Manager tab state
      smartAppsManagerTab: 'apps',
      setSmartAppsManagerTab: (tab) => set({ smartAppsManagerTab: tab }),
      
      // Notification preferences
      notificationsEnabled: true,
      setNotificationsEnabled: (enabled) => set({ notificationsEnabled: enabled }),
      
      // AI Assistant state
      isAIAssistantEnabled: true, // Default to true, will be updated by fetching SMART apps
      setIsAIAssistantEnabled: (enabled) => set({ isAIAssistantEnabled: enabled }),
    }),
    {
      name: 'app-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        language: state.language,
        sidebarCollapsed: state.sidebarCollapsed,
        activeTab: state.activeTab,
        smartAppsManagerTab: state.smartAppsManagerTab,
        notificationsEnabled: state.notificationsEnabled,
        isAIAssistantEnabled: state.isAIAssistantEnabled,
      }),
    }
  )
);

// Initialize language on app start
export const initializeAppStore = async () => {
  const { language, setLanguage } = useAppStore.getState();
  await setLanguage(language);
};