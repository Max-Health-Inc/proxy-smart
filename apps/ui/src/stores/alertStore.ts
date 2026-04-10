import { create } from 'zustand';

export interface AlertConfig {
    title: string;
    message: string;
    type?: 'info' | 'warning' | 'error' | 'success';
    confirmText?: string;
    cancelText?: string;
}

export interface ConfirmConfig extends AlertConfig {
    onConfirm: () => void | Promise<void>;
    onCancel?: () => void;
}

export interface ConfirmInputConfig extends Omit<ConfirmConfig, 'onConfirm'> {
    onConfirm: (input: string) => void | Promise<void>;
    inputLabel?: string;
    inputPlaceholder?: string;
    inputRequired?: boolean;
    inputType?: 'text' | 'textarea';
    inputValidation?: (value: string) => string | null; // Returns error message or null if valid
}

interface AlertState {
    // Current dialogs
    currentAlert: AlertConfig | null;
    currentConfirm: ConfirmConfig | null;
    currentConfirmInput: ConfirmInputConfig | null;
    
    // Actions
    alert: (config: AlertConfig) => void;
    confirm: (config: ConfirmConfig) => void;
    confirmInput: (config: ConfirmInputConfig) => void;
    
    // Dialog management
    closeAlert: () => void;
    closeConfirm: () => void;
    closeConfirmInput: () => void;
}

export const useAlertStore = create<AlertState>((set) => ({
    currentAlert: null,
    currentConfirm: null,
    currentConfirmInput: null,

    alert: (config) => set({ currentAlert: config }),
    
    confirm: (config) => set({ currentConfirm: config }),
    
    confirmInput: (config) => set({ currentConfirmInput: config }),
    
    closeAlert: () => set({ currentAlert: null }),
    
    closeConfirm: () => set({ currentConfirm: null }),
    
    closeConfirmInput: () => set({ currentConfirmInput: null }),
}));

// Convenience functions that can be imported directly
export const alert = (config: AlertConfig) => {
    useAlertStore.getState().alert(config);
};

export const confirm = (config: ConfirmConfig) => {
    useAlertStore.getState().confirm(config);
};

export const confirmInput = (config: ConfirmInputConfig) => {
    useAlertStore.getState().confirmInput(config);
};
