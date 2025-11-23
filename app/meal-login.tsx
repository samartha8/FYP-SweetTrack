import { useState } from 'react';
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
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { X, Camera, Image as ImageIcon, Flame, Wheat, Beef, Droplets, Info } from 'lucide-react-native';
import { useMutation } from '@tanstack/react-query';
import { generateObject } from '@/lib/rork-toolkit-mock';
import { z } from 'zod';
import Colors from '@/constants/colors';
import { useMealTracking } from '@/contexts/MealTrackingContext';

type NutritionalInfo = {
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
  healthTips: string[];
};

export default function MealLogScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { addMealLog } = useMealTracking();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [nutritionalData, setNutritionalData] = useState<NutritionalInfo | null>(null);
  const [selectedMealType, setSelectedMealType] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>('breakfast');

  const analysisMutation = useMutation({
    mutationFn: async (imageUri: string) => {
      const nutritionSchema = z.object({
        foodItems: z.array(z.object({
          name: z.string().describe('Name of the detected food item'),
          confidence: z.number().describe('Confidence level between 0 and 1'),
        })).describe('List of detected food items in the image'),
        nutritionalInfo: z.object({
          calories: z.number().describe('Total calories in kcal'),
          carbs: z.number().describe('Total carbohydrates in grams'),
          protein: z.number().describe('Total protein in grams'),
          fat: z.number().describe('Total fat in grams'),
          sugar: z.number().optional().describe('Total sugar in grams'),
          fiber: z.number().optional().describe('Total fiber in grams'),
          sodium: z.number().optional().describe('Total sodium in mg'),
        }).describe('Estimated nutritional breakdown'),
        servingSize: z.string().describe('Estimated serving size'),
        healthTips: z.array(z.string()).describe('3-4 health tips related to this meal'),
      });

      const result = await generateObject({
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Analyze this food image and provide detailed nutritional information. Identify all visible food items, estimate their quantities, and calculate total nutritional values. Also provide relevant health tips.' },
              { type: 'image', image: imageUri },
            ],
          },
        ],
        schema: nutritionSchema,
      });

      return result;
    },
    onSuccess: (data) => {
      setNutritionalData(data);
    },
    onError: (error) => {
      console.error('Meal analysis error:', error);
      Alert.alert('Error', 'Failed to analyze the meal. Please try again.');
    },
  });

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
    analysisMutation.mutate(selectedImage);
  };

  const saveMealLog = async () => {
    if (!nutritionalData) return;
    
    try {
      await addMealLog({
        imageUri: selectedImage || undefined,
        foodItems: nutritionalData.foodItems,
        nutritionalInfo: nutritionalData.nutritionalInfo,
        servingSize: nutritionalData.servingSize,
        mealType: selectedMealType,
      });
      
      Alert.alert(
        'Success',
        'Meal logged successfully! The data has been added to your wellness profile.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error) {
      console.error('Error saving meal log:', error);
      Alert.alert('Error', 'Failed to save meal log. Please try again.');
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
          <X size={24} color={Colors.text} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Smart Meal Logging</Text>
        <View style={styles.headerButton} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.imageSection}>
          {selectedImage ? (
            <View style={styles.imageContainer}>
              <Image source={{ uri: selectedImage }} style={styles.image} />
              <TouchableOpacity
                style={styles.removeImageButton}
                onPress={() => {
                  setSelectedImage(null);
                  setNutritionalData(null);
                }}
              >
                <X size={20} color={Colors.textWhite} strokeWidth={2} />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.placeholderContainer}>
              <ImageIcon size={64} color={Colors.textLight} strokeWidth={1.5} />
              <Text style={styles.placeholderText}>No image selected</Text>
            </View>
          )}
        </View>

        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.cameraButton]}
            onPress={takePhoto}
            accessibilityRole="button"
            accessibilityLabel="Take photo of meal"
          >
            <Camera size={24} color={Colors.textWhite} strokeWidth={2} />
            <Text style={styles.actionButtonText}>Camera</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.galleryButton]}
            onPress={pickImage}
            accessibilityRole="button"
            accessibilityLabel="Select image from gallery"
          >
            <ImageIcon size={24} color={Colors.textWhite} strokeWidth={2} />
            <Text style={styles.actionButtonText}>Gallery</Text>
          </TouchableOpacity>
        </View>

        {selectedImage && !nutritionalData && (
          <>
            <View style={styles.mealTypeSection}>
              <Text style={styles.mealTypeLabel}>Select Meal Type</Text>
              <View style={styles.mealTypeButtons}>
                {(['breakfast', 'lunch', 'dinner', 'snack'] as const).map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.mealTypeButton,
                      selectedMealType === type && styles.mealTypeButtonActive,
                    ]}
                    onPress={() => setSelectedMealType(type)}
                  >
                    <Text
                      style={[
                        styles.mealTypeButtonText,
                        selectedMealType === type && styles.mealTypeButtonTextActive,
                      ]}
                    >
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TouchableOpacity
              style={styles.analyzeButton}
              onPress={analyzeMeal}
              disabled={analysisMutation.isPending}
              accessibilityRole="button"
              accessibilityLabel="Analyze meal nutritional content"
            >
              {analysisMutation.isPending ? (
                <>
                  <ActivityIndicator color={Colors.textWhite} />
                  <Text style={styles.analyzeButtonText}>Analyzing...</Text>
                </>
              ) : (
                <Text style={styles.analyzeButtonText}>Analyze Meal</Text>
              )}
            </TouchableOpacity>
          </>
        )}

        {nutritionalData && (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Detected Items</Text>
              <View style={styles.card}>
                {nutritionalData.foodItems.map((item, index) => (
                  <View key={index} style={styles.foodItem}>
                    <View style={styles.foodItemDot} />
                    <Text style={styles.foodItemName}>{item.name}</Text>
                    <Text style={styles.foodItemConfidence}>
                      {Math.round(item.confidence * 100)}%
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Nutritional Breakdown</Text>
              <View style={styles.nutritionGrid}>
                <View style={styles.nutritionCard}>
                  <View style={[styles.nutritionIcon, { backgroundColor: Colors.warning + '20' }]}>
                    <Flame size={24} color={Colors.warning} strokeWidth={2} />
                  </View>
                  <Text style={styles.nutritionValue}>
                    {nutritionalData.nutritionalInfo.calories}
                  </Text>
                  <Text style={styles.nutritionLabel}>Calories</Text>
                </View>

                <View style={styles.nutritionCard}>
                  <View style={[styles.nutritionIcon, { backgroundColor: Colors.chart.glucose + '20' }]}>
                    <Wheat size={24} color={Colors.chart.glucose} strokeWidth={2} />
                  </View>
                  <Text style={styles.nutritionValue}>
                    {nutritionalData.nutritionalInfo.carbs}g
                  </Text>
                  <Text style={styles.nutritionLabel}>Carbs</Text>
                </View>

                <View style={styles.nutritionCard}>
                  <View style={[styles.nutritionIcon, { backgroundColor: Colors.error + '20' }]}>
                    <Beef size={24} color={Colors.error} strokeWidth={2} />
                  </View>
                  <Text style={styles.nutritionValue}>
                    {nutritionalData.nutritionalInfo.protein}g
                  </Text>
                  <Text style={styles.nutritionLabel}>Protein</Text>
                </View>

                <View style={styles.nutritionCard}>
                  <View style={[styles.nutritionIcon, { backgroundColor: Colors.secondary + '20' }]}>
                    <Droplets size={24} color={Colors.secondary} strokeWidth={2} />
                  </View>
                  <Text style={styles.nutritionValue}>
                    {nutritionalData.nutritionalInfo.fat}g
                  </Text>
                  <Text style={styles.nutritionLabel}>Fat</Text>
                </View>
              </View>

              <View style={styles.servingSizeCard}>
                <Info size={18} color={Colors.primary} strokeWidth={2} />
                <Text style={styles.servingSizeText}>
                  Serving size: {nutritionalData.servingSize}
                </Text>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Health Tips</Text>
              <View style={styles.card}>
                {nutritionalData.healthTips.map((tip, index) => (
                  <View key={index} style={styles.tipItem}>
                    <Text style={styles.tipNumber}>{index + 1}</Text>
                    <Text style={styles.tipText}>{tip}</Text>
                  </View>
                ))}
              </View>
            </View>

            <TouchableOpacity
              style={styles.saveButton}
              onPress={saveMealLog}
              accessibilityRole="button"
              accessibilityLabel="Save meal log to wellness profile"
            >
              <Text style={styles.saveButtonText}>Save to Wellness Profile</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.backgroundSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
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
    backgroundColor: Colors.card,
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
  },
  placeholderContainer: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: 16,
    backgroundColor: Colors.card,
    borderWidth: 2,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    fontSize: 14,
    color: Colors.textLight,
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
  cameraButton: {
    backgroundColor: Colors.primary,
  },
  galleryButton: {
    backgroundColor: Colors.secondary,
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.textWhite,
  },
  analyzeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 24,
    gap: 12,
  },
  analyzeButtonText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.textWhite,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 12,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    shadowColor: Colors.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  foodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.backgroundSecondary,
  },
  foodItemDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
    marginRight: 12,
  },
  foodItemName: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
    fontWeight: '500' as const,
  },
  foodItemConfidence: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '600' as const,
  },
  nutritionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
    marginBottom: 12,
  },
  nutritionCard: {
    width: '47%',
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    margin: 6,
    alignItems: 'center',
    shadowColor: Colors.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  nutritionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  nutritionValue: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 4,
  },
  nutritionLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  servingSizeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary + '10',
    borderRadius: 12,
    padding: 14,
    gap: 10,
  },
  servingSizeText: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
    fontWeight: '500' as const,
  },
  tipItem: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.backgroundSecondary,
  },
  tipNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    color: Colors.textWhite,
    fontSize: 12,
    fontWeight: '700' as const,
    textAlign: 'center',
    lineHeight: 24,
    marginRight: 12,
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
  },
  saveButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: Colors.cardShadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.textWhite,
  },
  mealTypeSection: {
    marginBottom: 20,
  },
  mealTypeLabel: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 12,
  },
  mealTypeButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  mealTypeButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: Colors.card,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  mealTypeButtonActive: {
    backgroundColor: Colors.primary + '15',
    borderColor: Colors.primary,
  },
  mealTypeButtonText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  mealTypeButtonTextActive: {
    color: Colors.primary,
    fontWeight: '700' as const,
  },
});
