export type FoodItem = {
  id: string;
  name: string;
  category: 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'beverage';
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  sugar?: number;
  fiber?: number;
  sodium?: number;
  servingSize: string;
  dietaryTags: ('diabetic-friendly' | 'low-carb' | 'high-protein' | 'vegetarian' | 'vegan' | 'heart-healthy' | 'balanced')[];
};

export type DietPlan = {
  id: string;
  name: string;
  description: string;
  targetCondition: string[];
  dailyCalorieTarget: number;
  macroRatio: {
    protein: number;
    carbs: number;
    fat: number;
  };
  recommendations: string[];
  avoidFoods: string[];
  icon: string;
  color: string;
};

export const FOOD_DATABASE: FoodItem[] = [
  {
    id: '1',
    name: 'Oatmeal with Berries',
    category: 'breakfast',
    calories: 220,
    protein: 8,
    carbs: 42,
    fat: 4,
    sugar: 12,
    fiber: 6,
    sodium: 150,
    servingSize: '1 bowl (200g)',
    dietaryTags: ['diabetic-friendly', 'heart-healthy', 'vegetarian', 'vegan', 'balanced'],
  },
  {
    id: '2',
    name: 'Scrambled Eggs with Toast',
    category: 'breakfast',
    calories: 340,
    protein: 18,
    carbs: 28,
    fat: 16,
    sugar: 3,
    fiber: 2,
    sodium: 420,
    servingSize: '2 eggs + 2 slices',
    dietaryTags: ['high-protein', 'low-carb', 'balanced'],
  },
  {
    id: '3',
    name: 'Greek Yogurt with Nuts',
    category: 'breakfast',
    calories: 280,
    protein: 20,
    carbs: 24,
    fat: 12,
    sugar: 16,
    fiber: 3,
    sodium: 80,
    servingSize: '1 cup (250g)',
    dietaryTags: ['high-protein', 'vegetarian', 'balanced'],
  },
  {
    id: '4',
    name: 'Grilled Chicken Salad',
    category: 'lunch',
    calories: 320,
    protein: 35,
    carbs: 18,
    fat: 12,
    sugar: 6,
    fiber: 5,
    sodium: 380,
    servingSize: '1 plate (350g)',
    dietaryTags: ['high-protein', 'low-carb', 'diabetic-friendly', 'balanced'],
  },
  {
    id: '5',
    name: 'Quinoa Buddha Bowl',
    category: 'lunch',
    calories: 420,
    protein: 16,
    carbs: 62,
    fat: 14,
    sugar: 8,
    fiber: 12,
    sodium: 320,
    servingSize: '1 bowl (400g)',
    dietaryTags: ['vegetarian', 'vegan', 'heart-healthy', 'balanced'],
  },
  {
    id: '6',
    name: 'Salmon with Vegetables',
    category: 'dinner',
    calories: 450,
    protein: 38,
    carbs: 24,
    fat: 22,
    sugar: 6,
    fiber: 8,
    sodium: 420,
    servingSize: '1 fillet + sides (350g)',
    dietaryTags: ['high-protein', 'heart-healthy', 'balanced'],
  },
  {
    id: '7',
    name: 'Lentil Curry with Rice',
    category: 'dinner',
    calories: 480,
    protein: 18,
    carbs: 72,
    fat: 12,
    sugar: 8,
    fiber: 14,
    sodium: 450,
    servingSize: '1 plate (400g)',
    dietaryTags: ['vegetarian', 'vegan', 'heart-healthy', 'balanced'],
  },
  {
    id: '8',
    name: 'Apple with Almond Butter',
    category: 'snack',
    calories: 180,
    protein: 5,
    carbs: 22,
    fat: 8,
    sugar: 16,
    fiber: 4,
    sodium: 45,
    servingSize: '1 apple + 2 tbsp',
    dietaryTags: ['vegetarian', 'vegan', 'diabetic-friendly', 'balanced'],
  },
  {
    id: '9',
    name: 'Protein Smoothie',
    category: 'beverage',
    calories: 240,
    protein: 25,
    carbs: 28,
    fat: 4,
    sugar: 20,
    fiber: 3,
    sodium: 120,
    servingSize: '1 glass (350ml)',
    dietaryTags: ['high-protein', 'vegetarian', 'balanced'],
  },
  {
    id: '10',
    name: 'Green Tea',
    category: 'beverage',
    calories: 2,
    protein: 0,
    carbs: 0,
    fat: 0,
    sugar: 0,
    fiber: 0,
    sodium: 5,
    servingSize: '1 cup (250ml)',
    dietaryTags: ['diabetic-friendly', 'heart-healthy', 'vegan', 'vegetarian'],
  },
];

