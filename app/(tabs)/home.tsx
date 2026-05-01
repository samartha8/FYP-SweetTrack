import { useState, useCallback, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, ColorValue, Platform, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Heart, Brain, Activity, Droplet, Moon, Flame, TrendingUp, UtensilsCrossed, Camera, BarChart3, List, Link, ChevronRight, ShieldCheck, Zap, LayoutGrid, Trophy, Medal, Sparkles } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from '@/hooks/use-translation';
import { useUser } from '@/contexts/UserContext';
import { useMealTracking } from '@/contexts/MealTrackingContext';
import { DIABETES_URL } from '../../constants/Api';
import { useTheme } from '@/contexts/SettingsContext';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 60) / 2;

// Persistent throttle ref across mounts
let globalLastFetch = 0;

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, healthMetrics, dailyGoals, rewardsPoints, streak, unlockedBadges = [], isGoogleFitConnected, connectGoogleFit, ensureAccessToken, syncGoogleFitData, syncRewards } = useUser();
  const { todayNutrition, activeDietDetails } = useMealTracking();
  const { colors, scale, ms, wp, hp } = useTheme(); // Global Theme Hook
  const { t } = useTranslation();
  const [predictionData, setPredictionData] = useState({
    riskScore: 0,
    riskLevel: 'Low Risk',
    hasHistory: false,
    inputData: null as any,
    insights: [] as string[]
  });
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Dynamic Styles
  const themed = useMemo(() => ({
    container: { flex: 1 },
    header: { backgroundColor: 'transparent' },
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
    riskLabel: { color: colors.textWhite, fontSize: scale(18) },
    riskDescription: { color: colors.textWhite, fontSize: scale(14) },
    sectionLink: { fontSize: scale(14) },
    riskHeader: { marginBottom: scale(12) },
    rewardItem: { alignItems: 'center' as const },
    rewardDivider: { width: 1, height: scale(40), marginHorizontal: scale(5) },
    googleFitTitle: { fontSize: scale(20) },
    googleFitDescription: { fontSize: scale(14) },
    statGoal: { fontSize: scale(12), color: colors.textSecondary },
    // 📱 Responsive Layout
    padL: ms(20),
    padM: ms(16),
    padS: ms(12),
    cardGap: ms(12),
    iconS: ms(24),
    iconM: ms(40),
  }), [colors, scale, ms, wp, hp, width]);

  const getHealthVal = useCallback((userObj: any, key: string, fallbackKey?: string) => {
    if (!userObj) return undefined;
    if (userObj[key] !== undefined) return userObj[key];
    if (userObj.healthData && userObj.healthData[key] !== undefined) return userObj.healthData[key];
    if (fallbackKey) {
      if (userObj[fallbackKey] !== undefined) return userObj[fallbackKey];
      if (userObj.healthData && userObj.healthData[fallbackKey] !== undefined) return userObj.healthData[fallbackKey];
    }
    return undefined;
  }, []);

  const currentHealth = useMemo(() => {
    if (!user) return null;
    const anyUser = user as any;
    return {
      age: Number(getHealthVal(anyUser, 'age') || 5),
      sex: Number(getHealthVal(anyUser, 'sex') || 0),
      bmi: Number(getHealthVal(anyUser, 'bmi') || 0),
      highBP: Number(getHealthVal(anyUser, 'highBP') || 0),
      highChol: Number(getHealthVal(anyUser, 'highChol') || 0),
      smoker: Number(getHealthVal(anyUser, 'smoker') || 0),
      physActivity: Number(getHealthVal(anyUser, 'physActivity') || 0),
      genHlth: Number(getHealthVal(anyUser, 'genHlth') || 3),
      heartDiseaseOrAttack: Number(getHealthVal(anyUser, 'heartDiseaseOrAttack', 'heartDisease') || 0),
      pregnancies: Number(getHealthVal(anyUser, 'pregnancies') || 0),
      height: Number(getHealthVal(anyUser, 'height') || 0),
      weight: Number(getHealthVal(anyUser, 'weight') || 0),
    };
  }, [user, getHealthVal]);

  const isUnchanged = useMemo(() => {
    if (!predictionData.inputData || !currentHealth) return false;

    const isSame = (val1: any, val2: any) => {
      const n1 = (val1 === undefined || val1 === null) ? 0 : Number(val1);
      const n2 = (val2 === undefined || val2 === null) ? 0 : Number(val2);
      return Math.abs(n1 - n2) < 0.001;
    };

    const prevData = predictionData.inputData || {} as any;

    return (
      isSame(currentHealth.bmi, prevData.bmi) &&
      isSame(currentHealth.age, prevData.age) &&
      isSame(currentHealth.sex, prevData.sex) &&
      isSame(currentHealth.highBP, prevData.highBP) &&
      isSame(currentHealth.highChol, prevData.highChol) &&
      isSame(currentHealth.smoker, prevData.smoker) &&
      isSame(currentHealth.physActivity, prevData.physActivity) &&
      isSame(currentHealth.genHlth, prevData.genHlth) &&
      isSame(currentHealth.heartDiseaseOrAttack, prevData.heartDiseaseOrAttack ?? prevData.heartDisease) &&
      isSame(currentHealth.pregnancies, prevData.pregnancies) &&
      isSame(currentHealth.height, prevData.height ?? currentHealth.height) &&
      isSame(currentHealth.weight, prevData.weight ?? currentHealth.weight)
    );
  }, [predictionData.inputData, currentHealth]);

  const isFetchingRef = useRef(false);

  useFocusEffect(
    useCallback(() => {
      const now = Date.now();
      if (isFetchingRef.current || (now - globalLastFetch < 60000 && isUnchanged)) {
        syncGoogleFitData();
        syncRewards();
        return;
      }

      syncGoogleFitData();
      syncRewards();

      const fetchPredictionPrev = async (retryLimit = 1): Promise<void> => {
        try {
          if (!user) return;
          isFetchingRef.current = true;

          let token = await ensureAccessToken();
          if (!token) {
            isFetchingRef.current = false;
            return;
          }

          if (__DEV__) console.log(`🏠 [Home] Fetching latest prediction preview (Attempt: ${2 - retryLimit})...`);

          if (retryLimit === 1) globalLastFetch = now;

          const response = await fetch(`${DIABETES_URL}/latest?t=${now}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });

          if (response.status === 401 && retryLimit > 0) {
            if (__DEV__) console.warn("🏠 [Home] 401 Unauthorized - forcing token refresh and retrying...");
            token = await ensureAccessToken(true);
            if (token) {
              return fetchPredictionPrev(retryLimit - 1);
            }
          }

          if (!response.ok) {
            if (__DEV__) console.warn(`🏠 [Home] Fetch failed with status ${response.status}`);
            return;
          }

          const json = await response.json();
          if (json.success && json.hasHistory) {
            setPredictionData({
              riskScore: json.riskScore,
              riskLevel: json.riskLevel,
              hasHistory: true,
              inputData: json.inputData,
              insights: json.insights || []
            });
            globalLastFetch = Date.now();
          }
        } catch (e) {
          console.log('Failed to fetch prediction preview', e);
        } finally {
          isFetchingRef.current = false;
        }
      };

      fetchPredictionPrev();
    }, [user?.id, user?.email, ensureAccessToken, syncGoogleFitData])
  );

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await Promise.all([
      syncGoogleFitData(),
      (() => { globalLastFetch = 0; return Promise.resolve(); })()
    ]);
    setIsRefreshing(false);
  }, [syncGoogleFitData]);

  const { riskScore, riskLevel } = predictionData;
  const riskColor = riskLevel === 'High Risk' ? colors.risk.high : riskLevel === 'Medium Risk' ? colors.risk.moderate : colors.risk.low;

  const quickStats = [
    { icon: Activity, label: t.wellness.steps, value: healthMetrics.steps, goal: dailyGoals.steps, unit: '', color: colors.chart.bmi },
    { icon: Droplet, label: t.wellness.water, value: healthMetrics.water, goal: dailyGoals.water, unit: t.wellness.unitWater, color: colors.secondary },
    { icon: Moon, label: t.wellness.sleep, value: healthMetrics.sleep, goal: dailyGoals.sleep, unit: t.wellness.unitSleep, color: colors.chart.glucose },
    { icon: Flame, label: t.wellness.calories, value: Math.round(todayNutrition.calories || 0), goal: activeDietDetails?.dailyCalorieTarget || dailyGoals.calories, unit: t.wellness.unitCalories, color: colors.warning },
  ];

  const features = [
    { icon: UtensilsCrossed, label: t.home.dietSuggestion, route: '/diet-suggestions', gradient: ['#10B981', '#059669'] }, // Emerald
    { icon: Camera, label: t.home.mealLog, route: '/meal-log', gradient: ['#F59E0B', '#D97706'] }, // Amber
    { icon: BarChart3, label: t.home.progress, route: '/progress', gradient: ['#3B82F6', '#2563EB'] }, // Royal Blue
    { icon: LayoutGrid, label: t.mealDashboard.header, route: '/view-all-meals', gradient: ['#8B5CF6', '#6D28D9'] }, // Purple
  ];

  return (
    <LinearGradient
      colors={['#DCFCE7', '#F0FDF4', '#FFFFFF']} // Emerald 100 -> Green 50 -> White (Wellness Gradient)
      style={[styles.container, { paddingTop: insets.top }]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        <View style={[styles.header, themed.header]}>
          <View>
            <Text style={[styles.greeting, themed.greeting]}>
              {t.home.greeting}, {user?.name ? user.name : 'User'}!
            </Text>
            <Text style={[styles.subtitle, themed.subtitle]}>{t.home.subtitle}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.riskCard, { shadowColor: colors.cardShadow }]}
          activeOpacity={0.8}
          onPress={() => router.push('/prediction' as any)}
        >
          <LinearGradient
            colors={[riskColor, riskColor + 'C0'] as any}
            style={styles.riskGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.riskHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Brain size={themed.iconS} color={colors.textWhite} strokeWidth={2.5} />
                <Text style={[themed.riskLabel, { marginBottom: 0, fontSize: scale(11), fontWeight: '900', letterSpacing: 1.5, color: colors.textWhite, textTransform: 'uppercase', opacity: 0.9 }]}>
                  SweetTrack AI Analysis
                </Text>
              </View>
              {!isUnchanged && (
                <View style={[styles.riskBadge, { backgroundColor: 'rgba(255,255,255,0.3)', paddingHorizontal: 12 }]}>
                  <Text style={[styles.riskBadgeText, { color: '#ffffff', fontWeight: '800' }]}>
                    {t.prediction?.outdated || "OUTDATED"}
                  </Text>
                </View>
              )}
            </View>

            <View style={{ marginTop: 16, marginBottom: 8 }}>
              <Text style={[styles.riskScore, themed.riskScore, { fontSize: scale(36), fontWeight: '900', color: colors.textWhite }]}>
                {riskLevel === 'High Risk' ? (t?.home?.riskPositive || "POSITIVE") : (t?.home?.riskNegative || "NEGATIVE")}
              </Text>
            </View>

            <View style={{ height: 1.5, backgroundColor: 'rgba(255,255,255,0.2)', width: '40%', marginBottom: 12 }} />

            <Text style={[styles.riskDescription, themed.riskDescription, { color: 'rgba(255,255,255,0.95)', fontSize: scale(13), lineHeight: scale(18) }]} numberOfLines={2}>
              {!isUnchanged
                ? (t.prediction?.factorsDesc || "Health metrics updated. Run new analysis for accuracy.")
                : (riskLevel === 'Low Risk' ? t.prediction?.lowRiskDesc : t.prediction?.highRiskDesc)}
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        {isGoogleFitConnected && (
          <>
            {/* 🛡️ Metabolic Synergy Widget */}
            <TouchableOpacity
              style={[styles.synergyWidget, { backgroundColor: colors.card, shadowColor: colors.cardShadow }]}
              activeOpacity={0.8}
              onPress={() => router.push('/progress-impact' as any)}
            >
              <View style={[styles.synergyIconBox, { backgroundColor: '#E8F5E9', width: themed.iconM, height: themed.iconM, borderRadius: themed.iconM / 3 }]}>
                <ShieldCheck size={themed.iconS} color="#2E7D32" />
              </View>
              <View style={styles.synergyInfo}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={[styles.synergyTitle, { color: colors.text }]}>Metabolic Synergy</Text>
                  {healthMetrics.steps >= 8000 && (
                    <View style={styles.activeMitigationBadge}>
                      <Zap size={10} color="#FFF" />
                      <Text style={styles.activeMitigationText}>ACTIVE</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.synergyDesc, { color: colors.textSecondary }]}>
                  {healthMetrics.steps >= 8000
                    ? "Steps threshold met! Mitigating risk by 7.5%."
                    : "Reach 8,000 steps to activate metabolic synergy."}
                </Text>
              </View>
              <ChevronRight size={20} color={colors.textLight} />
            </TouchableOpacity>

            {/* 📋 Daily Metabolic Recap Entry */}
            <TouchableOpacity
              style={[styles.synergyWidget, { backgroundColor: colors.card, shadowColor: colors.cardShadow, marginTop: 12 }]}
              activeOpacity={0.8}
              onPress={() => router.push('/daily-recap' as any)}
            >
              <View style={[styles.synergyIconBox, { backgroundColor: colors.primary + '15' }]}>
                <BarChart3 size={24} color={colors.primary} />
              </View>
              <View style={styles.synergyInfo}>
                <Text style={[styles.synergyTitle, { color: colors.text }]}>Daily Metabolic Report</Text>
                <Text style={[styles.synergyDesc, { color: colors.textSecondary }]}>
                  View your personalized "Good vs Bad" metabolic audit.
                </Text>
              </View>
              <ChevronRight size={20} color={colors.textLight} />
            </TouchableOpacity>
          </>
        )}

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
                  <TouchableOpacity
                    key={index}
                    activeOpacity={0.8}
                    style={[styles.statCard, themed.card, { borderColor: stat.color + '15', borderWidth: 1 }]}
                  >
                    <View style={styles.statHeader}>
                      <View style={[styles.statIconContainer, { backgroundColor: stat.color + '15' }]}>
                        <Icon size={22} color={stat.color} strokeWidth={2.5} />
                      </View>
                      <View style={[styles.progressBadge, { backgroundColor: stat.color + '10' }]}>
                        <Text style={[styles.progressBadgeText, { color: stat.color }]}>
                          {Math.round(progress)}%
                        </Text>
                      </View>
                    </View>
                    <View style={styles.statBody}>
                      <Text style={[styles.statValue, themed.statValue]}>
                        {stat.value}
                        {stat.unit && <Text style={[styles.statUnit, themed.statUnit]}> {stat.unit}</Text>}
                      </Text>
                      <Text style={[styles.statLabel, themed.statLabel]}>{stat.label}</Text>
                    </View>

                    <View style={styles.statFooter}>
                      <View style={[styles.progressBar, { backgroundColor: colors.backgroundTertiary }]}>
                        <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: stat.color }]} />
                      </View>
                      <Text style={[styles.statGoal, themed.statGoal]}>{t.common.goal}: {stat.goal}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {!isGoogleFitConnected && (
          <View style={styles.section}>
            <TouchableOpacity
              style={[styles.googleFitCard, { shadowColor: colors.cardShadow, marginHorizontal: themed.padL }]}
              activeOpacity={0.8}
              onPress={connectGoogleFit}
            >
              <LinearGradient
                colors={colors.gradient.primary as any}
                style={styles.googleFitGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.googleFitContent}>
                  <View style={[styles.googleFitIconContainer, { width: themed.iconM, height: themed.iconM, borderRadius: themed.iconM / 2.5 }]}>
                    <Link size={themed.iconS} color={colors.textWhite} strokeWidth={2} />
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
                  style={[styles.featureCard, { shadowColor: feature.gradient[0] }]}
                  activeOpacity={0.9}
                  onPress={() => router.push(feature.route as any)}
                >
                  <LinearGradient
                    colors={feature.gradient as any}
                    style={styles.featureGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    {/* Decorative Background Element */}
                    <View style={styles.featureDecorator} />
                    <View style={styles.featureGlass} />

                    <View style={styles.featureHeader}>
                      <View style={styles.iconCircle}>
                        <Icon size={26} color={feature.gradient[0]} strokeWidth={2.5} />
                      </View>
                      <View style={styles.actionArrow}>
                        <ChevronRight size={16} color="#FFFFFF" strokeWidth={3} />
                      </View>
                    </View>

                    <View style={styles.featureInfo}>
                      <Text style={styles.featureLabelInside} numberOfLines={2}>
                        {feature.label}
                      </Text>
                      <View style={styles.featureStatus}>
                        <View style={styles.statusDot} />
                        <Text style={styles.statusText}>Active</Text>
                      </View>
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, themed.sectionTitle]}>{t.home.rewardsSummary}</Text>
            <Trophy size={20} color="#FF9500" />
          </View>
          <View style={[styles.rewardsCard, themed.card]}>
            <View style={styles.rewardsRow}>
              <View style={styles.rewardItem}>
                <View style={[styles.rewardIconContainer, { backgroundColor: colors.primary + '15' }]}>
                  <Medal size={20} color={colors.primary} />
                </View>
                <Text style={[styles.rewardValue, themed.rewardValue, { color: colors.primary }]}>{rewardsPoints}</Text>
                <Text style={[styles.rewardLabel, themed.rewardLabel]}>{t.home.points}</Text>
              </View>
              <View style={styles.rewardDivider} />
              <View style={styles.rewardItem}>
                <View style={[styles.rewardIconContainer, { backgroundColor: '#FF9500' + '15' }]}>
                  <Flame size={20} color="#FF9500" />
                </View>
                <Text style={[styles.rewardValue, themed.rewardValue, { color: '#FF9500' }]}>{streak}</Text>
                <Text style={[styles.rewardLabel, themed.rewardLabel]}>{t.home.streak}</Text>
              </View>
              <View style={styles.rewardDivider} />
              <View style={styles.rewardItem}>
                <View style={[styles.rewardIconContainer, { backgroundColor: '#4CAF50' + '15' }]}>
                  <ShieldCheck size={20} color="#4CAF50" />
                </View>
                <Text style={[styles.rewardValue, themed.rewardValue, { color: '#4CAF50' }]}>{unlockedBadges.length}</Text>
                <Text style={[styles.rewardLabel, themed.rewardLabel]}>{t.home.badges}</Text>
              </View>
            </View>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => router.push('/(tabs)/rewards' as any)}
            >
              <LinearGradient
                colors={['#00B4D8', '#0077B6']}
                style={styles.rewardsButton}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.rewardsButtonText}>{t.home.viewRewards}</Text>
                <ChevronRight size={16} color="#FFFFFF" strokeWidth={3} />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, themed.sectionTitle]}>{t.home.healthTips}</Text>
            <Sparkles size={20} color={colors.primary} />
          </View>
          <View style={[styles.tipCard, themed.card]}>
            <View style={styles.tipAccent} />
            <View style={styles.tipContent}>
              <View style={styles.tipHeader}>
                <View style={styles.tipIconContainer}>
                  <TrendingUp size={20} color={colors.primary} />
                </View>
                <Text style={[styles.tipTitle, themed.tipTitle]}>{t.home.tipStayHydrated}</Text>
              </View>
              <Text style={[styles.tipDescription, themed.tipDescription]}>{t.home.tipStayHydratedDesc}</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </LinearGradient>
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
    ...Platform.select({
      web: { boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.2)' },
      native: {
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 6,
      }
    }),
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
    ...Platform.select({
      web: { boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.2)' },
      native: {
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 6,
      }
    }),
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
    gap: 12,
    justifyContent: 'space-between',
  },
  statCard: {
    width: CARD_WIDTH,
    borderRadius: 20,
    padding: 16,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
    flexDirection: 'column',
    justifyContent: 'space-between',
    minHeight: 165,
  },
  statHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  progressBadgeText: {
    fontSize: 12,
    fontWeight: '800' as const,
  },
  statBody: {
    flex: 1,
    justifyContent: 'flex-start',
    marginTop: 4,
  },
  statValue: {
    fontWeight: '800' as const,
    fontSize: 28,
  },
  statUnit: {
    fontWeight: '600' as const,
    fontSize: 14,
    opacity: 0.6,
  },
  statLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    opacity: 0.7,
    marginTop: 2,
  },
  statFooter: {
    marginTop: 12,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  statGoal: {
    fontSize: 12,
    fontWeight: '600' as const,
    opacity: 0.5,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
  },
  featureCard: {
    width: (width - 56) / 2,
    margin: 8,
    borderRadius: 28,
    overflow: 'hidden',
    ...Platform.select({
      web: { boxShadow: '0px 8px 20px rgba(0, 0, 0, 0.15)' },
      native: {
        elevation: 10,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
      }
    }),
  },
  featureGradient: {
    padding: 22,
    aspectRatio: 1,
    justifyContent: 'space-between',
    position: 'relative',
  },
  featureDecorator: {
    position: 'absolute',
    top: -20,
    right: -20,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  featureGlass: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '40%',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderBottomLeftRadius: 100,
    borderBottomRightRadius: 100,
    transform: [{ scaleX: 2 }],
  },
  featureHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      web: { boxShadow: '0px 4px 10px rgba(0, 0, 0, 0.1)' },
      native: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
        elevation: 4,
      }
    }),
  },
  featureInfo: {
    gap: 6,
  },
  featureLabelInside: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    lineHeight: 22,
  },
  featureStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    opacity: 0.8,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  actionArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rewardsCard: {
    padding: 24,
    borderRadius: 24,
    marginBottom: 24,
    ...Platform.select({
      web: { boxShadow: '0px 4px 15px rgba(0, 0, 0, 0.05)' },
      native: {
        elevation: 3,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
      }
    }),
  },
  rewardsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  rewardItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  rewardIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  rewardDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  rewardValue: {
    fontSize: 22,
    fontWeight: '900',
  },
  rewardLabel: {
    fontSize: 12,
    fontWeight: '600',
    opacity: 0.7,
  },
  rewardsButton: {
    height: 52,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    ...Platform.select({
      web: { boxShadow: '0px 4px 12px rgba(0, 180, 216, 0.3)' },
      native: {
        elevation: 4,
        shadowColor: '#00B4D8',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      }
    }),
  },
  rewardsButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  tipCard: {
    padding: 20,
    borderRadius: 24,
    marginBottom: 80,
    flexDirection: 'row',
    overflow: 'hidden',
    ...Platform.select({
      web: { boxShadow: '0px 4px 15px rgba(0, 0, 0, 0.05)' },
      native: {
        elevation: 3,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
      }
    }),
  },
  tipAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 6,
    backgroundColor: '#00B4D8',
  },
  tipContent: {
    flex: 1,
  },
  tipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  tipIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#00B4D8' + '10',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  tipDescription: {
    fontSize: 14,
    lineHeight: 22,
    opacity: 0.8,
  },
  // --- 🛡️ Synergy Widget Styles ---
  synergyWidget: {
    marginHorizontal: 20,
    marginTop: 16,
    padding: 16,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    ...Platform.select({
      web: {
        boxShadow: '0px 2px 5px rgba(0, 0, 0, 0.1)',
      },
      native: {
        elevation: 2,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 5,
      },
    }),
  },
  synergyIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  synergyInfo: {
    flex: 1,
    marginLeft: 16,
    marginRight: 8,
  },
  synergyTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  synergyDesc: {
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500',
  },
  activeMitigationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2E7D32',

    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 2
  },
  activeMitigationText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: '900'
  },
});
