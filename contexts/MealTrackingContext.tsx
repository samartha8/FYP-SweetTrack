import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Platform } from 'react-native';
import { useUser } from './UserContext';

export type MealLog = {
  id: string;
  date: string;
  imageUri?: string;
  foodItems: {
    name: string;
    confidence: number;
  }[];
  nutritionalInfo: {
    calories: number;
    carbs: number;
    protein: number;
    fat: number;
    sugar?: number;
    fiber?: number;
    sodium?: number;
  };
  servingSize: string;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  notes?: string;
  backendId?: string;
};

export type WeeklyStats = {
  totalCalories: number;
  avgCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  mealsLogged: number;
};

export type DailyNutrition = {
  date: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  mealsCount: number;
};

const BASE_STORAGE_KEY = '@sweettrack_meal_logs';

const normalizeApiUrl = (url: string) => {
  const trimmed = url.replace(/\/$/, '');
  return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
};

const getApiBaseUrl = () => {
  const envBase = process.env.EXPO_PUBLIC_API_BASE_URL || process.env.API_BASE_URL;
  if (envBase) return normalizeApiUrl(envBase);

  if (Platform.OS === 'web') return 'http://localhost:5000/api';

  const hostOverride = process.env.EXPO_PUBLIC_API_HOST || process.env.API_HOST;
  const port = process.env.EXPO_PUBLIC_API_PORT || process.env.API_PORT || '5000';
  const defaultIP = '10.0.2.2';
  const hostIP = hostOverride || (__DEV__ ? defaultIP : '192.168.0.111');
  return `http://${hostIP}:${port}/api`;
};

const API_BASE_URL = getApiBaseUrl();

export const fixupImageUrl = (url?: string) => {
  if (!url || !url.startsWith('http')) return url;
  const apiHost = API_BASE_URL.split('/')[2];
  // Replace anything between http:// and the first /uploads or similar path with current apiHost
  // This handles localhost, 127.0.0.1, or stale IP addresses
  return url.replace(/https?:\/\/([^\/]+)/, `http://${apiHost}`);
};

