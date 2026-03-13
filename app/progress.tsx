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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Flame, Wheat, Beef, Droplets, TrendingUp, Calendar, UtensilsCrossed } from 'lucide-react-native';
import { useMealTracking } from '@/contexts/MealTrackingContext';
import { useTheme } from '@/contexts/SettingsContext';
import { useMemo } from 'react';
import { useTranslation } from '@/hooks/use-translation';

const BAR_MAX_HEIGHT = 150;

export default function ProgressScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { todayNutrition, weeklyStats, getDailyNutritionForWeek, getTodayMeals } = useMealTracking();
  const { colors, scale } = useTheme();
  const { t } = useTranslation();

  // Dynamic Styles
  const themed = useMemo(() => ({
    container: { backgroundColor: colors.backgroundSecondary },
    header: { backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)' },
    headerTitle: { color: colors.text, fontSize: scale(19), fontWeight: '700', letterSpacing: -0.5 },
    sectionTitle: { color: colors.text, fontSize: scale(20), fontWeight: '800', letterSpacing: -0.5 },
    summaryCard: {
      backgroundColor: colors.card,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.1,
      shadowRadius: 24,
      elevation: 8,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.8)',
    },
    calorieValue: { color: '#ffffff', fontSize: scale(42), fontWeight: '900', letterSpacing: -1 },
    calorieLabel: { color: 'rgba(255,255,255,0.8)', fontSize: scale(14), fontWeight: '600' },
    progressRing: { backgroundColor: 'rgba(255,255,255,0.2)' },
    progressRingInner: { backgroundColor: 'transparent' },
    progressPercentage: { color: '#ffffff', fontSize: scale(18), fontWeight: '800' },
    mealsLoggedInfo: { borderTopColor: 'rgba(255,255,255,0.2)', borderTopWidth: 1, paddingTop: 16 },
    mealsLoggedText: { color: 'rgba(255,255,255,0.9)', fontSize: scale(15), fontWeight: '600' },
    macroCard: {
      backgroundColor: 'rgba(255,255,255,0.7)',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.05,
      shadowRadius: 12,
      elevation: 4,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.8)',
    },
    macroValue: { color: colors.text, fontSize: scale(22), fontWeight: '800', letterSpacing: -0.5 },
    macroLabel: { color: colors.textSecondary, fontSize: scale(13), fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
    chartCard: {
      backgroundColor: '#ffffff',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.08,
      shadowRadius: 30,
      elevation: 10,
      borderWidth: 1,
      borderColor: 'rgba(0,0,0,0.03)',
    },
    chartTitle: { color: colors.text, fontSize: scale(17), fontWeight: '700', letterSpacing: -0.3 },
    barLabel: { color: colors.textSecondary, fontSize: scale(12), fontWeight: '700' },
    barValue: { color: colors.primary, fontSize: scale(11), fontWeight: '800' },
    chartLegend: { borderTopColor: 'rgba(0,0,0,0.05)', borderTopWidth: 1 },
    legendText: { color: colors.textSecondary, fontSize: scale(13), fontWeight: '600' },
    statCard: {
      backgroundColor: 'rgba(255,255,255,0.8)',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.06,
      shadowRadius: 16,
      elevation: 5,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.9)',
    },
    statValue: { color: colors.text, fontSize: scale(26), fontWeight: '900', letterSpacing: -0.8 },
    statLabel: { color: colors.textSecondary, fontSize: scale(14), fontWeight: '600' },
    tipTitle: { color: colors.success, fontSize: scale(17), fontWeight: '800' },
    tipText: { color: colors.textSecondary, fontSize: scale(15), lineHeight: 22 },
    tipCard: {
      backgroundColor: '#ffffff',
      borderLeftColor: colors.success,
      borderLeftWidth: 6,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.05,
      shadowRadius: 12,
      elevation: 3,
    },
  } as any), [colors, scale]);

  const dailyData = getDailyNutritionForWeek;
  const maxCalories = Math.max(...dailyData.map(d => d.calories), 1);

  const getDayLabel = (dateString: string) => {
    const date = new Date(dateString);
    const days = [t.progress.sun, t.progress.mon, t.progress.tue, t.progress.wed, t.progress.thu, t.progress.fri, t.progress.sat];
    return days[date.getDay()];
  };

  const calorieGoal = 2000;
  const calorieProgress = Math.min((todayNutrition.calories / calorieGoal) * 100, 100);

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
        <Text style={[styles.headerTitle, themed.headerTitle]}>{t.progress.header}</Text>
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
            <Text style={[styles.sectionTitle, themed.sectionTitle]}>{t.progress.todaySummary}</Text>
          </View>

          <LinearGradient
            colors={[colors.primary, colors.secondary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.summaryCard, themed.summaryCard]}
          >
            <View style={styles.calorieProgressContainer}>
              <View style={styles.calorieProgressInfo}>
                <Text style={[styles.calorieValue, themed.calorieValue]}>{Math.round(todayNutrition.calories || 0)}</Text>
                <Text style={[styles.calorieLabel, themed.calorieLabel]}>{t.progress.kcalOf} {calorieGoal} {t.wellness.unitCalories}</Text>
              </View>
              <View style={[styles.progressRing, themed.progressRing]}>
                <View
                  style={[
                    styles.progressRingFill,
                    {
                      width: '100%',
                      height: `${calorieProgress}%`,
                      bottom: 0,
                      backgroundColor: 'rgba(255,255,255,0.3)',
                      borderRadius: 0,
                    },
                  ]}
                />
                <View style={[styles.progressRingInner, themed.progressRingInner]}>
                  <Text style={[styles.progressPercentage, themed.progressPercentage]}>{Math.round(calorieProgress)}%</Text>
                </View>
              </View>
            </View>

            <View style={[styles.mealsLoggedInfo, themed.mealsLoggedInfo]}>
              <View style={styles.mealsLoggedBadge}>
                <UtensilsCrossed size={16} color="#ffffff" strokeWidth={2.5} />
                <Text style={[styles.mealsLoggedText, themed.mealsLoggedText]}>
                  {(getTodayMeals?.length || 0)} {t.progress.mealsLoggedToday}
                </Text>
              </View>
            </View>
          </LinearGradient>

          <View style={styles.macroGrid}>
            <View style={[styles.macroCard, themed.macroCard, { backgroundColor: (colors.chart?.glucose || '#30D158') + '15' }]}>
              <View style={[styles.macroIcon, { backgroundColor: (colors.chart?.glucose || '#30D158') + '20' }]}>
                <Wheat size={scale(22)} color={colors.chart?.glucose || '#30D158'} strokeWidth={2.5} />
              </View>
              <Text style={[styles.macroValue, themed.macroValue]}>{todayNutrition.carbs}{t.wellness.unitG}</Text>
              <Text style={[styles.macroLabel, themed.macroLabel]}>{t.progress.carbs}</Text>
            </View>

            <View style={[styles.macroCard, themed.macroCard, { backgroundColor: colors.error + '12' }]}>
              <View style={[styles.macroIcon, { backgroundColor: colors.error + '20' }]}>
                <Beef size={scale(22)} color={colors.error} strokeWidth={2.5} />
              </View>
              <Text style={[styles.macroValue, themed.macroValue]}>{todayNutrition.protein}{t.wellness.unitG}</Text>
              <Text style={[styles.macroLabel, themed.macroLabel]}>{t.progress.protein}</Text>
            </View>

            <View style={[styles.macroCard, themed.macroCard, { backgroundColor: colors.secondary + '12' }]}>
              <View style={[styles.macroIcon, { backgroundColor: colors.secondary + '20' }]}>
                <Droplets size={scale(22)} color={colors.secondary} strokeWidth={2.5} />
              </View>
              <Text style={[styles.macroValue, themed.macroValue]}>{todayNutrition.fat}{t.wellness.unitG}</Text>
              <Text style={[styles.macroLabel, themed.macroLabel]}>{t.progress.fat}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <TrendingUp size={20} color={colors.primary} strokeWidth={2} />
            <Text style={[styles.sectionTitle, themed.sectionTitle]}>{t.progress.trends7Day}</Text>
          </View>

          <View style={[styles.chartCard, themed.chartCard]}>
            <View style={styles.chartHeader}>
              <Flame size={18} color={colors.warning} strokeWidth={2} />
              <Text style={[styles.chartTitle, themed.chartTitle]}>{t.progress.dailyCalorieIntake}</Text>
            </View>

            <View style={styles.chart}>
              {dailyData.map((day, index) => {
                const barHeight = (day.calories / maxCalories) * BAR_MAX_HEIGHT;
                const isToday = index === dailyData.length - 1;

                return (
                  <View key={day.date} style={styles.barContainer}>
                    <View style={styles.barWrapper}>
                      {day.calories > 0 && (
                        <Text style={[styles.barValue, themed.barValue]}>{Math.round(day.calories)}</Text>
                      )}
                      {day.calories > 0 ? (
                        <LinearGradient
                          colors={[
                            isToday ? colors.primary : '#E0E0E0',
                            isToday ? colors.secondary : '#BDBDBD'
                          ]}
                          style={[
                            styles.bar,
                            {
                              height: Math.max(barHeight, 4),
                            },
                            isToday && {
                              shadowColor: colors.primary,
                              shadowOffset: { width: 0, height: 0 },
                              shadowOpacity: 0.5,
                              shadowRadius: 10,
                              elevation: 5,
                            }
                          ]}
                        />
                      ) : (
                        <View style={[styles.emptyBarDot, { backgroundColor: colors.border }]} />
                      )}
                    </View>
                    <Text style={[
                      styles.barLabel,
                      themed.barLabel,
                      isToday && { color: colors.primary, fontWeight: '700' }
                    ]}>
                      {getDayLabel(day.date)}
                    </Text>
                  </View>
                );
              })}
            </View>

            <View style={[styles.chartLegend, themed.chartLegend]}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
                <Text style={[styles.legendText, themed.legendText]}>{t.progress.today}</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: colors.chart?.glucose || '#30D158' }]} />
                <Text style={[styles.legendText, themed.legendText]}>{t.progress.previousDays}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, themed.sectionTitle]}>{t.progress.weeklyStatistics}</Text>

          <View style={styles.statsGrid}>
            <View style={[styles.statCard, themed.statCard]}>
              <View style={[styles.statIcon, { backgroundColor: colors.warning + '20' }]}>
                <Flame size={scale(24)} color={colors.warning} strokeWidth={2.5} />
              </View>
              <Text style={[styles.statValue, themed.statValue]}>{weeklyStats.avgCalories}</Text>
              <Text style={[styles.statLabel, themed.statLabel]}>{t.progress.avgDailyCalories}</Text>
            </View>

            <View style={[styles.statCard, themed.statCard]}>
              <View style={[styles.statIcon, { backgroundColor: colors.primary + '20' }]}>
                <UtensilsCrossed size={scale(24)} color={colors.primary} strokeWidth={2.5} />
              </View>
              <Text style={[styles.statValue, themed.statValue]}>{weeklyStats.mealsLogged}</Text>
              <Text style={[styles.statLabel, themed.statLabel]}>{t.progress.mealsLogged}</Text>
            </View>

            <View style={[styles.statCard, themed.statCard]}>
              <View style={[styles.statIcon, { backgroundColor: colors.error + '20' }]}>
                <Beef size={scale(24)} color={colors.error} strokeWidth={2.5} />
              </View>
              <Text style={[styles.statValue, themed.statValue]}>{weeklyStats.totalProtein}{t.wellness.unitG}</Text>
              <Text style={[styles.statLabel, themed.statLabel]}>{t.progress.totalProtein}</Text>
            </View>

            <View style={[styles.statCard, themed.statCard]}>
              <View style={[styles.statIcon, { backgroundColor: (colors.chart?.glucose || '#30D158') + '20' }]}>
                <Wheat size={scale(24)} color={colors.chart?.glucose || '#30D158'} strokeWidth={2.5} />
              </View>
              <Text style={[styles.statValue, themed.statValue]}>{weeklyStats.totalCarbs}{t.wellness.unitG}</Text>
              <Text style={[styles.statLabel, themed.statLabel]}>{t.progress.totalCarbs}</Text>
            </View>
          </View>
        </View>

        <View style={[styles.tipCard, themed.tipCard]}>
          <TrendingUp size={32} color={colors.success} strokeWidth={2.5} />
          <View style={styles.tipContent}>
            <Text style={[styles.tipTitle, themed.tipTitle]}>{t.progress.keepUp}</Text>
            <Text style={[styles.tipText, themed.tipText]}>
              {t.progress.keepUpDesc}
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
  summaryCard: {
    borderRadius: 24,
    padding: 24,
    marginBottom: 16,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
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
    fontWeight: '700',
    marginBottom: 4,
  },
  calorieLabel: {
  },
  progressRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
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
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  progressPercentage: {
    fontWeight: '700',
  },
  mealsLoggedInfo: {
    borderTopWidth: 1,
    marginTop: 16,
  },
  mealsLoggedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderRadius: 12,
  },
  mealsLoggedText: {
  },
  macroGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  macroCard: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
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
    fontWeight: '700',
    marginBottom: 4,
  },
  macroLabel: {
  },
  chartCard: {
    borderRadius: 24,
    padding: 24,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 8,
  },
  chartTitle: {
    fontWeight: '600',
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
    borderRadius: 6,
    minHeight: 4,
  },
  emptyBarDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginBottom: 4,
  },
  barValue: {
    fontWeight: '600',
    marginBottom: 4,
  },
  barLabel: {
    marginTop: 8,
  },
  chartLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    paddingTop: 12,
    borderTopWidth: 1,
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
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    width: '48%',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 4,
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
    fontWeight: '700',
    marginBottom: 4,
  },
  statLabel: {
    textAlign: 'center',
  },
  tipCard: {
    flexDirection: 'row',
    borderRadius: 20,
    padding: 20,
    gap: 16,
    borderLeftWidth: 6,
    marginTop: 8,
  },
  tipContent: {
    flex: 1,
  },
  tipTitle: {
    fontWeight: '700',
    marginBottom: 6,
  },
  tipText: {
    lineHeight: 18,
  },
});
