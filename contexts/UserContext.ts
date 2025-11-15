import { createContextHook } from '@/hooks/use-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState, useEffect, useCallback, useMemo } from 'react';

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
};

export type HealthMetrics = {
  steps: number;
  water: number;
  sleep: number;
  calories: number;
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
};

export const [UserProvider, useUser] = createContextHook(() => {
  const [user, setUser] = useState<User | null>(null);
  const [hasOnboarded, setHasOnboarded] = useState<boolean>(false);
  const [hasHealthSetup, setHasHealthSetup] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [healthMetrics, setHealthMetrics] = useState<HealthMetrics>({
    steps: 0,
    water: 0,
    sleep: 0,
    calories: 0,
  });
  const [dailyGoals, setDailyGoals] = useState<DailyGoals>({
    steps: 10000,
    water: 8,
    sleep: 8,
    calories: 2000,
  });
  const [rewardsPoints, setRewardsPoints] = useState<number>(0);
  const [streak, setStreak] = useState<number>(0);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      // Add timeout for web platform to prevent hanging
      const loadPromise = Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.USER).catch(() => null),
        AsyncStorage.getItem(STORAGE_KEYS.HAS_ONBOARDED).catch(() => null),
        AsyncStorage.getItem(STORAGE_KEYS.HAS_HEALTH_SETUP).catch(() => null),
        AsyncStorage.getItem(STORAGE_KEYS.HEALTH_METRICS).catch(() => null),
        AsyncStorage.getItem(STORAGE_KEYS.DAILY_GOALS).catch(() => null),
        AsyncStorage.getItem(STORAGE_KEYS.REWARDS_POINTS).catch(() => null),
        AsyncStorage.getItem(STORAGE_KEYS.STREAK).catch(() => null),
      ]);

      // Set a timeout to prevent infinite waiting on web
      const timeoutPromise = new Promise((resolve) => 
        setTimeout(() => resolve([null, null, null, null, null, null, null]), 2000)
      );

      const [
        storedUser,
        storedOnboarded,
        storedHealthSetup,
        storedMetrics,
        storedGoals,
        storedPoints,
        storedStreak,
      ] = await Promise.race([loadPromise, timeoutPromise]) as any;

      // Parse values only if they exist and are not null
      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser));
        } catch (e) {
          console.error('Error parsing user:', e);
        }
      }
      
      if (storedOnboarded) {
        try {
          const parsed = JSON.parse(storedOnboarded);
          setHasOnboarded(parsed === true || parsed === 'true');
        } catch (e) {
          console.error('Error parsing onboarded:', e);
          setHasOnboarded(false);
        }
      } else {
        setHasOnboarded(false);
      }
      
      if (storedHealthSetup) {
        try {
          const parsed = JSON.parse(storedHealthSetup);
          setHasHealthSetup(parsed === true || parsed === 'true');
        } catch (e) {
          console.error('Error parsing health setup:', e);
          setHasHealthSetup(false);
        }
      } else {
        setHasHealthSetup(false);
      }
      
      if (storedMetrics) {
        try {
          setHealthMetrics(JSON.parse(storedMetrics));
        } catch (e) {
          console.error('Error parsing metrics:', e);
        }
      }
      
      if (storedGoals) {
        try {
          setDailyGoals(JSON.parse(storedGoals));
        } catch (e) {
          console.error('Error parsing goals:', e);
        }
      }
      
      if (storedPoints) {
        try {
          setRewardsPoints(JSON.parse(storedPoints));
        } catch (e) {
          console.error('Error parsing points:', e);
        }
      }
      
      if (storedStreak) {
        try {
          setStreak(JSON.parse(storedStreak));
        } catch (e) {
          console.error('Error parsing streak:', e);
        }
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      // Reset to default state on error
      setHasOnboarded(false);
      setHasHealthSetup(false);
      setUser(null);
      // Ensure loading is set to false even on error
    } finally {
      // Always set loading to false, even if there was an error
      setIsLoading(false);
      console.log('User data loading complete');
    }
  };

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
    } catch (error) {
      console.error('Error completing health setup:', error);
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const storedUser = await AsyncStorage.getItem(STORAGE_KEYS.USER);
      if (storedUser) {
        const user = JSON.parse(storedUser);
        setUser(user);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error logging in:', error);
      return false;
    }
  }, []);

  const signup = useCallback(async (name: string, email: string, password: string) => {
    const newUser: User = {
      id: Date.now().toString(),
      name,
      email,
    };
    
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(newUser));
      setUser(newUser);
      return true;
    } catch (error) {
      console.error('Error signing up:', error);
      return false;
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

  const updateHealthMetrics = useCallback(async (metrics: Partial<HealthMetrics>) => {
    const updated = { ...healthMetrics, ...metrics };
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.HEALTH_METRICS, JSON.stringify(updated));
      setHealthMetrics(updated);
    } catch (error) {
      console.error('Error updating health metrics:', error);
    }
  }, [healthMetrics]);

  const updateDailyGoals = useCallback(async (goals: Partial<DailyGoals>) => {
    const updated = { ...dailyGoals, ...goals };
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.DAILY_GOALS, JSON.stringify(updated));
      setDailyGoals(updated);
    } catch (error) {
      console.error('Error updating daily goals:', error);
    }
  }, [dailyGoals]);

  const resetApp = useCallback(async () => {
    try {
      // Clear all AsyncStorage data
      await Promise.all([
        AsyncStorage.removeItem(STORAGE_KEYS.USER),
        AsyncStorage.removeItem(STORAGE_KEYS.HAS_ONBOARDED),
        AsyncStorage.removeItem(STORAGE_KEYS.HAS_HEALTH_SETUP),
        AsyncStorage.removeItem(STORAGE_KEYS.HEALTH_METRICS),
        AsyncStorage.removeItem(STORAGE_KEYS.DAILY_GOALS),
        AsyncStorage.removeItem(STORAGE_KEYS.REWARDS_POINTS),
        AsyncStorage.removeItem(STORAGE_KEYS.STREAK),
      ]);

      // Reset all state to defaults
      setUser(null);
      setHasOnboarded(false);
      setHasHealthSetup(false);
      setHealthMetrics({
        steps: 0,
        water: 0,
        sleep: 0,
        calories: 0,
      });
      setDailyGoals({
        steps: 10000,
        water: 8,
        sleep: 8,
        calories: 2000,
      });
      setRewardsPoints(0);
      setStreak(0);
    } catch (error) {
      console.error('Error resetting app:', error);
    }
  }, []);

  return useMemo(() => ({
    user,
    hasOnboarded,
    hasHealthSetup,
    isLoading,
    healthMetrics,
    dailyGoals,
    rewardsPoints,
    streak,
    completeOnboarding,
    completeHealthSetup,
    login,
    signup,
    updateUser,
    updateHealthMetrics,
    updateDailyGoals,
    resetApp,
  }), [user, hasOnboarded, hasHealthSetup, isLoading, healthMetrics, dailyGoals, rewardsPoints, 
    streak, completeOnboarding, completeHealthSetup, login, signup, updateUser, 
    updateHealthMetrics, updateDailyGoals, resetApp]);
});