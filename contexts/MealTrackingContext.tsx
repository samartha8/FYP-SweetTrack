import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState, useEffect, useCallback, useMemo } from 'react';

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

export const [MealTrackingProvider, useMealTracking] = createContextHook(() => {
  const [mealLogs, setMealLogs] = useState<MealLog[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedDietPlan, setSelectedDietPlan] = useState<string>('balanced');

  useEffect(() => {
    loadMealLogs();
  }, []);

  const loadMealLogs = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        setMealLogs(JSON.parse(stored));
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

  const addMealLog = useCallback(async (meal: Omit<MealLog, 'id' | 'date'>) => {
    const newMeal: MealLog = {
      ...meal,
      id: Date.now().toString(),
      date: new Date().toISOString(),
    };

    setMealLogs(prev => {
      const updated = [newMeal, ...prev];
      saveMealLogs(updated);
      return updated;
    });

    return newMeal;
  }, []);

  const deleteMealLog = useCallback(async (mealId: string) => {
    setMealLogs(prev => {
      const updated = prev.filter(meal => meal.id !== mealId);
      saveMealLogs(updated);
      return updated;
    });
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
