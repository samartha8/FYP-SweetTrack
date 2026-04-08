import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  Alert,
  ColorValue,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  X,
  Flame,
  Wheat,
  Beef,
  Droplets,
  UtensilsCrossed,
  Clock,
  ChevronRight,
  Calendar,
  TrendingUp,
  Trash2,
  Candy,
  Waves,
  Leaf,
} from 'lucide-react-native';
import { useMealTracking, fixupImageUrl } from '@/contexts/MealTrackingContext';
import { useTheme } from '@/contexts/SettingsContext';
import { useMemo } from 'react';
import { useTranslation } from '@/hooks/use-translation';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 60) / 2;

export default function ViewAllDashboardScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { mealLogs, todayNutrition, getTodayMeals, weeklyStats, deleteMealLog } = useMealTracking();
  const { colors, scale } = useTheme();
  const { t, language } = useTranslation();

  // Dynamic Styles
  const themed = useMemo(() => ({
    container: { backgroundColor: colors.backgroundSecondary },
    header: { backgroundColor: colors.background, borderBottomColor: colors.border },
    headerTitle: { color: colors.text, fontSize: scale(18) },
    sectionTitle: { color: colors.text, fontSize: scale(18) },
    summaryCard: { shadowColor: colors.cardShadow },
    summaryValue: { color: colors.text, fontSize: scale(22) },
    summaryLabel: { color: colors.textSecondary, fontSize: scale(12) },
    mealsLoggedCard: { backgroundColor: colors.card, shadowColor: colors.cardShadow },
    mealsLoggedText: { color: colors.text, fontSize: scale(14) },
    statsRow: { backgroundColor: colors.card, shadowColor: colors.cardShadow },
    statValue: { color: colors.primary, fontSize: scale(28) },
    statLabel: { color: colors.textSecondary, fontSize: scale(13) },
    statDivider: { backgroundColor: colors.border },
    emptyState: { backgroundColor: colors.card, shadowColor: colors.cardShadow },
    emptyStateTitle: { color: colors.text, fontSize: scale(18) },
    emptyStateText: { color: colors.textSecondary, fontSize: scale(14) },
    emptyStateButton: { backgroundColor: colors.primary },
    emptyStateButtonText: { color: colors.textWhite, fontSize: scale(14) },
    mealCard: { backgroundColor: colors.card, shadowColor: colors.cardShadow },
    mealImage: { backgroundColor: colors.backgroundSecondary },
    mealTypeText: { fontSize: scale(11) },
    mealTime: { color: colors.textSecondary, fontSize: scale(12) },
    foodItemText: { color: colors.text, fontSize: scale(14) },
    foodItemMore: { color: colors.textSecondary, fontSize: scale(12) },
    mealNutrition: { borderTopColor: colors.border, gap: 10 },
    nutritionText: { color: colors.textSecondary, fontSize: scale(11), fontWeight: '600' as const },
    quickActionButton: { backgroundColor: colors.card, shadowColor: colors.cardShadow },
    quickActionText: { color: colors.text, fontSize: scale(15) },
  }), [colors, scale]);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString(language === 'en' ? 'en-US' : language === 'ja' ? 'ja-JP' : 'ne-NP', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return t.progress.today;
    } else if (date.toDateString() === yesterday.toDateString()) {
      return t.mealDashboard.yesterday;
    } else {
      return date.toLocaleDateString(language === 'en' ? 'en-US' : language === 'ja' ? 'ja-JP' : 'ne-NP', { month: 'short', day: 'numeric' });
    }
  };

  const getMealTypeColor = (mealType: string) => {
    switch (mealType) {
      case 'breakfast':
        return colors.warning;
      case 'lunch':
        return colors.primary;
      case 'dinner':
        return colors.secondary;
      case 'snack':
        return colors.chart?.glucose || '#30D158';
      default:
        return colors.textSecondary;
    }
  };

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
        <Text style={[styles.headerTitle, themed.headerTitle]}>{t.mealDashboard.header}</Text>
        <View style={styles.headerButton} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Calendar size={20} color={colors.primary} strokeWidth={2} />
            <Text style={[styles.sectionTitle, themed.sectionTitle]}>{t.mealDashboard.todayOverview}</Text>
          </View>

          <View style={styles.summaryGrid}>
            {/* Hero Calories Card */}
            <TouchableOpacity
              activeOpacity={0.9}
              style={styles.heroCard}
            >
              <LinearGradient
                colors={['#FF9500', '#FF5E00'] as any}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.heroGradient}
              >
                <View style={styles.heroContent}>
                  <View style={styles.heroInfo}>
                    <Text style={styles.heroLabel}>{t.wellness.unitCalories.toUpperCase()}</Text>
                    <Text style={styles.heroValue}>{todayNutrition.calories}</Text>
                    <Text style={styles.heroSubtext}>Target: 2000 kcal</Text>
                  </View>
                  <View style={styles.heroIconContainer}>
                    <Flame size={48} color="#FFF" strokeWidth={2.5} />
                  </View>
                </View>
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.nutrientGrid}>
              {/* Carbs */}
              <View style={[styles.nutrientCard, { borderColor: (colors.chart?.glucose || '#30D158') + '30' }]}>
                <View style={[styles.nutrientIconCircle, { backgroundColor: (colors.chart?.glucose || '#30D158') + '15' }]}>
                  <Wheat size={20} color={colors.chart?.glucose || '#30D158'} strokeWidth={2.5} />
                </View>
                <Text style={[styles.nutrientValue, themed.summaryValue]}>{Number(todayNutrition.carbs).toFixed(1)}g</Text>
                <Text style={[styles.nutrientLabel, themed.summaryLabel]}>{t.progress.carbs}</Text>
              </View>

              {/* Protein */}
              <View style={[styles.nutrientCard, { borderColor: colors.error + '30' }]}>
                <View style={[styles.nutrientIconCircle, { backgroundColor: colors.error + '15' }]}>
                  <Beef size={20} color={colors.error} strokeWidth={2.5} />
                </View>
                <Text style={[styles.nutrientValue, themed.summaryValue]}>{Number(todayNutrition.protein).toFixed(1)}g</Text>
                <Text style={[styles.nutrientLabel, themed.summaryLabel]}>{t.progress.protein}</Text>
              </View>

              {/* Fat */}
              <View style={[styles.nutrientCard, { borderColor: colors.secondary + '30' }]}>
                <View style={[styles.nutrientIconCircle, { backgroundColor: colors.secondary + '15' }]}>
                  <Droplets size={20} color={colors.secondary} strokeWidth={2.5} />
                </View>
                <Text style={[styles.nutrientValue, themed.summaryValue]}>{Number(todayNutrition.fat).toFixed(1)}g</Text>
                <Text style={[styles.nutrientLabel, themed.summaryLabel]}>{t.progress.fat}</Text>
              </View>

              {/* Fiber */}
              <View style={[styles.nutrientCard, { borderColor: (colors.success || '#34C759') + '30' }]}>
                <View style={[styles.nutrientIconCircle, { backgroundColor: (colors.success || '#34C759') + '15' }]}>
                  <Leaf size={20} color={colors.success || '#34C759'} strokeWidth={2.5} />
                </View>
                <Text style={[styles.nutrientValue, themed.summaryValue]}>{Number(todayNutrition.fiber).toFixed(1)}g</Text>
                <Text style={[styles.nutrientLabel, themed.summaryLabel]}>{t.progress.fiber || 'Fiber'}</Text>
              </View>

              {/* Sugar */}
              <View style={[styles.nutrientCard, { borderColor: (colors.chart?.glucose || '#FF2D55') + '30' }]}>
                <View style={[styles.nutrientIconCircle, { backgroundColor: (colors.chart?.glucose || '#FF2D55') + '15' }]}>
                  <Candy size={20} color={colors.chart?.glucose || '#FF2D55'} strokeWidth={2.5} />
                </View>
                <Text style={[styles.nutrientValue, themed.summaryValue]}>{Number(todayNutrition.sugar).toFixed(1)}g</Text>
                <Text style={[styles.nutrientLabel, themed.summaryLabel]}>{t.progress.sugar || 'Sugar'}</Text>
              </View>

              {/* Sodium */}
              <View style={[styles.nutrientCard, { borderColor: (colors.info || '#5856D6') + '30' }]}>
                <View style={[styles.nutrientIconCircle, { backgroundColor: (colors.info || '#5856D6') + '15' }]}>
                  <Waves size={20} color={colors.info || '#5856D6'} strokeWidth={2.5} />
                </View>
                <Text style={[styles.nutrientValue, themed.summaryValue]}>{Math.round(todayNutrition.sodium)}mg</Text>
                <Text style={[styles.nutrientLabel, themed.summaryLabel]}>{t.progress.sodium || 'Sodium'}</Text>
              </View>
            </View>
          </View>

          <View style={[styles.mealsLoggedCard, themed.mealsLoggedCard]}>
            <UtensilsCrossed size={20} color={colors.primary} strokeWidth={2} />
            <Text style={[styles.mealsLoggedText, themed.mealsLoggedText]}>{getTodayMeals.length} {t.progress.mealsLoggedToday}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <TrendingUp size={20} color={colors.primary} strokeWidth={2} />
            <Text style={[styles.sectionTitle, themed.sectionTitle]}>{t.mealDashboard.quickStats}</Text>
          </View>

          <View style={[styles.statsRow, themed.statsRow]}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, themed.statValue]}>{weeklyStats.avgCalories}</Text>
              <Text style={[styles.statLabel, themed.statLabel]}>{t.progress.avgDailyCalories}</Text>
            </View>
            <View style={[styles.statDivider, themed.statDivider]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, themed.statValue]}>{weeklyStats.mealsLogged}</Text>
              <Text style={[styles.statLabel, themed.statLabel]}>{t.mealDashboard.thisWeek}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Clock size={20} color={colors.primary} strokeWidth={2} />
            <Text style={[styles.sectionTitle, themed.sectionTitle]}>{t.mealDashboard.recentMeals}</Text>
          </View>

          {mealLogs.length === 0 ? (
            <View style={[styles.emptyState, themed.emptyState]}>
              <UtensilsCrossed size={48} color={colors.textSecondary} strokeWidth={1.5} />
              <Text style={[styles.emptyStateTitle, themed.emptyStateTitle]}>{t.mealDashboard.noMealsTitle}</Text>
              <Text style={[styles.emptyStateText, themed.emptyStateText]}>
                {t.mealDashboard.noMealsDesc}
              </Text>
              <TouchableOpacity
                style={[styles.emptyStateButton, themed.emptyStateButton]}
                onPress={() => router.push('/meal-log' as any)}
              >
                <Text style={[styles.emptyStateButtonText, themed.emptyStateButtonText]}>{t.mealDashboard.logFirstMeal}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.mealsList}>
              {mealLogs.slice(0, 10).map((meal) => (
                <View key={meal.id} style={[styles.mealCard, themed.mealCard]}>
                  {meal.imageUri ? (
                    <Image
                      source={{ uri: meal.imageUri }}
                      style={[styles.mealImage, themed.mealImage]}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={[styles.mealImagePlaceholder, { backgroundColor: colors.backgroundSecondary }]}>
                      <UtensilsCrossed size={32} color={colors.textSecondary + '40'} />
                    </View>
                  )}

                  <View style={styles.mealContent}>
                    <View style={styles.mealHeader}>
                      <View style={styles.mealInfo}>
                        <View
                          style={[
                            styles.mealTypeBadge,
                            { backgroundColor: getMealTypeColor(meal.mealType) + '20' },
                          ]}
                        >
                          <Text
                            style={[
                              styles.mealTypeText,
                              themed.mealTypeText,
                              { color: getMealTypeColor(meal.mealType) },
                            ]}
                          >
                            {t.mealDashboard[meal.mealType] || meal.mealType}
                          </Text>
                        </View>
                        <Text style={[styles.mealTime, themed.mealTime]}>
                          {formatDate(meal.date)} • {formatTime(meal.date)}
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => {
                          Alert.alert(
                            "Delete Meal",
                            "Are you sure you want to delete this meal log?",
                            [
                              { text: "Cancel", style: "cancel" },
                              {
                                text: "Delete",
                                style: "destructive",
                                onPress: () => deleteMealLog(meal.id, meal.backendId)
                              }
                            ]
                          );
                        }}
                        style={styles.deleteButton}
                      >
                        <Trash2 size={22} color={colors.error} strokeWidth={2} />
                      </TouchableOpacity>
                    </View>

                    <View style={styles.foodItems}>
                      {meal.foodItems.slice(0, 2).map((item, idx) => (
                        <Text key={idx} style={[styles.foodItemText, themed.foodItemText]}>
                          • {item.name}
                        </Text>
                      ))}
                      {meal.foodItems.length > 2 && (
                        <Text style={[styles.foodItemMore, themed.foodItemMore]}>
                          {t.mealDashboard.moreItems.replace('{count}', (meal.foodItems.length - 2).toString())}
                        </Text>
                      )}
                    </View>

                    <View style={[styles.mealNutrition, themed.mealNutrition]}>
                      <View style={styles.nutritionItem}>
                        <Flame size={12} color={colors.warning} strokeWidth={2.5} />
                        <Text style={[styles.nutritionText, themed.nutritionText]}>{Math.round(meal.nutritionalInfo.calories)}</Text>
                      </View>
                      <View style={styles.nutritionItem}>
                        <Wheat size={12} color={colors.primary} strokeWidth={2.5} />
                        <Text style={[styles.nutritionText, themed.nutritionText]}>{Number(meal.nutritionalInfo.carbs).toFixed(1)}g</Text>
                      </View>
                      <View style={styles.nutritionItem}>
                        <Beef size={12} color={colors.error} strokeWidth={2.5} />
                        <Text style={[styles.nutritionText, themed.nutritionText]}>{Number(meal.nutritionalInfo.protein).toFixed(1)}g</Text>
                      </View>
                      <View style={styles.nutritionItem}>
                        <Droplets size={12} color={colors.secondary} strokeWidth={2.5} />
                        <Text style={[styles.nutritionText, themed.nutritionText]}>{Number(meal.nutritionalInfo.fat).toFixed(1)}g</Text>
                      </View>
                      <View style={styles.nutritionItem}>
                        <Leaf size={12} color={colors.success || '#34C759'} strokeWidth={2.5} />
                        <Text style={[styles.nutritionText, themed.nutritionText]}>{Number(meal.nutritionalInfo.fiber || 0).toFixed(1)}g</Text>
                      </View>
                      <View style={styles.nutritionItem}>
                        <Candy size={12} color={colors.chart?.glucose || '#FF2D55'} strokeWidth={2.5} />
                        <Text style={[styles.nutritionText, themed.nutritionText]}>{Number(meal.nutritionalInfo.sugar || 0).toFixed(1)}g</Text>
                      </View>
                      <View style={styles.nutritionItem}>
                        <Waves size={12} color={colors.info || '#5856D6'} strokeWidth={2.5} />
                        <Text style={[styles.nutritionText, themed.nutritionText]}>{Math.round(meal.nutritionalInfo.sodium || 0)}mg</Text>
                      </View>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={styles.quickActionsSection}>
          <TouchableOpacity
            style={[styles.quickActionButton, themed.quickActionButton]}
            onPress={() => router.push('/diet-suggestions' as any)}
          >
            <UtensilsCrossed size={20} color={colors.primary} strokeWidth={2} />
            <Text style={[styles.quickActionText, themed.quickActionText]}>{t.mealDashboard.browseDietPlans}</Text>
            <ChevronRight size={20} color={colors.primary} strokeWidth={2} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.quickActionButton, themed.quickActionButton]}
            onPress={() => router.push('/progress' as any)}
          >
            <TrendingUp size={20} color={colors.primary} strokeWidth={2} />
            <Text style={[styles.quickActionText, themed.quickActionText]}>{t.mealDashboard.viewFullProgress}</Text>
            <ChevronRight size={20} color={colors.primary} strokeWidth={2} />
          </TouchableOpacity>
        </View>
      </ScrollView >
    </View >
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
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  sectionTitle: {
    fontWeight: '700',
  },
  summaryGrid: {
    gap: 16,
    marginBottom: 20,
  },
  heroCard: {
    width: '100%',
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#FF5E00',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  heroGradient: {
    padding: 24,
  },
  heroContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroInfo: {
    flex: 1,
  },
  heroLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.8)',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  heroValue: {
    fontSize: 42,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -1,
  },
  heroSubtext: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
    fontWeight: '600',
  },
  heroIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nutrientGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  nutrientCard: {
    width: (width - 52) / 2, // 2-columns
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  nutrientIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  nutrientValue: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 2,
    letterSpacing: -0.5,
  },
  nutrientLabel: {
    fontSize: 12,
    fontWeight: '600',
    opacity: 0.6,
  },
  mealsLoggedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 18,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  mealsLoggedText: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  statsRow: {
    flexDirection: 'row',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 32,
    fontWeight: '800',
    marginBottom: 4,
    letterSpacing: -1,
  },
  statLabel: {
    fontSize: 13,
    fontWeight: '600',
    opacity: 0.6,
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    height: '80%',
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.08)',
  },
  mealsList: {
    gap: 20,
  },
  mealCard: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 15,
    elevation: 6,
  },
  mealImage: {
    width: '100%',
    height: 140,
  },
  mealImagePlaceholder: {
    width: '100%',
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mealContent: {
    padding: 16,
  },
  mealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  mealInfo: {
    flex: 1,
  },
  mealTypeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 6,
  },
  mealTypeText: {
    fontWeight: '700',
  },
  mealTime: {
  },
  viewButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  foodItems: {
    marginBottom: 12,
  },
  foodItemText: {
    marginBottom: 4,
  },
  foodItemMore: {
    fontStyle: 'italic',
    marginTop: 4,
  },
  mealNutrition: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  nutritionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  nutritionText: {
    fontWeight: '600',
  },
  emptyState: {
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  emptyStateTitle: {
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyStateButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyStateButtonText: {
    fontWeight: '700',
  },
  quickActionsSection: {
    gap: 12,
    marginTop: 8,
  },
  quickActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 16,
    gap: 12,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  quickActionText: {
    flex: 1,
    fontWeight: '600',
  },
});
