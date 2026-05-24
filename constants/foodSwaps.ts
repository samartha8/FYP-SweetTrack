/**
 * Smart Food Swaps for Diabetic & High-Risk Users
 * Focuses on common Nepali and South Asian diets.
 */

export type FoodSwap = {
  riskyItem: string;
  category?: 'Carbs' | 'Sugar' | 'Snacks' | 'Drinks';
  reason?: string;
  alternatives: {
    name: string;
    benefit: string;
    macroImpact: string;
  }[];
};

export const NEPALI_FOOD_SWAPS: Record<string, FoodSwap> = {
  'white rice': {
    riskyItem: 'White Rice (Bhat)',
    category: 'Carbs',
    alternatives: [
      { name: 'Brown Rice', benefit: 'Higher fiber, slower glucose release', macroImpact: '-15% Glycemic Load' },
      { name: 'Dhedo (Millet/Buckwheat)', benefit: 'Complex carbs and high minerals', macroImpact: 'Low Glycemic Index' },
      { name: 'Cauliflower Rice', benefit: 'Ultra-low carb alternative', macroImpact: '-90% Carbs' }
    ]
  },
  'roti': {
    riskyItem: 'Maida Roti / Naan',
    category: 'Carbs',
    alternatives: [
      { name: 'Multigrain Atta Roti', benefit: 'Sustained energy release', macroImpact: '+4g Fiber per serving' },
      { name: 'Bajra (Pearl Millet) Roti', benefit: 'Gluten-free and high fiber', macroImpact: 'Slow digestion' }
    ]
  },
  'coke': {
    riskyItem: 'Sugary Soda / Coke',
    category: 'Drinks',
    alternatives: [
      { name: 'Fresh Lemon Water (Salted)', benefit: 'Refreshing with zero sugar', macroImpact: '-35g Sugar' },
      { name: 'Mahi (Buttermilk)', benefit: 'Probiotics and low calorie', macroImpact: 'Natural hydration' },
      { name: 'Green Tea', benefit: 'Antioxidants with zero calories', macroImpact: 'Metabolism boost' }
    ]
  },
  'samosa': {
    riskyItem: 'Fried Samosa',
    category: 'Snacks',
    alternatives: [
      { name: 'Roasted Chana (Chickpeas)', benefit: 'High protein and high fiber', macroImpact: 'No trans fats' },
      { name: 'Sprouted Moong Salad', benefit: 'Alive nutrients and very low GI', macroImpact: '-70% Fat' }
    ]
  },
  'mithai': {
    riskyItem: 'Mithai / Jalebi',
    category: 'Sugar',
    alternatives: [
      { name: 'Greek Yogurt with Cinnamon', benefit: 'High protein dessert', macroImpact: '-80% Sugar' },
      { name: 'Small portion of Papaya', benefit: 'Natural fiber and vitamins', macroImpact: 'Low calorie density' }
    ]
  }
};

/**
 * Helper to find swaps for a detected food name
 */
export const getSwapForFood = (foodName: string): FoodSwap | null => {
  const normalized = foodName.toLowerCase().trim();
  
  // Direct match
  if (NEPALI_FOOD_SWAPS[normalized]) return NEPALI_FOOD_SWAPS[normalized];
  
  // Partial match checks
  if (normalized.includes('rice')) return NEPALI_FOOD_SWAPS['white rice'];
  if (normalized.includes('soda') || normalized.includes('cola') || normalized.includes('juice')) return NEPALI_FOOD_SWAPS['coke'];
  if (normalized.includes('bread') || normalized.includes('naan')) return NEPALI_FOOD_SWAPS['roti'];
  
  return null;
};
