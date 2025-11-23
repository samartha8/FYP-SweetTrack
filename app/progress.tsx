import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Flame, Wheat, Beef, Droplets, TrendingUp, Calendar, UtensilsCrossed } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useMealTracking } from '@/contexts/MealTrackingContext';

const BAR_MAX_HEIGHT = 150;

export default function ProgressScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { todayNutrition, weeklyStats, getDailyNutritionForWeek, getTodayMeals } = useMealTracking();

  const dailyData = getDailyNutritionForWeek;

  const maxCalories = Math.max(...dailyData.map(d => d.calories), 1);

  const getDayLabel = (dateString: string) => {
    const date = new Date(dateString);
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days[date.getDay()];
  };

  const calorieGoal = 2000;
  const calorieProgress = Math.min((todayNutrition.calories / calorieGoal) * 100, 100);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
          <X size={24} color={Colors.text} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Progress Tracking</Text>
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
            <Text style={styles.sectionTitle}>Today&apos;s Summary</Text>
          </View>

          <View style={styles.summaryCard}>
            <View style={styles.calorieProgressContainer}>
              <View style={styles.calorieProgressInfo}>
                <Text style={styles.calorieValue}>{todayNutrition.calories}</Text>
                <Text style={styles.calorieLabel}>of {calorieGoal} kcal</Text>
              </View>
              <View style={styles.progressRing}>
                <View
                  style={[
                    styles.progressRingFill,
                    {
                      transform: [{ rotate: `${(calorieProgress / 100) * 360}deg` }],
                      backgroundColor: calorieProgress >= 90 ? Colors.success : Colors.primary,
                    },
                  ]}
                />
                <View style={styles.progressRingInner}>
                  <Text style={styles.progressPercentage}>{Math.round(calorieProgress)}%</Text>
                </View>
              </View>
            </View>

            <View style={styles.mealsLoggedInfo}>
              <UtensilsCrossed size={18} color={Colors.textSecondary} strokeWidth={2} />
              <Text style={styles.mealsLoggedText}>
                {getTodayMeals.length} meals logged today
              </Text>
            </View>
          </View>

          <View style={styles.macroGrid}>
            <View style={styles.macroCard}>
              <View style={[styles.macroIcon, { backgroundColor: Colors.chart.glucose + '20' }]}>
                <Wheat size={20} color={Colors.chart.glucose} strokeWidth={2} />
              </View>
              <Text style={styles.macroValue}>{todayNutrition.carbs}g</Text>
              <Text style={styles.macroLabel}>Carbs</Text>
            </View>

            <View style={styles.macroCard}>
              <View style={[styles.macroIcon, { backgroundColor: Colors.error + '20' }]}>
                <Beef size={20} color={Colors.error} strokeWidth={2} />
              </View>
              <Text style={styles.macroValue}>{todayNutrition.protein}g</Text>
              <Text style={styles.macroLabel}>Protein</Text>
            </View>

            <View style={styles.macroCard}>
              <View style={[styles.macroIcon, { backgroundColor: Colors.secondary + '20' }]}>
                <Droplets size={20} color={Colors.secondary} strokeWidth={2} />
              </View>
              <Text style={styles.macroValue}>{todayNutrition.fat}g</Text>
              <Text style={styles.macroLabel}>Fat</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <TrendingUp size={20} color={Colors.primary} strokeWidth={2} />
            <Text style={styles.sectionTitle}>7-Day Trends</Text>
          </View>

          <View style={styles.chartCard}>
            <View style={styles.chartHeader}>
              <Flame size={18} color={Colors.warning} strokeWidth={2} />
              <Text style={styles.chartTitle}>Daily Calorie Intake</Text>
            </View>

            <View style={styles.chart}>
              {dailyData.map((day, index) => {
                const barHeight = (day.calories / maxCalories) * BAR_MAX_HEIGHT;
                const isToday = index === dailyData.length - 1;

                return (
                  <View key={day.date} style={styles.barContainer}>
                    <View style={styles.barWrapper}>
                      {day.calories > 0 && (
                        <Text style={styles.barValue}>{day.calories}</Text>
                      )}
                      <View
                        style={[
                          styles.bar,
                          {
                            height: Math.max(barHeight, 4),
                            backgroundColor: isToday ? Colors.primary : Colors.chart.glucose,
                          },
                        ]}
                      />
                    </View>
                    <Text style={[styles.barLabel, isToday && styles.barLabelToday]}>
                      {getDayLabel(day.date)}
                    </Text>
                  </View>
                );
              })}
            </View>

            <View style={styles.chartLegend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: Colors.primary }]} />
                <Text style={styles.legendText}>Today</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: Colors.chart.glucose }]} />
                <Text style={styles.legendText}>Previous days</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Weekly Statistics</Text>

          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: Colors.warning + '20' }]}>
                <Flame size={24} color={Colors.warning} strokeWidth={2} />
              </View>
              <Text style={styles.statValue}>{weeklyStats.avgCalories}</Text>
              <Text style={styles.statLabel}>Avg Daily Calories</Text>
            </View>

            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: Colors.primary + '20' }]}>
                <UtensilsCrossed size={24} color={Colors.primary} strokeWidth={2} />
              </View>
              <Text style={styles.statValue}>{weeklyStats.mealsLogged}</Text>
              <Text style={styles.statLabel}>Meals Logged</Text>
            </View>

            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: Colors.error + '20' }]}>
                <Beef size={24} color={Colors.error} strokeWidth={2} />
              </View>
              <Text style={styles.statValue}>{weeklyStats.totalProtein}g</Text>
              <Text style={styles.statLabel}>Total Protein</Text>
            </View>

            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: Colors.chart.glucose + '20' }]}>
                <Wheat size={24} color={Colors.chart.glucose} strokeWidth={2} />
              </View>
              <Text style={styles.statValue}>{weeklyStats.totalCarbs}g</Text>
              <Text style={styles.statLabel}>Total Carbs</Text>
            </View>
          </View>
        </View>

        <View style={styles.tipCard}>
          <TrendingUp size={24} color={Colors.success} strokeWidth={2} />
          <View style={styles.tipContent}>
            <Text style={styles.tipTitle}>Keep Up the Good Work!</Text>
            <Text style={styles.tipText}>
              Consistent meal tracking helps you understand your eating patterns and make healthier choices.
            </Text>
          </View>
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
  summaryCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    shadowColor: Colors.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  calorieProgressContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  calorieProgressInfo: {
    flex: 1,
  },
  calorieValue: {
    fontSize: 36,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 4,
  },
  calorieLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  progressRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  progressRingFill: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  progressRingInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  progressPercentage: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.primary,
  },
  mealsLoggedInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  mealsLoggedText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  macroGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  macroCard: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: Colors.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  macroIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  macroValue: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 4,
  },
  macroLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  chartCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 20,
    shadowColor: Colors.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 8,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: BAR_MAX_HEIGHT + 50,
    paddingHorizontal: 8,
    marginBottom: 16,
  },
  barContainer: {
    flex: 1,
    alignItems: 'center',
  },
  barWrapper: {
    alignItems: 'center',
    marginBottom: 8,
    height: BAR_MAX_HEIGHT + 20,
    justifyContent: 'flex-end',
  },
  bar: {
    width: 32,
    borderRadius: 4,
    minHeight: 4,
  },
  barValue: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  barLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 8,
  },
  barLabelToday: {
    fontWeight: '700' as const,
    color: Colors.primary,
  },
  chartLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    width: '48%',
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: Colors.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  statIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  tipCard: {
    flexDirection: 'row',
    backgroundColor: Colors.success + '10',
    borderRadius: 12,
    padding: 16,
    gap: 12,
    borderLeftWidth: 4,
    borderLeftColor: Colors.success,
  },
  tipContent: {
    flex: 1,
  },
  tipTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 6,
  },
  tipText: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
});