export const DIET_PLANS: DietPlan[] = [
  {
    id: 'diabetic',
    name: 'Diabetic-Friendly Diet',
    description: 'Low sugar, balanced carbohydrates, high fiber diet designed for diabetes management',
    targetCondition: ['diabetes', 'prediabetes', 'insulin resistance'],
    dailyCalorieTarget: 1800,
    macroRatio: {
      protein: 25,
      carbs: 45,
      fat: 30,
    },
    recommendations: [
      'Focus on low glycemic index foods',
      'Eat smaller, more frequent meals',
      'Include plenty of non-starchy vegetables',
      'Choose whole grains over refined carbs',
      'Monitor carbohydrate intake at each meal',
      'Stay hydrated with water and unsweetened beverages',
    ],
    avoidFoods: [
      'Sugary drinks and sodas',
      'White bread and refined grains',
      'Fried and processed foods',
      'High-sugar desserts and candies',
      'Fruit juices with added sugar',
    ],
    icon: 'apple',
    color: '#4CAF50',
  },
  {
    id: 'weight-loss',
    name: 'Weight Loss Diet',
    description: 'Low-calorie, high-protein diet for sustainable weight loss',
    targetCondition: ['obesity', 'overweight', 'weight management'],
    dailyCalorieTarget: 1500,
    macroRatio: {
      protein: 35,
      carbs: 35,
      fat: 30,
    },
    recommendations: [
      'Create a calorie deficit of 500-750 calories per day',
      'Prioritize lean proteins in every meal',
      'Increase vegetable intake for volume',
      'Limit processed and high-calorie foods',
      'Practice portion control',
      'Stay active with regular exercise',
    ],
    avoidFoods: [
      'Fast food and fried items',
      'Sugary snacks and desserts',
      'High-calorie beverages',
      'Processed meats',
      'Excessive oils and butter',
    ],
    icon: 'target',
    color: '#FF9800',
  },
  {
    id: 'heart-healthy',
    name: 'Heart-Healthy Diet',
    description: 'Low sodium, low saturated fat diet for cardiovascular health',
    targetCondition: ['heart disease', 'high blood pressure', 'high cholesterol'],
    dailyCalorieTarget: 2000,
    macroRatio: {
      protein: 20,
      carbs: 50,
      fat: 30,
    },
    recommendations: [
      'Choose healthy fats from fish, nuts, and olive oil',
      'Limit sodium intake to under 2000mg daily',
      'Eat plenty of fruits and vegetables',
      'Choose whole grains over refined',
      'Include omega-3 rich foods',
      'Reduce saturated and trans fats',
    ],
    avoidFoods: [
      'High-sodium processed foods',
      'Fatty and red meats',
      'Full-fat dairy products',
      'Fried foods',
      'Foods high in trans fats',
    ],
    icon: 'heart',
    color: '#F44336',
  },
  {
    id: 'balanced',
    name: 'Balanced Diet',
    description: 'Well-rounded nutrition for general health and wellness',
    targetCondition: ['general wellness', 'maintenance', 'healthy lifestyle'],
    dailyCalorieTarget: 2000,
    macroRatio: {
      protein: 25,
      carbs: 50,
      fat: 25,
    },
    recommendations: [
      'Eat a variety of foods from all food groups',
      'Include colorful fruits and vegetables',
      'Choose whole grains and lean proteins',
      'Stay hydrated with 8 glasses of water daily',
      'Practice mindful eating',
      'Maintain regular meal times',
    ],
    avoidFoods: [
      'Excessive processed foods',
      'Too much added sugar',
      'Excessive alcohol',
      'Foods high in artificial additives',
    ],
    icon: 'activity',
    color: '#2196F3',
  },
  {
    id: 'high-protein',
    name: 'High-Protein Diet',
    description: 'Protein-rich diet for muscle building and athletic performance',
    targetCondition: ['muscle building', 'athletic performance', 'post-workout recovery'],
    dailyCalorieTarget: 2200,
    macroRatio: {
      protein: 35,
      carbs: 40,
      fat: 25,
    },
    recommendations: [
      'Consume 1.6-2.2g protein per kg body weight',
      'Include protein in every meal',
      'Time protein intake around workouts',
      'Choose lean protein sources',
      'Combine with strength training',
      'Stay hydrated for optimal performance',
    ],
    avoidFoods: [
      'Low-quality protein supplements',
      'Excessive empty calories',
      'Too many simple carbohydrates',
      'Alcohol before/after workouts',
    ],
    icon: 'dumbbell',
    color: '#9C27B0',
  },
  {
    id: 'vegetarian',
    name: 'Vegetarian Diet',
    description: 'Plant-based nutrition with dairy and eggs',
    targetCondition: ['vegetarian lifestyle', 'plant-based wellness'],
    dailyCalorieTarget: 1900,
    macroRatio: {
      protein: 20,
      carbs: 55,
      fat: 25,
    },
    recommendations: [
      'Include varied plant-based proteins',
      'Ensure adequate B12 and iron intake',
      'Eat legumes, nuts, and seeds daily',
      'Include dairy or fortified alternatives',
      'Focus on whole, unprocessed foods',
      'Monitor protein and nutrient intake',
    ],
    avoidFoods: [
      'All meat and fish',
      'Gelatin-based products',
      'Animal-derived additives',
    ],
    icon: 'leaf',
    color: '#4CAF50',
  },
];

