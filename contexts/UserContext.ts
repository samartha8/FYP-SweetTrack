import { createContextHook } from '@/hooks/use-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Linking, Platform } from 'react-native';

export type User = {
  id: string;
  name: string;
  email: string;
  // Health data fields from health setup
  age?: number; // Age category 1-13
  sex?: number; // 0=Female, 1=Male
  height?: number; // cm
  weight?: number; // kg
  bmi?: number; // Calculated BMI
  highBP?: number; // 0=No, 1=Yes
  highChol?: number; // 0=No, 1=Yes
  genHlth?: number; // 1-5 (Excellent to Poor)
  smoker?: number; // 0=No, 1=Yes
  physActivity?: number; // 0=No, 1=Yes
  heartDiseaseOrAttack?: number; // 0=No, 1=Yes
  hba1cEstimated?: number; // Estimated HbA1c %
  bloodGlucoseEstimated?: number; // Estimated blood glucose mg/dL
  healthSetupCompleted?: boolean;
  isGoogleFitConnected?: boolean;
  medicalHistory?: string[];
};

export type HealthMetrics = {
  steps: number;
  water: number;
  sleep: number;
  calories: number;
  heartRateAvg?: number | null;
  bloodGlucose?: number | null;
  bloodPressure?: { systolic: number; diastolic: number } | null;
  weight?: number;
};

export type DailyGoals = {
  steps: number;
  water: number;
  sleep: number;
  calories: number;
};

const STORAGE_KEYS = {
  USER: '@sweettrack_user',
  HAS_ONBOARDED: '@sweettrack_onboarded',
  HAS_HEALTH_SETUP: '@sweettrack_health_setup',
  HEALTH_METRICS: '@sweettrack_health_metrics',
  DAILY_GOALS: '@sweettrack_daily_goals',
  REWARDS_POINTS: '@sweettrack_rewards_points',
  STREAK: '@sweettrack_streak',
  TOKEN: '@sweettrack_token',
  REFRESH_TOKEN: '@sweettrack_refresh_token',
  GOOGLE_FIT_CONNECTED: '@sweettrack_google_fit_connected',
  WATER_INTAKE: '@sweettrack_water_intake',
};

const EXTERNAL_STORAGE_KEYS = ['@sweettrack_settings', '@sweettrack_meal_logs'];

const DEFAULT_HEALTH_METRICS: HealthMetrics = {
  steps: 0,
  water: 0,
  sleep: 0,
  calories: 0,
};

const DEFAULT_DAILY_GOALS: DailyGoals = {
  steps: 10000,
  water: 8,
  sleep: 8,
  calories: 2000,
};

const getExpoProjectId = () => {
  // Try to resolve project ID for push token on EAS/Expo
  // Falls back to undefined which lets Expo try to infer in dev client
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const anyConstants: any = Constants;
  return anyConstants?.expoConfig?.extra?.eas?.projectId || anyConstants?.easConfig?.projectId;
};

// --- Backend API URL ---
const normalizeApiUrl = (url: string) => {
  const trimmed = url.replace(/\/$/, '');
  return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
};

const getApiBaseUrl = () => {
  // Highest priority: explicit env override
  const envBase = process.env.EXPO_PUBLIC_API_BASE_URL || process.env.API_BASE_URL;
  if (envBase) return normalizeApiUrl(envBase);

  // Web: use localhost
  if (Platform.OS === 'web') {
    return 'http://localhost:5000/api';
  }

  // ✅ ANDROID EMULATOR: Must use 10.0.2.2
  if (Platform.OS === 'android') {
    // Check if running on emulator vs physical device
    const isEmulator = Constants.deviceName?.includes('sdk') ||
      Constants.deviceName?.includes('emulator') ||
      !Constants.deviceName; // null deviceName often means emulator

    if (isEmulator) {
      console.log('🤖 Android Emulator detected - Using 10.0.2.2');
      return 'http://10.0.2.2:5000/api';
    }

    // Physical Android device - use network IP from app.json
    const appJsonIP = Constants.expoConfig?.extra?.apiHost;
    if (appJsonIP && appJsonIP !== 'auto-detect') {
      console.log('📱 Android Physical Device - Using:', appJsonIP);
      return `http://${appJsonIP}:5000/api`;
    }
  }

  // iOS Simulator: use localhost
  if (Platform.OS === 'ios') {
    console.log('🍎 iOS Simulator - Using localhost');
    return 'http://localhost:5000/api';
  }

  // Fallback for physical devices
  const appJsonIP = Constants.expoConfig?.extra?.apiHost || '192.168.1.76';
  console.log('📱 Physical Device Fallback - Using:', appJsonIP);
  return `http://${appJsonIP}:5000/api`;
};

