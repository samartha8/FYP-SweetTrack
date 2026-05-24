import { createContextHook } from '../hooks/use-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';
import * as ExpoLinking from 'expo-linking';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { DeviceEventEmitter, Platform } from 'react-native';
import apiClient, { AUTH_SESSION_EXPIRED_EVENT, SECURE_STORAGE_KEYS, refreshAccessToken } from '../lib/apiClient';
import { AUTH_URL, API_BASE_URL } from '../constants/Api';

WebBrowser.maybeCompleteAuthSession();

export type User = {
  id: string;
  name: string;
  email: string;
  healthSetupCompleted?: boolean;
  isGoogleFitConnected?: boolean;
  riskStatus?: 'Positive' | 'Negative' | 'Normal';
  riskProbability?: number;
  [key: string]: any;
};

const STORAGE_KEYS = {
  USER: '@sweettrack_user',
  HAS_ONBOARDED: '@sweettrack_onboarded',
};

const EXTERNAL_STORAGE_KEYS = [
  '@sweettrack_health_setup',
  '@sweettrack_health_metrics',
  '@sweettrack_daily_goals',
  '@sweettrack_rewards_points',
  '@sweettrack_streak',
  '@sweettrack_google_fit_connected',
  '@sweettrack_water_intake',
  '@sweettrack_risk_status',
  '@sweettrack_risk_probability',
  '@sweettrack_last_metrics_date',
  '@sweettrack_settings',
];

const GOOGLE_AUTH_RETURN_URL = 'diabetesapp://auth/callback';

const getRedirectParam = (url: string, key: string) => {
  const queryStart = url.indexOf('?');
  if (queryStart === -1) return null;

  const queryString = url.slice(queryStart + 1).split('#')[0];
  const params = new URLSearchParams(queryString);
  return params.get(key);
};

