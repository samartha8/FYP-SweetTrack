import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { DeviceEventEmitter, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL, AUTH_URL } from '../constants/Api';

// Keys used in SecureStore
export const SECURE_STORAGE_KEYS = {
  TOKEN: 'secure_sweettrack_token',
  REFRESH_TOKEN: 'secure_sweettrack_refresh_token',
};

export const AUTH_SESSION_EXPIRED_EVENT = 'sweettrack:auth-session-expired';

// Create the global Axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true'
  },
});

// A flag to prevent multiple simultaneous refresh requests
let isRefreshing = false;
// Queue to hold pending requests while a refresh is occurring
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else if (token) {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

const getStoredToken = async (key: string) => {
  if (Platform.OS === 'web') {
    return AsyncStorage.getItem(key);
  }
  return SecureStore.getItemAsync(key);
};

const setStoredToken = async (key: string, value: string) => {
  if (Platform.OS === 'web') {
    await AsyncStorage.setItem(key, value);
  } else {
    await SecureStore.setItemAsync(key, value);
  }
};

const clearStoredTokens = async () => {
  if (Platform.OS === 'web') {
    await AsyncStorage.multiRemove([
      SECURE_STORAGE_KEYS.TOKEN,
      SECURE_STORAGE_KEYS.REFRESH_TOKEN,
    ]);
  } else {
    await SecureStore.deleteItemAsync(SECURE_STORAGE_KEYS.TOKEN);
    await SecureStore.deleteItemAsync(SECURE_STORAGE_KEYS.REFRESH_TOKEN);
  }
};

const notifySessionExpired = () => {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.dispatchEvent(new Event(AUTH_SESSION_EXPIRED_EVENT));
    return;
  }
  DeviceEventEmitter.emit(AUTH_SESSION_EXPIRED_EVENT);
};

export const refreshAccessToken = async () => {
  const refreshToken = await getStoredToken(SECURE_STORAGE_KEYS.REFRESH_TOKEN);

  if (!refreshToken) {
    throw new Error('No refresh token available');
  }

  console.log(`[Axios] Attempting refresh with URL: ${AUTH_URL}/refresh`);
  const res = await axios.post(`${AUTH_URL}/refresh`, { refreshToken }, {
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'ngrok-skip-browser-warning': 'true'
    },
    timeout: 10000
  });

  if (!res.data?.success || !res.data.token) {
    console.warn('[Axios] Refresh failed: Invalid response structure', res.data);
    throw new Error('Refresh failed (invalid response)');
  }

  const newToken = res.data.token;
  const newRefreshToken = res.data.refreshToken || refreshToken;

  await setStoredToken(SECURE_STORAGE_KEYS.TOKEN, newToken);
  await setStoredToken(SECURE_STORAGE_KEYS.REFRESH_TOKEN, newRefreshToken);

  return newToken;
};

// 1. Request Interceptor: Attach the current Access Token & Handle FormData
apiClient.interceptors.request.use(
  async (config) => {
    try {
      // 🛡️ [Security Fix] Handle FormData headers
      // If we are sending FormData, we must delete the Content-Type header
      // to let Axios set it automatically with the correct boundary.
      const isFormData = config.data && typeof config.data === 'object' && typeof config.data.append === 'function';
      if (isFormData) {
        delete config.headers['Content-Type'];
      }

      const token = await getStoredToken(SECURE_STORAGE_KEYS.TOKEN);
      
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('[Axios] Error reading token from SecureStorage:', error);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 2. Response Interceptor: Handle 401s and Automatic Token Refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Check if the error is a 401 and we haven't already retried this request
    if (error.response?.status === 401 && !originalRequest._retry) {
      // Avoid infinite loops or refresh attempts on auth endpoints
      if (
        originalRequest.url.includes('/auth/refresh') || 
        originalRequest.url.includes('/auth/login') || 
        originalRequest.url.includes('/auth/signup')
      ) {
        return Promise.reject(error);
      }

      originalRequest._retry = true;

      if (isRefreshing) {
        // If already refreshing, wait for the new token in the queue
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return apiClient(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      isRefreshing = true;

      try {
        const newToken = await refreshAccessToken();
        console.log('[Axios] Refresh successful. Replaying queued requests.');
        processQueue(null, newToken);
        
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        console.error('[Axios] Refresh completely failed:', refreshError);
        processQueue(refreshError, null);
        await clearStoredTokens();
        notifySessionExpired();
        
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // For any other error, pass it back
    return Promise.reject(error);
  }
);

    // A native fetch compatible wrapper that routes through our Axios interceptor
export const secureFetch = async (url: string, options: any = {}) => {
  try {
    const method = (options.method || 'GET').toLowerCase();
    const headers = { ...(options.headers || {}) };
    
    // Axios expects data instead of body
    let data = options.body;
    
    // 🛡️ [Executive Fix] Handle FormData correctly
    // Axios in React Native has notorious bugs with FormData and HTTPS.
    // We will bypass Axios completely and use the native fetch API for FormData.
    const isFormData = data && typeof data === 'object' && typeof (data as any).append === 'function';
    
    if (isFormData) {
      console.log('📦 [apiClient] FormData detected. Using native fetch to avoid Axios crash.');
      
      // Merge base URL if needed
      const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
      
      // Ensure ngrok headers are present
      headers['ngrok-skip-browser-warning'] = 'true';
      headers['Accept'] = 'application/json';
      
      // We DO NOT set Content-Type for FormData; the browser/fetch sets it with the boundary
      delete headers['Content-Type'];

      const nativeResponse = await global.fetch(fullUrl, {
        method,
        headers,
        body: data,
      });

      const responseJson = await nativeResponse.json().catch(() => ({}));

      if (!nativeResponse.ok) {
        throw { response: { status: nativeResponse.status, data: responseJson } };
      }

      return {
        ok: true,
        status: nativeResponse.status,
        json: async () => responseJson,
        text: async () => JSON.stringify(responseJson),
        blob: async () => responseJson,
      };
    }

    // --- STANDARD AXIOS REQUEST FOR JSON ---
    if (typeof data === 'string' && headers['Content-Type']?.includes('application/json')) {
      try { data = JSON.parse(data); } catch (e) {}
    }

    const response = await apiClient({
      url,
      method,
      headers,
      data,
    });

    // Mock the native Response object
    return {
      ok: response.status >= 200 && response.status < 300,
      status: response.status,
      json: async () => response.data,
      text: async () => typeof response.data === 'string' ? response.data : JSON.stringify(response.data),
      blob: async () => response.data,
    };
  } catch (error: any) {
    if (error.response) {
      return {
        ok: false,
        status: error.response.status,
        json: async () => error.response.data,
        text: async () => typeof error.response.data === 'string' ? error.response.data : JSON.stringify(error.response.data),
        blob: async () => error.response.data,
      };
    }
    throw error;
  }
};

export default apiClient;
