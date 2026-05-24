import { createContextHook } from '../hooks/use-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Alert } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import apiClient from '../lib/apiClient';
import { API_BASE_URL, GOOGLE_FIT_URL } from '../constants/Api';
import { useAuth } from './AuthContext';

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

const DEFAULT_HEALTH_METRICS: HealthMetrics = {
  steps: 0, water: 0, sleep: 0, calories: 0, caloriesConsumed: 0,
};

const DEFAULT_DAILY_GOALS: DailyGoals = {
  steps: 10000, water: 8, sleep: 8, calories: 2000,
};

const normalizeDailyGoals = (goals: Partial<DailyGoals> = {}): DailyGoals => ({
  steps: Number(goals.steps) > 0 ? Number(goals.steps) : DEFAULT_DAILY_GOALS.steps,
  water: Number(goals.water) > 0 ? Number(goals.water) : DEFAULT_DAILY_GOALS.water,
  sleep: Number(goals.sleep) > 0 ? Number(goals.sleep) : DEFAULT_DAILY_GOALS.sleep,
  calories: Number(goals.calories) > 0 ? Number(goals.calories) : DEFAULT_DAILY_GOALS.calories,
});

const STORAGE_KEYS = {
  HAS_HEALTH_SETUP: '@sweettrack_health_setup',
  HEALTH_METRICS: '@sweettrack_health_metrics',
  DAILY_GOALS: '@sweettrack_daily_goals',
  REWARDS_POINTS: '@sweettrack_rewards_points',
  STREAK: '@sweettrack_streak',
  GOOGLE_FIT_CONNECTED: '@sweettrack_google_fit_connected',
  RISK_STATUS: '@sweettrack_risk_status',
  RISK_PROBABILITY: '@sweettrack_risk_probability',
  LAST_METRICS_DATE: '@sweettrack_last_metrics_date',
};

const SYNC_THROTTLE_MS = 30000;
const MAX_DAILY_WATER_GLASSES = 20;
const WATER_BOUNDS_MESSAGE = 'Value out of bounds. Please enter a realistic daily water intake.';
const GOOGLE_FIT_RETURN_URL = 'diabetesapp://google-fit/callback';

