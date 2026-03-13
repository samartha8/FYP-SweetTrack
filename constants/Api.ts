import { Platform } from 'react-native';
import Constants from 'expo-constants';

/**
 * Returns the base API URL based on the platform and environment.
 * - Web: http://localhost:5000/api
 * - Android Emulator: http://10.0.2.2:5000/api
 * - iOS Simulator: http://localhost:5000/api
 * - Physical Devices: Uses the apiHost from app.json or a default IP
 */
export const getApiBaseUrl = (): string => {
    // Use environment variable if provided
    if (process.env.EXPO_PUBLIC_API_URL) {
        return `${process.env.EXPO_PUBLIC_API_URL}/api`;
    }

    // 1. WEB: Always use localhost
    if (Platform.OS === 'web') {
        return 'http://localhost:5000/api';
    }

    // 2. ANDROID EMULATOR: Must use 10.0.2.2
    if (Platform.OS === 'android') {
        const isEmulator =
            Constants.deviceName?.includes('sdk') ||
            Constants.deviceName?.includes('emulator') ||
            !Constants.deviceName; // common for emulators

        if (isEmulator) {
            return 'http://10.0.2.2:5000/api';
        }

        // Physical Android device - use network IP
        const appJsonIP = Constants.expoConfig?.extra?.apiHost;
        if (appJsonIP && appJsonIP !== 'auto-detect') {
            return `http://${appJsonIP}:5000/api`;
        }

        // Default fallback IP (change this to your machine's local IP if needed)
        return 'http://192.168.1.76:5000/api';
    }

    // 3. iOS SIMULATOR: use localhost
    if (Platform.OS === 'ios') {
        return 'http://localhost:5000/api';
    }

    // Final generic fallback
    return 'http://localhost:5000/api';
};

export const API_BASE_URL = getApiBaseUrl();
export const AUTH_URL = `${API_BASE_URL}/auth`;
export const GOOGLE_FIT_URL = `${API_BASE_URL}/google-fit`;
export const DIABETES_URL = `${API_BASE_URL}/diabetes`;
export const HEALTH_URL = `${API_BASE_URL}/health`;
export const SETTINGS_URL = `${API_BASE_URL}/settings`;
export const CHAT_URL = `${API_BASE_URL}/chat`;
export const MEAL_URL = `${API_BASE_URL}/meals`;
export const RECORDS_URL = `${API_BASE_URL}/records`;
