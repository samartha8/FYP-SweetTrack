import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ColorValue,
  Image,
  TextStyle,
  ViewStyle,
  Platform,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Flame, Wheat, Beef, Droplets, TrendingUp, Calendar, UtensilsCrossed, ArrowLeft, Sparkles, Activity } from 'lucide-react-native';
import { useMealTracking } from '@/contexts/MealTrackingContext';
import { useTheme } from '@/contexts/SettingsContext';
import { useMemo } from 'react';
import { useTranslation } from '@/hooks/use-translation';
import Animated, { FadeInDown, FadeInUp, Layout, ZoomIn } from 'react-native-reanimated';

const { width } = Dimensions.get('window');
const BAR_MAX_HEIGHT = 150;

export default function ProgressScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { todayNutrition, weeklyStats, getDailyNutritionForWeek, getTodayMeals, activeDietDetails } = useMealTracking();
  const { colors, scale } = useTheme();
  const { t } = useTranslation();

  const themed = useMemo(() => ({
    container: { backgroundColor: 'transparent' },
    headerTitle: { color: colors.text, fontSize: scale(24), fontWeight: '900' as const, letterSpacing: -1 },
    sectionTitle: { color: colors.text, fontSize: scale(20), fontWeight: '900' as const, letterSpacing: -0.5 },
    card: { 
      backgroundColor: '#FFF', 
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.08,
      shadowRadius: 20,
      elevation: 5,
      borderRadius: 32,
      borderWidth: 1,
      borderColor: 'rgba(0,0,0,0.03)'
    },
    calorieValue: { color: '#ffffff', fontSize: scale(48), fontWeight: '900' as const, letterSpacing: -1.5 },
    calorieLabel: { color: 'rgba(255,255,255,0.9)', fontSize: scale(14), fontWeight: '700' as const },
    macroValue: { color: colors.text, fontSize: scale(20), fontWeight: '900' as const, letterSpacing: -0.5 },
    macroLabel: { color: colors.textSecondary, fontSize: scale(11), fontWeight: '800' as const, textTransform: 'uppercase' as const, letterSpacing: 1 },
    statValue: { color: colors.text, fontSize: scale(28), fontWeight: '900' as const, letterSpacing: -1 },
    statLabel: { color: colors.textSecondary, fontSize: scale(13), fontWeight: '700' as const },
  }), [colors, scale]);

  const dailyData = getDailyNutritionForWeek;
  const maxCalories = Math.max(...dailyData.map(d => d.calories), 1);

  const getDayLabel = (dateString: string) => {
    const date = new Date(dateString);
    const days = [t.progress.sun, t.progress.mon, t.progress.tue, t.progress.wed, t.progress.thu, t.progress.fri, t.progress.sat];
    return days[date.getDay()];
  };

  const calorieGoal = activeDietDetails?.dailyCalorieTarget || 2000;
  const calorieProgress = Math.min((todayNutrition.calories / calorieGoal) * 100, 100);

  const macroGoalProtein = Math.round((calorieGoal * ((activeDietDetails?.macroRatio?.protein || 25) / 100)) / 4);
  const macroGoalCarbs = Math.round((calorieGoal * ((activeDietDetails?.macroRatio?.carbs || 50) / 100)) / 4);
  const macroGoalFat = Math.round((calorieGoal * ((activeDietDetails?.macroRatio?.fat || 25) / 100)) / 9);
  const formatMacroGrams = (value: number) => {
    const safeValue = Number(value) || 0;
    return safeValue >= 10 ? Math.round(safeValue).toString() : safeValue.toFixed(1);
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#F0FDF4', '#F0F9FF']} style={StyleSheet.absoluteFill} />
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={28} color={colors.text} strokeWidth={2.5} />
        </TouchableOpacity>
        <Text style={themed.headerTitle}>Progress Hub</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Today Summary Card */}
        <Animated.View entering={FadeInUp} style={styles.section}>
          <LinearGradient
            colors={['#00B4D8', '#0077B6']}
            style={[styles.summaryCard, themed.card]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.summaryHeader}>
              <View style={styles.summaryInfo}>
                <Text style={themed.calorieLabel}>CALORIES TODAY</Text>
                <Text style={themed.calorieValue}>{Math.round(todayNutrition.calories || 0)}</Text>
                <Text style={[themed.calorieLabel, { opacity: 0.8 }]}>Target: {calorieGoal} kcal</Text>
              </View>
              <View style={styles.progressCircle}>
                <View style={[styles.progressRingBg, { borderColor: 'rgba(255,255,255,0.2)' }]} />
                <View style={[styles.progressRingFill, { height: `${calorieProgress}%`, backgroundColor: 'rgba(255,255,255,0.3)' }]} />
                <Text style={styles.progressText}>{Math.round(calorieProgress)}%</Text>
              </View>
            </View>

            <View style={styles.summaryFooter}>
              <UtensilsCrossed size={18} color="#FFF" strokeWidth={2.5} />
              <Text style={styles.summaryFooterText}>
                {getTodayMeals?.length || 0} meals logged today
              </Text>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Macros Grid */}
        <View style={styles.macroGrid}>
          {[
            { icon: Wheat, label: 'Carbs', value: formatMacroGrams(todayNutrition.carbs), goal: macroGoalCarbs, color: '#10B981', delay: 100 },
            { icon: Beef, label: 'Protein', value: formatMacroGrams(todayNutrition.protein), goal: macroGoalProtein, color: '#EF4444', delay: 200 },
            { icon: Droplets, label: 'Fat', value: formatMacroGrams(todayNutrition.fat), goal: macroGoalFat, color: '#3B82F6', delay: 300 },
          ].map((macro, idx) => (
            <Animated.View 
              key={idx} 
              entering={FadeInDown.delay(macro.delay)}
              style={[styles.macroCard, themed.card]}
            >
              <View style={[styles.macroIconBox, { backgroundColor: macro.color + '15' }]}>
                <macro.icon size={22} color={macro.color} strokeWidth={2.5} />
              </View>
              <View style={styles.macroValueRow}>
                <Text style={themed.macroValue}>{macro.value}</Text>
                <Text style={styles.macroGoalText}>/{macro.goal}g</Text>
              </View>
              <Text style={themed.macroLabel}>{macro.label}</Text>
            </Animated.View>
          ))}
        </View>

        {/* Weekly Chart */}
        <Animated.View entering={FadeInDown.delay(400)} style={styles.section}>
          <Text style={[themed.sectionTitle, { marginBottom: 16 }]}>Weekly Insight</Text>
          <View style={[styles.chartCard, themed.card]}>
            <View style={styles.chartHeader}>
              <TrendingUp size={22} color={colors.primary} strokeWidth={2.5} />
              <Text style={[themed.sectionTitle, { fontSize: 18 }]}>Calories Intake</Text>
            </View>

            <View style={styles.chartContainer}>
              {dailyData.map((day, index) => {
                const barHeight = (day.calories / maxCalories) * BAR_MAX_HEIGHT;
                const isToday = index === dailyData.length - 1;

                return (
                  <View key={index} style={styles.barColumn}>
                    <View style={styles.barTrack}>
                      <LinearGradient
                        colors={isToday ? ['#00B4D8', '#0077B6'] : ['#F1F5F9', '#E2E8F0']}
                        style={[styles.barFill, { height: Math.max(barHeight, 8) }]}
                      />
                    </View>
                    <Text style={[styles.dayLabel, isToday && { color: colors.primary, fontWeight: '900' }]}>
                      {getDayLabel(day.date)}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        </Animated.View>

        {/* Stats Grid */}
        <View style={styles.section}>
          <Text style={[themed.sectionTitle, { marginBottom: 16 }]}>Performance Stats</Text>
          <View style={styles.statsGrid}>
            {[
              { label: 'Avg Calories', value: weeklyStats.avgCalories, icon: Flame, color: '#F59E0B' },
              { label: 'Logged Meals', value: weeklyStats.mealsLogged, icon: UtensilsCrossed, color: '#3B82F6' },
              { label: 'Total Protein', value: `${weeklyStats.totalProtein}g`, icon: Beef, color: '#EF4444' },
              { label: 'Total Carbs', value: `${weeklyStats.totalCarbs}g`, icon: Wheat, color: '#10B981' },
            ].map((stat, idx) => (
              <Animated.View 
                key={idx} 
                entering={FadeInDown.delay(500 + idx * 50)}
                style={[styles.statCard, themed.card]}
              >
                <View style={[styles.statIconBox, { backgroundColor: stat.color + '10' }]}>
                  <stat.icon size={22} color={stat.color} strokeWidth={2.5} />
                </View>
                <Text style={themed.statValue}>{stat.value}</Text>
                <Text style={themed.statLabel}>{stat.label}</Text>
              </Animated.View>
            ))}
          </View>
        </View>

        {/* Motivation Tip */}
        <Animated.View entering={FadeInDown.delay(700)} style={[styles.tipCard, themed.card]}>
          <View style={styles.tipIconBox}>
            <Sparkles size={28} color={colors.primary} strokeWidth={2.5} />
          </View>
          <View style={styles.tipContent}>
            <Text style={[themed.sectionTitle, { fontSize: 18 }]}>Metabolic Power</Text>
            <Text style={styles.tipText}>
              Consistently logging your meals helps the AI accurately predict your glycemic response and optimizes your metabolic health.
            </Text>
          </View>
        </Animated.View>

      </ScrollView>
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
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  section: {
    marginBottom: 32,
  },
  summaryCard: {
    padding: 32,
    borderRadius: 40,
    overflow: 'hidden',
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryInfo: {
    flex: 1,
  },
  progressCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  progressRingBg: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 6,
  },
  progressRingFill: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
  },
  progressText: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: '900',
    zIndex: 1,
  },
  summaryFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
    gap: 12,
  },
  summaryFooterText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
  macroGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 32,
  },
  macroCard: {
    flex: 1,
    paddingVertical: 20,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  macroIconBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  macroValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    minHeight: 34,
  },
  macroGoalText: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '800',
  },
  chartCard: {
    padding: 28,
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 32,
  },
  chartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: BAR_MAX_HEIGHT + 40,
  },
  barColumn: {
    alignItems: 'center',
    width: (width - 48 - 56) / 7,
  },
  barTrack: {
    width: 14,
    height: BAR_MAX_HEIGHT,
    backgroundColor: '#F1F5F9',
    borderRadius: 7,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    borderRadius: 7,
  },
  dayLabel: {
    marginTop: 12,
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    width: (width - 48 - 12) / 2,
    padding: 24,
    alignItems: 'center',
  },
  statIconBox: {
    width: 54,
    height: 54,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  tipCard: {
    flexDirection: 'row',
    padding: 28,
    gap: 20,
    alignItems: 'center',
    marginBottom: 40,
  },
  tipIconBox: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: '#F0F9FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tipContent: {
    flex: 1,
  },
  tipText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 4,
  },
});
