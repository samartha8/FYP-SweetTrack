import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState, useEffect, useCallback, useMemo } from 'react';

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

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const storedSettings = await AsyncStorage.getItem(STORAGE_KEY);
      if (storedSettings) {
        setSettings(JSON.parse(storedSettings));
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateSettings = useCallback(async (updates: Partial<Settings>) => {
    const newSettings = { ...settings, ...updates };
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings));
      setSettings(newSettings);
    } catch (error) {
      console.error('Error updating settings:', error);
    }
  }, [settings]);

  const toggleHighContrast = useCallback(async () => {
    const newSettings = { ...settings, highContrast: !settings.highContrast };
    await updateSettings(newSettings);
  }, [settings, updateSettings]);

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
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_SETTINGS));
      setSettings(DEFAULT_SETTINGS);
    } catch (error) {
      console.error('Error resetting settings:', error);
    }
  }, []);

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
