import { useState, useEffect, useCallback } from 'react';
import { adminApiCall } from '@/lib/admin-api';

/** Banner state shown above a settings page. */
export interface SettingsMessage {
  type: 'success' | 'error';
  text: string;
}

export interface UseAdminSettingsOptions<T> {
  /** Admin endpoint serving `{ config }` on GET and taking the config on PUT */
  endpoint: string;
  /** Shown until the first load resolves */
  defaults: T;
  loadErrorText: string;
  saveErrorText: string;
  saveSuccessText: string;
}

export interface UseAdminSettingsResult<T> {
  settings: T;
  setSettings: React.Dispatch<React.SetStateAction<T>>;
  loading: boolean;
  saving: boolean;
  message: SettingsMessage | null;
  /** Re-read from the server, showing the loading state again */
  reload: () => void;
  save: () => Promise<void>;
  /** Append to a string-array field, ignoring blanks and duplicates */
  addToList: (field: keyof T, value: string) => boolean;
  removeFromList: (field: keyof T, value: string) => void;
}

const errorText = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

/**
 * Load, edit and save one admin config endpoint.
 *
 * The consent and IAL settings pages each carried their own copy of this —
 * including a useEffect that re-implemented the loader inline rather than
 * calling it, so the load path existed twice in each file.
 */
export function useAdminSettings<T extends object>(
  opts: UseAdminSettingsOptions<T>,
): UseAdminSettingsResult<T> {
  const { endpoint, defaults, loadErrorText, saveErrorText, saveSuccessText } = opts;

  const [settings, setSettings] = useState<T>(defaults);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<SettingsMessage | null>(null);

  // `stillWanted` lets the mount effect drop a response that arrived after the
  // component went away, or after the endpoint changed under it.
  const load = useCallback(async (stillWanted: () => boolean = () => true) => {
    try {
      const res = await adminApiCall<{ config: T }>(endpoint);
      if (!stillWanted()) return;
      setSettings(res.config);
      setMessage(null);
    } catch (error) {
      if (!stillWanted()) return;
      setMessage({ type: 'error', text: errorText(error, loadErrorText) });
    } finally {
      if (stillWanted()) setLoading(false);
    }
  }, [endpoint, loadErrorText]);

  useEffect(() => {
    let cancelled = false;
    // load() only sets state after awaiting the request, so this is not the
    // synchronous cascade the rule guards against; the guard drops a late
    // response rather than setting state on an unmounted component.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load(() => !cancelled);
    return () => { cancelled = true; };
  }, [load]);

  const reload = useCallback(() => {
    setLoading(true);
    setMessage(null);
    void load();
  }, [load]);

  const save = useCallback(async () => {
    try {
      setSaving(true);
      setMessage(null);
      await adminApiCall(endpoint, 'PUT', settings);
      setMessage({ type: 'success', text: saveSuccessText });
    } catch (error) {
      setMessage({ type: 'error', text: errorText(error, saveErrorText) });
    } finally {
      setSaving(false);
    }
  }, [endpoint, settings, saveErrorText, saveSuccessText]);

  // Decided against the current value rather than inside the updater, so the
  // caller gets a straight answer about whether to clear its input.
  const addToList = useCallback((field: keyof T, value: string): boolean => {
    const trimmed = value.trim();
    if (!trimmed) return false;
    const current = settings[field];
    if (!Array.isArray(current) || current.includes(trimmed)) return false;
    setSettings(prev => {
      const list = prev[field];
      if (!Array.isArray(list) || list.includes(trimmed)) return prev;
      return { ...prev, [field]: [...list, trimmed] };
    });
    return true;
  }, [settings]);

  const removeFromList = useCallback((field: keyof T, value: string) => {
    setSettings(prev => {
      const current = prev[field];
      if (!Array.isArray(current)) return prev;
      return { ...prev, [field]: current.filter(v => v !== value) };
    });
  }, []);

  return { settings, setSettings, loading, saving, message, reload, save, addToList, removeFromList };
}
