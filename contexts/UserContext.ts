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
  medicalHistory?: string[];
};

export type HealthMetrics = {
  steps: number;
  water: number;
  sleep: number;
  calories: number;
  weight?: number;
  glucose?: number;
  bloodPressure?: { systolic: number; diastolic: number };
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
      const [
        storedUser,
        storedOnboarded,
        storedHealthSetup,
        storedMetrics,
        storedGoals,
        storedPoints,
        storedStreak,
      ] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.USER),
        AsyncStorage.getItem(STORAGE_KEYS.HAS_ONBOARDED),
        AsyncStorage.getItem(STORAGE_KEYS.HAS_HEALTH_SETUP),
        AsyncStorage.getItem(STORAGE_KEYS.HEALTH_METRICS),
        AsyncStorage.getItem(STORAGE_KEYS.DAILY_GOALS),
        AsyncStorage.getItem(STORAGE_KEYS.REWARDS_POINTS),
        AsyncStorage.getItem(STORAGE_KEYS.STREAK),
      ]);

      if (storedUser) setUser(JSON.parse(storedUser));
      if (storedOnboarded) setHasOnboarded(JSON.parse(storedOnboarded));
      if (storedHealthSetup) setHasHealthSetup(JSON.parse(storedHealthSetup));
      if (storedMetrics) setHealthMetrics(JSON.parse(storedMetrics));
      if (storedGoals) setDailyGoals(JSON.parse(storedGoals));
      if (storedPoints) setRewardsPoints(JSON.parse(storedPoints));
      if (storedStreak) setStreak(JSON.parse(storedStreak));
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setIsLoading(false);
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
    // In a real app, this would authenticate and load user from backend
    // For now, check if user exists in storage, otherwise create dummy user
    try {
      const storedUser = await AsyncStorage.getItem(STORAGE_KEYS.USER);
      if (storedUser) {
        const user = JSON.parse(storedUser);
        setUser(user);
        // Check if user has health data - if they do, they've likely completed setup
        // But we rely on hasHealthSetup flag which is loaded separately
        return true;
      } else {
        // Create new user for first-time login (shouldn't happen in real app)
        const dummyUser: User = {
          id: '1',
          name: 'John Doe',
          email,
          medicalHistory: [],
        };
        await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(dummyUser));
        setUser(dummyUser);
        return true;
      }
    } catch (error) {
      console.error('Error logging in:', error);
      return false;
    }
  }, []);

  const signup = useCallback(async (name: string, email: string, password: string) => {
    const dummyUser: User = {
      id: Date.now().toString(),
      name,
      email,
      medicalHistory: [],
    };
    
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(dummyUser));
      setUser(dummyUser);
      return true;
    } catch (error) {
      console.error('Error signing up:', error);
      return false;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.USER);
      setUser(null);
    } catch (error) {
      console.error('Error logging out:', error);
    }
  }, []);

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
    // Allow updating even if user is null (for initial setup)
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
    const resetMetrics: HealthMetrics = {
      steps: 0,
      water: 0,
      sleep: 0,
      calories: 0,
    };
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.HEALTH_METRICS, JSON.stringify(resetMetrics));
      setHealthMetrics(resetMetrics);
    } catch (error) {
      console.error('Error resetting daily metrics:', error);
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
    logout,
    resetOnboarding,
    updateUser,
    updateHealthMetrics,
    updateDailyGoals,
    addRewardPoints,
    resetDailyMetrics,
  }), [
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
    logout,
    resetOnboarding,
    updateUser,
    updateHealthMetrics,
    updateDailyGoals,
    addRewardPoints,
    resetDailyMetrics,
  ]);
});
