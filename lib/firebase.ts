import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { FirebaseApp, getApps, initializeApp } from 'firebase/app';
import { Auth, getAuth, initializeAuth } from 'firebase/auth';
import { Firestore, getFirestore } from 'firebase/firestore';
import { Platform } from 'react-native';

// Import getReactNativePersistence - Firebase v12+ exports this from firebase/auth
// TypeScript types might not include it in some versions, so we access it via the module
import * as firebaseAuth from 'firebase/auth';
const getReactNativePersistence = (firebaseAuth as any)?.getReactNativePersistence;

// Fallback Firebase config (matches app.json) - used if Constants.expoConfig is not available
const FALLBACK_FIREBASE_CONFIG = {
  apiKey: "AIzaSyBIXqGLcFUw9jW9xUPLFmdR82a2WKaqQ_o",
  authDomain: "sweettrack-d805d.firebaseapp.com",
  projectId: "sweettrack-d805d",
  storageBucket: "sweettrack-d805d.firebasestorage.app",
  messagingSenderId: "1045594987128",
  appId: "1:1045594987128:web:aecc3e857beb3b605c2b8d",
  measurementId: "G-J8J9HRXCGJ",
};

// Firebase configuration from app.json
const getFirebaseConfig = () => {
  // Try multiple ways to get the config (for different Expo versions and platforms)
  const extra = Constants.expoConfig?.extra || (Constants as any).manifest?.extra || (Constants as any).manifest2?.extra;
  const firebaseConfig = extra?.firebase;

  if (firebaseConfig) {
    return {
      apiKey: firebaseConfig.apiKey,
      authDomain: firebaseConfig.authDomain,
      projectId: firebaseConfig.projectId,
      storageBucket: firebaseConfig.storageBucket,
      messagingSenderId: firebaseConfig.messagingSenderId,
      appId: firebaseConfig.appId,
      measurementId: firebaseConfig.measurementId,
    };
  }

  // Fallback to hardcoded config if Constants is not available
  if (__DEV__) {
    console.warn('⚠️ Firebase config not found in Constants, using fallback config. This is normal during initial load.');
  }
  return FALLBACK_FIREBASE_CONFIG;
};

// Initialize Firebase App
let _app: FirebaseApp | null = null;
let _auth: Auth | null = null;
let _db: Firestore | null = null;

try {
  const config = getFirebaseConfig();

  // Initialize app only if not already initialized
  if (getApps().length === 0) {
    _app = initializeApp(config);
  } else {
    _app = getApps()[0];
  }

  // Initialize Auth with AsyncStorage persistence for React Native when available
  if (Platform.OS !== 'web') {
    try {
        if (typeof getReactNativePersistence === 'function') {
        _auth = initializeAuth(_app, {
          persistence: getReactNativePersistence(AsyncStorage),
        });
      } else {
        // Fallback: initialize without explicit RN persistence if helper missing
        _auth = initializeAuth(_app);
      }
    } catch (e: any) {
      const code = (e && (e as any).code) || (e && (e as Error).message) || '';
      // If auth is already initialized, get the existing instance
      if (String(code).includes('already-initialized') || String(code).includes('already exists')) {
        _auth = getAuth(_app!);
      } else {
        throw e;
      }
    }
  } else {
    _auth = getAuth(_app!);
  }

  // Initialize Firestore (optional, for future use)
  _db = getFirestore(_app!);
} catch (error) {
  console.error('Firebase initialization error:', error);
  throw error;
}

// Export non-null asserted instances for consumers
export const app = _app!;
export const auth = _auth!;
export const db = _db!;
export default { app, auth, db };
