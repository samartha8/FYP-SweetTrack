import { z } from 'zod';

export async function generateObject<T extends z.ZodTypeAny>(params: {
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: Array<{
      type: 'text' | 'image';
      text?: string;
      image?: string;
    }>;
  }>;
  schema: T;
}): Promise<z.infer<T>> {
  console.warn('Using mock implementation for @rork/toolkit-sdk. Replace with actual AI service.');
  
  const mockData = {
    foodItems: [
      { name: 'Sample Food Item', confidence: 0.85 },
    ],
    nutritionalInfo: {
      calories: 300,
      carbs: 40,
      protein: 20,
      fat: 10,
      sugar: 5,
      fiber: 3,
      sodium: 200,
    },
    servingSize: '1 serving',
    healthTips: [
      'This meal provides a good balance of macronutrients.',
      'Consider adding more vegetables for additional fiber.',
      'Stay hydrated throughout the day.',
    ],
  };

  return mockData as z.infer<T>;
}

