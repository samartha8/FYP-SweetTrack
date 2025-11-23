import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState, useEffect, useCallback, useMemo } from 'react';

export type Badge = {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  gradient: string[];
  condition: string;
  unlocked?: boolean;
};

export type RewardGoal = {
  id: string;
  title: string;
  description: string;
  points: number;
  type: 'coupon' | 'giveaway' | 'achievement';
  icon: string;
  expiryDate?: string;
  terms?: string;
};

export type DietPlan = {
  id: string;
  name: string;
  description: string;
  category: 'diabetes' | 'heart' | 'weight-loss' | 'general';
  meals: {
    breakfast: string[];
    lunch: string[];
    dinner: string[];
    snacks: string[];
  };
  tips: string[];
};

const STORAGE_KEYS = {
  BADGES: '@sweettrack_admin_badges',
  REWARDS: '@sweettrack_admin_rewards',
  DIET_PLANS: '@sweettrack_admin_diet_plans',
};

const DEFAULT_BADGES: Badge[] = [
  {
    id: '1',
    name: 'First Steps',
    description: 'Complete your first day',
    icon: 'Star',
    color: '#FFA000',
    gradient: ['#FFA000', '#FF6F00'],
    condition: 'complete_first_day',
  },
  {
    id: '2',
    name: 'Week Warrior',
    description: '7 day streak',
    icon: 'Zap',
    color: '#00BCD4',
    gradient: ['#00BCD4', '#0097A7'],
    condition: 'streak_7',
  },
  {
    id: '3',
    name: 'Health Hero',
    description: 'Complete all daily goals',
    icon: 'Trophy',
    color: '#4CAF50',
    gradient: ['#4CAF50', '#388E3C'],
    condition: 'complete_all_goals',
  },
  {
    id: '4',
    name: 'Hydration Master',
    description: 'Drink 8 glasses for 7 days',
    icon: 'Target',
    color: '#2196F3',
    gradient: ['#2196F3', '#1976D2'],
    condition: 'water_streak_7',
  },
  {
    id: '5',
    name: 'Step Champion',
    description: 'Walk 10,000 steps for 30 days',
    icon: 'TrendingUp',
    color: '#FF5722',
    gradient: ['#FF5722', '#E64A19'],
    condition: 'steps_30_days',
  },
  {
    id: '6',
    name: 'Wellness Guru',
    description: 'Maintain 30 day streak',
    icon: 'Heart',
    color: '#E91E63',
    gradient: ['#E91E63', '#C2185B'],
    condition: 'streak_30',
  },
];

const DEFAULT_REWARDS: RewardGoal[] = [
  {
    id: '1',
    title: '10% Off Health Supplements',
    description: 'Get 10% discount on all health supplements',
    points: 500,
    type: 'coupon',
    icon: 'Gift',
  },
  {
    id: '2',
    title: 'Free Fitness Class',
    description: 'Attend one free fitness class at any partner gym',
    points: 1000,
    type: 'coupon',
    icon: 'Dumbbell',
  },
  {
    id: '3',
    title: 'iPhone Giveaway',
    description: 'Enter to win the latest iPhone',
    points: 5000,
    type: 'giveaway',
    icon: 'Smartphone',
  },
  {
    id: '4',
    title: 'BhatBhateni Coupon',
    description: 'Rs. 1000 voucher for BhatBhateni',
    points: 2000,
    type: 'coupon',
    icon: 'ShoppingBag',
  },
];

