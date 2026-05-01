import { useState, useMemo, useEffect } from 'react';
import { useIsomorphicLayoutEffect } from '../hooks/useIsomorphicLayoutEffect';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  Platform,
  Dimensions,
  Modal,
  TextInput,
  FlatList,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
  FadeIn,
  FadeInUp,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { X, Camera, Image as ImageIcon, Flame, Wheat, Beef, Droplets, Info, Candy, Waves, Croissant, Pizza, CheckCircle, Plus, Minus, Trash2, AlertTriangle, Zap, ArrowRight, ShieldAlert, ShieldCheck, Scale, ChevronRight, Utensils } from 'lucide-react-native';
import { getSwapForFood, FoodSwap } from '@/constants/foodSwaps';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from '@/hooks/use-translation';
import { generateObject } from '@/lib/rork-toolkit-mock';
import { z } from 'zod';
import { useMealTracking } from '@/contexts/MealTrackingContext';
import { useTheme } from '@/contexts/SettingsContext';
import { useUser } from '@/contexts/UserContext';
import { moderateScale as ms, wp, hp, fontSize } from '@/utils/responsive';
// Fallback for StyleSheet scope
const scale = fontSize;
import { MEAL_URL } from '../constants/Api';

const { width } = Dimensions.get('window');
const responsiveScale = (size: number) => (width / 375) * size;

// 🍎 Global Diet Alias Map for consistent enforcement across all logging modes
const DIET_ALIASES: Record<string, string[]> = {
  'meat and fish': [
    'meat', 'chicken', 'beef', 'pork', 'mutton', 'fish', 'salmon', 'tuna', 'bacon', 'sausage', 'steak',
    'baby back ribs', 'beef carpaccio', 'beef tartare', 'chicken curry', 'chicken wings', 'filet mignon', 
    'grilled salmon', 'peking duck', 'pork chop', 'prime rib', 'sashimi', 'scallops', 'shrimp and grits', 
    'tuna tartare', 'lobster bisque', 'mussels', 'oysters', 'crab cakes'
  ],
  'sugary drinks': ['soda', 'coke', 'pepsi', 'sprite', 'juice', 'energy drink', 'sweet tea', 'mountain dew', 'fanta'],
  'sodas': ['soda', 'coke', 'pepsi', 'sprite', 'mountain dew', 'fanta'],
  'high-calorie beverages': ['soda', 'coke', 'pepsi', 'energy drink', 'milkshake', 'frappuccino', 'smoothie'],
  'high-sugar desserts': [
    'cake', 'cookie', 'brownie', 'ice cream', 'candy', 'chocolate', 'donut', 'pastry',
    'apple pie', 'baklava', 'beignets', 'bread pudding', 'cannoli', 'carrot cake', 'cheesecake', 
    'chocolate cake', 'chocolate mousse', 'churros', 'creme brulee', 'cup cakes', 'donuts', 
    'frozen yogurt', 'macarons', 'panna cotta', 'red velvet cake', 'strawberry shortcake', 
    'tiramisu', 'waffles'
  ],
  'candies': ['candy', 'chocolate', 'gummy', 'toffee', 'lollipop'],
  'sugary snacks': [
    'cake', 'cookie', 'brownie', 'ice cream', 'candy', 'chocolate', 'donut', 'pastry', 'mithai', 'jalebi',
    'baklava', 'churros', 'macarons'
  ],
  'refined carbs': [
    'white bread', 'pasta', 'white rice', 'naan', 'pizza', 'garlic bread', 'noodles',
    'club sandwich', 'croque madame', 'dumplings', 'french toast', 'gnocchi', 'grilled cheese sandwich', 
    'hamburger', 'hot dog', 'lasagna', 'macaroni and cheese', 'pancakes', 'ravioli', 
    'spaghetti bolognese', 'spaghetti carbonara'
  ],
  'refined grains': ['white bread', 'pasta', 'white rice', 'naan', 'noodles', 'couscous'],
  'fried foods': [
    'fries', 'samosa', 'chips', 'fried chicken', 'tempura', 'pakora',
    'beignets', 'chicken wings', 'churros', 'crab cakes', 'donuts', 'falafel', 
    'fish and chips', 'french fries', 'fried calamari', 'fried rice', 'onion rings', 
    'spring rolls', 'takoyaki'
  ],
  'fast food': [
    'samosa', 'burger', 'pizza', 'fries', 'hot dog', 'chips', 'momo', 'chowmein',
    'breakfast burrito', 'club sandwich', 'french fries', 'hamburger', 'nachos', 'onion rings', 
    'poutine', 'spring rolls', 'tacos'
  ],
  'processed meats': ['bacon', 'sausage', 'ham', 'salami', 'pepperoni', 'hot dog', 'chorizo', 'prosciutto', 'beef jerky', 'deli meat']
};
// ⚖️ Portion Scaling Multipliers (Mirrored from Backend)
const SIZE_SCALARS: Record<string, number> = {
  'Small': 0.7,
  'Standard': 1.0,
  'Big': 1.4
};


