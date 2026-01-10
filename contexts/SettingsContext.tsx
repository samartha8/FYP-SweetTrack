import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useUser } from './UserContext';

export type Language = 'en' | 'ne' | 'hi';

export type Settings = {
  language: Language;
  highContrast: boolean;
  fontSize: 'small' | 'medium' | 'large';
  notifications: {
    enabled: boolean;
    dailyReminders: boolean;
    goalAlerts: boolean;
    healthTips: boolean;
  };
  accessibility: {
    screenReader: boolean;
    hapticFeedback: boolean;
    voiceInput: boolean;
  };
};

const STORAGE_KEY = '@sweettrack_settings';

const DEFAULT_SETTINGS: Settings = {
  language: 'en',
  highContrast: false,
  fontSize: 'medium',
  notifications: {
    enabled: true,
    dailyReminders: true,
    goalAlerts: true,
    healthTips: true,
  },
  accessibility: {
    screenReader: false,
    hapticFeedback: true,
    voiceInput: false,
  },
};

export const [SettingsProvider, useSettings] = createContextHook(() => {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { ensureAccessToken } = useUser();

  const API_URL = useMemo(() => {
    return process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:5000';
  }, []);

  const loadSettings = useCallback(async () => {
    try {
      // 1. Load from Local Cache first (Fast UI)
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        setSettings(JSON.parse(stored));
      }

      // 2. Load from Backend (Source of Truth)
      const token = await ensureAccessToken();
      if (token) {
        const response = await fetch(`${API_URL}/api/settings`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const json = await response.json();
        if (json.success && json.settings) {
          const remoteSettings = json.settings;
          // Merge to avoid losing local-only fields if any
          const merged = { ...DEFAULT_SETTINGS, ...remoteSettings };
          setSettings(merged);
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
        }
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setIsLoading(false);
    }
  }, [ensureAccessToken, API_URL]);

  useEffect(() => {
    loadSettings();
  }, []);

  const updateSettings = useCallback(async (updates: Partial<Settings>) => {
    const newSettings = { ...settings, ...updates };
    setSettings(newSettings); // Optimistic UI

    try {
      // Save Local
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings));

      // Save Backend
      const token = await ensureAccessToken();
      if (token) {
        await fetch(`${API_URL}/api/settings`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(updates)
        });
      }
    } catch (error) {
      console.error('Error updating settings:', error);
    }
  }, [settings, ensureAccessToken, API_URL]);

  const toggleHighContrast = useCallback(async () => {
    await updateSettings({ highContrast: !settings.highContrast });
  }, [settings.highContrast, updateSettings]);

  const setLanguage = useCallback(async (language: Language) => {
    await updateSettings({ language });
  }, [updateSettings]);

  const setFontSize = useCallback(async (fontSize: 'small' | 'medium' | 'large') => {
    await updateSettings({ fontSize });
  }, [updateSettings]);

  const updateNotifications = useCallback(async (notifications: Partial<Settings['notifications']>) => {
    const newNotifications = { ...settings.notifications, ...notifications };
    await updateSettings({ notifications: newNotifications });
  }, [settings.notifications, updateSettings]);

  const updateAccessibility = useCallback(async (accessibility: Partial<Settings['accessibility']>) => {
    const newAccessibility = { ...settings.accessibility, ...accessibility };
    await updateSettings({ accessibility: newAccessibility });
  }, [settings.accessibility, updateSettings]);

  const resetSettings = useCallback(async () => {
    try {
      setSettings(DEFAULT_SETTINGS);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_SETTINGS));

      const token = await ensureAccessToken();
      if (token) {
        await fetch(`${API_URL}/api/settings/reset`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });
      }
    } catch (error) {
      console.error('Error resetting settings:', error);
    }
  }, [ensureAccessToken, API_URL]);

  return useMemo(() => ({
    settings,
    isLoading,
    updateSettings,
    toggleHighContrast,
    setLanguage,
    setFontSize,
    updateNotifications,
    updateAccessibility,
    resetSettings,
  }), [
    settings,
    isLoading,
    updateSettings,
    toggleHighContrast,
    setLanguage,
    setFontSize,
    updateNotifications,
    updateAccessibility,
    resetSettings,
  ]);
});
