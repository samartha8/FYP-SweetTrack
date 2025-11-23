import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
} from 'react-native';
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
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useMealTracking } from '@/contexts/MealTrackingContext';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 60) / 2;

export default function ViewAllDashboardScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { mealLogs, todayNutrition, getTodayMeals, weeklyStats } = useMealTracking();

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  const getMealTypeColor = (mealType: string) => {
    switch (mealType) {
      case 'breakfast':
        return Colors.warning;
      case 'lunch':
        return Colors.primary;
      case 'dinner':
        return Colors.secondary;
      case 'snack':
        return Colors.chart.glucose;
      default:
        return Colors.textSecondary;
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
          <X size={24} color={Colors.text} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Meal Dashboard</Text>
        <View style={styles.headerButton} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Calendar size={20} color={Colors.primary} strokeWidth={2} />
            <Text style={styles.sectionTitle}>Today&apos;s Overview</Text>
          </View>

          <View style={styles.summaryGrid}>
            <View style={[styles.summaryCard, { backgroundColor: Colors.warning + '15' }]}>
              <Flame size={28} color={Colors.warning} strokeWidth={2} />
              <Text style={styles.summaryValue}>{todayNutrition.calories}</Text>
              <Text style={styles.summaryLabel}>Calories</Text>
            </View>

            <View style={[styles.summaryCard, { backgroundColor: Colors.chart.glucose + '15' }]}>
              <Wheat size={28} color={Colors.chart.glucose} strokeWidth={2} />
              <Text style={styles.summaryValue}>{todayNutrition.carbs}g</Text>
              <Text style={styles.summaryLabel}>Carbs</Text>
            </View>

            <View style={[styles.summaryCard, { backgroundColor: Colors.error + '15' }]}>
              <Beef size={28} color={Colors.error} strokeWidth={2} />
              <Text style={styles.summaryValue}>{todayNutrition.protein}g</Text>
              <Text style={styles.summaryLabel}>Protein</Text>
            </View>

            <View style={[styles.summaryCard, { backgroundColor: Colors.secondary + '15' }]}>
              <Droplets size={28} color={Colors.secondary} strokeWidth={2} />
              <Text style={styles.summaryValue}>{todayNutrition.fat}g</Text>
              <Text style={styles.summaryLabel}>Fat</Text>
            </View>
          </View>

          <View style={styles.mealsLoggedCard}>
            <UtensilsCrossed size={20} color={Colors.primary} strokeWidth={2} />
            <Text style={styles.mealsLoggedText}>{getTodayMeals.length} meals logged today</Text>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <TrendingUp size={20} color={Colors.primary} strokeWidth={2} />
            <Text style={styles.sectionTitle}>Quick Stats</Text>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{weeklyStats.avgCalories}</Text>
              <Text style={styles.statLabel}>Avg Daily Calories</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{weeklyStats.mealsLogged}</Text>
              <Text style={styles.statLabel}>This Week</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Clock size={20} color={Colors.primary} strokeWidth={2} />
            <Text style={styles.sectionTitle}>Recent Meals</Text>
          </View>

          {mealLogs.length === 0 ? (
            <View style={styles.emptyState}>
              <UtensilsCrossed size={48} color={Colors.textLight} strokeWidth={1.5} />
              <Text style={styles.emptyStateTitle}>No meals logged yet</Text>
              <Text style={styles.emptyStateText}>
                Start tracking your meals to see your nutrition data here
              </Text>
              <TouchableOpacity
                style={styles.emptyStateButton}
                onPress={() => router.push('/meal-log' as any)}
              >
                <Text style={styles.emptyStateButtonText}>Log Your First Meal</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.mealsList}>
              {mealLogs.slice(0, 10).map((meal) => (
                <View key={meal.id} style={styles.mealCard}>
                  {meal.imageUri && (
                    <Image source={{ uri: meal.imageUri }} style={styles.mealImage} />
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
                              { color: getMealTypeColor(meal.mealType) },
                            ]}
                          >
                            {meal.mealType.charAt(0).toUpperCase() + meal.mealType.slice(1)}
                          </Text>
                        </View>
                        <Text style={styles.mealTime}>
                          {formatDate(meal.date)} • {formatTime(meal.date)}
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => router.push('/meal-log' as any)}
                        style={styles.viewButton}
                      >
                        <ChevronRight size={20} color={Colors.textSecondary} strokeWidth={2} />
                      </TouchableOpacity>
                    </View>

                    <View style={styles.foodItems}>
                      {meal.foodItems.slice(0, 2).map((item, idx) => (
                        <Text key={idx} style={styles.foodItemText}>
                          • {item.name}
                        </Text>
                      ))}
                      {meal.foodItems.length > 2 && (
                        <Text style={styles.foodItemMore}>
                          +{meal.foodItems.length - 2} more items
                        </Text>
                      )}
                    </View>

                    <View style={styles.mealNutrition}>
                      <View style={styles.nutritionItem}>
                        <Flame size={14} color={Colors.warning} strokeWidth={2} />
                        <Text style={styles.nutritionText}>{meal.nutritionalInfo.calories} kcal</Text>
                      </View>
                      <View style={styles.nutritionItem}>
                        <Wheat size={14} color={Colors.chart.glucose} strokeWidth={2} />
                        <Text style={styles.nutritionText}>{meal.nutritionalInfo.carbs}g</Text>
                      </View>
                      <View style={styles.nutritionItem}>
                        <Beef size={14} color={Colors.error} strokeWidth={2} />
                        <Text style={styles.nutritionText}>{meal.nutritionalInfo.protein}g</Text>
                      </View>
                      <View style={styles.nutritionItem}>
                        <Droplets size={14} color={Colors.secondary} strokeWidth={2} />
                        <Text style={styles.nutritionText}>{meal.nutritionalInfo.fat}g</Text>
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
            style={styles.quickActionButton}
            onPress={() => router.push('/diet-suggestions' as any)}
          >
            <UtensilsCrossed size={20} color={Colors.primary} strokeWidth={2} />
            <Text style={styles.quickActionText}>Browse Diet Plans</Text>
            <ChevronRight size={20} color={Colors.primary} strokeWidth={2} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionButton}
            onPress={() => router.push('/progress' as any)}
          >
            <TrendingUp size={20} color={Colors.primary} strokeWidth={2} />
            <Text style={styles.quickActionText}>View Full Progress</Text>
            <ChevronRight size={20} color={Colors.primary} strokeWidth={2} />
          </TouchableOpacity>
        </View>
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
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12,
  },
  summaryCard: {
    width: CARD_WIDTH,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: Colors.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  summaryValue: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: Colors.text,
    marginTop: 12,
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  mealsLoggedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    gap: 10,
    shadowColor: Colors.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  mealsLoggedText: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: '600' as const,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 20,
    shadowColor: Colors.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: Colors.primary,
    marginBottom: 6,
  },
  statLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: Colors.border,
    marginHorizontal: 20,
  },
  mealsList: {
    gap: 16,
  },
  mealCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: Colors.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  mealImage: {
    width: '100%',
    height: 140,
    backgroundColor: Colors.backgroundSecondary,
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
    fontSize: 11,
    fontWeight: '700' as const,
  },
  mealTime: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  viewButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  foodItems: {
    marginBottom: 12,
  },
  foodItemText: {
    fontSize: 14,
    color: Colors.text,
    marginBottom: 4,
  },
  foodItemMore: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    marginTop: 4,
  },
  mealNutrition: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  nutritionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  nutritionText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '600' as const,
  },
  emptyState: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    shadowColor: Colors.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyStateButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyStateButtonText: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.textWhite,
  },
  quickActionsSection: {
    gap: 12,
    marginTop: 8,
  },
  quickActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    gap: 12,
    shadowColor: Colors.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  quickActionText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
  },
});