export const [HealthProvider, useHealth] = createContextHook(() => {
  const { user, clearLocalState } = useAuth();
  const userId = user?.id;
  
  const [hasHealthSetup, setHasHealthSetup] = useState<boolean>(false);
  const [healthMetrics, setHealthMetrics] = useState<HealthMetrics>(DEFAULT_HEALTH_METRICS);
  const [dailyGoals, setDailyGoals] = useState<DailyGoals>(DEFAULT_DAILY_GOALS);
  const [rewardsPoints, setRewardsPoints] = useState<number>(0);
  const [streak, setStreak] = useState<number>(0);
  const [unlockedBadges, setUnlockedBadges] = useState<string[]>([]);
  const [redeemedRewards, setRedeemedRewards] = useState<string[]>([]);
  const [isGoogleFitConnected, setIsGoogleFitConnected] = useState<boolean>(false);
  const [riskStatus, setRiskStatus] = useState<'Positive' | 'Negative' | 'Normal'>('Normal');
  const [riskProbability, setRiskProbability] = useState<number>(0);
  const [isHealthLoading, setIsHealthLoading] = useState<boolean>(true);
  const inFlightRef = useRef<Record<string, boolean>>({});
  const lastRunRef = useRef<Record<string, number>>({});

  const shouldSkipRequest = useCallback((key: string, force = false) => {
    const now = Date.now();
    if (inFlightRef.current[key]) return true;
    if (!force && now - (lastRunRef.current[key] || 0) < SYNC_THROTTLE_MS) return true;

    inFlightRef.current[key] = true;
    lastRunRef.current[key] = now;
    return false;
  }, []);

  const finishRequest = useCallback((key: string) => {
    inFlightRef.current[key] = false;
  }, []);

  const fetchDailyMetrics = useCallback(async (force = false) => {
    if (!user) return;
    const requestKey = 'dailyMetrics';
    if (shouldSkipRequest(requestKey, force)) return;

    try {
      const dateStr = new Date().toLocaleDateString('sv-SE');
      const res = await apiClient.get(`${API_BASE_URL}/wellness/metrics?date=${dateStr}`);
      if (res.data && res.data.success && res.data.metrics) {
        setHealthMetrics(prev => {
          const merged = {
            ...prev,
            ...res.data.metrics,
            steps: Math.max(prev.steps, res.data.metrics.steps || 0),
            water: Math.max(prev.water, res.data.metrics.water || 0),
            sleep: Math.max(prev.sleep, res.data.metrics.sleep || 0),
            calories: Math.max(prev.calories, res.data.metrics.calories || 0),
          };
          AsyncStorage.setItem(STORAGE_KEYS.HEALTH_METRICS, JSON.stringify(merged));
          return merged;
        });
      }
    } catch (error) {
      console.error('Error fetching today\'s metrics:', error);
    } finally {
      finishRequest(requestKey);
    }
  }, [finishRequest, shouldSkipRequest, userId]);

  const checkGoogleFitStatus = useCallback(async () => {
    if (!user) return false;
    try {
      const res = await apiClient.get(`${GOOGLE_FIT_URL}/status`);
      if (res.data && res.data.success) {
        setIsGoogleFitConnected(res.data.connected);
        if (res.data.connected) {
          // Persist the connection state so we auto-refresh next time
          await AsyncStorage.setItem(STORAGE_KEYS.GOOGLE_FIT_CONNECTED, 'true');
          fetchDailyMetrics(true);
        } else {
          // If explicitly disconnected on server, clear local flag
          await AsyncStorage.removeItem(STORAGE_KEYS.GOOGLE_FIT_CONNECTED);
        }
        return res.data.connected;
      }
      return false;
    } catch (error: any) {
      // Handle silent failures for status checks (e.g. 401 when not yet connected)
      if (error.response?.status !== 401) {
        console.error('Error checking Google Fit status:', error);
      }
      return false;
    }
  }, [fetchDailyMetrics, userId]);

  const syncGoogleFitData = useCallback(async (force = false) => {
    if (!user) return { success: false, message: 'Authentication required' };
    
    // Do NOT auto-check status here. If it's not connected in state, it's not connected.
    if (!isGoogleFitConnected) return { success: false, message: 'Google Fit not connected' };
    const requestKey = 'googleFitSync';
    if (shouldSkipRequest(requestKey, force)) return { success: false, message: 'Sync already running' };

    try {
      const res = await apiClient.post(`${GOOGLE_FIT_URL}/sync`, {
        date: new Date().toLocaleDateString('sv-SE')
      });
      if (res.data && res.data.success && res.data.data) {
        const remote = res.data.data;
        setHealthMetrics(prev => {
          const merged = { ...prev, ...remote };
          AsyncStorage.setItem(STORAGE_KEYS.HEALTH_METRICS, JSON.stringify(merged));
          return merged;
        });
        return { success: true, data: remote };
      }
      return { success: false, message: 'Failed to sync Google Fit data' };
    } catch (error: any) {
      // If backend says not connected (400), sync our local state
      if (error.response?.status === 400 && error.response?.data?.message === 'Google Fit not connected') {
        if (__DEV__) console.log('🔄 [HealthContext] Google Fit disconnected on server, updating local state...');
        setIsGoogleFitConnected(false);
        AsyncStorage.removeItem(STORAGE_KEYS.GOOGLE_FIT_CONNECTED);
      } else {
        console.error('Error syncing Google Fit:', error);
      }
      return { success: false, message: 'Unable to sync Google Fit data' };
    } finally {
      finishRequest(requestKey);
    }
  }, [finishRequest, isGoogleFitConnected, shouldSkipRequest, userId]);

  const setWater = useCallback(async (glasses: number) => {
    if (!Number.isFinite(glasses) || glasses < 0 || glasses > MAX_DAILY_WATER_GLASSES) {
      Alert.alert('Invalid water intake', WATER_BOUNDS_MESSAGE);
      return { success: false, message: WATER_BOUNDS_MESSAGE };
    }

    setHealthMetrics(prev => {
      const updated = { ...prev, water: glasses };
      AsyncStorage.setItem(STORAGE_KEYS.HEALTH_METRICS, JSON.stringify(updated));
      return updated;
    });
    try {
      await apiClient.put(`${API_BASE_URL}/notifications/water`, { water: glasses });
      return { success: true };
    } catch (error) {
      console.error('Error updating water intake:', error);
      return { success: false, message: 'Error updating water intake' };
    }
  }, []);

  const connectGoogleFit = useCallback(async () => {
    try {
      const res = await apiClient.post(`${GOOGLE_FIT_URL}/connect`);
      if (res.data && res.data.success && res.data.authorizationUrl) {
        const result = await WebBrowser.openAuthSessionAsync(
          res.data.authorizationUrl,
          GOOGLE_FIT_RETURN_URL
        );

        if (result.type === 'success') {
          await checkGoogleFitStatus();
          await fetchDailyMetrics(true);
          return { success: true };
        }

        return { success: false, message: 'Google Fit connection was cancelled.' };
      }
      Alert.alert('Error', res.data.message || 'Connection failed');
      return { success: false };
    } catch (e) {
      Alert.alert('Error', 'Could not connect to Google Fit');
      return { success: false };
    }
  }, [checkGoogleFitStatus, fetchDailyMetrics]);

  const updateHealthMetrics = useCallback((metrics: Partial<HealthMetrics>) => {
    setHealthMetrics(prev => {
      const updated = { ...prev, ...metrics };
      AsyncStorage.setItem(STORAGE_KEYS.HEALTH_METRICS, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const persistDailyGoals = useCallback(async (nextGoals: DailyGoals) => {
    await AsyncStorage.setItem(STORAGE_KEYS.DAILY_GOALS, JSON.stringify(nextGoals));
  }, []);

  const fetchDailyGoals = useCallback(async (force = false) => {
    if (!user) return null;
    const requestKey = 'dailyGoals';
    if (shouldSkipRequest(requestKey, force)) return null;

    try {
      const res = await apiClient.get(`${API_BASE_URL}/notifications/goals`);
      if (res.data?.success) {
        const remoteGoals = res.data.goals || {};
        const nextGoals = normalizeDailyGoals(remoteGoals);
        setDailyGoals(nextGoals);
        await persistDailyGoals(nextGoals);
        return nextGoals;
      }
    } catch (error) {
      console.error('Error fetching daily goals:', error);
    } finally {
      finishRequest(requestKey);
    }
    return null;
  }, [finishRequest, persistDailyGoals, shouldSkipRequest, userId]);

  const updateDailyGoals = useCallback((goals: Partial<DailyGoals>) => {
    setDailyGoals(prev => {
      const updated = normalizeDailyGoals({ ...prev, ...goals });
      persistDailyGoals(updated);
      apiClient.put(`${API_BASE_URL}/notifications/goals`, updated).catch(error => {
        console.error('Error saving daily goals:', error);
      });
      return updated;
    });
  }, [persistDailyGoals]);

  const awardPoints = useCallback(async (actionType: 'DAILY_LOGIN' | 'LOG_MEAL' | 'HEALTH_PREDICTION' | 'HIT_GOAL') => {
    if (!user) return { success: false };
    try {
      const res = await apiClient.post(`${API_BASE_URL}/rewards/award`, { actionType });
      if (res.data && res.data.success) {
        setRewardsPoints(res.data.rewardsPoints || 0);
        setUnlockedBadges(res.data.unlockedBadges || []);
        
        // Persist
        await AsyncStorage.setItem(STORAGE_KEYS.REWARDS_POINTS, JSON.stringify(res.data.rewardsPoints));
        
        return { success: true, points: res.data.rewardsPoints };
      }
      return { success: false };
    } catch (error) {
      console.error('Error awarding points:', error);
      return { success: false };
    }
  }, [userId]);

  const syncRewards = useCallback(async (force = false) => {
    if (!user) return { success: false };
    const requestKey = 'rewardsSync';
    if (shouldSkipRequest(requestKey, force)) return { success: false };

    try {
      const dateStr = new Date().toLocaleDateString('sv-SE');
      const res = await apiClient.post(`${API_BASE_URL}/rewards/sync`, { date: dateStr });
      if (res.data && res.data.success) {
        const { rewardsPoints: points, streak: currentStreak, unlockedBadges: badges } = res.data;
        
        setRewardsPoints(points || 0);
        setStreak(currentStreak || 0);
        setUnlockedBadges(badges || []);
        
        // Persist
        await AsyncStorage.multiSet([
          [STORAGE_KEYS.REWARDS_POINTS, JSON.stringify(points)],
          [STORAGE_KEYS.STREAK, JSON.stringify(currentStreak)],
        ]);
        
        return { success: true, streak: currentStreak, points };
      }
      return { success: false };
    } catch (error) {
      console.error('Error syncing rewards:', error);
      return { success: false };
    } finally {
      finishRequest(requestKey);
    }
  }, [finishRequest, shouldSkipRequest, userId]);

  const redeemReward = useCallback(async (rewardId: string, cost: number) => {
    if (!user) return { success: false, message: 'Authentication required' };
    try {
      const res = await apiClient.post(`${API_BASE_URL}/rewards/redeem`, { rewardId, cost });
      if (res.data && res.data.success) {
        setRewardsPoints(res.data.rewardsPoints);
        setRedeemedRewards(res.data.redeemedRewards);
        
        // Persist points
        await AsyncStorage.setItem(STORAGE_KEYS.REWARDS_POINTS, JSON.stringify(res.data.rewardsPoints));
        
        return { success: true, message: 'Reward redeemed successfully' };
      }
      return { success: false, message: res.data.message || 'Redemption failed' };
    } catch (error) {
      console.error('Error redeeming reward:', error);
      return { success: false, message: 'An error occurred during redemption' };
    }
  }, [userId]);

  const loadHealthData = useCallback(async () => {
    if (!user) return;
    try {
      const [
        storedHealthSetup, storedMetrics, storedGoals,
        storedPoints, storedStreak, storedGoogleFit, storedMetricsDate
      ] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.HAS_HEALTH_SETUP),
        AsyncStorage.getItem(STORAGE_KEYS.HEALTH_METRICS),
        AsyncStorage.getItem(STORAGE_KEYS.DAILY_GOALS),
        AsyncStorage.getItem(STORAGE_KEYS.REWARDS_POINTS),
        AsyncStorage.getItem(STORAGE_KEYS.STREAK),
        AsyncStorage.getItem(STORAGE_KEYS.GOOGLE_FIT_CONNECTED),
        AsyncStorage.getItem(STORAGE_KEYS.LAST_METRICS_DATE),
      ]);

      const todayStr = new Date().toLocaleDateString('sv-SE');
      if (storedMetricsDate !== todayStr) {
        setHealthMetrics(DEFAULT_HEALTH_METRICS);
        await AsyncStorage.multiSet([
          [STORAGE_KEYS.HEALTH_METRICS, JSON.stringify(DEFAULT_HEALTH_METRICS)],
          [STORAGE_KEYS.LAST_METRICS_DATE, todayStr],
        ]);
      } else if (storedMetrics) {
        setHealthMetrics(JSON.parse(storedMetrics));
      }

      if (storedGoals) setDailyGoals(normalizeDailyGoals(JSON.parse(storedGoals)));
      fetchDailyGoals(true);
      if (storedPoints) setRewardsPoints(JSON.parse(storedPoints));
      if (storedStreak) setStreak(JSON.parse(storedStreak));
      if (storedGoogleFit) setIsGoogleFitConnected(JSON.parse(storedGoogleFit));
      
      if (__DEV__) console.log("🚀 [HealthContext] storedGoogleFit:", storedGoogleFit, "user.isGoogleFitConnected:", user?.isGoogleFitConnected);

      // Also check the user object as a source of truth if storage is empty
      if (!storedGoogleFit && user?.isGoogleFitConnected === true) {
        setIsGoogleFitConnected(true);
        await AsyncStorage.setItem(STORAGE_KEYS.GOOGLE_FIT_CONNECTED, 'true');
      }

      const storedRiskStatus = await AsyncStorage.getItem(STORAGE_KEYS.RISK_STATUS);
      const storedRiskProb = await AsyncStorage.getItem(STORAGE_KEYS.RISK_PROBABILITY);
      if (storedRiskStatus) setRiskStatus(storedRiskStatus as any);
      if (storedRiskProb) setRiskProbability(parseFloat(storedRiskProb));

      setHasHealthSetup(storedHealthSetup === 'true' || user?.healthSetupCompleted || false);
      
      setIsHealthLoading(false);
      
      // Auto fetch fresh data in background
      fetchDailyMetrics(true);
      syncRewards(true); // Keep streak and points in sync
      if (storedGoogleFit === 'true') {
        syncGoogleFitData(true);
      }
    } catch (error) {
      console.error('Error loading health data:', error);
      setIsHealthLoading(false);
    }
  }, [
    userId,
    user?.healthSetupCompleted,
    user?.isGoogleFitConnected,
    fetchDailyMetrics,
    fetchDailyGoals,
    syncGoogleFitData,
    syncRewards,
  ]);

  useEffect(() => {
    if (userId) {
      setIsHealthLoading(true);
      loadHealthData();
    } else {
      // Clear local memory state if user logs out
      setHealthMetrics(DEFAULT_HEALTH_METRICS);
      setDailyGoals(DEFAULT_DAILY_GOALS);
      setHasHealthSetup(false);
      setIsGoogleFitConnected(false);
      setIsHealthLoading(false);
    }
  }, [userId, loadHealthData]);

  // Handle AppState changes (e.g. returning from browser after OAuth)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', async nextAppState => {
      if (nextAppState === 'active' && userId) {
        // When returning to foreground, always check status if not connected 
        // or refresh data if already connected.
        const storedGoogleFit = await AsyncStorage.getItem(STORAGE_KEYS.GOOGLE_FIT_CONNECTED);
        
        if (storedGoogleFit === 'true' || !isGoogleFitConnected) {
          if (__DEV__) console.log('🏠 [HealthContext] Refreshing Google Fit status...');
          await checkGoogleFitStatus();
        }
        
        syncRewards(true);
      }
    });

    return () => {
      subscription.remove();
    };
  }, [userId, isGoogleFitConnected, checkGoogleFitStatus, syncRewards]);

  return useMemo(() => ({
    hasHealthSetup,
    healthMetrics,
    dailyGoals,
    rewardsPoints,
    streak,
    unlockedBadges,
    redeemedRewards,
    isGoogleFitConnected,
    riskStatus,
    riskProbability,
    isHealthLoading,
    setWater,
    fetchDailyMetrics,
    syncGoogleFitData,
    setHasHealthSetup,
    setHealthMetrics,
    updateHealthMetrics,
    updateDailyGoals,
    fetchDailyGoals,
    connectGoogleFit,
    redeemReward,
    syncRewards,
    awardPoints,
  }), [
    hasHealthSetup, healthMetrics, dailyGoals, rewardsPoints, streak, 
    unlockedBadges, redeemedRewards,
    isGoogleFitConnected, riskStatus, riskProbability, isHealthLoading,
    setWater, fetchDailyMetrics, syncGoogleFitData, updateHealthMetrics, updateDailyGoals, fetchDailyGoals, connectGoogleFit, redeemReward, syncRewards, awardPoints
  ]);
});
