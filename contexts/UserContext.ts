import { createContextHook } from '@/hooks/use-context-hook';
import { auth } from '@/lib/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as AuthSession from 'expo-auth-session';
import Constants from 'expo-constants';
import * as Crypto from 'expo-crypto';
import * as Notifications from 'expo-notifications';
import * as WebBrowser from 'expo-web-browser';
import { signOut as firebaseSignOut, GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Linking, Platform } from 'react-native';

export type User = {
  id: string;
  name: string;
  email: string;
  age?: number;
  gender?: string;
  height?: number;
  weight?: number;
  bmi?: number;
  familyHistory?: string;
  previousDiagnosis?: string;
  currentMedication?: string;
  physicalActivityDays?: number;
  smoking?: string;
  alcohol?: string;
  fastingGlucose?: number;
  bloodPressure?: { systolic: number; diastolic: number };
  medicalHistory?: string[];
  healthSetupCompleted?: boolean;
  isGoogleFitConnected?: boolean;
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
  // Highest priority: explicit env override (works for any port/host)
  const envBase = process.env.EXPO_PUBLIC_API_BASE_URL || process.env.API_BASE_URL;
  if (envBase) return normalizeApiUrl(envBase);

  // Web: default to backend dev port unless explicitly proxied
  if (Platform.OS === 'web') {
    return 'http://localhost:5000/api';
  }

  // Native: allow host/port overrides via env; fall back to emulator-friendly defaults
  const hostOverride = process.env.EXPO_PUBLIC_API_HOST || process.env.API_HOST;
  const port = process.env.EXPO_PUBLIC_API_PORT || process.env.API_PORT || '5000';

  let hostIP = hostOverride;
  
  if (!hostIP) {
    // Try to extract IP from Expo dev server connection
    // When connected via QR code, Expo provides the dev server URL
    try {
      const debuggerHost = Constants.expoConfig?.hostUri || Constants.expoConfig?.extra?.debuggerHost;
      if (debuggerHost) {
        // Extract IP from format like "192.168.1.76:8081" or "192.168.1.76"
        const ipMatch = debuggerHost.match(/^([\d.]+)(?::\d+)?$/);
        if (ipMatch && ipMatch[1]) {
          hostIP = ipMatch[1];
          if (__DEV__) {
            console.log('✅ Auto-detected API host from Expo connection:', hostIP);
          }
        }
      }
    } catch (e) {
      // Ignore errors in IP detection
    }
    
    // Fallback: Android emulator uses 10.0.2.2, physical devices need LAN IP
    if (!hostIP) {
      // Try to use the IP from app.json if available (for physical devices)
      const appJsonIP = Constants.expoConfig?.extra?.apiHost;
      if (appJsonIP && appJsonIP !== 'auto-detect') {
        hostIP = appJsonIP;
        if (__DEV__) {
          console.log('Using API host from app.json:', hostIP);
        }
      } else {
        // Default fallback: Android emulator uses 10.0.2.2, iOS simulator uses localhost
        hostIP = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
        if (__DEV__) {
          console.warn('⚠️ Using fallback IP:', hostIP, '- For physical devices, ensure phone and computer are on same Wi-Fi');
        }
      }
    }
  }

  const apiUrl = `http://${hostIP}:${port}/api`;
  if (__DEV__) {
    console.log('🌐 API Base URL:', apiUrl);
  }
  return apiUrl;
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

  const persistAuthPayload = useCallback(async (nextUser: User, accessToken: string, refreshToken: string) => {
    // IMPORTANT: Set state synchronously BEFORE async storage operations
    // This ensures state is updated immediately to prevent navigation issues
    setUser(nextUser);
    setHasHealthSetup(nextUser.healthSetupCompleted || false);
    setIsGoogleFitConnected(nextUser.isGoogleFitConnected || false);
    // Mark onboarding as completed for authenticated users (they've seen the login screen)
    setHasOnboarded(true);

    // Store in AsyncStorage (async, but state is already set above)
    await AsyncStorage.multiSet([
      [STORAGE_KEYS.USER, JSON.stringify(nextUser)],
      [STORAGE_KEYS.TOKEN, accessToken],
      [STORAGE_KEYS.REFRESH_TOKEN, refreshToken],
      [STORAGE_KEYS.HAS_ONBOARDED, 'true'], // Mark onboarding as complete
      [STORAGE_KEYS.HAS_HEALTH_SETUP, nextUser.healthSetupCompleted ? 'true' : 'false'], // Store health setup status
    ]);
    
    if (__DEV__) {
      console.log('✅ Auth payload persisted. User:', nextUser.email, 'Onboarded: true', 'HealthSetup:', nextUser.healthSetupCompleted);
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
      const res = await fetch(`${AUTH_URL}/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        // Check if it's a signature error - means token was signed with different JWT_SECRET
        if (data.errorCode === 'INVALID_SIGNATURE') {
          console.warn('Token signature invalid - clearing all tokens. User must login again.');
          await clearLocalState();
          return { success: false, message: 'Session invalid. Please login again.', errorCode: 'INVALID_SIGNATURE' };
        }
        
        // Other errors - clear tokens and require re-login
        await clearLocalState();
        return { success: false, message: data.message || 'Unable to refresh session' };
      }

      await persistAuthPayload(data.user, data.token, data.refreshToken);
      return { success: true, token: data.token };
    } catch (error) {
      console.error('Error refreshing session:', error);
      await clearLocalState();
      return { success: false, message: 'Unable to refresh session' };
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

      if (storedOnboarded) setHasOnboarded(JSON.parse(storedOnboarded));
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
  }, [refreshSession]);

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
      // Configure Google OAuth
      const firebaseConfig = Constants.expoConfig?.extra?.firebase;
      if (!firebaseConfig) {
        return { 
          success: false, 
          message: 'Firebase not configured. Please add Firebase config to app.json' 
        };
      }

      // Get OAuth client IDs
      const webClientId = firebaseConfig.webClientId || firebaseConfig.iosClientId;
      if (!webClientId) {
        return { 
          success: false, 
          message: 'Google OAuth client ID not found. Please add webClientId to Firebase config in app.json' 
        };
      }

      WebBrowser.maybeCompleteAuthSession();

      // Configure OAuth request with proper redirect URI
      let redirectUri: string;
      
      if (Platform.OS === 'web') {
        // For web, use the current origin or localhost
        redirectUri = AuthSession.makeRedirectUri({
          useProxy: false,
        } as any);
      } else {
        // For native, use the app scheme or Expo proxy
        redirectUri = AuthSession.makeRedirectUri({
          useProxy: true,
          scheme: 'diabetesapp', // Use your app scheme from app.json
        } as any);
      }

      // Log the redirect URI for debugging (user needs to add this to Google Cloud Console)
      if (__DEV__) {
        console.log('🔗 Google OAuth Redirect URI:', redirectUri);
        console.log('⚠️ Make sure this URI is added to your Google Cloud Console OAuth client');
      }

      // Generate a secure nonce for ID token requests (required by Google for security)
      // The nonce prevents replay attacks and must be included when requesting ID tokens
      // Google expects a random string (not hashed) that will be returned in the ID token
      const randomBytes = await Crypto.getRandomBytesAsync(32);
      const nonce = Array.from(randomBytes)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      if (__DEV__) {
        console.log('🔐 Generated nonce for OAuth request:', nonce.substring(0, 16) + '...');
      }

      // Manually construct the authorization URL with nonce parameter
      // expo-auth-session doesn't always include nonce in the URL for ID token requests
      const scopeString = ['openid', 'profile', 'email'].join(' ');
      const state = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        `${Date.now()}-${Math.random()}`
      );
      
      const authUrlParams = new URLSearchParams({
        client_id: webClientId,
        redirect_uri: redirectUri,
        response_type: 'id_token',
        scope: scopeString,
        nonce: nonce, // CRITICAL: Must be included for ID token requests
        state: state,
      });

      const authorizationUrl = `https://accounts.google.com/o/oauth2/v2/auth?${authUrlParams.toString()}`;

      if (__DEV__) {
        console.log('✅ Authorization URL with nonce:', authorizationUrl.substring(0, 150) + '...');
        console.log('✅ Nonce parameter included:', authorizationUrl.includes('nonce='));
      }

      // For web, manually open the authorization URL with nonce included
      if (Platform.OS === 'web') {
        // Use WebBrowser to open the manually constructed URL with nonce
        const result = await WebBrowser.openAuthSessionAsync(
          authorizationUrl,
          redirectUri
        );

        if (result.type !== 'success') {
          if (result.type === 'cancel') {
            return { success: false, message: 'Sign-in cancelled' };
          }
          return { success: false, message: 'Google Sign-In failed' };
        }

        // Parse the redirect URL to extract the ID token
        // For ID token flow, Google returns the token in the URL fragment (hash)
        const redirectUrl = result.url;
        let id_token: string | null = null;
        
        try {
          const urlObj = new URL(redirectUrl);
          // ID tokens are returned in the hash fragment for security
          if (urlObj.hash) {
            const hashParams = new URLSearchParams(urlObj.hash.substring(1));
            id_token = hashParams.get('id_token');
          }
          // Fallback to query params (shouldn't happen for ID token flow, but just in case)
          if (!id_token) {
            id_token = urlObj.searchParams.get('id_token');
          }
        } catch (e) {
          console.error('Error parsing redirect URL:', e);
          return { success: false, message: 'Invalid redirect URL received' };
        }
        
        if (!id_token) {
          return { success: false, message: 'No ID token received from Google' };
        }

        // Create Firebase credential with the ID token
        const credential = GoogleAuthProvider.credential(id_token);
        const firebaseResult = await signInWithCredential(auth, credential);
        const firebaseUser = firebaseResult.user;
        
        if (!firebaseUser.email) {
          await firebaseSignOut(auth);
          return { success: false, message: 'No email found in Google account' };
        }
        
        // Get ID token to send to backend
        const idToken = await firebaseUser.getIdToken();
        
        // Send to backend to create/update user in database
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);
        
        try {
          const res = await fetch(`${AUTH_URL}/google-signin`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              idToken,
              email: firebaseUser.email,
              name: firebaseUser.displayName || firebaseUser.email.split('@')[0],
              photoURL: firebaseUser.photoURL || null,
            }),
            signal: controller.signal,
          });
          clearTimeout(timeoutId);
          
          const data = await res.json();
          
          if (!res.ok || !data.success) {
            // Sign out from Firebase if backend fails
            await firebaseSignOut(auth);
            return { 
              success: false, 
              message: data.message || 'Failed to create/update user account' 
            };
          }
          
          // Successfully stored user in database - persist auth data
          await persistAuthPayload(data.user, data.token, data.refreshToken);
          
          if (__DEV__) {
            console.log('✅ Google Sign-In successful. User stored in database:', data.user.email);
            console.log('✅ Health setup status:', data.user.healthSetupCompleted);
          }
          
          // Return user data so caller can check health setup status
          return { 
            success: true, 
            user: data.user,
            needsHealthSetup: !data.user.healthSetupCompleted
          };
        } catch (fetchError: any) {
          clearTimeout(timeoutId);
          await firebaseSignOut(auth);
          
          if (fetchError.name === 'AbortError') {
            return { success: false, message: 'Request timed out. Please check your connection.' };
          }
          
          return { 
            success: false, 
            message: fetchError.message || 'Failed to connect to server' 
          };
        }
      }

      // For native (iOS/Android), use WebBrowser with manually constructed URL
      const result = await WebBrowser.openAuthSessionAsync(
        authorizationUrl,
        redirectUri
      );
      
      if (result.type !== 'success') {
        if (result.type === 'cancel') {
          return { success: false, message: 'Sign-in cancelled' };
        }
        return { success: false, message: 'Google Sign-In failed' };
      }

      // Parse the redirect URL to extract the ID token
      // For ID token flow, Google returns the token in the URL fragment (hash)
      const redirectUrl = result.url;
      let id_token: string | null = null;
      
      try {
        const urlObj = new URL(redirectUrl);
        // ID tokens are returned in the hash fragment for security
        if (urlObj.hash) {
          const hashParams = new URLSearchParams(urlObj.hash.substring(1));
          id_token = hashParams.get('id_token');
        }
        // Fallback to query params (shouldn't happen for ID token flow, but just in case)
        if (!id_token) {
          id_token = urlObj.searchParams.get('id_token');
        }
      } catch (e) {
        console.error('Error parsing redirect URL:', e);
        return { success: false, message: 'Invalid redirect URL received' };
      }
      
      if (!id_token) {
        return { success: false, message: 'No ID token received from Google' };
      }

      // Create Firebase credential with the ID token
      const credential = GoogleAuthProvider.credential(id_token);
      const firebaseResult = await signInWithCredential(auth, credential);
      const firebaseUser = firebaseResult.user;
      
      if (!firebaseUser.email) {
        await firebaseSignOut(auth);
        return { success: false, message: 'No email found in Google account' };
      }
      
      // Get ID token to send to backend
      const idToken = await firebaseUser.getIdToken();
      
      // Send to backend to create/update user in database
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      
      try {
        const res = await fetch(`${AUTH_URL}/google-signin`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            idToken,
            email: firebaseUser.email,
            name: firebaseUser.displayName || firebaseUser.email.split('@')[0],
            photoURL: firebaseUser.photoURL || null,
          }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        
        const data = await res.json();
        
        if (!res.ok || !data.success) {
          // Sign out from Firebase if backend fails
          await firebaseSignOut(auth);
          return { 
            success: false, 
            message: data.message || 'Failed to create/update user account' 
          };
        }
        
        // Successfully stored user in database - persist auth data
        await persistAuthPayload(data.user, data.token, data.refreshToken);
        
        if (__DEV__) {
          console.log('✅ Google Sign-In successful. User stored in database:', data.user.email);
          console.log('✅ Health setup status:', data.user.healthSetupCompleted);
        }
        
        // Return user data so caller can check health setup status
        return { 
          success: true, 
          user: data.user,
          needsHealthSetup: !data.user.healthSetupCompleted
        };
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        await firebaseSignOut(auth);
        
        if (fetchError.name === 'AbortError') {
          return { success: false, message: 'Request timed out. Please check your connection.' };
        }
        
        return { 
          success: false, 
          message: fetchError.message || 'Failed to connect to server' 
        };
      }
    } catch (error: any) {
      console.error('Google Sign-In error:', error);
      if (error.name === 'AbortError') {
        return { success: false, message: 'Request timed out. Please try again.' };
      }
      return { success: false, message: error.message || 'Google Sign-In failed' };
    }
  }, [persistAuthPayload]);

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

    // Token exists - try to refresh it to ensure it's still valid
    const refreshed = await refreshSession();
    if (refreshed.success) {
      return await AsyncStorage.getItem(STORAGE_KEYS.TOKEN);
    }

    // If refresh failed due to signature error, tokens are already cleared
    if (refreshed.errorCode === 'INVALID_SIGNATURE') {
      return null;
    }

    // For other errors, return null (tokens already cleared by refreshSession)
    return null;
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

  // Handle Google Fit OAuth callback deep link
  useEffect(() => {
    const handleDeepLink = async (url: string) => {
      if (!url || !url.includes('google-fit-connected')) return;

      try {
        // Parse URL manually for React Native compatibility
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
    };

    // Handle deep link when app is already open
    const subscription = Linking.addEventListener('url', (event) => {
      handleDeepLink(event.url);
    });

    // Handle deep link when app is opened from closed state
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink(url);
      }
    });

    return () => {
      subscription.remove();
    };
  }, [user, syncGoogleFitData]);

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
