import { createContextHook } from '../hooks/use-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as WebBrowser from 'expo-web-browser';
import * as ExpoLinking from 'expo-linking';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Linking, Platform } from 'react-native';
import {
  AUTH_URL,
  GOOGLE_FIT_URL,
  API_BASE_URL,
  HEALTH_URL
} from '../constants/Api';

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
  rewardsPoints?: number;
  streak?: number;
  unlockedBadges?: string[];
};

export type HealthMetrics = {
  steps: number;
  water: number;
  sleep: number;
  calories: number;
  caloriesConsumed?: number;
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
  caloriesConsumed: 0,
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
// --- User Context ---

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
  const [unlockedBadges, setUnlockedBadges] = useState<string[]>([]);
  const [isGoogleFitConnected, setIsGoogleFitConnected] = useState<boolean>(false);
  
  // Single-flight refresh coordination
  const refreshPromise = useMemo(() => ({ current: null as Promise<{ success: boolean; token?: string; errorCode?: string; message?: string }> | null }), []);
  
  // Track user ID in a ref to avoid dependency loops in callbacks
  const userIdRef = useMemo(() => ({ current: null as string | null }), []);
  
  // Track processed URLs to prevent infinite loops on Web (handles Linking.getInitialURL() behavior)
  const processedUrlsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    userIdRef.current = user?.id || null;
  }, [user?.id]);

  const persistAuthPayload = useCallback(async (nextUser: User & { healthData?: any }, accessToken: string, refreshToken: string) => {
    // Flatten healthData if present (from backend)
    let userToSave: any = { ...nextUser };
    const healthObj = typeof nextUser.healthData === 'object' ? nextUser.healthData : {};
    const { _id, id: _hid, user: _u, __v, createdAt, updatedAt, ...healthFields } = healthObj;
    
    // Ensure id exists (map from _id if necessary)
    const userId = nextUser.id || (nextUser as any)._id;
    
    userToSave = { 
      ...userToSave, 
      id: userId,
      ...healthFields 
    };

    // Safety check: ensure name is never empty if it existed before
    if (!userToSave.name && nextUser.name) {
      userToSave.name = nextUser.name;
    }

    // IMPORTANT: Set state synchronously BEFORE async storage operations
    // This ensures state is updated immediately to prevent navigation issues
    setUser(userToSave);
    setHasHealthSetup(userToSave.healthSetupCompleted || false);
    setIsGoogleFitConnected(userToSave.isGoogleFitConnected || false);
    setRewardsPoints(userToSave.rewardsPoints || 0);
    setStreak(userToSave.streak || 0);
    setUnlockedBadges(userToSave.unlockedBadges || []);
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
    // Get current user ID from ref to avoid dependency loop
    const currentUserId = userIdRef.current;

    const keysToClear = [
      ...Object.values(STORAGE_KEYS),
      ...EXTERNAL_STORAGE_KEYS,
    ];

    if (currentUserId) {
      keysToClear.push(`@sweettrack_meal_logs_${currentUserId}`);
    }

    if (__DEV__) console.log('🧹 Clearing local auth state');
    
    await AsyncStorage.multiRemove(keysToClear);
    setUser(null);
    setHasOnboarded(false);
    setHasHealthSetup(false);
    setHealthMetrics(DEFAULT_HEALTH_METRICS);
    setDailyGoals(DEFAULT_DAILY_GOALS);
    setRewardsPoints(0);
    setStreak(0);
    setIsGoogleFitConnected(false);
  }, []); // Empty dependencies - use refs for dynamic values

  const refreshSession = useCallback(async (refreshTokenOverride?: string) => {
    // If a refresh is already in progress, return the existing promise
    if (refreshPromise.current) {
      return refreshPromise.current;
    }

    const performRefresh = async () => {
      const refreshToken = refreshTokenOverride || await AsyncStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
      if (!refreshToken) {
        await clearLocalState();
        return { success: false, message: 'No refresh token available' };
      }

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        console.log(`[X-Ray] Refreshing session via: ${AUTH_URL}/refresh`);
        const res = await fetch(`${AUTH_URL}/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        const rawText = await res.text();
        let data;
        try {
          data = JSON.parse(rawText);
        } catch (e) {
          console.error(`❌ [X-Ray] JSON Parse Failed. Response from server was: "${rawText}"`);
          return { success: false, message: 'Server returned invalid response', errorCode: 'SERVER_ERROR' };
        }

        if (!res.ok || !data.success) {
          if (res.status === 401 || res.status === 403 || data.errorCode === 'INVALID_REFRESH_TOKEN' || data.errorCode === 'INVALID_SIGNATURE' || data.errorCode === 'VERSION_MISMATCH') {
            console.warn(`Session expired or invalid (${data.errorCode || res.status}) - clearing state.`);
            await clearLocalState();
            return { success: false, message: 'Session expired. Please login again.', errorCode: data.errorCode || 'INVALID_TOKEN' };
          }
          return { success: false, message: data.message || 'Unable to refresh session', errorCode: undefined };
        }

        await persistAuthPayload(data.user, data.token, data.refreshToken);
        return { success: true, token: data.token, errorCode: undefined };
      } catch (error) {
        console.error('Error refreshing session:', error);
        return { success: false, message: 'Network error. Offline mode.', errorCode: 'NETWORK_ERROR' };
      } finally {
        // Clear the promise ref when done
        refreshPromise.current = null;
      }
    };

    refreshPromise.current = performRefresh();
    return refreshPromise.current;
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
          if (refreshed.errorCode === 'INVALID_SIGNATURE' || refreshed.errorCode === 'INVALID_TOKEN' || refreshed.errorCode === 'TOKEN_EXPIRED' || refreshed.errorCode === 'VERSION_MISMATCH') {
            // User state already cleared by refreshSession, just ensure it stays null
            setUser(null);
            setHasHealthSetup(false);
          } else if (storedUser) {
            // Other errors (like Network Offline) - might be temporary, restore user but they'll need to refresh
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

      // Step 1: Construct return URL dynamically so it works in Expo Go (exp://) or Production (diabetesapp://)
      const returnUrl = ExpoLinking.createURL('auth/callback');

      // Step 2: Pass returnUrl to the backend via query parameter
      const googleAuthUrl = `${AUTH_URL}/google?returnUrl=${encodeURIComponent(returnUrl)}`;

      if (__DEV__) {
        console.log('🔐 Opening Google Sign-In:', googleAuthUrl);
        console.log('🔙 Expecting return URL:', returnUrl);
      }

      // Step 3: Open OAuth flow in system browser
      const result = await WebBrowser.openAuthSessionAsync(
        googleAuthUrl,
        returnUrl
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

      // Step 4: Extract tokens from the dynamic callback URL returned by WebBrowser
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

  const ensureAccessToken = useCallback(async (forceRefresh = false) => {
    // Helper to check if token is expired
    const isTokenExpired = (token: string) => {
      try {
        const parts = token.split('.');
        if (parts.length !== 3) return true;
        
        // Use a simple base64 decoder for JWT payload
        const base64Url = parts[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
          (Platform.OS === 'web' ? atob(base64) : require('buffer').Buffer.from(base64, 'base64').toString('binary'))
            .split('')
            .map((c: string) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
            .join('')
        );
        
        const payload = JSON.parse(jsonPayload);
        const now = Math.floor(Date.now() / 1000);
        
        // Refresh if within 1 minute of expiry
        return payload.exp && payload.exp < (now + 60);
      } catch (e) {
        console.warn('⚠️ Token expiration check failed:', e);
        return true; // Conservative approach: treat as expired if check fails
      }
    };

    // First, try to get the current token
    const currentToken = await AsyncStorage.getItem(STORAGE_KEYS.TOKEN);

    // If no token or forced refresh or expired
    const expired = currentToken ? isTokenExpired(currentToken) : true;
    if (!currentToken || forceRefresh || expired) {
      if (__DEV__) {
        console.log(`🔐 [Auth] Token Refresh Check: ${!currentToken ? 'No Token' : forceRefresh ? 'Forced' : 'Expired'}`);
      }
      
      const refreshed = await refreshSession();
      if (refreshed.success) {
        return await AsyncStorage.getItem(STORAGE_KEYS.TOKEN);
      }
      return null;
    }

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
    try {
      // 1. Update local state immediately for better UI responsiveness
      setUser(prev => {
        if (!prev) return prev;

        // Check if updates actually change anything
        const hasChanges = Object.entries(updates).some(([key, value]) => {
          return prev[key as keyof User] !== value;
        });

        if (!hasChanges) return prev;

        const updatedUser = { ...prev, ...updates };
        
        // 1.1 Calculate BMI if height or weight change
        if (updates.height !== undefined || updates.weight !== undefined) {
          const h = parseFloat(updatedUser.height?.toString() || '0');
          const w = parseFloat(updatedUser.weight?.toString() || '0');
          if (h > 80 && w > 25 && w < 400) {
            const hMeters = h / 100;
            const bmiCalculated = Number((w / (hMeters * hMeters)).toFixed(1));
            // Only update if it's a valid human BMI range
            if (bmiCalculated >= 12 && bmiCalculated <= 98) {
              updatedUser.bmi = bmiCalculated;
            }
          }
        }

        if (__DEV__) {
          console.log('👤 [UserContext] updateUser (Local):', updates);
        }

        // 1.2 Auto-calculate HbA1c and Glucose if relevant fields change
        const derivedFields = ['bmi', 'age', 'genHlth', 'highChol', 'highBP'];
        const shouldRecalculate = Object.keys(updates).some(key => derivedFields.includes(key)) || updates.height !== undefined || updates.weight !== undefined;
        
        if (shouldRecalculate) {
          const bmi = parseFloat(updatedUser.bmi?.toString() || '0');
          const age = parseFloat(updatedUser.age?.toString() || '0');
          const genHlth = parseFloat(updatedUser.genHlth?.toString() || '0');
          const highChol = parseFloat(updatedUser.highChol?.toString() || '0');
          const highBP = parseFloat(updatedUser.highBP?.toString() || '0');

          if (bmi > 0 && age > 0 && genHlth > 0) {
            // HbA1c
            const hba1c = 4.5 + (bmi - 25) * 0.03 + (age - 7) * 0.15 + genHlth * 0.4 + highChol * 0.8 + highBP * 0.6;
            updatedUser.hba1cEstimated = Number(Math.max(3.5, Math.min(15.0, hba1c)).toFixed(2));
            
            // Glucose
            const glucose = 85 + (bmi - 25) * 1.2 + (age - 7) * 3.0 + genHlth * 8 + highChol * 15 + highBP * 12;
            updatedUser.bloodGlucoseEstimated = Number(Math.max(70, Math.min(300, glucose)).toFixed(1));
          }
        }

        // Preserve name if it was present in prev but missing/empty in updates
        if (prev.name && !updatedUser.name) {
          updatedUser.name = prev.name;
        }


        // Sync to storage
        AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(updatedUser)).catch(e =>
          console.error('Error syncing user to storage:', e)
        );
        return updatedUser;
      });

      // 2. Persist to backend
      const authFields = ['name', 'email'];
      const healthFields = [
        'age', 'sex', 'height', 'weight', 'bmi', 'highBP', 'highChol', 
        'genHlth', 'smoker', 'physActivity', 'heartDiseaseOrAttack', 
        'hba1cEstimated', 'bloodGlucoseEstimated', 'medicalHistory'
      ];

      const authUpdates: any = {};
      const healthUpdates: any = {};

      Object.entries(updates).forEach(([key, value]) => {
        if (authFields.includes(key)) authUpdates[key] = value;
        if (healthFields.includes(key)) healthUpdates[key] = value;
      });

      const persistToBackend = async (retryLimit = 1) => {
        try {
          let token = await ensureAccessToken();
          if (!token) return;

          let authSuccess = true;
          let healthSuccess = true;

          // Update Profile (Name/Email)
          if (Object.keys(authUpdates).length > 0) {
            const authRes = await fetch(`${AUTH_URL}/profile`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify(authUpdates)
            });
            if (authRes.status === 401) authSuccess = false;
          }

          // Update Health Data
          if (Object.keys(healthUpdates).length > 0) {
            const healthRes = await fetch(`${HEALTH_URL}`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify(healthUpdates)
            });
            if (healthRes.status === 401) healthSuccess = false;
          }

          // If either failed with 401, retry once
          if ((!authSuccess || !healthSuccess) && retryLimit > 0) {
            if (__DEV__) console.warn('👤 [UserContext] updateUser 401 - refreshing token and retrying...');
            token = await ensureAccessToken(true); // Force refresh
            if (token) {
              await persistToBackend(retryLimit - 1);
            }
          }
        } catch (e) {
          console.error('Error persisting updates to backend:', e);
        }
      };

      await persistToBackend();
    } catch (error) {
      console.error('Error updating user state:', error);
    }
  }, [ensureAccessToken]);


  const syncRewards = useCallback(async (retryLimit = 1) => {
    let token = await ensureAccessToken();
    if (!token) return;
    try {
      const response = await fetch(`${API_BASE_URL}/rewards/sync`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.status === 401 && retryLimit > 0) {
        token = await ensureAccessToken(true);
        if (token) return syncRewards(retryLimit - 1);
      }

      const data = await response.json();
      if (data.success) {
        setRewardsPoints(data.rewardsPoints);
        setStreak(data.streak);
        setUnlockedBadges(data.unlockedBadges);
      }
    } catch (e) {
      console.error('Failed to sync rewards:', e);
    }
  }, [ensureAccessToken]);

  const addRewardPoints = useCallback(async (actionType: 'DAILY_LOGIN' | 'LOG_MEAL' | 'HEALTH_PREDICTION' | 'HIT_GOAL', retryLimit = 1) => {
    let token = await ensureAccessToken();
    if (!token) return;
    try {
      const response = await fetch(`${API_BASE_URL}/rewards/award`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ actionType })
      });
      
      if (response.status === 401 && retryLimit > 0) {
        token = await ensureAccessToken(true);
        if (token) return addRewardPoints(actionType, retryLimit - 1);
      }

      const data = await response.json();
      if (data.success) {
        setRewardsPoints(data.rewardsPoints);
        setUnlockedBadges(data.unlockedBadges);
        
        // Return information if they unlocked a new badge or gained points
        return {
          pointsGained: data.message.match(/\d+/) ? parseInt(data.message.match(/\d+/)[0]) : 0,
          newBadges: data.newBadges || []
        };
      }
    } catch(e) {
      console.error('Failed to award points:', e);
    }
    return null;
  }, [ensureAccessToken]);

  const checkGoalsCompletion = useCallback((metrics: HealthMetrics, goals: DailyGoals) => {
    const goalsCompleted =
      metrics.steps >= goals.steps &&
      metrics.water >= goals.water &&
      metrics.sleep >= goals.sleep;

    if (goalsCompleted) {
      addRewardPoints('HIT_GOAL');
    }
  }, [addRewardPoints]);

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

    const updateWaterRef = async (retryLimit = 1): Promise<void> => {
      try {
        let token = await ensureAccessToken();
        if (!token) return;
        const res = await fetch(`${API_BASE_URL}/notifications/water`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ water: glasses })
        });

        if (res.status === 401 && retryLimit > 0) {
          token = await ensureAccessToken(true);
          if (token) return updateWaterRef(retryLimit - 1);
        }
      } catch (error) {
        console.error('Error updating water intake:', error);
      }
    };
    await updateWaterRef();
  }, [ensureAccessToken]);

  const registerPushNotifications = useCallback(async () => {
    if (Platform.OS === 'web') {
      return { success: false, message: 'Push notifications not supported on web' };
    }

    try {
      // Dynamically import Notifications to prevent Expo Go SDK 53+ terminal spam on boot
      const Notifications = await import('expo-notifications');
      
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

      const register = async (retryLimit = 1): Promise<{ success: boolean; token?: string; message?: string }> => {
        let authToken = await ensureAccessToken();
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

        if (res.status === 401 && retryLimit > 0) {
          authToken = await ensureAccessToken(true);
          if (authToken) return register(retryLimit - 1);
        }

        const data = await res.json();
        if (!res.status.toString().startsWith('2') || !data.success) {
          return { success: false, message: data.message || 'Failed to register push token' };
        }

        return { success: true, token: expoToken };
      };

      return await register();
    } catch (error) {
      console.error('Push registration error:', error);
      return { success: false, message: 'Push registration failed' };
    }
  }, [ensureAccessToken]);

  const connectGoogleFit = useCallback(async () => {
    const connect = async (retryLimit = 1): Promise<{ success: boolean; message: string }> => {
      try {
        let token = await ensureAccessToken();
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

        if (res.status === 401 && retryLimit > 0) {
          token = await ensureAccessToken(true);
          if (token) return connect(retryLimit - 1);
        }

        const data = await res.json();
        if (res.ok && data.success && data.authorizationUrl) {
          await Linking.openURL(data.authorizationUrl);
          return { success: true, message: 'Opening Google Fit connection...' };
        }

        // Check for specific error codes
        if (data.errorCode === 'INVALID_SIGNATURE') {
          console.warn('Token signature invalid - clearing tokens');
          await clearLocalState();
          return { success: false, message: 'Session invalid. Please login again.' };
        }

        return { success: false, message: data.message || 'Connection failed' };
      } catch (error) {
        console.error('Google Fit connection error:', error);
        return { success: false, message: 'Could not connect to Google Fit' };
      }
    };

    return await connect();
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
  }, [ensureAccessToken, user, isGoogleFitConnected]);

  const syncGoogleFitData = useCallback(async () => {
    // 🛡️ Skip silently if the user hasn't connected Google Fit yet
    if (!isGoogleFitConnected) {
      if (__DEV__) {
        console.log('ℹ️ [UserContext] Skipping Google Fit sync (Not connected)');
      }
      return { success: false, message: 'Google Fit not connected' };
    }

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
          caloriesConsumed: data.data.caloriesConsumed || 0,
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
  }, [ensureAccessToken, updateHealthMetrics, clearLocalState, isGoogleFitConnected]);

  // Handle OAuth callbacks and Google Fit deep links
  useEffect(() => {
    const handleDeepLink = async (url: string) => {
      if (!url) return;
      
      // Prevent processing the same internal redirect multiple times (fixes loops on Web)
      if (processedUrlsRef.current.has(url)) return;
      processedUrlsRef.current.add(url);

      if (__DEV__) {
        console.log('🔗 Deep link received:', url);
      }

      // Handle auth callbacks (Google Sign-In)
      if (url.includes('auth/')) {
        // Handle errors
        if (url.includes('auth/error')) {
          const queryStart = url.indexOf('?');
          if (queryStart !== -1) {
            const params = new URLSearchParams(url.substring(queryStart + 1));
            const message = params.get('message') || 'Authentication failed';
            console.error('❌ Auth error from deep link:', message);
          }
          return;
        }

        // Handle successful callback
        if (url.includes('auth/callback')) {
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

            // On Web, clear the tokens from the browser URL to keep it clean and prevent re-parsing
            if (Platform.OS === 'web' && typeof window !== 'undefined') {
              window.history.replaceState({}, document.title, window.location.pathname);
            }
          } catch (error) {
            console.error('❌ Deep link handling error:', error);
          }
        }
        return; // Exit after handling auth callback
      }

      // Handle Google Fit callbacks (separate from auth prefix to prevent collision)
      if (url.includes('google-fit/callback')) {
        try {
          const urlParts = url.split('?');
          const queryString = urlParts[1] || '';
          const params = new URLSearchParams(queryString);
          const success = params.get('success');
          const error = params.get('error');

          if (success === 'true') {
            if (__DEV__) console.log('✅ Google Fit connection confirmed via deep link');
            
            // 🚀 STEP 1: INSTANT UI FEEDBACK
            // Set local states immediately so UI components (like Home) update before network calls
            setIsGoogleFitConnected(true);
            if (user) {
              const updatedUser = { ...user, isGoogleFitConnected: true };
              setUser(updatedUser);
              // Optimistically update storage
              await AsyncStorage.setItem(STORAGE_KEYS.GOOGLE_FIT_CONNECTED, JSON.stringify(true));
              await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(updatedUser));
            }

            // 🚀 STEP 2: BACK-END SYNC
            // Force a session refresh to get the latest tokens and confirm state with server
            if (__DEV__) console.log('🔄 Syncing connection state with server...');
            const refreshResult = await refreshSession();
            
            // 🚀 STEP 3: INITIAL DATA PULL
            // Sync actual health data (steps, etc) from Google Fit API
            if (refreshResult.success) {
              await syncGoogleFitData();
              if (__DEV__) console.log('🏁 Initial Google Fit data sync completed');
            }
          } else if (success === 'false') {
            const errorMessage = error ? decodeURIComponent(error) : 'Google Fit connection failed';
            console.error('❌ Google Fit connection error:', errorMessage);
            Alert.alert('Connection Failed', errorMessage);
          }
        } catch (err) {
          console.error('❌ Error handling Google Fit deep link:', err);
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
    unlockedBadges,
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
    syncRewards,
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
    unlockedBadges,
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
    syncRewards,
    resetDailyMetrics,
    connectGoogleFit,
    disconnectGoogleFit,
    syncGoogleFitData,
    ensureAccessToken,
  ]);
});