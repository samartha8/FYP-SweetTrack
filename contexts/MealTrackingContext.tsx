import { createContextHook } from '@/hooks/use-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Platform } from 'react-native';
import { useUser } from './UserContext';
import { DIET_PLANS, DietPlan } from '@/constants/foodData';

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

import { MEAL_URL } from '@/constants/Api';

const API_BASE_URL = MEAL_URL;

export const fixupImageUrl = (url?: string) => {
  if (!url || !url.startsWith('http')) return url;
  // Use the host from the centralized MEAL_URL if possible, otherwise use local-first fallback
  const apiHost = API_BASE_URL.split('/')[2];
  // Replace anything between http:// and the first /uploads or similar path with current apiHost
  return url.replace(/https?:\/\/([^\/]+)/, `http://${apiHost}`);
};

export const [MealTrackingProvider, useMealTracking] = createContextHook(() => {
  const [mealLogs, setMealLogs] = useState<MealLog[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedDietPlan, setSelectedDietPlanState] = useState<string>('balanced');

  const setSelectedDietPlan = useCallback(async (planId: string) => {
    setSelectedDietPlanState(planId);
    try {
      await AsyncStorage.setItem('@sweettrack_selected_diet', planId);
    } catch (e) {
      console.error('Failed to save diet plan', e);
    }
  }, []);

  useEffect(() => {
    const loadDietPlan = async () => {
      try {
        const stored = await AsyncStorage.getItem('@sweettrack_selected_diet');
        if (stored) setSelectedDietPlanState(stored);
      } catch (e) {
        console.error('Failed to load diet plan', e);
      }
    };
    loadDietPlan();
  }, []);

  const activeDietDetails = useMemo(() => {
    return DIET_PLANS.find(p => p.id === selectedDietPlan) || DIET_PLANS.find(p => p.id === 'balanced')!;
  }, [selectedDietPlan]);
  const { user, ensureAccessToken, isLoading: isAuthLoading, syncGoogleFitData } = useUser();
  const lastUserRef = useRef<any>(null);

  const lastLoadedUserId = useRef<string | null>(null);
  const isFetching = useRef<boolean>(false);
  const fetchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mealLogsCount = useRef<number>(0);

  const getUserStorageKey = useCallback((userId: string) => `${BASE_STORAGE_KEY}_${userId}`, []);

  const saveMealLogs = useCallback(async (logs: MealLog[], userId: string) => {
    try {
      await AsyncStorage.setItem(getUserStorageKey(userId), JSON.stringify(logs));
    } catch (error) {
      console.error('Error saving meal logs:', error);
    }
  }, [getUserStorageKey]);

  const loadMealLogs = useCallback(async (userId: string, isRetry = false) => {
    // If we're already fetching for this user and it's not a retry, skip
    if (isFetching.current && !isRetry) {
      if (__DEV__) console.log('[MealTracking] Already fetching, skipping load for user:', userId);
      return;
    }

    // If we just loaded this user and it's not a retry, skip
    if (lastLoadedUserId.current === userId && !isRetry) {
      if (__DEV__) console.log('[MealTracking] Meal logs already loaded for user:', userId);
      setIsLoading(false);
      return;
    }

    // Lock both synchronously to prevent race conditions during subsequent renders/effects
    isFetching.current = true;
    lastLoadedUserId.current = userId;

    try {
      setIsLoading(true);
      if (__DEV__) console.log(`[MealTracking] ${isRetry ? 'Retrying' : 'Loading'} logs for user ${userId}...`);

      const storageKey = getUserStorageKey(userId);
      const stored = await AsyncStorage.getItem(storageKey);

      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            const fixed = parsed.map((log: any) => ({
              ...log,
              imageUri: fixupImageUrl(log.imageUri)
            }));
            setMealLogs(fixed);
            mealLogsCount.current = fixed.length;
          }
        } catch (e) {
          console.error('[MealTracking] Failed to parse stored logs:', e);
        }
      } else if (!isRetry) {
        setMealLogs([]);
        mealLogsCount.current = 0;
      }

      // Fetch latest from backend if token exists
      let token = await ensureAccessToken?.(isRetry);
      if (token) {
        if (__DEV__) console.log(`[MealTracking] Fetching from backend: ${API_BASE_URL}`);
        let res = await fetch(`${API_BASE_URL}`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        // Handle 401 retry linearly
        if (res.status === 401 && !isRetry) {
          console.warn('[MealTracking] 401 Unauthorized - retrying with fresh token');
          token = await ensureAccessToken?.(true);
          if (!token) { // If refresh fails, return early
            console.error('[MealTracking] Failed to refresh token, cannot fetch meals.');
            setIsLoading(false); // Ensure loading state is reset
            return; // Stop execution of loadMealLogs
          }
          // If token is successfully refreshed, retry the fetch
          res = await fetch(`${API_BASE_URL}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
        }

        if (res.ok) {
          const data = await res.json();
          if (data.success && data.mealLogs) {
            if (__DEV__) console.log(`[MealTracking] Received ${data.mealLogs.length} logs from backend`);

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

              // Update count and storage. Ref is sync, storage is async fire-and-forget here.
              mealLogsCount.current = merged.length;
              saveMealLogs(merged, userId).catch(e => console.error('[MealTracking] Save failed:', e));

              return merged;
            });
          }
        }
      }
    } catch (error) {
      console.error('[MealTracking] Failed to load logs:', error);
      // On failure, reset the lock so it can be retried on next user-driven event
      lastLoadedUserId.current = null;
    } finally {
      setIsLoading(false);
      isFetching.current = false;
    }
  }, [ensureAccessToken, getUserStorageKey, saveMealLogs]);

  const loadMealLogsRef = useRef(loadMealLogs);
  useEffect(() => {
    if (loadMealLogsRef.current !== loadMealLogs) {
      if (__DEV__) console.log('[MealTracking] loadMealLogs identity changed');
      loadMealLogsRef.current = loadMealLogs;
    }
  }, [loadMealLogs]);

  useEffect(() => {
    // Wait for UserContext to finish loading initial state
    if (isAuthLoading) return;

    if (user?.id) {
      if (__DEV__ && lastUserRef.current !== user) {
        console.log('[MealTracking] User object identity changed. ID:', user.id);
        lastUserRef.current = user;
      }
      
      const userId = user.id;
      if (__DEV__) console.log('[MealTracking] Effect trigger for user:', userId);
      
      // Debounce the load
      if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current);
      fetchTimeoutRef.current = setTimeout(() => {
        loadMealLogs(userId);
      }, 150);
    } else {
      lastLoadedUserId.current = null;
      setMealLogs([]);
      setIsLoading(false);
    }

    return () => {
      if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current);
    };
  }, [user?.id, isAuthLoading, loadMealLogs]);

  const addMealLog = useCallback(async (meal: Omit<MealLog, 'id' | 'date'> & { imageFileUri?: string }, isRetry = false): Promise<MealLog> => {
    // 1. Create the temporary local meal object
    const tempId = `temp-${Date.now()}`;
    const newMeal: MealLog = {
      ...meal,
      id: tempId,
      date: new Date().toISOString(),
    };

    // 2. IMMEDIATELY update local state (Optimistic)
    setMealLogs(prev => {
      const updated = [newMeal, ...prev];
      mealLogsCount.current = updated.length;
      if (user?.id) saveMealLogs(updated, user.id);
      
      // Post-add sync
      syncGoogleFitData().catch(e => console.log('[MealTracking] Post-add sync failed:', e));
      
      return updated;
    });

    // 3. Perform background server sync
    (async () => {
      const token = await ensureAccessToken?.(isRetry);
      const isServerUrl = meal.imageUri?.startsWith('http') && !meal.imageUri?.includes('file://');

      if (!token) return;

      try {
        const headers: any = {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        };

        let body;
        if (isServerUrl) {
          headers['Content-Type'] = 'application/json';
          body = JSON.stringify({
            mealType: meal.mealType,
            foodItems: meal.foodItems || [],
            nutritionalInfo: meal.nutritionalInfo,
            servingSize: meal.servingSize,
            notes: meal.notes,
            loggedAt: newMeal.date,
            imageUrl: meal.imageUri
          });
        } else {
          const form = new FormData();
          form.append('mealType', meal.mealType);
          form.append('foodItems', JSON.stringify(meal.foodItems || []));
          form.append('nutritionalInfo', JSON.stringify(meal.nutritionalInfo));
          if (meal.servingSize) form.append('servingSize', meal.servingSize);
          if (meal.notes) form.append('notes', meal.notes);
          form.append('loggedAt', newMeal.date);

          if (meal.imageUri) {
            const uriParts = meal.imageUri.split('.');
            const ext = uriParts[uriParts.length - 1];
            form.append('image', {
              uri: meal.imageUri,
              name: `meal.${ext || 'jpg'}`,
              type: `image/${ext || 'jpeg'}`,
            } as any);
          }
          body = form as any;
        }

        const res = await fetch(`${API_BASE_URL}`, {
          method: 'POST',
          headers,
          body,
        });

        if (res.status === 401 && !isRetry) {
          return addMealLog(meal, true);
        }

        const data = await res.json();
        if (res.ok && data.success && data.mealLog) {
          const backendLog = data.mealLog;
          
          // 4. Update the local entry with official backend data
          setMealLogs(prev => {
            const updated = prev.map(m => 
              m.id === tempId ? {
                ...m,
                id: backendLog._id,
                backendId: backendLog._id,
                imageUri: fixupImageUrl(backendLog.imageUrl) || m.imageUri,
                date: backendLog.loggedAt || m.date
              } : m
            );
            if (user?.id) saveMealLogs(updated, user.id);
            return updated;
          });
          console.log('[MealTracking] Background sync successful for:', tempId);
        }
      } catch (error) {
        console.error('[MealTracking] Background sync failed:', error);
      }
    })();

    return newMeal;
  }, [ensureAccessToken, user?.id, saveMealLogs, syncGoogleFitData]);

  const deleteMealLog = useCallback(async (mealId: string, backendId?: string) => {
    setMealLogs(prev => {
      const updated = prev.filter(meal => meal.id !== mealId && meal.backendId !== backendId);
      mealLogsCount.current = updated.length;
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
        
        // Trigger health metrics sync to update global 'caloriesConsumed'
        syncGoogleFitData().catch(e => console.error('[MealTracking] Post-delete sync failed:', e));
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
    const todayStr = new Date().toDateString();
    return mealLogs.filter(meal => {
      return new Date(meal.date).toDateString() === todayStr;
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
      calories: acc.calories + (Number(meal.nutritionalInfo.calories) || 0),
      protein: acc.protein + (Number(meal.nutritionalInfo.protein) || 0),
      carbs: acc.carbs + (Number(meal.nutritionalInfo.carbs) || 0),
      fat: acc.fat + (Number(meal.nutritionalInfo.fat) || 0),
      sugar: acc.sugar + (Number(meal.nutritionalInfo.sugar) || 0),
      fiber: acc.fiber + (Number(meal.nutritionalInfo.fiber) || 0),
      sodium: acc.sodium + (Number(meal.nutritionalInfo.sodium) || 0),
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
      mealLogsCount.current = 0;
      setMealLogs([]);
    } catch (error) {
      console.error('Error clearing meal logs:', error);
    }
  }, []);

  const getDailyRecap = useCallback(async () => {
    try {
      const token = await ensureAccessToken?.();
      if (!token) return null;

      const res = await fetch(`${API_BASE_URL}/daily-recap`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      return data.success ? data : null;
    } catch (error) {
      console.error('Error fetching daily recap:', error);
      return null;
    }
  }, [ensureAccessToken]);

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
    getDailyRecap,
    activeDietDetails,
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
    getDailyRecap,
    activeDietDetails,
  ]);
});

type MealTrackingContextType = {
  mealLogs: MealLog[];
  isLoading: boolean;
  selectedDietPlan: string;
  setSelectedDietPlan: (plan: string) => void;
  addMealLog: (meal: Omit<MealLog, 'id' | 'date'> & { imageFileUri?: string }) => Promise<MealLog>;
  deleteMealLog: (mealId: string, backendId?: string) => Promise<void>;
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
  getDailyRecap: () => Promise<any>;
  activeDietDetails: DietPlan;
};
