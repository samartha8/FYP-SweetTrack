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

const STORAGE_KEY = '@sweettrack_meal_logs';

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

export const [MealTrackingProvider, useMealTracking] = createContextHook(() => {
  const [mealLogs, setMealLogs] = useState<MealLog[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedDietPlan, setSelectedDietPlan] = useState<string>('balanced');
  const { ensureAccessToken } = useUser();

  useEffect(() => {
    loadMealLogs();
  }, []);

  const loadMealLogs = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        setMealLogs(JSON.parse(stored));
      }
      // Fetch latest from backend if token exists
      const token = await ensureAccessToken?.();
      if (token) {
        const res = await fetch(`${API_BASE_URL}/meals`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (res.ok && data.success && data.mealLogs) {
          const normalized = data.mealLogs.map((log: any) => ({
            id: log._id,
            backendId: log._id,
            date: log.loggedAt || log.createdAt,
            imageUri: log.imageUrl,
            foodItems: log.foodItems || [],
            nutritionalInfo: log.nutritionalInfo,
            servingSize: log.servingSize,
            mealType: log.mealType,
            notes: log.notes,
          }));
          setMealLogs(normalized);
          await saveMealLogs(normalized);
        }
      }
    } catch (error) {
      console.error('Error loading meal logs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveMealLogs = async (logs: MealLog[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
    } catch (error) {
      console.error('Error saving meal logs:', error);
    }
  };

  const addMealLog = useCallback(async (meal: Omit<MealLog, 'id' | 'date'> & { imageFileUri?: string }) => {
    const token = await ensureAccessToken?.();
    const form = new FormData();
    form.append('mealType', meal.mealType);
    form.append('foodItems', JSON.stringify(meal.foodItems || []));
    form.append('nutritionalInfo', JSON.stringify(meal.nutritionalInfo));
    if (meal.servingSize) form.append('servingSize', meal.servingSize);
    if (meal.notes) form.append('notes', meal.notes);
    form.append('loggedAt', new Date().toISOString());

    if (meal.imageUri) {
      const uriParts = meal.imageUri.split('.');
      const ext = uriParts[uriParts.length - 1];
      form.append('image', {
        uri: meal.imageUri,
        name: `meal.${ext || 'jpg'}`,
        type: `image/${ext || 'jpeg'}`,
      } as any);
    }

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
        const data = await res.json();
        if (res.ok && data.success) {
          backendLog = data.mealLog;
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
      imageUri: backendLog?.imageUrl || meal.imageUri,
    };

    setMealLogs(prev => {
      const updated = [newMeal, ...prev];
      saveMealLogs(updated);
      return updated;
    });

    return newMeal;
  }, []);

  const deleteMealLog = useCallback(async (mealId: string, backendId?: string) => {
    setMealLogs(prev => {
      const updated = prev.filter(meal => meal.id !== mealId && meal.backendId !== backendId);
      saveMealLogs(updated);
      return updated;
    });

    const token = await AsyncStorage.getItem('@sweettrack_token');
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
  }, []);

  const updateMealLog = useCallback(async (mealId: string, updates: Partial<MealLog>) => {
    setMealLogs(prev => {
      const updated = prev.map(meal =>
        meal.id === mealId ? { ...meal, ...updates } : meal
      );
      saveMealLogs(updated);
      return updated;
    });
  }, []);

  const getTodayMeals = useMemo(() => {
    const today = new Date().toDateString();
    return mealLogs.filter(meal => {
      const mealDate = new Date(meal.date).toDateString();
      return mealDate === today;
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
    return getTodayMeals.reduce((acc, meal) => ({
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
      totalCalories,
      avgCalories: getWeekMeals.length > 0 ? Math.round(totalCalories / 7) : 0,
      totalProtein: Math.round(totalProtein),
      totalCarbs: Math.round(totalCarbs),
      totalFat: Math.round(totalFat),
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
      await AsyncStorage.removeItem(STORAGE_KEY);
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