export const [MealTrackingProvider, useMealTracking] = createContextHook(() => {
  const [mealLogs, setMealLogs] = useState<MealLog[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedDietPlan, setSelectedDietPlan] = useState<string>('balanced');
  const { user, ensureAccessToken, isLoading: isAuthLoading } = useUser();

  const getUserStorageKey = (userId: string) => `${BASE_STORAGE_KEY}_${userId}`;

  useEffect(() => {
    // Wait for UserContext to finish loading initial state
    if (isAuthLoading) return;

    if (user?.id) {
      loadMealLogs(user.id);
    } else {
      // Only clear if we are definitely not logged in
      setMealLogs([]);
    }
  }, [user?.id, isLoading]);

  const saveMealLogs = async (logs: MealLog[], userId: string) => {
    try {
      await AsyncStorage.setItem(getUserStorageKey(userId), JSON.stringify(logs));
    } catch (error) {
      console.error('Error saving meal logs:', error);
    }
  };

  const loadMealLogs = async (userId: string, isRetry = false) => {
    try {
      setIsLoading(true);
      const storageKey = getUserStorageKey(userId);
      const stored = await AsyncStorage.getItem(storageKey);

      if (stored) {
        const parsed = JSON.parse(stored);
        // Ensure image URIs are fixed up even for cached data
        const fixed = parsed.map((log: any) => ({
          ...log,
          imageUri: fixupImageUrl(log.imageUri)
        }));
        setMealLogs(fixed);
      } else if (!isRetry) {
        // Only reset if first load and no storage found
        setMealLogs([]);
      }

      // Fetch latest from backend if token exists
      const token = await ensureAccessToken?.(isRetry);
      if (token) {
        console.log(`[MealTracking] Fetching logs for user ${userId} from backend...`);
        const res = await fetch(`${API_BASE_URL}/meals`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (res.status === 401 && !isRetry) {
          console.warn('[MealTracking] 401 Unauthorized on load - retrying with fresh token');
          return loadMealLogs(userId, true);
        }

        const data = await res.json();

        if (res.ok && data.success && data.mealLogs) {
          console.log(`[MealTracking] Received ${data.mealLogs.length} logs from backend`);

          const normalized = data.mealLogs.map((log: any) => ({
            id: log._id,
            backendId: log._id,
            date: log.loggedAt || log.createdAt,
            imageUri: fixupImageUrl(log.imageUrl),
            foodItems: log.foodItems || [],
            nutritionalInfo: log.nutritionalInfo,
            servingSize: log.servingSize,
            mealType: log.mealType,
            notes: log.notes,
          }));

          setMealLogs(prev => {
            const backendIds = new Set<string>(normalized.map((m: any) => m.id));
            const localOnly = prev.filter((m: MealLog) => !m.backendId || !backendIds.has(m.backendId));
            const merged = [...normalized, ...localOnly].sort((a, b) =>
              new Date(b.date).getTime() - new Date(a.date).getTime()
            );

            saveMealLogs(merged, userId);
            return merged;
          });
        }
      }
    } catch (error) {
      console.error('[MealTracking] Failed to load logs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const addMealLog = useCallback(async (meal: Omit<MealLog, 'id' | 'date'> & { imageFileUri?: string }, isRetry = false): Promise<MealLog> => {
    const token = await ensureAccessToken?.(isRetry);
    const isServerUrl = meal.imageUri?.startsWith('http') && !meal.imageUri?.includes('file://');

    const form = new FormData();
    form.append('mealType', meal.mealType);
    form.append('foodItems', JSON.stringify(meal.foodItems || []));
    form.append('nutritionalInfo', JSON.stringify(meal.nutritionalInfo));
    if (meal.servingSize) form.append('servingSize', meal.servingSize);
    if (meal.notes) form.append('notes', meal.notes);
    form.append('loggedAt', new Date().toISOString());

    if (meal.imageUri && !isServerUrl) {
      const uriParts = meal.imageUri.split('.');
      const ext = uriParts[uriParts.length - 1];
      form.append('image', {
        uri: meal.imageUri,
        name: `meal.${ext || 'jpg'}`,
        type: `image/${ext || 'jpeg'}`,
      } as any);
    } else if (meal.imageUri && isServerUrl) {
      form.append('imageUrl', meal.imageUri);
    }

    console.log('[MealTracking] Adding meal log, imageUri:', meal.imageUri, 'isServerUrl:', isServerUrl);
    let backendLog: any = null;
    if (token) {
      try {
        const res = await fetch(`${API_BASE_URL}/meals`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
          body: form as any,
        });

        if (res.status === 401 && !isRetry) {
          console.warn('[MealTracking] 401 Unauthorized on add - retrying');
          return addMealLog(meal, true);
        }

        const data = await res.json();
        console.log('[MealTracking] Backend response:', data?.success ? 'SUCCESS' : 'FAILED', data?.message);
        if (res.ok && data.success) {
          backendLog = data.mealLog;
          console.log('[MealTracking] Backend imageUrl:', backendLog?.imageUrl);
        } else {
          console.error('Backend meal log failed:', data?.message);
        }
      } catch (error) {
        console.error('Meal upload failed:', error);
      }
    }

    const newMeal: MealLog = {
      ...meal,
      id: backendLog?._id || Date.now().toString(),
      backendId: backendLog?._id,
      date: backendLog?.loggedAt || new Date().toISOString(),
      // Apply fixupImageUrl to the backend URI if present
      imageUri: backendLog?.imageUrl ? fixupImageUrl(backendLog.imageUrl) : meal.imageUri,
    };
    console.log('[MealTracking] Final newMeal imageUri:', newMeal.imageUri);

    setMealLogs(prev => {
      const updated = [newMeal, ...prev];
      if (user?.id) saveMealLogs(updated, user.id);
      return updated;
    });

    return newMeal;
  }, [ensureAccessToken, user?.id]);

  const deleteMealLog = useCallback(async (mealId: string, backendId?: string) => {
    setMealLogs(prev => {
      const updated = prev.filter(meal => meal.id !== mealId && meal.backendId !== backendId);
      if (user?.id) saveMealLogs(updated, user.id);
      return updated;
    });

    const token = await ensureAccessToken?.();
    if (token && backendId) {
      try {
        await fetch(`${API_BASE_URL}/meals/${backendId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        });
      } catch (error) {
        console.error('Backend delete meal log failed:', error);
      }
    }
  }, [ensureAccessToken, user?.id]);

  const updateMealLog = useCallback(async (mealId: string, updates: Partial<MealLog>) => {
    setMealLogs(prev => {
      const updated = prev.map(meal =>
        meal.id === mealId ? { ...meal, ...updates } : meal
      );
      if (user?.id) saveMealLogs(updated, user.id);
      return updated;
    });
  }, []);

  const getTodayMeals = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return mealLogs.filter(meal => {
      const mealDate = new Date(meal.date);
      return mealDate >= today && mealDate < tomorrow;
    });
  }, [mealLogs]);

  const getWeekMeals = useMemo(() => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    return mealLogs.filter(meal => {
      const mealDate = new Date(meal.date);
      return mealDate >= weekAgo;
    });
  }, [mealLogs]);

  const todayNutrition = useMemo(() => {
    const totals = getTodayMeals.reduce((acc, meal) => ({
      calories: acc.calories + meal.nutritionalInfo.calories,
      protein: acc.protein + meal.nutritionalInfo.protein,
      carbs: acc.carbs + meal.nutritionalInfo.carbs,
      fat: acc.fat + meal.nutritionalInfo.fat,
      sugar: acc.sugar + (meal.nutritionalInfo.sugar || 0),
      fiber: acc.fiber + (meal.nutritionalInfo.fiber || 0),
      sodium: acc.sodium + (meal.nutritionalInfo.sodium || 0),
    }), {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      sugar: 0,
      fiber: 0,
      sodium: 0,
    });

    return {
      calories: Math.round(totals.calories),
      protein: parseFloat(totals.protein.toFixed(1)),
      carbs: parseFloat(totals.carbs.toFixed(1)),
      fat: parseFloat(totals.fat.toFixed(1)),
      sugar: parseFloat(totals.sugar.toFixed(1)),
      fiber: parseFloat(totals.fiber.toFixed(1)),
      sodium: parseFloat(totals.sodium.toFixed(1)),
    };
  }, [getTodayMeals]);

  const weeklyStats = useMemo((): WeeklyStats => {
    const totalCalories = getWeekMeals.reduce((sum, meal) =>
      sum + meal.nutritionalInfo.calories, 0
    );
    const totalProtein = getWeekMeals.reduce((sum, meal) =>
      sum + meal.nutritionalInfo.protein, 0
    );
    const totalCarbs = getWeekMeals.reduce((sum, meal) =>
      sum + meal.nutritionalInfo.carbs, 0
    );
    const totalFat = getWeekMeals.reduce((sum, meal) =>
      sum + meal.nutritionalInfo.fat, 0
    );

    return {
      totalCalories: Math.round(totalCalories),
      avgCalories: getWeekMeals.length > 0 ? Math.round(totalCalories / 7) : 0,
      totalProtein: parseFloat(totalProtein.toFixed(1)),
      totalCarbs: parseFloat(totalCarbs.toFixed(1)),
      totalFat: parseFloat(totalFat.toFixed(1)),
      mealsLogged: getWeekMeals.length,
    };
  }, [getWeekMeals]);

  const getDailyNutritionForWeek = useMemo((): DailyNutrition[] => {
    const days: DailyNutrition[] = [];

    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateString = date.toDateString();

      const dayMeals = mealLogs.filter(meal => {
        const mealDate = new Date(meal.date).toDateString();
        return mealDate === dateString;
      });

      const nutrition = dayMeals.reduce((acc, meal) => ({
        calories: acc.calories + meal.nutritionalInfo.calories,
        protein: acc.protein + meal.nutritionalInfo.protein,
        carbs: acc.carbs + meal.nutritionalInfo.carbs,
        fat: acc.fat + meal.nutritionalInfo.fat,
      }), {
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
      });

      days.push({
        date: dateString,
        ...nutrition,
        mealsCount: dayMeals.length,
      });
    }

    return days;
  }, [mealLogs]);

  const getMealsByType = useCallback((mealType: MealLog['mealType']) => {
    return mealLogs.filter(meal => meal.mealType === mealType);
  }, [mealLogs]);

  const clearAllMealLogs = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(BASE_STORAGE_KEY);
      setMealLogs([]);
    } catch (error) {
      console.error('Error clearing meal logs:', error);
    }
  }, []);

  return useMemo(() => ({
    mealLogs,
    isLoading,
    selectedDietPlan,
    setSelectedDietPlan,
    addMealLog,
    deleteMealLog,
    updateMealLog,
    getTodayMeals,
    getWeekMeals,
    todayNutrition,
    weeklyStats,
    getDailyNutritionForWeek,
    getMealsByType,
    clearAllMealLogs,
  }), [
    mealLogs,
    isLoading,
    selectedDietPlan,
    addMealLog,
    deleteMealLog,
    updateMealLog,
    getTodayMeals,
    getWeekMeals,
    todayNutrition,
    weeklyStats,
    getDailyNutritionForWeek,
    getMealsByType,
    clearAllMealLogs,
  ]);
});

type MealTrackingContextType = {
  mealLogs: MealLog[];
  isLoading: boolean;
  selectedDietPlan: string;
  setSelectedDietPlan: (plan: string) => void;
  addMealLog: (meal: Omit<MealLog, 'id' | 'date'>) => Promise<MealLog>;
  deleteMealLog: (mealId: string) => Promise<void>;
  updateMealLog: (mealId: string, updates: Partial<MealLog>) => Promise<void>;
  getTodayMeals: MealLog[];
  getWeekMeals: MealLog[];
  todayNutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    sugar: number;
    fiber: number;
    sodium: number;
  };
  weeklyStats: WeeklyStats;
  getDailyNutritionForWeek: DailyNutrition[];
  getMealsByType: (mealType: MealLog['mealType']) => MealLog[];
  clearAllMealLogs: () => Promise<void>;
};
