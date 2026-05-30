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
  Platform,
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
    header: { backgroundColor: 'transparent' },
    headerTitle: { color: colors.text, fontSize: scale(20), fontWeight: '900' as const, letterSpacing: -1 },
    sectionTitle: { color: colors.text, fontSize: scale(22), fontWeight: '900' as const, letterSpacing: -0.5 },
    summaryCard: { shadowColor: '#000' },
    summaryValue: { color: colors.text, fontSize: scale(24), fontWeight: '900' as const, letterSpacing: -0.5 },
    summaryLabel: { color: colors.textSecondary, fontSize: scale(11), fontWeight: '800' as const, textTransform: 'uppercase' as const, letterSpacing: 0.5 },
    mealsLoggedCard: { backgroundColor: '#FFF', shadowColor: '#000' },
    mealsLoggedText: { color: colors.text, fontSize: scale(15), fontWeight: '700' as const },
    statsRow: { backgroundColor: '#FFF', shadowColor: '#000' },
    statValue: { color: colors.primary, fontSize: scale(32), fontWeight: '900' as const, letterSpacing: -1 },
    statLabel: { color: colors.textSecondary, fontSize: scale(13), fontWeight: '700' as const },
    statDivider: { backgroundColor: '#F1F5F9' },
    emptyState: { backgroundColor: '#FFF', shadowColor: '#000' },
    emptyStateTitle: { color: colors.text, fontSize: scale(20), fontWeight: '900' as const },
    emptyStateText: { color: colors.textSecondary, fontSize: scale(14), fontWeight: '600' as const },
    emptyStateButton: { backgroundColor: colors.primary },
    emptyStateButtonText: { color: colors.textWhite, fontSize: scale(15), fontWeight: '800' as const },
    mealCard: { backgroundColor: '#FFF', shadowColor: '#000' },
    mealImage: { backgroundColor: '#F1F5F9' },
    mealTypeText: { fontSize: scale(11), fontWeight: '900' as const, textTransform: 'uppercase' as const },
    mealTime: { color: colors.textSecondary, fontSize: scale(12), fontWeight: '700' as const },
    foodItemText: { color: colors.text, fontSize: scale(15), fontWeight: '600' as const },
    foodItemMore: { color: colors.textSecondary, fontSize: scale(12), fontWeight: '600' as const, fontStyle: 'italic' as const },
    mealNutrition: { borderTopColor: '#F1F5F9', gap: 12 },
    nutritionText: { color: colors.textSecondary, fontSize: scale(12), fontWeight: '800' as const },
    quickActionButton: { backgroundColor: '#FFF', shadowColor: '#000' },
    quickActionText: { color: colors.text, fontSize: scale(16), fontWeight: '700' as const },
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
      <LinearGradient
        colors={['#F0FDF4', '#F0F9FF']}
        style={StyleSheet.absoluteFill}
      />
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
                      source={{ uri: fixupImageUrl(meal.imageUri) }}
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
    paddingVertical: 18,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      web: { boxShadow: '0px 4px 10px rgba(0,0,0,0.05)' },
      native: { elevation: 3, shadowOpacity: 0.1, shadowRadius: 5, shadowColor: '#000' }
    })
  },
  headerTitle: {
    fontWeight: '900',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 60,
  },
  section: {
    marginBottom: 36,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  sectionTitle: {
    fontWeight: '900',
  },
  summaryGrid: {
    marginBottom: 24,
  },
  heroCard: {
    borderRadius: 32,
    overflow: 'hidden',
    marginBottom: 16,
    ...Platform.select({
      web: { boxShadow: '0px 10px 25px rgba(255, 149, 0, 0.2)' },
      native: { elevation: 8, shadowOpacity: 0.2, shadowRadius: 15, shadowColor: '#FF9500', shadowOffset: { width: 0, height: 10 } }
    })
  },
  heroGradient: {
    padding: 28,
  },
  heroContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroInfo: {
    flex: 1,
  },
  heroLabel: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
    opacity: 0.9,
    marginBottom: 4,
  },
  heroValue: {
    color: '#FFF',
    fontSize: 48,
    fontWeight: '900',
    letterSpacing: -1,
  },
  heroSubtext: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
    opacity: 0.8,
    marginTop: 4,
  },
  heroIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nutrientGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  nutrientCard: {
    width: (width - 62) / 2, // 2-columns with gap
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1.5,
    ...Platform.select({
      web: { boxShadow: '0px 8px 20px rgba(0, 0, 0, 0.06)' },
      native: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.06,
        shadowRadius: 15,
        elevation: 3,
      }
    }),
  },
  nutrientIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  nutrientValue: {
    marginBottom: 4,
  },
  nutrientLabel: {
  },
  mealsLoggedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 24,
    padding: 20,
    gap: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
    ...Platform.select({
      web: { boxShadow: '0px 8px 20px rgba(0, 0, 0, 0.08)' },
      native: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.08,
        shadowRadius: 15,
        elevation: 4,
      }
    }),
  },
  mealsLoggedText: {
    letterSpacing: -0.2,
  },
  statsRow: {
    flexDirection: 'row',
    borderRadius: 32,
    padding: 28,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
    ...Platform.select({
      web: { boxShadow: '0px 10px 25px rgba(0, 0, 0, 0.08)' },
      native: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.08,
        shadowRadius: 15,
        elevation: 5,
      }
    }),
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    marginBottom: 4,
  },
  statLabel: {
    textAlign: 'center',
  },
  statDivider: {
    width: 1.5,
    height: '70%',
    alignSelf: 'center',
  },
  mealsList: {
    gap: 24,
  },
  mealCard: {
    borderRadius: 32,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
    ...Platform.select({
      web: { boxShadow: '0px 12px 25px rgba(0, 0, 0, 0.1)' },
      native: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 8,
      }
    }),
  },
  mealImage: {
    width: '100%',
    height: 160,
  },
  mealImagePlaceholder: {
    width: '100%',
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mealContent: {
    padding: 20,
  },
  mealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  mealInfo: {
    flex: 1,
  },
  mealTypeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    marginBottom: 8,
  },
  mealTypeText: {
  },
  mealTime: {
  },
  viewButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF1F1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  foodItems: {
    marginBottom: 16,
  },
  foodItemText: {
    marginBottom: 6,
  },
  foodItemMore: {
    marginTop: 6,
  },
  mealNutrition: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingTop: 16,
    borderTopWidth: 1.5,
  },
  nutritionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  nutritionText: {
  },
  emptyState: {
    borderRadius: 32,
    padding: 48,
    alignItems: 'center',
    ...Platform.select({
      web: { boxShadow: '0px 10px 25px rgba(0,0,0,0.05)' },
      native: { elevation: 4, shadowOpacity: 0.05, shadowRadius: 15, shadowColor: '#000' }
    }),
  },
  emptyStateTitle: {
    marginTop: 20,
    marginBottom: 12,
  },
  emptyStateText: {
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 30,
  },
  emptyStateButton: {
    paddingHorizontal: 32,
    paddingVertical: 18,
    borderRadius: 18,
    ...Platform.select({
      web: { boxShadow: '0px 4px 12px rgba(0,0,0,0.15)' },
      native: { elevation: 6, shadowOpacity: 0.15, shadowRadius: 10, shadowColor: '#000' }
    })
  },
  emptyStateButtonText: {
  },
  quickActionsSection: {
    gap: 16,
    marginTop: 12,
  },
  quickActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    padding: 20,
    gap: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
    ...Platform.select({
      web: { boxShadow: '0px 6px 15px rgba(0, 0, 0, 0.05)' },
      native: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
        elevation: 3,
      }
    }),
  },
  quickActionText: {
    flex: 1,
  },
});
