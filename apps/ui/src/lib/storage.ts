import localforage from "localforage";
import { applyDecrypt, applyEncrypt } from "./utils";

localforage.config({
    name: "proxy-smart",
});

// Encrypted persistent storage using localforage
export const getItem = async <T>(key: string): Promise<T | null> => {
    let storedValue = await localforage.getItem<string>(key);

    if (storedValue) {
        storedValue = applyDecrypt(storedValue);

        // If decryption returned empty, treat as missing data
        if (!storedValue) {
            await localforage.removeItem(key);
            return null;
        }

        try {
            // Try to parse as JSON
            return JSON.parse(storedValue) as T;
        } catch {
            // If parsing fails, return the raw string
            return storedValue as T;
        }
    }

    return null;
};

export const storeItem = async (key: string, value: object): Promise<void> => {
    const valuestring = JSON.stringify(value);
    await setItem(key, valuestring);
};

export const setItem = async (key: string, value: string): Promise<void> => {
    const encryptedValue = applyEncrypt(value);
    await localforage.setItem(key, encryptedValue);
}

export const removeItem = async (key: string): Promise<void> => {
    await localforage.removeItem(key);
};

// Session storage utilities (for temporary data like PKCE parameters)
export const getSessionItem = (key: string): string | null => {
    try {
        return sessionStorage.getItem(key);
    } catch (error) {
        console.warn('Failed to get session storage item:', error);
        return null;
    }
};

export const setSessionItem = (key: string, value: string): void => {
    try {
        sessionStorage.setItem(key, value);
    } catch (error) {
        console.warn('Failed to set session storage item:', error);
    }
};

export const removeSessionItem = (key: string): void => {
    try {
        sessionStorage.removeItem(key);
    } catch (error) {
        console.warn('Failed to remove session storage item:', error);
    }
};

// Theme storage utilities (synchronous for immediate access during render)
// Note: Using localStorage directly instead of localforage for synchronous access
// and because theme preferences don't require encryption
export const getTheme = (storageKey: string, defaultTheme: string): string => {
    try {
        if (typeof window === 'undefined' || !window.localStorage) {
            return defaultTheme;
        }
        return localStorage.getItem(storageKey) || defaultTheme;
    } catch (error) {
        console.warn('Failed to get theme from storage:', error);
        return defaultTheme;
    }
};

export const setTheme = (storageKey: string, theme: string): void => {
    try {
        if (typeof window === 'undefined' || !window.localStorage) {
            console.warn('localStorage not available, theme not persisted');
            return;
        }
        localStorage.setItem(storageKey, theme);
    } catch (error) {
        console.warn('Failed to set theme in storage:', error);
    }
};

// Utility to clear all OAuth-related data (both encrypted and session)
export const clearAllAuthData = async (): Promise<void> => {
    // Clear encrypted token storage
    try {
        await removeItem('openid_tokens');
    } catch (error) {
        console.warn('Failed to clear encrypted tokens:', error);
    }

    // Clear session storage - OAuth and PKCE data
    removeSessionItem('pkce_code_verifier');
    removeSessionItem('oauth_state');
    removeSessionItem('authorization_code'); // Clear any leftover auth codes
    removeSessionItem('oauth_code_verifier'); // Alternative naming
    removeSessionItem('oauth_callback_processed'); // Clear processed flags

    // Clear any cached OAuth state in localStorage
    try {
        Object.keys(localStorage).forEach(key => {
            if (key.includes('oauth') || key.includes('pkce') || key.includes('auth') || key.includes('code')) {
                localStorage.removeItem(key);
            }
        });
    } catch (error) {
        console.warn('Failed to clear localStorage oauth data:', error);
    }

    // Clear any cached OAuth state in sessionStorage  
    try {
        Object.keys(sessionStorage).forEach(key => {
            if (key.includes('oauth') || key.includes('pkce') || key.includes('auth') || key.includes('code')) {
                sessionStorage.removeItem(key);
            }
        });
    } catch (error) {
        console.warn('Failed to clear sessionStorage oauth data:', error);
    }
};

// Utility to immediately clear authorization code data after use
export const clearAuthorizationCodeData = (): void => {
    console.log('🧹 Clearing authorization code data...');
    
    // Clear any potential authorization code storage
    removeSessionItem('authorization_code');
    removeSessionItem('oauth_code');
    removeSessionItem('auth_code');
    
    // Clear URL-based storage if any component stored it
    try {
        if (window.history && window.location.search.includes('code=')) {
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    } catch (error) {
        console.warn('Failed to clear URL parameters:', error);
    }
};