const API_BASE_URL = getApiBaseUrl();
const AUTH_URL = `${API_BASE_URL}/auth`;
const GOOGLE_FIT_URL = `${API_BASE_URL}/google-fit`;

// --- User Context ---
export const [UserProvider, useUser] = createContextHook(() => {
  const [user, setUser] = useState<User | null>(null);
  const [hasOnboarded, setHasOnboarded] = useState<boolean>(false);
  const [hasHealthSetup, setHasHealthSetup] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [healthMetrics, setHealthMetrics] = useState<HealthMetrics>(DEFAULT_HEALTH_METRICS);
  const [dailyGoals, setDailyGoals] = useState<DailyGoals>(DEFAULT_DAILY_GOALS);
  const [rewardsPoints, setRewardsPoints] = useState<number>(0);
  const [streak, setStreak] = useState<number>(0);
  const [isGoogleFitConnected, setIsGoogleFitConnected] = useState<boolean>(false);

  const persistAuthPayload = useCallback(async (nextUser: User & { healthData?: any }, accessToken: string, refreshToken: string) => {
    // Flatten healthData if present (from backend)
    let userToSave = { ...nextUser };
    if (nextUser.healthData) {
      const { _id, user: _u, __v, createdAt, updatedAt, ...healthFields } = nextUser.healthData;
      userToSave = { ...userToSave, ...healthFields };
      // Remove the nested healthData object to keep state clean
      delete userToSave.healthData;
    }

    // IMPORTANT: Set state synchronously BEFORE async storage operations
    // This ensures state is updated immediately to prevent navigation issues
    setUser(userToSave);
    setHasHealthSetup(userToSave.healthSetupCompleted || false);
    setIsGoogleFitConnected(userToSave.isGoogleFitConnected || false);
    // Mark onboarding as completed for authenticated users (they've seen the login screen)
    setHasOnboarded(true);

    // Store in AsyncStorage (async, but state is already set above)
    await AsyncStorage.multiSet([
      [STORAGE_KEYS.USER, JSON.stringify(userToSave)],
      [STORAGE_KEYS.TOKEN, accessToken],
      [STORAGE_KEYS.REFRESH_TOKEN, refreshToken],
      [STORAGE_KEYS.HAS_ONBOARDED, 'true'], // Mark onboarding as complete
      [STORAGE_KEYS.HAS_HEALTH_SETUP, userToSave.healthSetupCompleted ? 'true' : 'false'], // Store health setup status
    ]);

    if (__DEV__) {
      console.log('✅ Auth payload persisted. User:', userToSave.email, 'Onboarded: true', 'HealthSetup:', userToSave.healthSetupCompleted);
    }
  }, []);

  const clearLocalState = useCallback(async () => {
    const keysToClear = [
      ...Object.values(STORAGE_KEYS),
      ...EXTERNAL_STORAGE_KEYS,
    ];

    await AsyncStorage.multiRemove(keysToClear);
    setUser(null);
    setHasOnboarded(false);
    setHasHealthSetup(false);
    setHealthMetrics(DEFAULT_HEALTH_METRICS);
    setDailyGoals(DEFAULT_DAILY_GOALS);
    setRewardsPoints(0);
    setStreak(0);
    setIsGoogleFitConnected(false);
  }, []);

  const refreshSession = useCallback(async (refreshTokenOverride?: string) => {
    const refreshToken = refreshTokenOverride || await AsyncStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
    if (!refreshToken) {
      // No refresh token - clear any stale tokens
      await clearLocalState();
      return { success: false, message: 'No refresh token available' };
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 sec timeout

      const res = await fetch(`${AUTH_URL}/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      const data = await res.json();

      if (!res.ok || !data.success) {
        // Only clear state if explicitly unauthorized or invalid token
        if (res.status === 401 || res.status === 403 || data.errorCode === 'INVALID_REFRESH_TOKEN' || data.errorCode === 'INVALID_SIGNATURE') {
          console.warn('Session expired or invalid - clearing state.');
          await clearLocalState();
          return { success: false, message: 'Session expired. Please login again.', errorCode: data.errorCode || 'INVALID_TOKEN' };
        }

        // For other errors (500s, etc), keep local state but return failure
        console.warn('Refresh failed but session might still be valid locally:', data.message);
        return { success: false, message: data.message || 'Unable to refresh session', errorCode: undefined };
      }

      await persistAuthPayload(data.user, data.token, data.refreshToken);
      return { success: true, token: data.token, errorCode: undefined };
    } catch (error) {
      console.error('Error refreshing session:', error);
      // DO NOT clear local state on network error/timeout
      return { success: false, message: 'Network error. Offline mode.', errorCode: 'NETWORK_ERROR' };
    }
  }, [clearLocalState, persistAuthPayload]);

  const loadUserData = useCallback(async () => {
    try {
      const [
        storedUser,
        storedOnboarded,
        storedHealthSetup,
        storedMetrics,
        storedGoals,
        storedPoints,
        storedStreak,
        storedGoogleFit,
        storedRefreshToken,
      ] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.USER),
        AsyncStorage.getItem(STORAGE_KEYS.HAS_ONBOARDED),
        AsyncStorage.getItem(STORAGE_KEYS.HAS_HEALTH_SETUP),
        AsyncStorage.getItem(STORAGE_KEYS.HEALTH_METRICS),
        AsyncStorage.getItem(STORAGE_KEYS.DAILY_GOALS),
        AsyncStorage.getItem(STORAGE_KEYS.REWARDS_POINTS),
        AsyncStorage.getItem(STORAGE_KEYS.STREAK),
        AsyncStorage.getItem(STORAGE_KEYS.GOOGLE_FIT_CONNECTED),
        AsyncStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN),
      ]);

      // Default hasOnboarded to false if not found
      if (storedOnboarded) {
        setHasOnboarded(JSON.parse(storedOnboarded));
      } else {
        setHasOnboarded(false);
      }
      if (storedHealthSetup) setHasHealthSetup(JSON.parse(storedHealthSetup));
      if (storedMetrics) setHealthMetrics(JSON.parse(storedMetrics));
      if (storedGoals) setDailyGoals(JSON.parse(storedGoals));
      if (storedPoints) setRewardsPoints(JSON.parse(storedPoints));
      if (storedStreak) setStreak(JSON.parse(storedStreak));
      if (storedGoogleFit) setIsGoogleFitConnected(JSON.parse(storedGoogleFit));

      if (storedRefreshToken) {
        const refreshed = await refreshSession(storedRefreshToken);
        if (!refreshed.success) {
          // If refresh failed due to invalid signature, tokens are already cleared
          // Don't restore user - they need to login again
          if (refreshed.errorCode === 'INVALID_SIGNATURE') {
            // User state already cleared by refreshSession, just ensure it stays null
            setUser(null);
            setHasHealthSetup(false);
          } else if (storedUser) {
            // Other errors - might be temporary, restore user but they'll need to refresh
            const parsedUser = JSON.parse(storedUser);
            setUser(parsedUser);
            setHasHealthSetup(parsedUser.healthSetupCompleted || false);
          }
        }
        // If refresh succeeded, user is already set by persistAuthPayload in refreshSession
      } else if (storedUser) {
        // No refresh token but user exists - might be from before token system
        // Clear everything and require login
        await clearLocalState();
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [refreshSession, clearLocalState]);

  useEffect(() => {
    loadUserData();
  }, [loadUserData]);

  // --- Helper: Validate inputs ---
  const validateSignupInputs = (name: string, email: string, password: string) => {
    if (!name || !email || !password) return 'All fields are required.';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return 'Invalid email format.';
    if (password.length < 6) return 'Password must be at least 6 characters.';
    return null;
  };

  // --- LOGIN ---
  const login = useCallback(async (email: string, password: string) => {
    try {
      await clearLocalState(); // wipe any stale session first

      // Add timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const res = await fetch(`${AUTH_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const data = await res.json();

      if (!res.ok || !data.success) {
        const message = data.message || 'Login failed. Please try again.';
        console.warn('Login failed:', message);
        return { success: false, message };
      }

      await persistAuthPayload(data.user, data.token, data.refreshToken);
      return { success: true };
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.error('Login request timed out');
        return { success: false, message: 'Request timed out. Please check your connection and try again.' };
      }
      console.error('Error logging in:', error);
      return { success: false, message: 'Network or server error. Please ensure backend is running.' };
    }
  }, [clearLocalState, persistAuthPayload]);

  // --- SIGNUP ---
  const signup = useCallback(async (name: string, email: string, password: string) => {
    const validationError = validateSignupInputs(name, email, password);
    if (validationError) return { success: false, message: validationError };

    try {
      await clearLocalState(); // ensure old account data is cleared before new signup

      // Add timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      if (__DEV__) {
        console.log('📡 Signup request to:', `${AUTH_URL}/signup`);
      }

      const res = await fetch(`${AUTH_URL}/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const data = await res.json();

      if (!res.ok || !data.success) {
        const message = data.message || 'Signup failed. Please try again.';
        console.warn('Signup failed:', message);
        return { success: false, message };
      }

      await persistAuthPayload(data.user, data.token, data.refreshToken);
      setHasHealthSetup(false);
      return { success: true };
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.error('Signup request timed out');
        return { success: false, message: 'Request timed out. Please check:\n1. Backend server is running\n2. Phone and computer are on same Wi-Fi\n3. Firewall allows connections' };
      }
      console.error('Error signing up:', error);
      return { success: false, message: 'Network or server error. Please ensure backend is running on port 5000.' };
    }
  }, [clearLocalState, persistAuthPayload]);

  // --- GOOGLE SIGN-IN ---
  const signInWithGoogle = useCallback(async () => {
    try {
      await clearLocalState(); // Clear any existing session

      // Step 1: Construct Google OAuth URL
      const googleAuthUrl = `${AUTH_URL}/google`;

      if (__DEV__) {
        console.log('🔐 Opening Google Sign-In:', googleAuthUrl);
      }

      // Step 2: Open OAuth flow in system browser
      const result = await WebBrowser.openAuthSessionAsync(
        googleAuthUrl,
        'diabetesapp://auth/callback'
      );

      if (result.type === 'cancel') {
        if (__DEV__) {
          console.log('ℹ️  User cancelled Google Sign-In');
        }
        return { success: false, message: 'Sign-in cancelled' };
      }

      if (result.type !== 'success') {
        console.error('❌ Google Sign-In failed:', result);
        return { success: false, message: 'Google Sign-In failed. Please try again.' };
      }

      // Step 3: Extract tokens from callback URL
      // Format: diabetesapp://auth/callback?token=xxx&refreshToken=yyy&needsHealthSetup=true
      const url = result.url;
      if (__DEV__) {
        console.log('📱 Received callback from Google OAuth');
      }

      const queryStart = url.indexOf('?');
      if (queryStart === -1) {
        console.error('❌ No query parameters in callback URL');
        return { success: false, message: 'Invalid callback URL' };
      }

      const params = new URLSearchParams(url.substring(queryStart + 1));

      const token = params.get('token');
      const refreshToken = params.get('refreshToken');
      const needsHealthSetup = params.get('needsHealthSetup') === 'true';

      if (!token || !refreshToken) {
        console.error('❌ Missing tokens in callback URL');
        return { success: false, message: 'Authentication tokens not received' };
      }

      if (__DEV__) {
        console.log('✅ Tokens received successfully');
      }

      // Step 4: Get user data with the token
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      try {
        const userRes = await fetch(`${AUTH_URL}/me`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (!userRes.ok) {
          console.error('❌ Failed to fetch user data:', userRes.status);
          return { success: false, message: 'Failed to fetch user data' };
        }

        const userData = await userRes.json();

        if (!userData.success || !userData.user) {
          console.error('❌ Invalid user data received');
          return { success: false, message: 'Invalid user data' };
        }

        // Step 5: Save auth data to local storage
        await persistAuthPayload(userData.user, token, refreshToken);

        if (__DEV__) {
          console.log('✅ Google Sign-In successful:', userData.user.email);
          console.log('   - Needs health setup:', needsHealthSetup);
        }

        return {
          success: true,
          user: userData.user,
          needsHealthSetup
        };

      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        if (fetchError.name === 'AbortError') {
          return { success: false, message: 'Request timed out. Please try again.' };
        }
        throw fetchError;
      }

    } catch (error: any) {
      console.error('❌ Google Sign-In error:', error);
      return {
        success: false,
        message: error.message || 'Google Sign-In failed. Please try again.'
      };
    }
  }, [clearLocalState, persistAuthPayload]);

  // --- LOGOUT ---
  const logout = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.TOKEN);
      if (token) {
        await fetch(`${AUTH_URL}/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        }).catch(() => {
          // ignore network errors; still clear local state
        });
      }
      await clearLocalState();
      return { success: true };
    } catch (error) {
      console.error('Error logging out:', error);
      await clearLocalState();
      return { success: false, message: 'Logout failed locally' };
    }
  }, [clearLocalState]);

  const ensureAccessToken = useCallback(async () => {
    // First, try to get the current token
    const currentToken = await AsyncStorage.getItem(STORAGE_KEYS.TOKEN);

    // If no token, try to refresh
    if (!currentToken) {
      const refreshed = await refreshSession();
      if (refreshed.success) {
        return await AsyncStorage.getItem(STORAGE_KEYS.TOKEN);
      }
      // If refresh failed due to signature error, tokens are already cleared
      return null;
    }

    // Token exists - return it immediately.
    // We TRUST that if it's expired, the API call using it will fail (401),
    // and the specific component can handle the logout or retry if needed.
    // Automatically refreshing here causes an infinite loop because:
    // refresh -> setUser -> Component Re-render -> ensureAccessToken -> refresh...
    return currentToken;
  }, [refreshSession]);

  // --- REST FUNCTIONS REMAIN UNCHANGED ---
  const completeOnboarding = useCallback(async () => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.HAS_ONBOARDED, JSON.stringify(true));
      setHasOnboarded(true);
    } catch (error) {
      console.error('Error completing onboarding:', error);
    }
  }, []);

  const completeHealthSetup = useCallback(async () => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.HAS_HEALTH_SETUP, JSON.stringify(true));
      setHasHealthSetup(true);
      if (user) {
        await updateUser({ healthSetupCompleted: true });
      }
    } catch (error) {
      console.error('Error completing health setup:', error);
    }
  }, [user]);

  const resetOnboarding = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.HAS_ONBOARDED);
      await AsyncStorage.removeItem(STORAGE_KEYS.HAS_HEALTH_SETUP);
      setHasOnboarded(false);
      setHasHealthSetup(false);
    } catch (error) {
      console.error('Error resetting onboarding:', error);
    }
  }, []);

  const updateUser = useCallback(async (updates: Partial<User>) => {
    const currentUser = user || { id: '', name: '', email: '' };
    const updatedUser = { ...currentUser, ...updates };
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(updatedUser));
      setUser(updatedUser);
    } catch (error) {
      console.error('Error updating user:', error);
    }
  }, [user]);

  const addRewardPoints = useCallback(async (points: number) => {
    setRewardsPoints(prev => {
      const newPoints = prev + points;
      AsyncStorage.setItem(STORAGE_KEYS.REWARDS_POINTS, JSON.stringify(newPoints));
      return newPoints;
    });
  }, []);

  const incrementStreak = useCallback(async () => {
    setStreak(prev => {
      const newStreak = prev + 1;
      AsyncStorage.setItem(STORAGE_KEYS.STREAK, JSON.stringify(newStreak));
      return newStreak;
    });
  }, []);

  const checkGoalsCompletion = useCallback((metrics: HealthMetrics, goals: DailyGoals) => {
    const goalsCompleted =
      metrics.steps >= goals.steps &&
      metrics.water >= goals.water &&
      metrics.sleep >= goals.sleep;

    if (goalsCompleted) {
      addRewardPoints(50);
      incrementStreak();
    }
  }, [addRewardPoints, incrementStreak]);

  const updateHealthMetrics = useCallback(async (updates: Partial<HealthMetrics>) => {
    setHealthMetrics(prev => {
      const updatedMetrics = { ...prev, ...updates };
      AsyncStorage.setItem(STORAGE_KEYS.HEALTH_METRICS, JSON.stringify(updatedMetrics));
      checkGoalsCompletion(updatedMetrics, dailyGoals);
      return updatedMetrics;
    });
  }, [dailyGoals, checkGoalsCompletion]);

  const updateDailyGoals = useCallback(async (updates: Partial<DailyGoals>) => {
    setDailyGoals(prev => {
      const updatedGoals = { ...prev, ...updates };
      AsyncStorage.setItem(STORAGE_KEYS.DAILY_GOALS, JSON.stringify(updatedGoals));
      return updatedGoals;
    });
  }, []);

  const resetDailyMetrics = useCallback(async () => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.HEALTH_METRICS, JSON.stringify(DEFAULT_HEALTH_METRICS));
      setHealthMetrics(DEFAULT_HEALTH_METRICS);
    } catch (error) {
      console.error('Error resetting daily metrics:', error);
    }
  }, []);

  const setWater = useCallback(async (glasses: number) => {
    setHealthMetrics(prev => {
      const updated = { ...prev, water: glasses };
      AsyncStorage.setItem(STORAGE_KEYS.HEALTH_METRICS, JSON.stringify(updated));
      return updated;
    });

    try {
      const token = await ensureAccessToken();
      if (!token) return;
      await fetch(`${API_BASE_URL}/notifications/water`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ water: glasses })
      });
    } catch (error) {
      console.error('Error updating water intake:', error);
    }
  }, [ensureAccessToken]);

  const registerPushNotifications = useCallback(async () => {
    if (Platform.OS === 'web') {
      return { success: false, message: 'Push notifications not supported on web' };
    }

    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        return { success: false, message: 'Notification permission not granted' };
      }

      const projectId = getExpoProjectId();
      const tokenResult = await Notifications.getExpoPushTokenAsync(
        projectId ? { projectId } : undefined
      );
      const expoToken = tokenResult.data;

      const authToken = await ensureAccessToken();
      if (!authToken) {
        return { success: false, message: 'Not authenticated' };
      }

      const res = await fetch(`${API_BASE_URL}/notifications/push-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          token: expoToken,
          platform: Platform.OS,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, message: data.message || 'Failed to register push token' };
      }

      return { success: true, token: expoToken };
    } catch (error) {
      console.error('Push registration error:', error);
      return { success: false, message: 'Push registration failed' };
    }
  }, [ensureAccessToken]);

  const connectGoogleFit = useCallback(async () => {
    try {
      const token = await ensureAccessToken();
      if (!token) {
        return { success: false, message: 'Please log in again.' };
      }

      const res = await fetch(`${GOOGLE_FIT_URL}/connect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await res.json();

      if (res.ok && data.success && data.authorizationUrl) {
        await Linking.openURL(data.authorizationUrl);
        return { success: true };
      }

      // Check if it's a signature error
      if (data.errorCode === 'INVALID_SIGNATURE') {
        console.warn('Token signature invalid - clearing tokens');
        await clearLocalState();
        return { success: false, message: 'Session invalid. Please login again.' };
      }

      console.error('Google Fit connection failed:', data.message);
      return { success: false, message: data.message || 'Not authorized or token failed' };
    } catch (error) {
      console.error('Error connecting Google Fit:', error);
      return { success: false, message: 'Unable to connect Google Fit' };
    }
  }, [ensureAccessToken, clearLocalState]);

  const disconnectGoogleFit = useCallback(async () => {
    try {
      const token = await ensureAccessToken();
      if (!token) return;

      const res = await fetch(`${GOOGLE_FIT_URL}/disconnect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await res.json();

      if (data.success) {
        setIsGoogleFitConnected(false);
        await AsyncStorage.setItem(STORAGE_KEYS.GOOGLE_FIT_CONNECTED, JSON.stringify(false));
        if (user) {
          setUser({ ...user, isGoogleFitConnected: false });
        }
      } else {
        console.error('Google Fit disconnection failed:', data.message);
      }
    } catch (error) {
      console.error('Error disconnecting Google Fit:', error);
    }
  }, [ensureAccessToken, user]);

  const syncGoogleFitData = useCallback(async () => {
    try {
      const token = await ensureAccessToken();
      if (!token) {
        return { success: false, message: 'Please log in again.' };
      }

      const res = await fetch(`${GOOGLE_FIT_URL}/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await res.json();

      if (res.ok && data.success && data.data) {
        // Update health metrics with synced data
        await updateHealthMetrics({
          steps: data.data.steps || 0,
          calories: data.data.calories || 0,
          sleep: data.data.sleep || 0,
          heartRateAvg: data.data.heartRateAvg || null,
          bloodGlucose: data.data.bloodGlucose || null,
          bloodPressure: data.data.bloodPressure || null,
        });
        return { success: true, data: data.data };
      }

      // Check if it's a signature error
      if (data.errorCode === 'INVALID_SIGNATURE') {
        console.warn('Token signature invalid - clearing tokens');
        await clearLocalState();
        return { success: false, message: 'Session invalid. Please login again.' };
      }

      console.error('Google Fit sync failed:', data.message);
      return { success: false, message: data.message || 'Failed to sync Google Fit data' };
    } catch (error) {
      console.error('Error syncing Google Fit data:', error);
      return { success: false, message: 'Unable to sync Google Fit data' };
    }
  }, [ensureAccessToken, updateHealthMetrics, clearLocalState]);

  // Handle OAuth callbacks and Google Fit deep links
  useEffect(() => {
    const handleDeepLink = async (url: string) => {
      if (__DEV__) {
        console.log('🔗 Deep link received:', url);
      }

      // Handle auth callbacks (Google Sign-In)
      if (url.includes('diabetesapp://auth/')) {
        // Handle errors
        if (url.includes('diabetesapp://auth/error')) {
          const queryStart = url.indexOf('?');
          if (queryStart !== -1) {
            const params = new URLSearchParams(url.substring(queryStart + 1));
            const message = params.get('message') || 'Authentication failed';
            console.error('❌ Auth error from deep link:', message);
          }
          return;
        }

        // Handle successful callback
        if (url.includes('diabetesapp://auth/callback')) {
          try {
            const queryStart = url.indexOf('?');
            if (queryStart === -1) {
              console.error('❌ No query parameters in deep link');
              return;
            }

            const params = new URLSearchParams(url.substring(queryStart + 1));

            const token = params.get('token');
            const refreshToken = params.get('refreshToken');

            if (!token || !refreshToken) {
              console.error('❌ Missing tokens in deep link');
              return;
            }

            if (__DEV__) {
              console.log('✅ Tokens found in deep link, fetching user data...');
            }

            // Get user data
            const userRes = await fetch(`${AUTH_URL}/me`, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            });

            if (!userRes.ok) {
              console.error('❌ Failed to fetch user after deep link');
              return;
            }

            const userData = await userRes.json();

            if (!userData.success || !userData.user) {
              console.error('❌ Invalid user data in deep link');
              return;
            }

            // Save auth data
            await persistAuthPayload(userData.user, token, refreshToken);

            if (__DEV__) {
              console.log('✅ Deep link auth successful:', userData.user.email);
            }
          } catch (error) {
            console.error('❌ Deep link handling error:', error);
          }
        }
        return; // Exit after handling auth callback
      }

      // Handle Google Fit callbacks
      if (url.includes('google-fit-connected')) {
        try {
          const urlParts = url.split('?');
          const queryString = urlParts[1] || '';
          const params = new URLSearchParams(queryString);
          const success = params.get('success');
          const error = params.get('error');

          if (success === 'true') {
            // Connection successful - update status and sync data
            setIsGoogleFitConnected(true);
            await AsyncStorage.setItem(STORAGE_KEYS.GOOGLE_FIT_CONNECTED, JSON.stringify(true));

            if (user) {
              setUser({ ...user, isGoogleFitConnected: true });
            }

            // Sync data immediately after connection
            await syncGoogleFitData();
          } else if (success === 'false') {
            // Connection failed
            const errorMessage = error ? decodeURIComponent(error) : 'Google Fit connection failed';
            console.error('Google Fit connection error:', errorMessage);
          }
        } catch (err) {
          console.error('Error handling Google Fit deep link:', err);
        }
      }
    };

    // Listen for deep links when app is open
    const subscription = Linking.addEventListener('url', (event) => {
      handleDeepLink(event.url);
    });

    // Check if app was opened from deep link
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink(url);
      }
    });

    return () => {
      subscription.remove();
    };
  }, [user, syncGoogleFitData, persistAuthPayload]);

  return useMemo(() => ({
    user,
    hasOnboarded,
    hasHealthSetup,
    isLoading,
    healthMetrics,
    dailyGoals,
    rewardsPoints,
    streak,
    isGoogleFitConnected,
    setWater,
    registerPushNotifications,
    completeOnboarding,
    completeHealthSetup,
    login,
    signup,
    signInWithGoogle,
    logout,
    resetOnboarding,
    updateUser,
    updateHealthMetrics,
    updateDailyGoals,
    addRewardPoints,
    resetDailyMetrics,
    connectGoogleFit,
    disconnectGoogleFit,
    syncGoogleFitData,
    ensureAccessToken,
  }), [
    user,
    hasOnboarded,
    hasHealthSetup,
    isLoading,
    healthMetrics,
    dailyGoals,
    rewardsPoints,
    streak,
    isGoogleFitConnected,
    setWater,
    registerPushNotifications,
    completeOnboarding,
    completeHealthSetup,
    login,
    signup,
    signInWithGoogle,
    logout,
    resetOnboarding,
    updateUser,
    updateHealthMetrics,
    updateDailyGoals,
    addRewardPoints,
    resetDailyMetrics,
    connectGoogleFit,
    disconnectGoogleFit,
    syncGoogleFitData,
    ensureAccessToken,
  ]);
});