export const getDietPlanByCondition = (condition: string): DietPlan | undefined => {
  return DIET_PLANS.find(plan => 
    plan.targetCondition.some(c => c.toLowerCase().includes(condition.toLowerCase()))
  );
};

export const getFoodsByDietaryTag = (tag: FoodItem['dietaryTags'][number]): FoodItem[] => {
  return FOOD_DATABASE.filter(food => food.dietaryTags.includes(tag));
};

export const getFoodsByCategory = (category: FoodItem['category']): FoodItem[] => {
  return FOOD_DATABASE.filter(food => food.category === category);
};

export const calculateMealNutrition = (foodIds: string[]): {
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  totalSugar: number;
  totalFiber: number;
  totalSodium: number;
} => {
  const foods = FOOD_DATABASE.filter(food => foodIds.includes(food.id));
  
  return foods.reduce((acc, food) => ({
    totalCalories: acc.totalCalories + food.calories,
    totalProtein: acc.totalProtein + food.protein,
    totalCarbs: acc.totalCarbs + food.carbs,
    totalFat: acc.totalFat + food.fat,
    totalSugar: acc.totalSugar + (food.sugar || 0),
    totalFiber: acc.totalFiber + (food.fiber || 0),
    totalSodium: acc.totalSodium + (food.sodium || 0),
  }), {
    totalCalories: 0,
    totalProtein: 0,
    totalCarbs: 0,
    totalFat: 0,
    totalSugar: 0,
    totalFiber: 0,
    totalSodium: 0,
  });
};