export const [AuthProvider, useAuth] = createContextHook(() => {
  const [user, setUser] = useState<User | null>(null);
  const [hasOnboarded, setHasOnboarded] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const processedUrlsRef = useRef<Set<string>>(new Set());
  const userIdRef = useRef<string | null>(null);

  useEffect(() => {
    userIdRef.current = user?.id || null;
  }, [user?.id]);

  const clearLocalState = useCallback(async () => {
    const currentUserId = userIdRef.current;
    const asyncKeys = [...Object.values(STORAGE_KEYS), ...EXTERNAL_STORAGE_KEYS];
    if (currentUserId) asyncKeys.push(`@sweettrack_meal_logs_${currentUserId}`);

    await AsyncStorage.multiRemove(asyncKeys);
    
    if (Platform.OS !== 'web') {
      await SecureStore.deleteItemAsync(SECURE_STORAGE_KEYS.TOKEN);
      await SecureStore.deleteItemAsync(SECURE_STORAGE_KEYS.REFRESH_TOKEN);
    } else {
      await AsyncStorage.removeItem(SECURE_STORAGE_KEYS.TOKEN);
      await AsyncStorage.removeItem(SECURE_STORAGE_KEYS.REFRESH_TOKEN);
    }

    setUser(null);
    setHasOnboarded(false);
  }, []);

  const persistAuthPayload = useCallback(async (nextUser: User & { healthData?: any }, accessToken: string, refreshToken: string) => {
    let userToSave: any = { ...nextUser };
    const healthObj = typeof nextUser.healthData === 'object' ? nextUser.healthData : {};
    const { _id, id: _hid, user: _u, __v, createdAt, updatedAt, ...healthFields } = healthObj;
    
    const userId = nextUser.id || (nextUser as any)._id;
    userToSave = { ...userToSave, id: userId, ...healthFields };
    if (!userToSave.name && nextUser.name) userToSave.name = nextUser.name;

    if (Platform.OS !== 'web') {
      await SecureStore.setItemAsync(SECURE_STORAGE_KEYS.TOKEN, accessToken);
      await SecureStore.setItemAsync(SECURE_STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
    } else {
      await AsyncStorage.setItem(SECURE_STORAGE_KEYS.TOKEN, accessToken);
      await AsyncStorage.setItem(SECURE_STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
    }

    setUser(userToSave);
    setHasOnboarded(true);

    await AsyncStorage.multiSet([
      [STORAGE_KEYS.USER, JSON.stringify(userToSave)],
      [STORAGE_KEYS.HAS_ONBOARDED, 'true'],
    ]);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      await clearLocalState();
      const res = await apiClient.post(`${AUTH_URL}/login`, { email, password });
      if (res.data && res.data.success) {
        await persistAuthPayload(res.data.user, res.data.token, res.data.refreshToken);
        return { success: true };
      }
      return { success: false, message: res.data.message || 'Login failed' };
    } catch (error: any) {
      console.error('Login Error:', error);
      return { success: false, message: error.response?.data?.message || 'Login failed due to network error.' };
    }
  }, [clearLocalState, persistAuthPayload]);

  const signup = useCallback(async (name: string, email: string, password: string) => {
    try {
      await clearLocalState();
      const res = await apiClient.post(`${AUTH_URL}/signup`, { name, email, password });
      if (res.data && res.data.success) {
        await persistAuthPayload(res.data.user, res.data.token, res.data.refreshToken);
        return { success: true };
      }
      return { success: false, message: res.data.message || 'Signup failed' };
    } catch (error: any) {
      console.error('Signup Error:', error);
      return { success: false, message: error.response?.data?.message || 'Signup failed due to network error.' };
    }
  }, [clearLocalState, persistAuthPayload]);

  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      await apiClient.post(`${AUTH_URL}/logout`); // Will attach token automatically
    } catch (e) {} // ignore if token was already dead
    await clearLocalState();
    setIsLoading(false);
  }, [clearLocalState]);

  const ensureAccessToken = useCallback(async (forceRefresh?: boolean) => {
    try {
      if (forceRefresh) {
        return await refreshAccessToken();
      }

      if (Platform.OS !== 'web') {
        return await SecureStore.getItemAsync(SECURE_STORAGE_KEYS.TOKEN);
      }
      return await AsyncStorage.getItem(SECURE_STORAGE_KEYS.TOKEN);
    } catch (error) {
      console.warn('[AuthContext] Unable to refresh access token:', error);
      await clearLocalState();
      return null;
    }
  }, [clearLocalState]);

  const signInWithGoogle = useCallback(async () => {
    try {
      const authUrl = `${AUTH_URL}/google?returnUrl=${encodeURIComponent(GOOGLE_AUTH_RETURN_URL)}`;
      const result = await WebBrowser.openAuthSessionAsync(authUrl, GOOGLE_AUTH_RETURN_URL);

      if (result.type !== 'success' || !result.url) {
        return { success: false, message: 'Google sign-in was cancelled.' };
      }

      const accessToken = getRedirectParam(result.url, 'token');
      const refreshToken = getRedirectParam(result.url, 'refreshToken');

      if (!accessToken || !refreshToken) {
        const message = getRedirectParam(result.url, 'message') || 'Google sign-in did not return a valid session.';
        return { success: false, message };
      }

      if (Platform.OS !== 'web') {
        await SecureStore.setItemAsync(SECURE_STORAGE_KEYS.TOKEN, accessToken);
        await SecureStore.setItemAsync(SECURE_STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
      } else {
        await AsyncStorage.setItem(SECURE_STORAGE_KEYS.TOKEN, accessToken);
        await AsyncStorage.setItem(SECURE_STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
      }

      const me = await apiClient.get(`${AUTH_URL}/me`);
      if (!me.data?.success || !me.data.user) {
        await clearLocalState();
        return { success: false, message: 'Unable to load Google account profile.' };
      }

      await persistAuthPayload(me.data.user, accessToken, refreshToken);
      return {
        success: true,
        user: me.data.user,
        needsHealthSetup: getRedirectParam(result.url, 'needsHealthSetup') === 'true',
      };
    } catch (error: any) {
      console.error('Google Sign-In Error:', error);
      return {
        success: false,
        message: error.response?.data?.message || error.message || 'Google sign-in failed.',
      };
    }
  }, [clearLocalState, persistAuthPayload]);

  const completeOnboarding = useCallback(async () => {
    setHasOnboarded(true);
    await AsyncStorage.setItem(STORAGE_KEYS.HAS_ONBOARDED, 'true');
  }, []);

  const completeHealthSetup = useCallback(async (healthData?: any) => {
    try {
      // 1. Update local state and persist
      setUser(prev => {
        if (!prev) return null;
        
        // Extract health fields to flatten them
        const healthObj = healthData || {};
        const { _id, id: _hid, user: _u, __v, createdAt, updatedAt, ...healthFields } = healthObj;
        
        const next = { 
          ...prev, 
          ...healthFields,
          healthSetupCompleted: true 
        };
        
        // Persist to storage
        AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(next));
        return next;
      });
      
      // Also explicitly set the Health flag just in case
      AsyncStorage.setItem('@sweettrack_health_setup', 'true');
      
      return { success: true };
    } catch (e) {
      console.error("🚀 [AuthContext] completeHealthSetup failed:", e);
      return { success: false };
    }
  }, []);

  const updateUser = useCallback(async (updates: any) => {
    setUser(prev => {
      if (!prev) return null;
      const next = { ...prev, ...updates };
      // Also persist to storage so it survives refresh/mounts
      AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(next));
      return next;
    });
  }, []);

  const registerPushNotifications = useCallback(async () => {
    try {
      if (Platform.OS === 'web') {
        return { success: false, message: 'Push notifications not supported on web' };
      }

      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#10B981',
        });
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        return { success: false, message: 'Permission not granted for push notifications' };
      }

      const projectId =
        Constants.easConfig?.projectId ||
        Constants.expoConfig?.extra?.eas?.projectId ||
        Constants.expoConfig?.extra?.eas?.projectId;

      if (!projectId) {
        return {
          success: false,
          message: 'EAS project ID missing. Run eas init and rebuild the APK.',
        };
      }

      const tokenResponse = await Notifications.getExpoPushTokenAsync({ projectId });
      const token = tokenResponse.data;
      
      if (!token) throw new Error("Failed to get Expo push token");

      const accessToken = (Platform.OS as any) !== 'web'
        ? await SecureStore.getItemAsync(SECURE_STORAGE_KEYS.TOKEN)
        : await AsyncStorage.getItem(SECURE_STORAGE_KEYS.TOKEN);

      if (!accessToken) throw new Error("User not authenticated");

      const response = await fetch(`${API_BASE_URL}/notifications/push-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'ngrok-skip-browser-warning': 'true'
        },
        body: JSON.stringify({ token, platform: Platform.OS })
      });

      const json = await response.json();
      return { success: json.success, message: json.success ? 'Success' : json.message };
    } catch (error: any) {
      console.error('Error registering push notifications:', error);
      return { success: false, message: error.message || 'Failed to register token' };
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    const loadState = async () => {
      try {
        const [[, onboarded], [, savedUserStr], hasToken] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.HAS_ONBOARDED).then(val => [STORAGE_KEYS.HAS_ONBOARDED, val]),
          AsyncStorage.getItem(STORAGE_KEYS.USER).then(val => [STORAGE_KEYS.USER, val]),
          Platform.OS !== 'web' 
            ? SecureStore.getItemAsync(SECURE_STORAGE_KEYS.TOKEN).catch(() => null)
            : AsyncStorage.getItem(SECURE_STORAGE_KEYS.TOKEN).catch(() => null),
        ]);

        if (!isMounted) return;
        setHasOnboarded(onboarded === 'true');

        if (savedUserStr && hasToken) {
          try {
            setUser(JSON.parse(savedUserStr));
          } catch (e) {
            await clearLocalState();
          }
        } else if (savedUserStr || hasToken) {
          await clearLocalState();
        }
      } catch (error) {
        console.error('Error loading initial auth state', error);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    loadState();
    return () => { isMounted = false; };
  }, [clearLocalState]);

  useEffect(() => {
    const handleSessionExpired = () => {
      clearLocalState().catch(error => {
        console.error('[AuthContext] Failed to clear expired session:', error);
      });
    };

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.addEventListener(AUTH_SESSION_EXPIRED_EVENT, handleSessionExpired);
      return () => window.removeEventListener(AUTH_SESSION_EXPIRED_EVENT, handleSessionExpired);
    }

    const subscription = DeviceEventEmitter.addListener(AUTH_SESSION_EXPIRED_EVENT, handleSessionExpired);
    return () => subscription.remove();
  }, [clearLocalState]);

  return useMemo(() => ({
    user,
    hasOnboarded,
    isLoading,
    login,
    signup,
    logout,
    persistAuthPayload,
    clearLocalState,
    ensureAccessToken,
    signInWithGoogle,
    completeOnboarding,
    completeHealthSetup,
    updateUser,
    registerPushNotifications,
  }), [user, hasOnboarded, isLoading, login, signup, logout, persistAuthPayload, clearLocalState, ensureAccessToken, signInWithGoogle, completeOnboarding, completeHealthSetup, updateUser, registerPushNotifications]);
});