const DEFAULT_DIET_PLANS: DietPlan[] = [
  {
    id: '1',
    name: 'Diabetes Management',
    description: 'A balanced meal plan to help manage blood sugar levels',
    category: 'diabetes',
    meals: {
      breakfast: ['Oatmeal with berries and almonds', 'Greek yogurt with chia seeds', 'Whole grain toast with avocado'],
      lunch: ['Grilled chicken salad', 'Quinoa bowl with vegetables', 'Lentil soup with brown rice'],
      dinner: ['Baked salmon with steamed broccoli', 'Stir-fried tofu with vegetables', 'Lean beef with roasted vegetables'],
      snacks: ['Apple slices with almond butter', 'Carrot sticks with hummus', 'Mixed nuts (unsalted)'],
    },
    tips: [
      'Monitor your carbohydrate intake',
      'Eat at regular intervals',
      'Stay hydrated throughout the day',
      'Choose whole grains over refined grains',
    ],
  },
  {
    id: '2',
    name: 'Heart Healthy',
    description: 'Support cardiovascular health with these nutritious meals',
    category: 'heart',
    meals: {
      breakfast: ['Steel-cut oats with walnuts', 'Smoothie with spinach and berries', 'Whole grain cereal with low-fat milk'],
      lunch: ['Tuna salad sandwich on whole wheat', 'Mediterranean chickpea salad', 'Vegetable soup with whole grain crackers'],
      dinner: ['Grilled fish with asparagus', 'Turkey meatballs with zucchini noodles', 'Baked chicken with sweet potato'],
      snacks: ['Fresh fruit', 'Low-fat cheese with whole grain crackers', 'Air-popped popcorn'],
    },
    tips: [
      'Limit sodium intake',
      'Include omega-3 rich foods',
      'Reduce saturated fats',
      'Eat plenty of fiber',
    ],
  },
  {
    id: '3',
    name: 'Weight Management',
    description: 'Balanced nutrition for healthy weight management',
    category: 'weight-loss',
    meals: {
      breakfast: ['Egg white omelet with vegetables', 'Protein smoothie with banana', 'Low-fat cottage cheese with fruit'],
      lunch: ['Large mixed green salad with grilled chicken', 'Vegetable wrap with hummus', 'Minestrone soup with side salad'],
      dinner: ['Grilled lean protein with roasted vegetables', 'Stir-fry with brown rice', 'Baked cod with cauliflower rice'],
      snacks: ['Celery with peanut butter', 'Hard-boiled eggs', 'Greek yogurt'],
    },
    tips: [
      'Portion control is key',
      'Drink water before meals',
      'Eat protein with every meal',
      'Avoid processed foods',
    ],
  },
];

export const [AdminProvider, useAdmin] = createContextHook(() => {
  const [badges, setBadges] = useState<Badge[]>(DEFAULT_BADGES);
  const [rewards, setRewards] = useState<RewardGoal[]>(DEFAULT_REWARDS);
  const [dietPlans, setDietPlans] = useState<DietPlan[]>(DEFAULT_DIET_PLANS);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    loadAdminData();
  }, []);

  const loadAdminData = async () => {
    try {
      const [storedBadges, storedRewards, storedDietPlans] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.BADGES),
        AsyncStorage.getItem(STORAGE_KEYS.REWARDS),
        AsyncStorage.getItem(STORAGE_KEYS.DIET_PLANS),
      ]);

      if (storedBadges) setBadges(JSON.parse(storedBadges));
      if (storedRewards) setRewards(JSON.parse(storedRewards));
      if (storedDietPlans) setDietPlans(JSON.parse(storedDietPlans));
    } catch (error) {
      console.error('Error loading admin data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateBadges = useCallback(async (newBadges: Badge[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.BADGES, JSON.stringify(newBadges));
      setBadges(newBadges);
    } catch (error) {
      console.error('Error updating badges:', error);
    }
  }, []);

  const updateRewards = useCallback(async (newRewards: RewardGoal[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.REWARDS, JSON.stringify(newRewards));
      setRewards(newRewards);
    } catch (error) {
      console.error('Error updating rewards:', error);
    }
  }, []);

  const updateDietPlans = useCallback(async (newDietPlans: DietPlan[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.DIET_PLANS, JSON.stringify(newDietPlans));
      setDietPlans(newDietPlans);
    } catch (error) {
      console.error('Error updating diet plans:', error);
    }
  }, []);

  const addBadge = useCallback(async (badge: Badge) => {
    const newBadges = [...badges, badge];
    await updateBadges(newBadges);
  }, [badges, updateBadges]);

  const addReward = useCallback(async (reward: RewardGoal) => {
    const newRewards = [...rewards, reward];
    await updateRewards(newRewards);
  }, [rewards, updateRewards]);

  const addDietPlan = useCallback(async (dietPlan: DietPlan) => {
    const newDietPlans = [...dietPlans, dietPlan];
    await updateDietPlans(newDietPlans);
  }, [dietPlans, updateDietPlans]);

  return useMemo(() => ({
    badges,
    rewards,
    dietPlans,
    isLoading,
    updateBadges,
    updateRewards,
    updateDietPlans,
    addBadge,
    addReward,
    addDietPlan,
  }), [
    badges,
    rewards,
    dietPlans,
    isLoading,
    updateBadges,
    updateRewards,
    updateDietPlans,
    addBadge,
    addReward,
    addDietPlan,
  ]);
});
