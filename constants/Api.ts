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
    // For development, use the active ngrok tunnel
    return 'https://domain-recant-urgency.ngrok-free.dev/api';
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
