import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from './AuthContext';;
import { SETTINGS_URL } from '../constants/Api';
import { secureFetch } from '../lib/apiClient';
import BaseColors from '@/constants/colors';
import { moderateScale, wp, hp } from '@/utils/responsive';

export type Language = 'en' | 'ne' | 'ja';

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
  const { ensureAccessToken } = useAuth();

  // Dynamic Theme Generation
  const theme = useMemo(() => {
    if (settings.highContrast) {
      return {
        ...BaseColors,
        primary: '#FFD60A',
        text: '#FFFFFF',
        textSecondary: '#E5E7EB',
        textLight: '#D1D5DB',
        background: '#000000',
        backgroundSecondary: '#0F172A',
        border: '#374151',
        card: '#111827',
        cardShadow: 'rgba(255, 255, 255, 0.18)',
        // Ensure other colors remain available
      };
    }
    return BaseColors;
  }, [settings.highContrast]);

  // Font Scaling
  const scale = useMemo(() => {
    const fontScale = { small: 0.9, medium: 1, large: 1.15 }[settings.fontSize] || 1;
    return (size: number) => Math.round(size * fontScale);
  }, [settings.fontSize]);

  const loadSettings = useCallback(async () => {
    try {
      // 1. Load from Local Cache first
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        setSettings(JSON.parse(stored));
      }

      // 2. Load from Backend
      const response = await secureFetch(SETTINGS_URL);

      if (response.ok) {
        const json = await response.json();
        if (json.success && json.settings) {
          const remoteSettings = json.settings;
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
  }, [ensureAccessToken]);

  useEffect(() => {
    loadSettings();
  }, []);

  const updateSettings = useCallback(async (updates: Partial<Settings>) => {
    const newSettings = { ...settings, ...updates };
    setSettings(newSettings); // Optimistic UI

    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings));

      await secureFetch(SETTINGS_URL, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      });
    } catch (error) {
      console.error('Error updating settings:', error);
    }
  }, [settings, ensureAccessToken]);

  const toggleHighContrast = useCallback(() => updateSettings({ highContrast: !settings.highContrast }), [settings.highContrast, updateSettings]);
  const setLanguage = useCallback((language: Language) => updateSettings({ language }), [updateSettings]);
  const setFontSize = useCallback((fontSize: 'small' | 'medium' | 'large') => updateSettings({ fontSize }), [updateSettings]);
  const updateNotifications = useCallback((notifications: Partial<Settings['notifications']>) =>
    updateSettings({ notifications: { ...settings.notifications, ...notifications } }), [settings.notifications, updateSettings]);
  const updateAccessibility = useCallback((accessibility: Partial<Settings['accessibility']>) =>
    updateSettings({ accessibility: { ...settings.accessibility, ...accessibility } }), [settings.accessibility, updateSettings]);

  const resetSettings = useCallback(async () => {
    try {
      setSettings(DEFAULT_SETTINGS);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_SETTINGS));

      await secureFetch(`${SETTINGS_URL}/reset`, {
        method: 'POST'
      });
    } catch (error) {
      console.error('Error resetting settings:', error);
    }
  }, [ensureAccessToken]);

  return useMemo(() => ({
    settings,
    isLoading,
    colors: theme, // Expose dynamic colors
    scale,         // Expose font scaler
    updateSettings,
    toggleHighContrast,
    setLanguage,
    setFontSize,
    updateNotifications,
    updateAccessibility,
    resetSettings,
    ms: moderateScale,
    wp,
    hp,
  }), [
    settings,
    isLoading,
    theme,
    scale,
    updateSettings,
    toggleHighContrast,
    setLanguage,
    setFontSize,
    updateNotifications,
    updateAccessibility,
    resetSettings,
    moderateScale,
    wp,
    hp,
  ]);
});

// Helper hook for simpler consumption
export const useTheme = () => {
  const { colors, scale, settings, ms, wp, hp } = useSettings();
  return { colors, scale, ms, wp, hp, isHighContrast: settings.highContrast, fontSize: settings.fontSize };
};
