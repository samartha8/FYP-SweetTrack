import { useState, useMemo } from 'react';
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
import { X, Camera, Image as ImageIcon, Flame, Wheat, Beef, Droplets, Info, Candy, Waves, Croissant, Pizza, CheckCircle, Plus, Minus, Trash2 } from 'lucide-react-native';
import { useMutation } from '@tanstack/react-query';
import { generateObject } from '@/lib/rork-toolkit-mock';
import { z } from 'zod';
import { useMealTracking } from '@/contexts/MealTrackingContext';
import { useTheme } from '@/contexts/SettingsContext';
import { useUser } from '@/contexts/UserContext';
import { MEAL_URL } from '../constants/Api';

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
};

export default function MealLogScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { addMealLog } = useMealTracking();
  const { colors, scale } = useTheme();
  const { ensureAccessToken } = useUser();

  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [nutritionalData, setNutritionalData] = useState<NutritionalInfo | null>(null);
  const [selectedMealType, setSelectedMealType] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>('breakfast');
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [isCorrectionModalVisible, setIsCorrectionModalVisible] = useState(false);
  const [allFoodClasses, setAllFoodClasses] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isNotFoodDetected, setIsNotFoodDetected] = useState(false);
  const [uncertainFoodName, setUncertainFoodName] = useState<string | null>(null);
  const [analysisImageUrl, setAnalysisImageUrl] = useState<string | null>(null);
  const [isNutritionVisible, setIsNutritionVisible] = useState(false);
  const [isAddingNewItem, setIsAddingNewItem] = useState(false);

  // Dynamic Styles
  const themed = useMemo(() => ({
    container: { backgroundColor: colors.backgroundSecondary },
    header: { backgroundColor: colors.background, borderBottomColor: colors.border },
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
      let token = await ensureAccessToken();

      const fetchAnalysis = async (authToken: string) => {
        return fetch(`${MEAL_URL}/analyze`, {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${authToken || ''}`,
          },
          body: formData,
        });
      };

      let response = await fetchAnalysis(token || '');

      // Handle 401 Unauthorized (Token Expired)
      if (response.status === 401) {
        console.warn("Token expired, attempting refresh for meal analysis...");
        token = await ensureAccessToken(true); // Force refresh
        if (token) {
          console.log("Token refreshed, retrying meal analysis...");
          response = await fetchAnalysis(token);
        } else {
          console.error("Refresh failed - no token available for retry.");
        }
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
      // Map backend response to current UI status
      setNutritionalData({
        foodItems: data.foodItems.map((item: any) => ({
          ...item,
          count: item.count || 1,
          perItemNutrition: item.perItemNutrition
        })),
        nutritionalInfo: data.nutritionalInfo,
        servingSize: data.servingSize,
        healthTips: data.healthTips,
        imageUrl: data.imageUrl,
      });
    },
    onError: (error) => {
      stopScan();
      console.error('Meal analysis error:', error);
      setAnalysisError(error.message || 'Failed to analyze meal. Please ensure your backend is running.');
      setNutritionalData(null);
    },
  });

  // Scanning Animation
  const scanPosition = useSharedValue(0);

  const scanLineStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: scanPosition.value * 200 }], // Responsive to container height
    opacity: withTiming(analysisMutation.isPending ? 1 : 0),
  }));

  const startScan = () => {
    scanPosition.value = 0;
    scanPosition.value = withRepeat(
      withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.quad) }),
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

    setIsSaving(true);
    try {
      await addMealLog({
        imageUri: analysisImageUrl || nutritionalData?.imageUrl || selectedImage || undefined,
        foodItems: nutritionalData.foodItems,
        nutritionalInfo: nutritionalData.nutritionalInfo,
        servingSize: nutritionalData.servingSize,
        mealType: selectedMealType,
      });

      setShowSuccess(true);
      // Automatically go back after a short delay to let user see success
      setTimeout(() => {
        safeBack();
      }, 2500);

    } catch (error) {
      console.error('Error saving meal log:', error);
      Alert.alert('Error', 'Failed to save meal log. Please try again.');
    } finally {
      setIsSaving(false);
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

    const newCount = Math.max(0, item.count + delta);
    if (newCount === 0) {
      removeFoodItem(index);
      return;
    }

    item.count = newCount;
    // item.name is now clean from backend, no need to split/append

    setIsNutritionVisible(false);
    setNutritionalData({
      ...nutritionalData,
      foodItems: newItems,
      nutritionalInfo: recalculateTotals(newItems)
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

    setIsNutritionVisible(false);
    setNutritionalData({
      ...nutritionalData,
      foodItems: newItems,
      nutritionalInfo: recalculateTotals(newItems)
    });
  };

  const recalculateTotals = (items: any[]) => {
    return items.reduce((acc, item) => {
      const nutrition = item.perItemNutrition;
      if (!nutrition) return acc;

      const q = item.count;
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

  const handleCorrectItem = async (foodName: string) => {
    try {
      setIsCorrectionModalVisible(false);
      const token = await ensureAccessToken();
      const response = await fetch(`${MEAL_URL}/nutrition-lookup?name=${encodeURIComponent(foodName)}`, {
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
            carbs: data.nutrition.carbs_g,
            protein: data.nutrition.protein_g,
            fat: data.nutrition.fat_g,
            fiber: data.nutrition.fiber_g,
            sugar: data.nutrition.sugar_g,
            sodium: data.nutrition.sodium_mg,
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
      c && typeof c === 'string' && c.toLowerCase().includes(searchQuery.toLowerCase())
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
    <View style={[styles.container, themed.container, { paddingTop: insets.top }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[styles.header, themed.header]}>
        <TouchableOpacity onPress={safeBack} style={styles.headerButton}>
          <X size={24} color={colors.text} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, themed.headerTitle]}>Smart Meal Logging</Text>
        <View style={styles.headerButton} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.imageSection}>
          {selectedImage ? (
            <View style={[styles.imageContainer, themed.imageContainer]}>
              <Image source={{ uri: selectedImage }} style={styles.image} />

              {/* Scanning Overlay */}
              {analysisMutation.isPending && (
                <Animated.View style={[styles.scanLine, scanLineStyle]}>
                  <LinearGradient
                    colors={['transparent', colors.primary, 'transparent']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 1 }}
                    style={styles.scanGradient}
                  />
                </Animated.View>
              )}

              <TouchableOpacity
                style={styles.removeImageButton}
                onPress={() => {
                  setSelectedImage(null);
                  setNutritionalData(null);
                  stopScan();
                }}
              >
                <X size={20} color={colors.textWhite} strokeWidth={2} />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={[styles.placeholderContainer, themed.placeholderContainer]}>
              <ImageIcon size={64} color={colors.textSecondary} strokeWidth={1.5} />
              <Text style={[styles.placeholderText, themed.placeholderText]}>No image selected</Text>
            </View>
          )}
        </View>

        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.cameraButton, { backgroundColor: colors.primary }]}
            onPress={takePhoto}
            accessibilityRole="button"
            accessibilityLabel="Take photo of meal"
          >
            <Camera size={24} color={colors.textWhite} strokeWidth={2} />
            <Text style={[styles.actionButtonText, themed.actionButtonText]}>Camera</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.galleryButton, { backgroundColor: colors.secondary }]}
            onPress={pickImage}
            accessibilityRole="button"
            accessibilityLabel="Select image from gallery"
          >
            <ImageIcon size={24} color={colors.textWhite} strokeWidth={2} />
            <Text style={[styles.actionButtonText, themed.actionButtonText]}>Gallery</Text>
          </TouchableOpacity>
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
                <>
                  <ActivityIndicator color={colors.textWhite} />
                  <Text style={[styles.analyzeButtonText, { color: colors.textWhite }]}>Analyzing...</Text>
                </>
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
                  <Text style={{ color: colors.text, fontWeight: '700', fontSize: scale(15), marginBottom: 4 }}>
                    Uncertain Detection
                  </Text>
                  <Text style={{ color: colors.textSecondary, fontSize: scale(13), lineHeight: 20 }}>
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
                  <View key={index} style={[styles.foodItem, themed.foodItem]}>
                    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                      <View style={[styles.foodItemDot, themed.foodItemDot]} />
                      <View>
                        <Text style={[styles.foodItemName, themed.foodItemName]}>{item.name}</Text>
                        <Text style={[styles.foodItemConfidence, themed.foodItemConfidence]}>
                          {Math.round(item.confidence * 100)}% Match
                        </Text>
                      </View>
                    </View>

                    <View style={styles.quantityControls}>
                      <TouchableOpacity
                        style={styles.quantityButton}
                        onPress={() => updateQuantity(index, -1)}
                      >
                        <Minus size={16} color={colors.textSecondary} />
                      </TouchableOpacity>

                      <Text style={[styles.quantityText, { color: colors.text }]}>{item.count}</Text>

                      <TouchableOpacity
                        style={styles.quantityButton}
                        onPress={() => updateQuantity(index, 1)}
                      >
                        <Plus size={16} color={colors.textSecondary} />
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.quantityButton, { marginLeft: 8 }]}
                        onPress={() => removeFoodItem(index)}
                      >
                        <Trash2 size={16} color={colors.error} />
                      </TouchableOpacity>
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
              <>
                <Text style={[styles.sectionTitle, themed.sectionTitle]}>Nutritional Breakdown</Text>
                <View style={styles.nutritionGrid}>
                  {/* Calories */}
                  <View style={[styles.nutritionCard, themed.nutritionCard, themed.nutritionCardCalories]}>
                    <View style={[styles.nutritionIcon, { backgroundColor: colors.warning + '15' }]}>
                      <Flame size={20} color={colors.warning} />
                    </View>
                    <View>
                      <Text style={[styles.nutritionValue, themed.nutritionValue, { fontSize: scale(16) }]}>
                        {Math.round(nutritionalData.nutritionalInfo.calories)}
                      </Text>
                      <Text style={[styles.nutritionLabel, themed.nutritionLabel, { fontSize: scale(11) }]}>Calories</Text>
                    </View>
                  </View>

                  {/* Carbs */}
                  <View style={[styles.nutritionCard, themed.nutritionCard, themed.nutritionCardCarbs]}>
                    <View style={[styles.nutritionIcon, { backgroundColor: '#34C759' + '15' }]}>
                      <Croissant size={20} color="#34C759" />
                    </View>
                    <View>
                      <Text style={[styles.nutritionValue, themed.nutritionValue, { fontSize: scale(16) }]}>
                        {Number(nutritionalData.nutritionalInfo.carbs).toFixed(1)}g
                      </Text>
                      <Text style={[styles.nutritionLabel, themed.nutritionLabel, { fontSize: scale(11) }]}>Carbs</Text>
                    </View>
                  </View>

                  {/* Protein */}
                  <View style={[styles.nutritionCard, themed.nutritionCard, themed.nutritionCardProtein]}>
                    <View style={[styles.nutritionIcon, { backgroundColor: '#FF3B30' + '15' }]}>
                      <Beef size={20} color="#FF3B30" />
                    </View>
                    <View>
                      <Text style={[styles.nutritionValue, themed.nutritionValue, { fontSize: scale(16) }]}>
                        {Number(nutritionalData.nutritionalInfo.protein).toFixed(1)}g
                      </Text>
                      <Text style={[styles.nutritionLabel, themed.nutritionLabel, { fontSize: scale(11) }]}>Protein</Text>
                    </View>
                  </View>

                  {/* Fat */}
                  <View style={[styles.nutritionCard, themed.nutritionCard, themed.nutritionCardFat]}>
                    <View style={[styles.nutritionIcon, { backgroundColor: '#FF9500' + '15' }]}>
                      <Pizza size={20} color="#FF9500" />
                    </View>
                    <View>
                      <Text style={[styles.nutritionValue, themed.nutritionValue, { fontSize: scale(16) }]}>
                        {Number(nutritionalData.nutritionalInfo.fat).toFixed(1)}g
                      </Text>
                      <Text style={[styles.nutritionLabel, themed.nutritionLabel, { fontSize: scale(11) }]}>Fat</Text>
                    </View>
                  </View>

                  {/* Fiber */}
                  <View style={[styles.nutritionCard, themed.nutritionCard, themed.nutritionCardFiber]}>
                    <View style={[styles.nutritionIcon, { backgroundColor: '#5856D6' + '15' }]}>
                      <Wheat size={20} color="#5856D6" />
                    </View>
                    <View>
                      <Text style={[styles.nutritionValue, themed.nutritionValue, { fontSize: scale(16) }]}>
                        {Number(nutritionalData.nutritionalInfo.fiber).toFixed(1)}g
                      </Text>
                      <Text style={[styles.nutritionLabel, themed.nutritionLabel, { fontSize: scale(11) }]}>Fiber</Text>
                    </View>
                  </View>

                  {/* Sugar */}
                  <View style={[styles.nutritionCard, themed.nutritionCard, themed.nutritionCardSugar]}>
                    <View style={[styles.nutritionIcon, { backgroundColor: '#FF2D55' + '15' }]}>
                      <Candy size={20} color="#FF2D55" />
                    </View>
                    <View>
                      <Text style={[styles.nutritionValue, themed.nutritionValue, { fontSize: scale(16) }]}>
                        {Number(nutritionalData.nutritionalInfo.sugar).toFixed(1)}g
                      </Text>
                      <Text style={[styles.nutritionLabel, themed.nutritionLabel, { fontSize: scale(11) }]}>Sugar</Text>
                    </View>
                  </View>

                  {/* Sodium */}
                  <View style={[styles.nutritionCard, themed.nutritionCard, themed.nutritionCardSodium]}>
                    <View style={[styles.nutritionIcon, { backgroundColor: '#007AFF' + '15' }]}>
                      <Waves size={20} color="#007AFF" />
                    </View>
                    <View>
                      <Text style={[styles.nutritionValue, themed.nutritionValue, { fontSize: scale(16) }]}>
                        {Math.round(nutritionalData.nutritionalInfo.sodium || 0)}mg
                      </Text>
                      <Text style={[styles.nutritionLabel, themed.nutritionLabel, { fontSize: scale(11) }]}>Sodium</Text>
                    </View>
                  </View>
                </View>

                <View style={[styles.servingSizeCard, themed.servingSizeCard]}>
                  <Info size={18} color={colors.text} strokeWidth={2} />
                  <Text style={[styles.servingSizeText, themed.servingSizeText]}>
                    Serving size: {nutritionalData.servingSize}
                  </Text>
                </View>

                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, themed.sectionTitle]}>Smart Insight</Text>
                  <View style={[styles.insightCard, themed.insightCard]}>
                    {nutritionalData.healthTips.map((tip, index) => (
                      <View key={index} style={styles.insightRow}>
                        <View style={[styles.insightDot, { backgroundColor: colors.primary }]} />
                        <Text style={[styles.insightText, themed.insightText]}>{tip}</Text>
                      </View>
                    ))}
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.saveButton, isSaving && { opacity: 0.7 }]}
                  onPress={saveMealLog}
                  disabled={isSaving}
                  accessibilityRole="button"
                  accessibilityLabel={isSaving ? "Saving meal log" : "Save meal log to Meal Dashboard"}
                >
                  <LinearGradient
                    colors={['#8E56FF', '#4A3AFF']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[StyleSheet.absoluteFill, { borderRadius: 12 }]}
                  />
                  {isSaving ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <ActivityIndicator color="#FFF" size="small" />
                      <Text style={[styles.saveButtonText, { color: '#FFF' }]}>Saving...</Text>
                    </View>
                  ) : (
                    <Text style={[styles.saveButtonText, { color: '#FFF' }]}>Save to Meal Dashboard</Text>
                  )}
                </TouchableOpacity>
              </>
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
          <View style={[styles.modalContent, themed.modalContent]}>
            <View style={[styles.modalHeader, themed.modalHeader]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {isAddingNewItem ? 'Add Special Food' : 'Correct Food Item'}
              </Text>
              <TouchableOpacity onPress={() => setIsCorrectionModalVisible(false)}>
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={[styles.searchInput, themed.searchInput]}
              placeholder="Search food name..."
              placeholderTextColor={colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoFocus
            />

            <FlatList
              data={filteredFoodClasses}
              keyExtractor={(item) => item}
              style={styles.foodClassList}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.foodClassItem, themed.foodClassItem]}
                  onPress={() => handleCorrectItem(item)}
                >
                  <Text style={[styles.foodClassText, themed.foodClassText]}>
                    {item.replace(/_/g, ' ')}
                  </Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={{ alignItems: 'center', marginTop: 40 }}>
                  <Text style={{ color: colors.textSecondary, marginBottom: 10 }}>No matching foods found</Text>
                  <TouchableOpacity onPress={() => {
                    setIsCorrectionModalVisible(false);
                    Alert.alert("Unsupported Food", "We are currently working on adding more foods! Keep an eye out for updates.");
                  }}>
                    <Text style={{ color: colors.primary, fontWeight: '700' }}>Can't find your food?</Text>
                  </TouchableOpacity>
                </View>
              }
              ListFooterComponent={searchQuery.length > 0 ? (
                <TouchableOpacity
                  style={{ paddingVertical: 20, alignItems: 'center' }}
                  onPress={() => Alert.alert("Coming Soon", "We are working on adding this food to our database!")}
                >
                  <Text style={{ color: colors.textSecondary, fontSize: 13 }}>Don't see it? Let us know!</Text>
                </TouchableOpacity>
              ) : null}
            />
          </View>
        </TouchableOpacity>
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
    </View>
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
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    marginTop: 12,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  cameraButton: {},
  galleryButton: {},
  actionButtonText: {
    fontWeight: '600',
  },
  analyzeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 24,
    gap: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
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
    elevation: 4,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
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
    fontWeight: '700',
  },
  nutritionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
    marginBottom: 12,
  },
  nutritionCard: {
    width: '46.5%',
    borderRadius: 16,
    padding: 12,
    margin: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    elevation: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  nutritionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nutritionValue: {
    fontWeight: '800',
  },
  nutritionLabel: {
    fontWeight: '600',
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
    gap: 10,
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
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    height: '80%',
    padding: 24,
    paddingTop: 16,
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
    height: 54,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 16,
    marginBottom: 20,
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
});