type NutritionalInfo = {
  foodItems: {
    name: string;
    confidence: number;
    count: number;
    perItemNutrition: any;
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
  healthTips: string[];
  imageUrl?: string;
  suitability?: {
    rating: string;
    color: string;
    score: number;
    userRiskScore?: number;
    reason: string;
    clinicalAlert?: boolean;
    suggestedAlternative?: {
      name: string;
      reason: string;
    }[];
  };
};

export default function MealLogScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { addMealLog, activeDietDetails } = useMealTracking();
  const { colors, scale, ms, wp, hp } = useTheme();
  const { ensureAccessToken, riskStatus } = useUser();
  const { t } = useTranslation();

  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [nutritionalData, setNutritionalData] = useState<NutritionalInfo | null>(null);
  const [selectedMealType, setSelectedMealType] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>('breakfast');
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [isCorrectionModalVisible, setIsCorrectionModalVisible] = useState(false);
  const [allFoodClasses, setAllFoodClasses] = useState<{id: string, name: string}[]>([]);
  const [logMode, setLogMode] = useState<'scan' | 'manual'>('scan'); // 🛠️ New: Dual mode
  const [manualDescription, setManualDescription] = useState(''); // 🛠️ New: Text entry
  const [searchQuery, setSearchQuery] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isNotFoodDetected, setIsNotFoodDetected] = useState(false);
  const [uncertainFoodName, setUncertainFoodName] = useState<string | null>(null);
  const [analysisImageUrl, setAnalysisImageUrl] = useState<string | null>(null);
  const [isNutritionVisible, setIsNutritionVisible] = useState(false);
  const [isAddingNewItem, setIsAddingNewItem] = useState(false);
  const [blockedFoodInfo, setBlockedFoodInfo] = useState<FoodSwap | null>(null);
  const [hasRestrictedFood, setHasRestrictedFood] = useState(false);

  // 🛡️ Reusable Clinical Guard Logic
  useEffect(() => {
    if (!nutritionalData?.foodItems) {
      setHasRestrictedFood(false);
      return;
    }

    let blockedSwap: FoodSwap | null = null;
    for (const item of nutritionalData.foodItems) {
      const lowerName = item.name.toLowerCase();
      const activeAvoidMatch = activeDietDetails?.avoidFoods?.find(a => {
        const avoidKey = a.toLowerCase();
        if (lowerName.includes(avoidKey) || avoidKey.includes(lowerName)) return true;
        
        return Object.keys(DIET_ALIASES).some(key => {
          if (avoidKey.includes(key.toLowerCase())) {
            const aliases = DIET_ALIASES[key] || [];
            return aliases.some(alias => lowerName.includes(alias.toLowerCase()));
          }
          return false;
        });
      });

      if (activeAvoidMatch) {
        const smartSwap = getSwapForFood(item.name);
        blockedSwap = smartSwap || {
          riskyItem: item.name,
          category: 'Snacks',
          alternatives: [{ name: 'A healthy alternative', benefit: `Avoids ${activeAvoidMatch}`, macroImpact: 'Safe' }]
        };
        break;
      }
    }

    if (blockedSwap) {
      setHasRestrictedFood(true);
    } else {
      setHasRestrictedFood(false);
      setBlockedFoodInfo(null);
    }
  }, [nutritionalData, activeDietDetails]);

  // Dynamic Styles
  const themed = useMemo(() => ({
    container: { flex: 1 },
    header: { backgroundColor: 'transparent', borderBottomColor: 'transparent' },
    headerTitle: { color: colors.text, fontSize: scale(18) },
    imageContainer: { backgroundColor: colors.card },
    placeholderContainer: { backgroundColor: colors.card, borderColor: colors.border },
    placeholderText: { color: colors.textSecondary, fontSize: scale(14) },
    actionButtonText: { color: colors.textWhite, fontSize: scale(15) },
    mealTypeLabel: { color: colors.text, fontSize: scale(15) },
    mealTypeButton: { backgroundColor: colors.card, borderColor: colors.border },
    mealTypeButtonActive: { backgroundColor: colors.primary + '15', borderColor: colors.primary },
    mealTypeButtonText: { color: colors.textSecondary, fontSize: scale(13) },
    mealTypeButtonTextActive: { color: colors.primary },
    analyzeButton: { backgroundColor: colors.primary },
    analyzeButtonText: { color: colors.textWhite, fontSize: scale(16) },
    sectionTitle: { color: colors.text, fontSize: scale(18) },
    card: { backgroundColor: colors.card, shadowColor: colors.cardShadow },
    foodItem: { borderBottomColor: colors.backgroundSecondary },
    foodItemDot: { backgroundColor: colors.primary },
    foodItemName: { color: colors.text, fontSize: scale(15) },
    foodItemConfidence: { color: colors.textSecondary, fontSize: scale(13) },
    nutritionCard: { backgroundColor: colors.card, shadowColor: colors.cardShadow },
    nutritionValue: { color: colors.text, fontSize: scale(24) },
    nutritionLabel: { color: colors.textSecondary, fontSize: scale(14) },
    servingSizeCard: { backgroundColor: colors.primary + '10' },
    servingSizeText: { color: colors.text, fontSize: scale(14) },
    tipItem: { borderBottomColor: colors.backgroundSecondary },
    // 📱 Responsive Scaling
    iconSizeLarge: ms(80),
    iconSizeMedium: ms(40),
    iconSizeSmall: ms(32),
    paddingLarge: ms(24),
    paddingMedium: ms(16),
    paddingSmall: ms(12),
    buttonHeight: hp(7),
    scanBoxHeight: hp(30),
    modalHeight: hp(80),
    gapLarge: ms(20),
    gapMedium: ms(12),
    tipNumber: { backgroundColor: colors.primary, color: colors.textWhite, fontSize: scale(12) },
    tipText: { color: colors.text, fontSize: scale(14) },
    saveButton: { backgroundColor: colors.primary, shadowColor: colors.cardShadow },
    saveButtonText: { color: colors.textWhite, fontSize: scale(16) },
    errorCard: { backgroundColor: colors.error + '15', borderColor: colors.error },
    errorText: { color: colors.error },
    insightCard: { backgroundColor: colors.primary + '08', borderLeftColor: colors.primary },
    insightText: { color: colors.text, fontSize: scale(13.5) },
    nutritionCardCarbs: { shadowColor: '#34C759' },
    nutritionCardProtein: { shadowColor: '#FF3B30' },
    nutritionCardFat: { shadowColor: '#FF9500' },
    nutritionCardFiber: { shadowColor: '#5856D6' },
    nutritionCardSugar: { shadowColor: '#FF2D55' },
    nutritionCardSodium: { shadowColor: '#007AFF' },
    nutritionCardCalories: { shadowColor: colors.warning },
    modalOverlay: { backgroundColor: 'rgba(0,0,0,0.5)' },
    modalContent: { backgroundColor: colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
    modalHeader: { borderBottomColor: colors.border },
    searchInput: { backgroundColor: colors.card, borderColor: colors.border, color: colors.text },
    foodClassItem: { borderBottomColor: colors.border },
    foodClassText: { color: colors.text },
  }), [colors, scale]);

  const analysisMutation = useMutation({
    mutationFn: async (imageUri: string) => {
      // Create FormData to send image file
      const formData = new FormData();

      const filename = imageUri.split('/').pop() || 'meal.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';

      if (Platform.OS === 'web') {
        // On web, we need to fetch the URI and convert to a blob
        const response = await fetch(imageUri);
        const blob = await response.blob();
        formData.append('image', blob, filename);
      } else {
        // @ts-ignore - React Native specific FormData handling
        formData.append('image', {
          uri: imageUri,
          name: filename,
          type,
        });
      }

      // Get auth token
      const token = await ensureAccessToken();
      if (!token) throw new Error('Authentication required');

      const response = await fetch(`${MEAL_URL}/analyze`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (response.status === 401) {
        throw new Error('Session expired');
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Analysis failed');
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || 'Failed to analyze meal');
      }

      return data;
    },
    onSuccess: (data) => {
      stopScan();
      setAnalysisError(null);

      if (data.isNotFood) {
        setIsNotFoodDetected(true);
        setUncertainFoodName(data.detectedAs || null);
        setAnalysisImageUrl(data.imageUrl || null);
        setNutritionalData(null);
        return;
      }

      setIsNotFoodDetected(false);
      setUncertainFoodName(null);
      setAnalysisImageUrl(data.imageUrl || null);
      setIsNutritionVisible(false);
      setNutritionalData({
        foodItems: data.foodItems.map((item: any) => ({
          ...item,
          count: item.count || 1,
          perItemNutrition: item.perItemNutrition
        })),
        nutritionalInfo: data.nutritionalInfo,
        servingSize: data.servingSize,
        healthTips: data.healthTips || [],
        imageUrl: data.imageUrl,
        suitability: data.suitability,
      });
    },
    onError: (error) => {
      stopScan();
      console.error('Meal analysis error:', error);
      setAnalysisError(error.message || 'Failed to analyze meal. Please ensure your backend is running.');
      setNutritionalData(null);
    },
  });

  // 📝 Manual Text Analysis Mutation
  const analyzeTextMutation = useMutation({
    mutationFn: async (text: string) => {
      const token = await ensureAccessToken?.();
      const res = await fetch(`${MEAL_URL}/analyze-text`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to analyze text');
      return data as NutritionalInfo;
    },
    onSuccess: (data) => {
      setNutritionalData({
        ...data,
        healthTips: data.healthTips || [],
      });
      setAnalysisError(null);
    },
    onError: (error: any) => {
      setAnalysisError(error.message);
      Alert.alert('Analysis Failed', error.message);
    }
  });

  // Scanning Animation
  const scanPosition = useSharedValue(0);

  const scanLineStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: scanPosition.value * 200 }], // Responsive to container height
    opacity: withTiming(analysisMutation.isPending ? 1 : 0),
  }));

  const startScan = () => {
    setNutritionalData(null);
    setIsNutritionVisible(false);
    setIsNotFoodDetected(false);
    setUncertainFoodName(null);
    setHasRestrictedFood(false);
    
    scanPosition.value = withRepeat(
      withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  };

  const stopScan = () => {
    scanPosition.value = withTiming(0);
  };

  const requestPermissions = async () => {
    if (Platform.OS !== 'web') {
      const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
      const { status: mediaStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (cameraStatus !== 'granted' || mediaStatus !== 'granted') {
        Alert.alert('Permissions required', 'Camera and media library permissions are needed to log meals.');
        return false;
      }
    }
    return true;
  };

  const takePhoto = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: 'images' as any,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedImage(result.assets[0].uri);
        setNutritionalData(null);
      }
    } catch (error) {
      console.error('Camera error:', error);
      Alert.alert('Error', 'Failed to open camera');
    }
  };

  const pickImage = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images' as any,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedImage(result.assets[0].uri);
        setNutritionalData(null);
      }
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert('Error', 'Failed to select image');
    }
  };

  const analyzeMeal = () => {
    if (!selectedImage) {
      Alert.alert('No Image', 'Please select or capture an image first');
      return;
    }
    setAnalysisError(null);
    startScan();
    analysisMutation.mutate(selectedImage);
  };

  const saveMealLog = async () => {
    if (!nutritionalData || isSaving) return;

    // 🛡️ [Executive Clinical Guard]
    if (hasRestrictedFood) {
      // Re-calculate the specific blocked item for the modal
      for (const item of nutritionalData.foodItems) {
        const lowerName = item.name.toLowerCase();
        const activeAvoidMatch = activeDietDetails?.avoidFoods?.find(a => {
          const avoidKey = a.toLowerCase();
          if (lowerName.includes(avoidKey) || avoidKey.includes(lowerName)) return true;
          return Object.keys(DIET_ALIASES).some(key => 
            avoidKey.includes(key.toLowerCase()) && 
            (DIET_ALIASES[key] || []).some(alias => lowerName.includes(alias.toLowerCase()))
          );
        });

        if (activeAvoidMatch) {
          const swap = getSwapForFood(item.name) || {
            riskyItem: item.name,
            category: 'Snacks',
            alternatives: [{ name: 'A healthy alternative', benefit: `Avoids ${activeAvoidMatch}`, macroImpact: 'Safe' }]
          };
          setBlockedFoodInfo(swap);
          return;
        }
      }
    }

    if (nutritionalData.suitability?.rating === 'suitabilityHazard') {
       Alert.alert("High Metabolic Risk", "This meal contains excessive sugar/carbs for your safe threshold.");
       return; 
    }

    // 🛡️ [Legacy Backup] Fallback for specific food-name blocks
    if (riskStatus === 'Positive') {
      for (const item of nutritionalData.foodItems) {
        const swap = getSwapForFood(item.name);
        if (swap) {
          setBlockedFoodInfo(swap);
          return; 
        }
      }
    }

    setIsSaving(true);
    try {
      // With Optimistic UI, this returns immediately after saving to local state
      await addMealLog({
        imageUri: analysisImageUrl || nutritionalData?.imageUrl || selectedImage || undefined,
        foodItems: nutritionalData.foodItems,
        nutritionalInfo: nutritionalData.nutritionalInfo,
        servingSize: nutritionalData.servingSize,
        mealType: selectedMealType,
      });

      // ⚡ Instantly show success and navigate back
      setShowSuccess(true);
      setTimeout(() => {
        safeBack();
      }, 500); // Super fast 0.5s transition
    } catch (error) {
      console.error('Error saving meal log:', error);
      Alert.alert('Error', 'Failed to save meal log. Please try again.');
      setIsSaving(false); // Only reset if there's an error, otherwise we navigate away
    }
  };

  const fetchFoodClasses = async () => {
    try {
      const token = await ensureAccessToken();
      const response = await fetch(`${MEAL_URL}/food-classes`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setAllFoodClasses(data.classes);
      }
    } catch (error) {
      console.error('Error fetching food classes:', error);
    }
  };

  const openCorrectionModal = (isNew: boolean = false) => {
    if (allFoodClasses.length === 0) {
      fetchFoodClasses();
    }
    setSearchQuery('');
    setIsAddingNewItem(isNew);
    setIsCorrectionModalVisible(true);
  };

  const updateQuantity = (index: number, delta: number) => {
    if (!nutritionalData) return;

    const newItems = [...nutritionalData.foodItems];
    const item = newItems[index];
    if (!item) return;

    const currentCount = Number(item.count) || 1;
    const newCount = Math.max(0, currentCount + delta);
    if (newCount === 0) {
      removeFoodItem(index);
      return;
    }

    item.count = newCount;

    const newTotals = recalculateTotals(newItems);
    
    // Keep results visible and update instantly for better UX
    setNutritionalData({
      ...nutritionalData,
      foodItems: newItems,
      nutritionalInfo: newTotals,
      suitability: calculateClientSuitability(newTotals)
    });
  };

  const updatePortionSize = (index: number, newSize: string) => {
    if (!nutritionalData) return;

    const newItems = [...nutritionalData.foodItems];
    const item = newItems[index];
    if (!item) return;

    const currentScalar = (item as any).scalar || 1.0;
    const newScalar = SIZE_SCALARS[newSize] || 1.0;
    
    (item as any).portionSize = newSize;
    (item as any).scalar = newScalar;

    if (item.perItemNutrition) {
      const keys = ['calories', 'carbs', 'protein', 'fat', 'fiber', 'sugar', 'sodium'];
      keys.forEach(key => {
        if (item.perItemNutrition[key] !== undefined) {
           const baseValue = item.perItemNutrition[key] / currentScalar;
           item.perItemNutrition[key] = parseFloat((baseValue * newScalar).toFixed(1));
        }
      });
    }

    const newTotals = recalculateTotals(newItems);
    
    setNutritionalData({
      ...nutritionalData,
      foodItems: newItems,
      nutritionalInfo: newTotals,
      suitability: calculateClientSuitability(newTotals)
    });
  };

  const removeFoodItem = (index: number) => {
    if (!nutritionalData) return;
    const newItems = nutritionalData.foodItems.filter((_, i) => i !== index);

    if (newItems.length === 0) {
      setNutritionalData(null);
      setIsNutritionVisible(false);
      return;
    }

    const newTotals = recalculateTotals(newItems);

    // Keep results visible for seamless UX
    setNutritionalData({
      ...nutritionalData,
      foodItems: newItems,
      nutritionalInfo: newTotals,
      suitability: calculateClientSuitability(newTotals)
    });
  };

  const calculateClientSuitability = (nutrition: any) => {
    const sugar = nutrition.sugar || 0;
    const carbs = nutrition.carbs || 0;
    const fiber = nutrition.fiber || 0;
    const protein = nutrition.protein || 0;
    const isHighRisk = riskStatus === 'Positive';

    // 🔴 HAZARD: Universal or Clinical Safety threshold breech
    const isUniversalHazard = sugar > 30 || carbs > 75;
    const isRiskHazard = isHighRisk && (sugar > 10 || carbs > 25);

    if (isUniversalHazard || isRiskHazard) {
      return {
        rating: 'suitabilityHazard',
        color: '#FF3B30',
        score: Math.max(5, Math.round(isUniversalHazard ? 20 - sugar : 35 - sugar)),
        reason: isUniversalHazard 
          ? 'Extreme metabolic load detected - hazardous levels for glucose stability.' 
          : 'High glycemic load targets your specific metabolic risk profile.',
        clinicalAlert: true,
        suggestedAlternative: nutritionalData?.suitability?.suggestedAlternative || undefined
      };
    }

    // 🟠 CAUTION: Elevated levels requiring active monitoring
    const isStandardWarning = sugar > 15 || carbs > 45;
    const isRiskWarning = isHighRisk && (sugar > 6 || carbs > 15);

    if (isStandardWarning || isRiskWarning) {
      return {
        rating: 'suitabilityWarning',
        color: '#FF9500',
        score: Math.max(30, Math.round(55 - sugar)),
        reason: (sugar > 15 || (isHighRisk && sugar > 6)) 
          ? 'Elevated sugar content - moderate glycemic impact expected.' 
          : 'High carbohydrate concentration; portion control advised.',
        clinicalAlert: false,
        suggestedAlternative: nutritionalData?.suitability?.suggestedAlternative || undefined
      };
    }

    // 🟢 RECOMMENDED: Balanced choices with buffering nutrients
    const fiberBuffer = fiber > 4;
    const proteinBuffer = protein > 15;

    if (fiberBuffer || (sugar < 5 && carbs < 25)) {
      return {
        rating: 'suitabilityRecommended',
        color: '#34C759',
        score: fiberBuffer ? Math.min(100, 90 + fiber) : 85,
        reason: fiberBuffer 
          ? 'High fiber content successfully buffers metabolic response.' 
          : 'Low-glycemic and nutritionally balanced diabetic-friendly choice.',
        clinicalAlert: false,
        suggestedAlternative: undefined
      };
    }

    // 🟢 DEFAULT: Standard balanced choice
    return {
      rating: 'suitabilityRecommended',
      color: '#34C759',
      score: Math.min(80, 70 + protein / 2),
      reason: 'Standard nutritional profile with managed glycemic impact.',
      clinicalAlert: false,
      suggestedAlternative: undefined
    };
  };

  const recalculateTotals = (items: any[]) => {
    return items.reduce((acc, item) => {
      const nutrition = item.perItemNutrition;
      if (!nutrition) return acc;

      const q = Number(item.count) || 1;
      return {
        calories: acc.calories + (nutrition.calories * q),
        carbs: acc.carbs + (nutrition.carbs * q),
        protein: acc.protein + (nutrition.protein * q),
        fat: acc.fat + (nutrition.fat * q),
        fiber: (acc.fiber || 0) + (nutrition.fiber * q),
        sugar: (acc.sugar || 0) + (nutrition.sugar * q),
        sodium: (acc.sodium || 0) + (nutrition.sodium * q),
      };
    }, { calories: 0, carbs: 0, protein: 0, fat: 0, fiber: 0, sugar: 0, sodium: 0 });
  };

  const handleCorrectItem = async (foodId: string) => {
    try {
      setIsCorrectionModalVisible(false);
      const token = await ensureAccessToken();
      const response = await fetch(`${MEAL_URL}/nutrition-lookup?name=${encodeURIComponent(foodId)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();

      if (data.success) {
        const newItem = {
          name: data.name,
          confidence: 1.0,
          count: 1,
          perItemNutrition: {
            calories: data.nutrition.calories,
            carbs: data.nutrition.carbs,
            protein: data.nutrition.protein,
            fat: data.nutrition.fat,
            fiber: data.nutrition.fiber,
            sugar: data.nutrition.sugar,
            sodium: data.nutrition.sodium,
          }
        };

        const currentItems = nutritionalData?.foodItems || [];
        let updatedItems;

        if (isAddingNewItem) {
          updatedItems = [...currentItems, newItem];
        } else {
          // If we had the modal open but weren't "adding", 
          // we should technically replace? For now let's just add 
          // since the user wants to add missing items.
          updatedItems = [...currentItems, newItem];
        }

        setIsNutritionVisible(false);
        setNutritionalData({
          foodItems: updatedItems,
          nutritionalInfo: recalculateTotals(updatedItems),
          servingSize: "1 Standard Serving (100g approx)",
          healthTips: ["Modified manually by user."],
          imageUrl: analysisImageUrl || nutritionalData?.imageUrl || undefined,
          suitability: data.suitability,
        });
        setIsNotFoodDetected(false);
        setUncertainFoodName(null);
      }
    } catch (error) {
      console.error('Error during food correction:', error);
      Alert.alert('Error', 'Failed to update nutrition data.');
    }
  };

  const filteredFoodClasses = useMemo(() => {
    return (allFoodClasses || []).filter(c =>
      c && c.name && c.name.toLowerCase().includes(searchQuery.toLowerCase())
    ).slice(0, 50); // Limit results for performance
  }, [allFoodClasses, searchQuery]);

  const safeBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  };

  return (
    <LinearGradient
      colors={['#F0FDF4', '#F0F9FF']} // Soft Green to Soft Blue/Teal (Premium Background)
      style={[styles.container, { paddingTop: insets.top }]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[styles.header, themed.header]}>
        <TouchableOpacity onPress={safeBack} style={styles.headerButton}>
          <X size={24} color={colors.text} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, themed.headerTitle]}>Diabetes-Aware Analysis</Text>
        <View style={styles.headerButton} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.imageSection}>
          {selectedImage ? (
            <View style={[styles.imageContainer, themed.imageContainer, Platform.select({
              web: { boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.3)' },
              native: { elevation: 12, shadowOpacity: 0.3 }
            })]}>
              <Image 
                source={{ uri: selectedImage }} 
                style={styles.image} 
                resizeMode="cover"
              />

              {/* Scanning Overlay */}
              {analysisMutation.isPending && (
                <Animated.View style={[styles.scanLine, scanLineStyle]}>
                  <LinearGradient
                    colors={['transparent', '#00D4FF', 'transparent']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 1 }}
                    style={styles.scanGradient}
                  />
                </Animated.View>
              )}

              <TouchableOpacity
                style={styles.removeImageButton}
                onPress={() => {
                  const resetLog = () => {
                    setSelectedImage(null);
                    setNutritionalData(null);
                    setAnalysisError(null);
                    setManualDescription('');
                    setLogMode('scan');
                  };
                  resetLog();
                }}
              >
                <X size={20} color={colors.textWhite} strokeWidth={2.5} />
              </TouchableOpacity>
            </View>
          ) : (
            !nutritionalData && (
              <View style={styles.initialState}>
                {/* 🛠️ New: Mode Selector */}
                <View style={[styles.modeSelector, { backgroundColor: colors.backgroundSecondary }]}>
                  <TouchableOpacity 
                    onPress={() => setLogMode('scan')}
                    style={[styles.modeBtn, logMode === 'scan' && { backgroundColor: '#FFF', ...styles.modeBtnActive }]}
                  >
                    <Camera size={ms(20)} color={logMode === 'scan' ? colors.primary : colors.textSecondary} />
                    <Text style={[styles.modeBtnText, { color: logMode === 'scan' ? colors.text : colors.textSecondary }]}>Scan Food</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    onPress={() => setLogMode('manual')}
                    style={[styles.modeBtn, logMode === 'manual' && { backgroundColor: '#FFF', ...styles.modeBtnActive }]}
                  >
                    <Utensils size={ms(20)} color={logMode === 'manual' ? colors.primary : colors.textSecondary} />
                    <Text style={[styles.modeBtnText, { color: logMode === 'manual' ? colors.text : colors.textSecondary }]}>Manual Log</Text>
                  </TouchableOpacity>
                </View>

                {logMode === 'scan' ? (
                  <>
                    <View style={[styles.scanBox, { backgroundColor: colors.card, minHeight: themed.scanBoxHeight }]}>
                      <View style={[styles.scanIcon, { backgroundColor: colors.primary + '15', width: themed.iconSizeLarge, height: themed.iconSizeLarge, borderRadius: themed.iconSizeLarge / 2 }]}>
                        <Camera size={themed.iconSizeMedium} color={colors.primary} />
                      </View>
                      <Text style={[styles.scanTitle, { color: colors.text }]}>{t.mealLog.uploadPrompt}</Text>
                      <Text style={styles.scanSubtitle}>{t.mealLog.uploadSubtitle}</Text>
                    </View>

                    <View style={styles.buttonContainer}>
                      <TouchableOpacity 
                        style={[styles.actionBtn, { backgroundColor: colors.primary }]}
                        onPress={takePhoto}
                      >
                        <Camera size={24} color="#FFF" />
                        <Text style={styles.actionBtnText}>{t.mealLog.btnCamera}</Text>
                      </TouchableOpacity>

                      <TouchableOpacity 
                        style={[styles.actionBtn, { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }]}
                        onPress={pickImage}
                      >
                        <ImageIcon size={24} color={colors.primary} />
                        <Text style={[styles.actionBtnText, { color: colors.primary }]}>{t.mealLog.btnGallery}</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                ) : (
                  <View style={[styles.manualBox, { backgroundColor: colors.card, minHeight: themed.scanBoxHeight }]}>
                    <View style={[styles.manualIcon, { backgroundColor: colors.primary + '15', width: themed.iconSizeLarge, height: themed.iconSizeLarge, borderRadius: themed.iconSizeLarge / 2 }]}>
                      <Utensils size={themed.iconSizeMedium} color={colors.primary} />
                    </View>
                    <Text style={[styles.scanTitle, { color: colors.text }]}>Describe Your Meal</Text>
                    <Text style={[styles.scanSubtitle, { color: colors.textSecondary }]}>Enter food name, portions, or ingredients</Text>
                    
                    <TextInput
                      style={[styles.manualInput, { backgroundColor: colors.backgroundSecondary, color: colors.text, borderColor: colors.border }]}
                      placeholder="e.g. 2 pieces of bread with butter and a glass of milk"
                      placeholderTextColor={colors.textSecondary + '80'}
                      multiline
                      numberOfLines={4}
                      value={manualDescription}
                      onChangeText={setManualDescription}
                    />

                    <TouchableOpacity 
                      style={[styles.analyzeBtn, { backgroundColor: colors.primary }, !manualDescription && { opacity: 0.5 }]}
                      disabled={!manualDescription || analyzeTextMutation.isPending}
                      onPress={() => analyzeTextMutation.mutate(manualDescription)}
                    >
                      {analyzeTextMutation.isPending ? (
                        <ActivityIndicator color="#FFF" />
                      ) : (
                        <>
                          <Zap size={20} color="#FFF" />
                          <Text style={styles.actionBtnText}>Analyze Meal</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )
          )}
        </View>

        {selectedImage && !nutritionalData && (
          <>
            <View style={styles.mealTypeSection}>
              <Text style={[styles.mealTypeLabel, themed.mealTypeLabel]}>Select Meal Type</Text>
              <View style={styles.mealTypeButtons}>
                {(['breakfast', 'lunch', 'dinner', 'snack'] as const).map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.mealTypeButton,
                      themed.mealTypeButton,
                      selectedMealType === type && themed.mealTypeButtonActive,
                    ]}
                    onPress={() => setSelectedMealType(type)}
                  >
                    <Text
                      style={[
                        styles.mealTypeButtonText,
                        themed.mealTypeButtonText,
                        selectedMealType === type && themed.mealTypeButtonTextActive,
                      ]}
                    >
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TouchableOpacity
              style={[styles.analyzeButton, { overflow: 'hidden' }]}
              onPress={analyzeMeal}
              disabled={analysisMutation.isPending}
              accessibilityRole="button"
              accessibilityLabel="Analyze meal nutritional content"
            >
              <LinearGradient
                colors={[colors.primary, colors.secondary || colors.primary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFill}
              />
              {analysisMutation.isPending ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <ActivityIndicator color={colors.textWhite} />
                  <Text style={[styles.analyzeButtonText, { color: colors.textWhite }]}>Analyzing...</Text>
                </View>
              ) : (
                <Text style={[styles.analyzeButtonText, { color: colors.textWhite }]}>Analyze Meal</Text>
              )}
            </TouchableOpacity>

            {analysisError && (
              <View style={[styles.errorCard, themed.errorCard]}>
                <Info size={20} color={colors.error} strokeWidth={2} />
                <Text style={[styles.errorText, themed.errorText]}>{analysisError}</Text>
              </View>
            )}

            {isNotFoodDetected && (
              <Animated.View entering={FadeInUp} style={[styles.errorCard, themed.errorCard, { borderColor: colors.warning, backgroundColor: colors.warning + '10', flexDirection: 'row', alignItems: 'flex-start' }]}>
                <Info size={24} color={colors.warning} strokeWidth={2.5} style={{ marginTop: 2 }} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={{ color: colors.text, fontWeight: '700', fontSize: responsiveScale(15), marginBottom: 4 }}>
                    Uncertain Detection
                  </Text>
                  <Text style={{ color: colors.textSecondary, fontSize: responsiveScale(13), lineHeight: 20 }}>
                    This image doesn't look like food to our AI{uncertainFoodName ? ` (it looks a bit like ${uncertainFoodName.replace(/_/g, ' ')})` : ''}.
                  </Text>

                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 15 }}>
                    <TouchableOpacity
                      style={[styles.retryButton, { backgroundColor: colors.warning }]}
                      onPress={() => {
                        setIsNotFoodDetected(false);
                        analyzeMeal();
                      }}
                    >
                      <Text style={styles.retryButtonText}>Retry AI</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.manualButton, { borderColor: colors.warning, borderWidth: 1 }]}
                      onPress={() => openCorrectionModal()}
                    >
                      <Text style={[styles.manualButtonText, { color: colors.warning }]}>Search</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </Animated.View>
            )}
          </>
        )}

        {nutritionalData && (
          <>
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, themed.sectionTitle]}>Detected Items</Text>
                <TouchableOpacity onPress={() => openCorrectionModal()}>
                  <Text style={[styles.correctionLink, { color: colors.primary }]}>Not correct?</Text>
                </TouchableOpacity>
              </View>
              <View style={[styles.card, themed.card]}>
                {nutritionalData.foodItems.map((item, index) => (
                  <View key={index} style={[styles.foodItem, themed.foodItem, { flexDirection: 'column', alignItems: 'stretch' }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                      <View style={[styles.foodItemDot, themed.foodItemDot]} />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.foodItemName, themed.foodItemName]}>{item.name}</Text>
                        <Text style={[styles.foodItemConfidence, themed.foodItemConfidence]}>
                         AI Match: {Math.round((item.confidence || 0) * 100)}%
                        </Text>
                      </View>
                      <View style={styles.quantityControls}>
                        <TouchableOpacity
                          style={styles.quantityButton}
                          onPress={() => updateQuantity(index, -1)}
                        >
                          <Minus size={16} color={colors.textSecondary} />
                        </TouchableOpacity>

                        <Text style={[styles.quantityText, { color: colors.text }]}>{Number(item.count) || 1}</Text>

                        <TouchableOpacity
                          style={styles.quantityButton}
                          onPress={() => updateQuantity(index, 1)}
                        >
                          <Plus size={16} color={colors.textSecondary} />
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.quantityButton, { marginLeft: 6 }]}
                          onPress={() => removeFoodItem(index)}
                        >
                          <Trash2 size={16} color={colors.error} />
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* ⚖️ Discovery-Optimized Size Selector */}
                    <View style={[styles.portionSelector, { backgroundColor: colors.backgroundSecondary + '40' }]}>
                      {['Small', 'Standard', 'Big'].map((size) => {
                        const isActive = ((item as any).portionSize || 'Standard') === size;
                        return (
                          <TouchableOpacity
                            key={size}
                            onPress={() => updatePortionSize(index, size)}
                            style={[
                              styles.portionOption,
                              isActive && { backgroundColor: size === 'Big' ? colors.warning : size === 'Small' ? colors.primary : colors.text }
                            ]}
                          >
                            <Text style={[
                              styles.portionOptionText,
                              isActive ? { color: '#FFF', fontWeight: '800' } : { color: colors.textSecondary }
                            ]}>
                              {size}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                ))}

                <TouchableOpacity
                  style={styles.addMissingButton}
                  onPress={() => openCorrectionModal(true)}
                >
                  <Plus size={18} color={colors.primary} strokeWidth={2.5} />
                  <Text style={[styles.addMissingText, { color: colors.primary }]}>Add Missing Item</Text>
                </TouchableOpacity>
              </View>
            </View>

            {!isNutritionVisible && (
              <TouchableOpacity
                style={styles.calculateButton}
                onPress={() => setIsNutritionVisible(true)}
              >
                <LinearGradient
                  colors={[colors.secondary, colors.primary]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[StyleSheet.absoluteFill, { borderRadius: 12 }]}
                />
                <Text style={styles.calculateButtonText}>Calculate & Verify Nutrition</Text>
              </TouchableOpacity>
            )}

            {isNutritionVisible && (
              <Animated.View entering={FadeInUp.duration(500)}>
                <View style={[styles.sectionHeader, { marginBottom: 16 }]}>
                  <Text style={[styles.sectionTitle, themed.sectionTitle]}>Nutritional Analysis</Text>
                  <View style={[styles.proBadge, { backgroundColor: colors.primary + '15' }]}>
                    <Text style={[styles.proBadgeText, { color: colors.primary }]}>AI VERIFIED</Text>
                  </View>
                </View>

                <View style={styles.nutritionGrid}>
                  <View style={[styles.nutritionCard, themed.nutritionCard, { shadowColor: colors.warning }]}>
                    <LinearGradient colors={[colors.warning + '15', colors.warning + '05']} style={StyleSheet.absoluteFill} />
                    <View style={[styles.nutritionIcon, { backgroundColor: colors.warning + '20' }]}>
                      <Flame size={20} color={colors.warning} strokeWidth={2.5} />
                    </View>
                    <View>
                      <Text style={[styles.nutritionValue, themed.nutritionValue, { color: colors.warning }]}>
                        {Math.round(nutritionalData.nutritionalInfo.calories || 0)}
                      </Text>
                      <Text style={[styles.nutritionLabel, themed.nutritionLabel]}>Calories</Text>
                    </View>
                  </View>

                  <View style={[styles.nutritionCard, themed.nutritionCard, { shadowColor: '#34C759' }]}>
                    <LinearGradient colors={['#34C75915', '#34C75905']} style={StyleSheet.absoluteFill} />
                    <View style={[styles.nutritionIcon, { backgroundColor: '#34C75920' }]}>
                      <Croissant size={20} color="#34C759" strokeWidth={2.5} />
                    </View>
                    <View>
                      <Text style={[styles.nutritionValue, themed.nutritionValue, { color: '#34C759' }]}>
                        {Number(nutritionalData.nutritionalInfo.carbs || 0).toFixed(1)}g
                      </Text>
                      <Text style={[styles.nutritionLabel, themed.nutritionLabel]}>Carbs</Text>
                    </View>
                  </View>

                  <View style={[styles.nutritionCard, themed.nutritionCard, { shadowColor: '#FF3B30' }]}>
                    <LinearGradient colors={['#FF3B3015', '#FF3B3005']} style={StyleSheet.absoluteFill} />
                    <View style={[styles.nutritionIcon, { backgroundColor: '#FF3B3020' }]}>
                      <Beef size={20} color="#FF3B30" strokeWidth={2.5} />
                    </View>
                    <View>
                      <Text style={[styles.nutritionValue, themed.nutritionValue, { color: '#FF3B30' }]}>
                        {Number(nutritionalData.nutritionalInfo.protein || 0).toFixed(1)}g
                      </Text>
                      <Text style={[styles.nutritionLabel, themed.nutritionLabel]}>Protein</Text>
                    </View>
                  </View>

                  <View style={[styles.nutritionCard, themed.nutritionCard, { shadowColor: '#FF9500' }]}>
                    <LinearGradient colors={['#FF950015', '#FF950005']} style={StyleSheet.absoluteFill} />
                    <View style={[styles.nutritionIcon, { backgroundColor: '#FF950020' }]}>
                      <Pizza size={20} color="#FF9500" strokeWidth={2.5} />
                    </View>
                    <View>
                      <Text style={[styles.nutritionValue, themed.nutritionValue, { color: '#FF9500' }]}>
                        {Number(nutritionalData.nutritionalInfo.fat || 0).toFixed(1)}g
                      </Text>
                      <Text style={[styles.nutritionLabel, themed.nutritionLabel]}>Fat</Text>
                    </View>
                  </View>

                  <View style={[styles.nutritionCard, themed.nutritionCard, { shadowColor: '#FF2D55', borderBottomWidth: 2, borderBottomColor: '#FF2D55' }]}>
                    <LinearGradient colors={['#FF2D5515', '#FF2D5505']} style={StyleSheet.absoluteFill} />
                    <View style={[styles.nutritionIcon, { backgroundColor: '#FF2D5520' }]}>
                      <Candy size={20} color="#FF2D55" strokeWidth={2.5} />
                    </View>
                    <View>
                      <Text style={[styles.nutritionValue, themed.nutritionValue, { color: '#FF2D55' }]}>
                        {Number(nutritionalData.nutritionalInfo.sugar || 0).toFixed(1)}g
                      </Text>
                      <Text style={[styles.nutritionLabel, themed.nutritionLabel]}>Sugar</Text>
                    </View>
                  </View>

                  <View style={[styles.nutritionCard, themed.nutritionCard, { shadowColor: '#007AFF', borderColor: '#007AFF15' }]}>
                    <LinearGradient colors={['#007AFF12', '#007AFF05']} style={StyleSheet.absoluteFill} />
                    <View style={[styles.nutritionIcon, { backgroundColor: '#007AFF15' }]}>
                      <Waves size={20} color="#007AFF" strokeWidth={2.5} />
                    </View>
                    <View>
                      <Text style={[styles.nutritionValue, themed.nutritionValue, { color: '#007AFF' }]}>
                        {Math.round(nutritionalData.nutritionalInfo.sodium || 0)}mg
                      </Text>
                      <Text style={[styles.nutritionLabel, themed.nutritionLabel]}>Sodium</Text>
                    </View>
                  </View>
                </View>

                <View style={[styles.servingSizeCard, { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border + '15', borderRadius: 16, padding: 16 }]}>
                  <View style={[styles.servingIconBox, { backgroundColor: colors.primary + '08' }]}>
                    <Scale size={20} color={colors.primary} strokeWidth={2.5} />
                  </View>
                  <Text style={[styles.servingSizeText, { color: colors.textSecondary, fontSize: 13 }]}>
                    Estimated Serving: <Text style={{ color: colors.text, fontWeight: '800', fontSize: 15 }}>{nutritionalData.servingSize}</Text>
                  </Text>
                  <View style={{ backgroundColor: colors.primary + '10', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}>
                     <Text style={{ color: colors.primary, fontSize: 10, fontWeight: '900' }}>AI ESTIMATED</Text>
                  </View>
                </View>

                {nutritionalData.suitability && (
                  <View style={styles.section}>
                    <View style={styles.clinicalHeaderRow}>
                      <Text style={styles.clinicalSectionTitle}>Diabetes-Aware Score</Text>
                        <View style={[styles.suitabilityBadge, { 
                          backgroundColor: hasRestrictedFood ? colors.error + '15' : (nutritionalData?.suitability?.color || colors.primary) + '15', 
                          borderColor: hasRestrictedFood ? colors.error : (nutritionalData?.suitability?.color || colors.primary) 
                        }]}>
                          <View style={[styles.suitabilityPulse, { backgroundColor: hasRestrictedFood ? colors.error : (nutritionalData?.suitability?.color || colors.primary) }]} />
                          <Text style={[styles.suitabilityBadgeText, { color: hasRestrictedFood ? colors.error : (nutritionalData?.suitability?.color || colors.primary) }]}>
                            {hasRestrictedFood ? 'Hazard' : (nutritionalData?.suitability?.rating === 'suitabilityHazard' ? 'Hazard' : nutritionalData?.suitability?.rating === 'suitabilityWarning' ? 'Caution' : 'Recommended')}
                          </Text>
                        </View>
                  </View>

                  <View style={[styles.suitabilityCard, { backgroundColor: colors.card }]}>
                    <View style={[styles.suitabilityIndicator, { backgroundColor: hasRestrictedFood ? colors.error : (nutritionalData?.suitability?.color || colors.primary) }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.suitabilityReason, { color: colors.text }]}>
                        {hasRestrictedFood 
                          ? `This meal is strictly avoided on your ${activeDietDetails?.name || 'diet plan'}.` 
                          : (nutritionalData?.suitability?.reason || 'Nutritional profile analyzed.')}
                      </Text>
                      <View style={styles.aiRiskBadge}>
                        <ShieldCheck size={12} color={colors.textSecondary} />
                        <Text style={styles.aiRiskText}>SweetTrack Wellness Guard Active</Text>
                      </View>
                    </View>
                    <View style={[styles.scoreCircle, { borderColor: (hasRestrictedFood ? colors.error : (nutritionalData?.suitability?.color || colors.primary)) + '20' }]}>
                      <Text style={[styles.scoreValue, { color: hasRestrictedFood ? colors.error : (nutritionalData?.suitability?.color || colors.primary) }]}>
                        {hasRestrictedFood ? '!' : Math.round(nutritionalData?.suitability?.score || 0)}
                      </Text>
                      <Text style={styles.scoreLabel}>{hasRestrictedFood ? 'Blocked' : 'Score'}</Text>
                    </View>
                  </View>

                    {nutritionalData.suitability.suggestedAlternative && Array.isArray(nutritionalData.suitability.suggestedAlternative) && nutritionalData.suitability.suggestedAlternative.length > 0 && (
                      <Animated.View
                        entering={FadeInUp.delay(300)}
                        style={[styles.alternativeCard, { backgroundColor: colors.primary + '05', borderColor: colors.primary + '20' }]}
                      >
                        <View style={styles.alternativeHeader}>
                          <Zap size={18} color={colors.primary} fill={colors.primary} />
                          <Text style={[styles.alternativeHeaderTitle, { color: colors.primary }]}>SMART ALTERNATIVES</Text>
                        </View>
                        {nutritionalData.suitability.suggestedAlternative.map((alt, idx) => {
                           const altArray = nutritionalData.suitability!.suggestedAlternative!;
                           return (
                             <View key={idx} style={[styles.swapMainRow, { borderBottomWidth: idx !== altArray.length - 1 ? 1 : 0, borderBottomColor: colors.primary + '15', paddingBottom: idx !== altArray.length - 1 ? 12 : 0, paddingTop: idx !== 0 ? 12 : 0 }]}>
                                <View style={styles.swapInfo}>
                                   <Text style={[styles.alternativeFoodName, { color: colors.text }]}>
                                     {alt.name}
                                   </Text>
                                   <Text style={[styles.alternativeReason, { color: colors.textSecondary }]}>
                                     {alt.reason}
                                   </Text>
                                </View>
                                <ArrowRight size={20} color={colors.primary} opacity={0.5} />
                             </View>
                           );
                        })}
                      </Animated.View>
                    )}
                  </View>
                )}

                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Wellness Insights</Text>
                  <View style={[styles.insightCard, { backgroundColor: colors.primary + '08', borderLeftColor: colors.primary }]}>
                    {nutritionalData.healthTips && nutritionalData.healthTips.length > 0 ? (
                      nutritionalData.healthTips.map((tip, index) => (
                        <View key={index} style={styles.insightRow}>
                          <CheckCircle size={14} color={colors.primary} style={{ marginTop: 2 }} />
                          <Text style={[styles.insightText, { color: colors.textSecondary }]}>{tip}</Text>
                        </View>
                      ))
                    ) : (
                      <View style={styles.insightRow}>
                        <Info size={14} color={colors.primary} />
                        <Text style={[styles.insightText, { color: colors.textSecondary }]}>Metabolic balance seems steady.</Text>
                      </View>
                    )}
                  </View>
                </View>

                {nutritionalData?.suitability?.rating === 'suitabilityHazard' || hasRestrictedFood ? (
                  <TouchableOpacity 
                    onPress={() => {
                      if (hasRestrictedFood) {
                        // Trigger the same logic as saveMealLog to show the block modal
                        saveMealLog();
                      }
                    }}
                    style={[styles.saveButton, { backgroundColor: colors.card, borderColor: colors.error + '25', borderWidth: 1.5, height: 'auto', paddingVertical: 24, marginTop: 24, borderRadius: 24 }]}
                  >
                    <LinearGradient 
                      colors={[colors.error + '08', colors.error + '02']} 
                      style={StyleSheet.absoluteFill} 
                    />
                    <View style={{ flexDirection: 'column', alignItems: 'center', gap: 12, paddingHorizontal: 20 }}>
                      <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: colors.error + '12', justifyContent: 'center', alignItems: 'center' }}>
                        <ShieldAlert size={28} color={colors.error} strokeWidth={2.5} />
                      </View>
                      <View style={{ alignItems: 'center' }}>
                        <Text style={[styles.saveButtonText, { color: colors.error, fontSize: 19, marginBottom: 4 }]}>{hasRestrictedFood ? 'Dietary Restriction Active' : 'High Metabolic Risk'}</Text>
                        <Text style={{ fontSize: 14, color: colors.textSecondary, fontWeight: '600', textAlign: 'center', lineHeight: 20 }}>
                          {hasRestrictedFood ? 'Logging disabled: This meal contains items strictly avoided on your active diet plan.' : 'Intake blocked: This meal contains excessive sugar/carbs for your safe threshold.'}
                        </Text>
                        <Text style={{ fontSize: 12, color: colors.error, marginTop: 8, fontWeight: '700' }}>VIEW REASON & SWAPS</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={[styles.saveButton, isSaving && { opacity: 0.7 }, { marginTop: 20 }]}
                    onPress={saveMealLog}
                    disabled={isSaving}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={[colors.primary, colors.secondary || colors.primary]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={StyleSheet.absoluteFill}
                    />
                    {isSaving ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <ActivityIndicator color="#FFF" size="small" />
                        <Text style={[styles.saveButtonText, { color: '#FFF' }]}>Securing Log...</Text>
                      </View>
                    ) : (
                      <Text style={[styles.saveButtonText, { color: '#FFF' }]}>Finalize & Save Log</Text>
                    )}
                  </TouchableOpacity>
                )}
              </Animated.View>
            )}
          </>
        )}
      </ScrollView>

      {/* Food Correction Modal */}
      <Modal
        visible={isCorrectionModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsCorrectionModalVisible(false)}
      >
        <TouchableOpacity
          style={[styles.modalOverlay, themed.modalOverlay]}
          activeOpacity={1}
          onPress={() => setIsCorrectionModalVisible(false)}
        >
          <View style={[styles.modalContent, themed.modalContent, { borderTopLeftRadius: 32, borderTopRightRadius: 32 }]}>
            <View style={styles.modalHandle} />
            <View style={[styles.modalHeader, themed.modalHeader, { borderBottomWidth: 0 }]}>
              <Text style={[styles.modalTitle, { color: colors.text, fontSize: 22 }]}>
                {isAddingNewItem ? 'Smart Add' : 'Correction'}
              </Text>
              <TouchableOpacity style={styles.modalCloseCircle} onPress={() => setIsCorrectionModalVisible(false)}>
                <X size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={[styles.searchContainer, { backgroundColor: colors.backgroundSecondary }]}>
               <ImageIcon size={20} color={colors.primary} />
                <TextInput
                  style={[styles.searchInput, { flex: 1, marginBottom: 0, borderWidth: 0 }]}
                  placeholder="What did you eat?"
                  placeholderTextColor={colors.textSecondary}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  autoCapitalize="none"
                  autoFocus
                />
            </View>

            <FlatList
              data={filteredFoodClasses}
              keyExtractor={(item) => item.id}
              style={styles.foodClassList}
              contentContainerStyle={{ paddingBottom: 40 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.premiumListItem, { borderBottomColor: colors.border + '20' }]}
                  onPress={() => handleCorrectItem(item.id)}
                >
                  <View style={[styles.listIconBox, { backgroundColor: colors.primary + '10' }]}>
                    <Plus size={16} color={colors.primary} />
                  </View>
                  <Text style={[styles.foodClassText, { color: colors.text }]}>
                    {item.name}
                  </Text>
                  <ChevronRight size={18} color={colors.textSecondary} opacity={0.5} />
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={{ alignItems: 'center', marginTop: 40, paddingHorizontal: 20 }}>
                  <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: colors.backgroundSecondary, justifyContent: 'center', alignItems: 'center', marginBottom: 20 }}>
                    <ImageIcon size={40} color={colors.textSecondary} opacity={0.3} />
                  </View>
                  <Text style={{ color: colors.text, fontWeight: '700', fontSize: 16, marginBottom: 8 }}>No matches found</Text>
                  <Text style={{ color: colors.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: 20 }}>Our AI is still learning! Try searching for common food names.</Text>
                  <TouchableOpacity 
                    style={{ backgroundColor: colors.primary + '15', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 }}
                    onPress={() => {
                      setIsCorrectionModalVisible(false);
                      Alert.alert("Feedback Received", "We've noted this missing food and will add it soon!");
                    }}
                  >
                    <Text style={{ color: colors.primary, fontWeight: '700' }}>Request this food</Text>
                  </TouchableOpacity>
                </View>
              }
            />
          </View>
        </TouchableOpacity>
      </Modal>

      {/* 🛡️ Clinical Block Modal */}
      <Modal
        visible={!!blockedFoodInfo}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setBlockedFoodInfo(null)}
      >
        <View style={styles.blockModalOverlay}>
          <View style={styles.blockModalContent}>
            <View style={styles.blockIconContainer}>
              <ShieldAlert size={48} color="#F44336" />
            </View>
            
            <Text style={styles.blockTitle}>High Metabolic Load Detected</Text>
            <Text style={styles.blockSubtitle}>
              Based on your clinical status, <Text style={{fontWeight: '900', color: colors.text}}>{blockedFoodInfo?.riskyItem}</Text> significantly increases your blood glucose risk.
            </Text>

            <View style={styles.blockDivider} />

            <Text style={styles.swapTitle}>Healthy Alternatives Suggested:</Text>
            {blockedFoodInfo?.alternatives.map((alt, idx) => (
              <View key={idx} style={styles.swapCard}>
                <View style={{flex: 1}}>
                  <Text style={styles.swapName}>{alt.name}</Text>
                  <Text style={styles.swapBenefit}>{alt.benefit}</Text>
                </View>
                <View style={styles.impactBadge}>
                  <Text style={styles.impactText}>{alt.macroImpact}</Text>
                </View>
              </View>
            ))}

            <TouchableOpacity 
              style={styles.closeBlockButton} 
              onPress={() => setBlockedFoodInfo(null)}
            >
              <Text style={styles.closeBlockText}>I Understand. I'll Swap This.</Text>
            </TouchableOpacity>

            <Text style={styles.blockDisclaimer}>
              Active metabolic restriction is enabled for your profile safety.
            </Text>
          </View>
        </View>
      </Modal>

      {/* Success Overlay */}
      {showSuccess && (
        <Animated.View
          entering={FadeIn.duration(400)}
          style={[StyleSheet.absoluteFill, styles.successOverlay, { backgroundColor: colors.background }]}
        >
          <View style={styles.successContent}>
            <Animated.View entering={FadeInUp.delay(200).duration(500)}>
              <CheckCircle size={80} color={colors.primary} strokeWidth={2.5} />
            </Animated.View>
            <Text style={[styles.successTitle, { color: colors.text }]}>Meal Saved!</Text>
            <Text style={[styles.successSubtitle, { color: colors.textSecondary }]}>
              Your meal has been successfully uploaded and added to your Meal Dashboard.
            </Text>

            <TouchableOpacity
              style={[styles.successButton, { backgroundColor: colors.primary }]}
              onPress={safeBack}
            >
              <Text style={styles.successButtonText}>Back to Dashboard</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  imageSection: {
    marginBottom: 20,
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  removeImageButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  scanLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 80,
    zIndex: 5,
  },
  scanGradient: {
    flex: 1,
  },
  placeholderContainer: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: 24,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  placeholderIconBox: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  placeholderTitle: {
    fontSize: 18,
    fontWeight: '800', 
    letterSpacing: 0.5,
  },
  placeholderSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 4,
    opacity: 0.7,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  actionButton: {
    flex: 1,
    height: 54,
    borderRadius: 16,
    overflow: 'hidden',
    ...Platform.select({
      web: { boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.15)' },
      native: {
        elevation: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      }
    }),
  },
  actionContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    zIndex: 1,
  },
  actionButtonText: {
    fontWeight: '800',
    fontSize: 16,
    letterSpacing: 0.3,
    color: '#FFF',
    ...Platform.select({
      ios: { paddingBottom: 1 },
      android: { paddingBottom: 2 }
    })
  },
  analyzeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 24,
    gap: 12,
    ...Platform.select({
      web: {
        boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.2)',
      },
      native: {
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
    }),
  },
  analyzeButtonText: {
    fontWeight: '700',
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 24,
    gap: 12,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  section: {
    marginBottom: 28,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontWeight: '700',
  },
  correctionLink: {
    fontSize: 13,
    fontWeight: '600',
  },
  card: {
    borderRadius: 16,
    padding: 16,
    ...Platform.select({
      web: {
        boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.1)',
      },
      native: {
        elevation: 4,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
    }),
  },
  foodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  foodItemDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 10,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  quantityButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityText: {
    fontSize: 16,
    fontWeight: '600',
    minWidth: 20,
    textAlign: 'center',
  },
  foodItemName: {
    flex: 1,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  foodItemConfidence: {
    fontWeight: '600',
    fontSize: 12,
    opacity: 0.7,
  },
  portionSelector: {
    flexDirection: 'row',
    borderRadius: 10,
    padding: 3,
    marginTop: 4,
  },
  portionOption: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  portionOptionText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  nutritionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -ms(4),
    marginBottom: ms(12),
  },
  nutritionCard: {
    width: '47.5%',
    borderRadius: ms(18),
    padding: ms(14),
    margin: ms(4),
    flexDirection: 'row',
    alignItems: 'center',
    gap: ms(12),
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
    backgroundColor: 'rgba(255,255,255,0.7)',
    overflow: 'hidden',
    ...Platform.select({
      web: { boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.04)' },
      native: {
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      }
    }),
  },
  nutritionIcon: {
    width: ms(40),
    height: ms(40),
    borderRadius: ms(20),
    alignItems: 'center',
    justifyContent: 'center',
  },
  nutritionValue: {
    fontWeight: '900',
    fontSize: 22,
    letterSpacing: -0.8,
    lineHeight: 26,
  },
  nutritionLabel: {
    fontWeight: '700',
    fontSize: 12,
    opacity: 0.8,
    marginTop: 1,
  },
  servingSizeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 14,
    gap: 10,
    marginTop: 8,
  },
  servingSizeText: {
    flex: 1,
    fontWeight: '600',
  },
  insightCard: {
    borderRadius: 16,
    padding: 16,
    borderLeftWidth: 4,
    gap: 12,
  },
  insightRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 8,
  },
  insightDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 7,
  },
  insightText: {
    flex: 1,
    lineHeight: 20,
    fontWeight: '500',
  },
  saveButton: {
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    elevation: 8,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    overflow: 'hidden',
  },
  saveButtonText: {
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  mealTypeSection: {
    marginBottom: 20,
  },
  mealTypeLabel: {
    fontWeight: '700',
    marginBottom: 12,
  },
  mealTypeButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  mealTypeButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  mealTypeButtonActive: {},
  mealTypeButtonText: {
    fontWeight: '600',
    fontSize: 12,
  },
  mealTypeButtonTextActive: {
    fontWeight: '800',
  },
  proBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  proBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  servingIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clinicalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  clinicalSectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#333',
  },
  suitabilityPulse: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  aiRiskBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    opacity: 0.6,
  },
  aiRiskText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  scoreValue: {
    fontSize: 24,
    fontWeight: '900',
    lineHeight: 28,
  },
  scoreLabel: {
    fontSize: 10,
    fontWeight: '800',
    opacity: 0.5,
    marginTop: -2,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  swapMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  swapInfo: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    height: hp(80),
    padding: ms(24),
    paddingTop: ms(16),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 16,
    marginBottom: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
  },
  searchInput: {
    height: ms(54),
    borderRadius: ms(12),
    borderWidth: 1,
    paddingHorizontal: ms(16),
    fontSize: scale(16),
    marginBottom: ms(20),
  },
  foodClassList: {
    flex: 1,
  },
  foodClassItem: {
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  foodClassText: {
    fontSize: 16,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  modalHandle: {
    width: 40,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#EEE',
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalCloseCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderRadius: 16,
    marginBottom: 24,
    height: 54,
    gap: 12,
  },
  premiumListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    gap: 14,
  },
  listIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  successOverlay: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  successContent: {
    alignItems: 'center',
    gap: 20,
  },
  successTitle: {
    fontSize: 32,
    fontWeight: '900',
    textAlign: 'center',
  },
  successSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    opacity: 0.8,
  },
  retryButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryButtonText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 14,
  },
  manualButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  manualButtonText: {
    fontWeight: '700',
    fontSize: 14,
  },
  successButton: {
    paddingHorizontal: 36,
    paddingVertical: 16,
    borderRadius: 30,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  successButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
  },
  addMissingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    marginTop: 4,
    gap: 8,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: 12,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  addMissingText: {
    fontWeight: '700',
    fontSize: 14,
  },
  calculateButton: {
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  calculateButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
  },
  suitabilityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1.5,
    gap: 6,
  },
  suitabilityBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  suitabilityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    gap: 16,
    overflow: 'hidden',
    ...Platform.select({
      web: { boxShadow: '0px 8px 16px rgba(0, 0, 0, 0.06)' },
      native: {
        elevation: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      }
    }),
  },
  suitabilityIndicator: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 6,
  },
  suitabilityReason: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 22,
  },
  suitabilityContext: {
    fontSize: 12,
    marginLeft: 6,
  },
  scoreCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
    ...Platform.select({
      web: { boxShadow: 'inset 0px 2px 4px rgba(0,0,0,0.05)' },
      native: {}
    }),
  },
  clinicalWarningCard: {
    borderWidth: 1.5,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
    backgroundColor: '#FFF',
    ...Platform.select({
      web: { boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)' },
      native: {
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      }
    }),
  },
  clinicalWarningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 8,
  },
  clinicalWarningTitle: {
    fontSize: 14,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  clinicalWarningBody: {
    padding: 16,
    paddingTop: 12,
  },
  clinicalWarningText: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 22,
  },
  alternativeCard: {
    marginTop: 20,
    borderWidth: 1,
    borderRadius: 20,
    padding: 20,
    backgroundColor: '#FFF',
    overflow: 'hidden',
    ...Platform.select({
      web: { boxShadow: '0px 8px 24px rgba(0, 0, 0, 0.05)' },
      native: {
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 16,
      }
    }),
  },
  alternativeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  alternativeHeaderTitle: {
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  alternativeBody: {
    gap: 4,
  },
  alternativeFoodName: {
    fontSize: 18,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  alternativeReason: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  // --- 🛡️ Clinical Block Styles ---
  blockModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  blockModalContent: {
    backgroundColor: '#FFF',
    width: '100%',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    ...Platform.select({
      web: { boxShadow: '0px 10px 20px rgba(0, 0, 0, 0.3)' },
      native: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 10,
      }
    }),
  },
  blockIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFEBEE',
    justifyContent: 'center', 
    alignItems: 'center', 
    marginBottom: 20,
  },
  blockTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#D32F2F',
    textAlign: 'center',
    marginBottom: 12,
  },
  blockSubtitle: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  blockDivider: {
    height: 1,
    backgroundColor: '#EEE',
    width: '100%',
    marginBottom: 20,
  },
  swapTitle: {
    alignSelf: 'flex-start',
    fontSize: 14,
    fontWeight: '800',
    color: '#444',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  swapCard: {
    flexDirection: 'row',
    backgroundColor: '#F9F9F9', 
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  swapName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
  swapBenefit: {
    fontSize: 12,
    color: '#777',
    marginTop: 2,
  },
  impactBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  impactText: {
    fontSize: 11,
    fontWeight: '800', 
    color: '#2E7D32',
  },
  closeBlockButton: {
    backgroundColor: '#333',
    width: '100%',
    height: 54,
    borderRadius: 12,
    justifyContent: 'center', 
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 12,
  },
  closeBlockText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
  },
  blockDisclaimer: {
    fontSize: 11,
    color: '#999',
    fontStyle: 'italic', 
    textAlign: 'center',
  },
  analyzeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    gap: 12,
    marginTop: 20,
    width: '100%',
  },
  modeSelector: {
    flexDirection: 'row',
    padding: 6,
    borderRadius: 14,
    marginBottom: 24,
    width: '100%',
  },
  modeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 8,
  },
  modeBtnActive: {
    ...Platform.select({
      web: { boxShadow: '0px 2px 4px rgba(0,0,0,0.1)' },
      native: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
      }
    })
  },
  modeBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  manualBox: {
    width: '100%',
    padding: ms(24),
    borderRadius: ms(24),
    alignItems: 'center',
    ...Platform.select({
      web: { boxShadow: '0px 4px 15px rgba(0,0,0,0.05)' },
      native: {
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 15,
      },
    }),
  },
  manualIcon: {
    width: ms(80),
    height: ms(80),
    borderRadius: ms(40),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: ms(20),
  },
  manualInput: {
    width: '100%',
    minHeight: ms(120),
    borderWidth: 1,
    borderRadius: ms(16),
    padding: ms(16),
    fontSize: scale(16),
    textAlignVertical: 'top',
    marginTop: ms(24),
  },
  initialState: {
    width: '100%',
    alignItems: 'center',
    marginTop: 20,
  },
  scanBox: {
    width: '100%',
    padding: 30,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: 'rgba(0,0,0,0.1)',
  },
  scanIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  scanTitle: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  scanSubtitle: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
    marginTop: 24,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
  },
  actionBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFF',
  },
});
