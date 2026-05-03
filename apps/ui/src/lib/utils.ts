import CryptoJS from "crypto-js";

// Re-export cn from shared-ui to avoid duplication
export { cn } from "@max-health-inc/shared-ui";

// Get encryption secret — VITE_ENCRYPTION_SECRET should be set via env/build-arg
const getEncryptionSecret = (): string => {
  const secret = import.meta.env.VITE_ENCRYPTION_SECRET;
  if (!secret) {
    console.warn("VITE_ENCRYPTION_SECRET is not set — using fallback key. Set this env variable for production builds.");
    return "proxy-smart-default-encryption-key";
  }
  return secret;
};

// Encrypt
export const applyEncrypt = (text: string): string => {
  try {
    return CryptoJS.AES.encrypt(text, getEncryptionSecret()).toString();
  } catch (error) {
    console.error("Encryption failed:", error);
    // Return the original text if encryption fails (fallback)
    return text;
  }
};

// Decrypt
export const applyDecrypt = (cipherText: string): string => {
  try {
    const bytes = CryptoJS.AES.decrypt(cipherText, getEncryptionSecret());
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);

    // If decryption fails, bytes.toString() returns empty string
    if (!decrypted) {
      console.warn("Decryption produced empty result — clearing stale data");
      return '';
    }

    return decrypted;
  } catch (error) {
    console.error("Decryption failed:", error);
    // Return empty string so callers treat this as missing data
    return '';
  }
};
