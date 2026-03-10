import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, ColorValue, Platform } from 'react-native';
import { useState, useCallback, useMemo } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Heart, Activity, Droplet, Moon, Flame, TrendingUp, UtensilsCrossed, Camera, BarChart3, List, Link, ChevronRight } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from '@/hooks/use-translation';
import { useUser } from '@/contexts/UserContext';
import { DIABETES_URL } from '../../constants/Api';
import { useTheme } from '@/contexts/SettingsContext';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 60) / 2;

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, healthMetrics, dailyGoals, rewardsPoints, streak, isGoogleFitConnected, connectGoogleFit, ensureAccessToken } = useUser();
  const { colors, scale } = useTheme(); // Global Theme Hook
  const { t } = useTranslation();
  const [predictionData, setPredictionData] = useState({ riskScore: 0, riskLevel: 'Low Risk', hasHistory: false });

  // Dynamic Styles
  const themed = useMemo(() => ({
    container: { backgroundColor: colors.backgroundSecondary },
    header: { backgroundColor: colors.background },
    greeting: { color: colors.text, fontSize: scale(24) },
    subtitle: { color: colors.textSecondary, fontSize: scale(14) },
    sectionTitle: { color: colors.text, fontSize: scale(20) },
    statValue: { color: colors.text, fontSize: scale(24) },
    statUnit: { color: colors.textSecondary },
    statLabel: { color: colors.textSecondary, fontSize: scale(14) },
    featureLabel: { color: colors.text, fontSize: scale(14) },
    rewardLabel: { color: colors.textSecondary, fontSize: scale(14) },
    rewardValue: { fontSize: scale(28) },
    tipTitle: { color: colors.text, fontSize: scale(16) },
    tipDescription: { color: colors.textSecondary, fontSize: scale(14) },
    card: { backgroundColor: colors.card, shadowColor: colors.cardShadow },
    riskBadgeText: { fontSize: scale(12) },
    riskScore: { fontSize: scale(48) },
    riskLabel: { fontSize: scale(16) },
    riskDescription: { fontSize: scale(14) },
    googleFitTitle: { fontSize: scale(20) },
    googleFitDescription: { fontSize: scale(14) },
    statGoal: { fontSize: scale(12), color: colors.textSecondary },
    sectionLink: { fontSize: scale(14) },
  }), [colors, scale]);

  useFocusEffect(
    useCallback(() => {
      const fetchPrediction = async () => {
        try {
          if (!user) return;
          let token = await ensureAccessToken();
          // Add timestamp to prevent caching
          let response = await fetch(`${DIABETES_URL}/latest?t=${Date.now()}`, {
            headers: { 'Authorization': `Bearer ${token || ''}` }
          });

          // ✅ 401 Retry Logic
          if (response.status === 401) {
            console.log('Home: Token expired, refreshing...');
            token = await ensureAccessToken(true);
            if (token) {
              response = await fetch(`${DIABETES_URL}/latest?t=${Date.now()}`, {
                headers: { 'Authorization': `Bearer ${token}` }
              });
            }
          }

          const json = await response.json();
          if (json.success && json.hasHistory) {
            setPredictionData({
              riskScore: json.riskScore,
              riskLevel: json.riskLevel,
              hasHistory: true
            });
          }
        } catch (e) {
          console.log('Failed to fetch prediction preview', e);
        }
      };

      fetchPrediction();
    }, [user, ensureAccessToken])
  );

  const { riskScore, riskLevel } = predictionData;
  const riskColor = riskLevel === 'High Risk' ? colors.risk.high : riskLevel === 'Medium Risk' ? colors.risk.moderate : colors.risk.low;

  const quickStats = [
    { icon: Activity, label: t.wellness.steps, value: healthMetrics.steps, goal: dailyGoals.steps, unit: '', color: colors.chart.bmi },
    { icon: Droplet, label: t.wellness.water, value: healthMetrics.water, goal: dailyGoals.water, unit: t.wellness.unitWater, color: colors.secondary },
    { icon: Moon, label: t.wellness.sleep, value: healthMetrics.sleep, goal: dailyGoals.sleep, unit: t.wellness.unitSleep, color: colors.chart.glucose },
    { icon: Flame, label: t.wellness.calories, value: healthMetrics.calories, goal: dailyGoals.calories, unit: t.wellness.unitCalories, color: colors.warning },
  ];

  const features = [
    { icon: UtensilsCrossed, label: t.home.dietSuggestion, route: '/diet-suggestions', gradient: colors.gradient.success },
    { icon: Camera, label: t.home.mealLog, route: '/meal-log', gradient: colors.gradient.warning },
    { icon: BarChart3, label: t.home.progress, route: '/progress', gradient: colors.gradient.secondary },
    { icon: List, label: t.home.viewAllMeals, route: '/view-all-meals', gradient: colors.gradient.error },
  ];

  return (
    <View style={[styles.container, themed.container, { paddingTop: insets.top }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.header, themed.header]}>
          <View>
            <Text style={[styles.greeting, themed.greeting]}>{t.home.greeting}, {user?.name || 'User'}!</Text>
            <Text style={[styles.subtitle, themed.subtitle]}>{t.home.greetingSub}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.riskCard, { shadowColor: colors.cardShadow }]}
          activeOpacity={0.8}
          onPress={() => router.push('/prediction' as any)}
        >
          <LinearGradient
            colors={[riskColor, riskColor + '80'] as unknown as readonly [ColorValue, ColorValue, ...ColorValue[]]}
            style={styles.riskGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.riskHeader}>
              <Heart size={32} color={colors.textWhite} strokeWidth={2} />
              <View style={styles.riskBadge}>
                <Text style={[styles.riskBadgeText, themed.riskBadgeText]}>
                  {riskLevel === 'Low Risk' ? t.home.riskLow : riskLevel === 'Medium Risk' ? t.home.riskMedium : t.home.riskHigh}
                </Text>
              </View>
            </View>
            <Text style={[styles.riskScore, themed.riskScore]}>{riskScore}%</Text>
            <Text style={[styles.riskLabel, themed.riskLabel]}>{t.home.riskScore}</Text>
            <Text style={[styles.riskDescription, themed.riskDescription]}>
              {riskLevel === 'Low Risk'
                ? t.home.riskLowDesc
                : t.home.riskHighDesc}
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        {isGoogleFitConnected && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, themed.sectionTitle]}>{t.home.todayProgress}</Text>
              <TouchableOpacity onPress={() => router.push('/progress' as any)}>
                <Text style={[styles.sectionLink, themed.sectionLink, { color: colors.primary }]}>{t.common.viewAll}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.statsGrid}>
              {quickStats.map((stat, index) => {
                const progress = Math.min((stat.value / stat.goal) * 100, 100);
                const Icon = stat.icon;

                return (
                  <View key={index} style={[styles.statCard, themed.card]}>
                    <View style={[styles.statIconContainer, { backgroundColor: stat.color + '20' }]}>
                      <Icon size={24} color={stat.color} strokeWidth={2} />
                    </View>
                    <Text style={[styles.statValue, themed.statValue]}>
                      {stat.value}
                      {stat.unit && <Text style={[styles.statUnit, themed.statUnit]}> {stat.unit}</Text>}
                    </Text>
                    <Text style={[styles.statLabel, themed.statLabel]}>{stat.label}</Text>
                    <View style={[styles.progressBar, { backgroundColor: colors.backgroundTertiary }]}>
                      <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: stat.color }]} />
                    </View>
                    <Text style={[styles.statGoal, themed.statGoal]}>{t.common.goal}: {stat.goal}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {!isGoogleFitConnected && (
          <View style={styles.section}>
            <TouchableOpacity
              style={[styles.googleFitCard, { shadowColor: colors.cardShadow }]}
              activeOpacity={0.8}
              onPress={connectGoogleFit}
            >
              <LinearGradient
                colors={colors.gradient.primary as unknown as readonly [ColorValue, ColorValue, ...ColorValue[]]}
                style={styles.googleFitGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.googleFitContent}>
                  <View style={styles.googleFitIconContainer}>
                    <Link size={32} color={colors.textWhite} strokeWidth={2} />
                  </View>
                  <View style={styles.googleFitTextContainer}>
                    <Text style={[styles.googleFitTitle, themed.googleFitTitle, { color: colors.textWhite }]}>{t.home.googleFit}</Text>
                    <Text style={[styles.googleFitDescription, themed.googleFitDescription, { color: colors.textWhite }]}>
                      {t.wellness.keepTracking}
                    </Text>
                  </View>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, themed.sectionTitle]}>{t.home.quickActions}</Text>
          <View style={styles.featuresGrid}>
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <TouchableOpacity
                  key={index}
                  style={styles.featureCard}
                  activeOpacity={0.8}
                  onPress={() => router.push(feature.route as any)}
                >
                  <LinearGradient
                    colors={feature.gradient as unknown as readonly [ColorValue, ColorValue, ...ColorValue[]]}
                    style={[styles.featureGradient, { shadowColor: feature.gradient[0] }]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <View style={styles.iconCircle}>
                      <Icon size={24} color={feature.gradient[0]} strokeWidth={2.5} />
                    </View>
                    <View style={styles.featureInfo}>
                      <Text style={styles.featureLabelInside}>{feature.label}</Text>
                      <View style={styles.actionArrow}>
                        <ChevronRight size={14} color="#FFFFFF" strokeWidth={3} />
                      </View>
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, themed.sectionTitle]}>{t.home.rewardsSummary}</Text>
          <View style={[styles.rewardsCard, themed.card]}>
            <View style={styles.rewardsRow}>
              <View style={styles.rewardItem}>
                <Text style={[styles.rewardValue, themed.rewardValue, { color: colors.primary }]}>{rewardsPoints}</Text>
                <Text style={[styles.rewardLabel, themed.rewardLabel]}>{t.home.points}</Text>
              </View>
              <View style={[styles.rewardDivider, { backgroundColor: colors.border }]} />
              <View style={styles.rewardItem}>
                <Text style={[styles.rewardValue, themed.rewardValue, { color: colors.primary }]}>{streak}</Text>
                <Text style={[styles.rewardLabel, themed.rewardLabel]}>{t.home.streak}</Text>
              </View>
              <View style={[styles.rewardDivider, { backgroundColor: colors.border }]} />
              <View style={styles.rewardItem}>
                <Text style={[styles.rewardValue, themed.rewardValue, { color: colors.primary }]}>3</Text>
                <Text style={[styles.rewardLabel, themed.rewardLabel]}>{t.home.badges}</Text>
              </View>
            </View>
            <TouchableOpacity
              style={[styles.rewardsButton, { backgroundColor: colors.primary }]}
              onPress={() => router.push('/(tabs)/rewards' as any)}
            >
              <Text style={[styles.rewardsButtonText, { color: colors.textWhite, fontSize: scale(14) }]}>{t.home.viewRewards}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, themed.sectionTitle]}>{t.home.healthTips}</Text>
          <View style={[styles.tipCard, themed.card]}>
            <TrendingUp size={24} color={colors.primary} strokeWidth={2} />
            <View style={styles.tipContent}>
              <Text style={[styles.tipTitle, themed.tipTitle]}>{t.home.tipStayHydrated}</Text>
              <Text style={[styles.tipDescription, themed.tipDescription]}>
                {t.home.tipStayHydratedDesc}
              </Text>
            </View>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 30,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  greeting: {
    fontWeight: '700' as const,
  },
  subtitle: {
    marginTop: 4,
  },
  googleFitCard: {
    marginHorizontal: 0,
    borderRadius: 20,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  googleFitGradient: {
    padding: 24,
  },
  googleFitContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  googleFitIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  googleFitTextContainer: {
    flex: 1,
  },
  googleFitTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#ffffff',
    marginBottom: 8,
  },
  googleFitDescription: {
    fontSize: 14,
    color: '#ffffff',
    opacity: 0.9,
    lineHeight: 20,
  },
  riskCard: {
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 20,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  riskGradient: {
    padding: 24,
  },
  riskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  riskBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  riskBadgeText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: '#ffffff',
  },
  riskScore: {
    fontSize: 48,
    fontWeight: '700' as const,
    color: '#ffffff',
    marginBottom: 4,
  },
  riskLabel: {
    fontSize: 16,
    color: '#ffffff',
    opacity: 0.9,
    marginBottom: 12,
  },
  riskDescription: {
    fontSize: 14,
    color: '#ffffff',
    opacity: 0.8,
    lineHeight: 20,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontWeight: '700' as const,
  },
  sectionLink: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#007AFF', // Use a default since this is static, or can be dynamic via themed
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  statCard: {
    width: CARD_WIDTH,
    borderRadius: 16,
    padding: 16,
    margin: 6,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontWeight: '700' as const,
    marginBottom: 4,
  },
  statUnit: {
    fontWeight: '400' as const,
  },
  statLabel: {
    marginBottom: 12,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  statGoal: {
    fontSize: 12,
    color: '#95A5A6',
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
  },
  featureCard: {
    width: (width - 56) / 2,
    margin: 8,
    borderRadius: 24,
    overflow: 'hidden',
  },
  featureGradient: {
    padding: 20,
    aspectRatio: 1,
    justifyContent: 'space-between',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  featureInfo: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  featureLabelInside: {
    fontSize: 15,
    fontWeight: '800' as const,
    color: '#FFFFFF',
    flex: 1,
    marginRight: 8,
    letterSpacing: -0.2,
  },
  actionArrow: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rewardsCard: {
    borderRadius: 16,
    padding: 20,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  rewardsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  rewardItem: {
    alignItems: 'center',
  },
  rewardValue: {
    fontSize: 28,
    fontWeight: '700' as const,
    marginBottom: 4,
  },
  rewardLabel: {
    fontSize: 14,
  },
  rewardDivider: {
    width: 1,
  },
  rewardsButton: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  rewardsButtonText: {
    fontSize: 14,
    fontWeight: '700' as const,
  },
  tipCard: {
    flexDirection: 'row',
    borderRadius: 16,
    padding: 16,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  tipContent: {
    flex: 1,
    marginLeft: 16,
  },
  tipTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    marginBottom: 4,
  },
  tipDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
});
