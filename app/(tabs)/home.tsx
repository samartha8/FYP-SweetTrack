import { secureFetch as fetch } from '@/lib/apiClient';
import { useState, useCallback, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, ColorValue, Platform, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Heart, Brain, Activity, Droplet, Moon, Flame, TrendingUp, UtensilsCrossed, Camera, BarChart3, List, Link, ChevronRight, ShieldCheck, Zap, LayoutGrid, Trophy, Medal, Sparkles } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from '@/hooks/use-translation';
import { useAuth } from '@/contexts/AuthContext';
import { useHealth } from '@/contexts/HealthContext';;
import { useMealTracking } from '@/contexts/MealTrackingContext';
import { DIABETES_URL } from '../../constants/Api';
import { useTheme } from '@/contexts/SettingsContext';

const { width } = Dimensions.get('window');

// Persistent throttle ref across mounts
let globalLastFetch = 0;

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, hasOnboarded, isLoading, ensureAccessToken } = useAuth();
  const { 
    healthMetrics, dailyGoals, rewardsPoints, streak, 
    fetchDailyMetrics, setWater, isGoogleFitConnected, 
    riskStatus, riskProbability, unlockedBadges, syncRewards,
    connectGoogleFit, syncGoogleFitData
  } = useHealth();
  if (__DEV__) console.log("🏠 [Home] isGoogleFitConnected:", isGoogleFitConnected);
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
      bloodGlucoseEstimated: Number(getHealthVal(anyUser, 'bloodGlucoseEstimated', 'glucose') || 0),
      hba1cEstimated: Number(getHealthVal(anyUser, 'hba1cEstimated', 'hba1c') || 0),
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
      isSame(currentHealth.weight, prevData.weight ?? currentHealth.weight) &&
      isSame(currentHealth.bloodGlucoseEstimated, prevData.bloodGlucoseEstimated ?? prevData.glucose) &&
      isSame(currentHealth.hba1cEstimated, prevData.hba1cEstimated ?? prevData.hba1c)
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
            headers: { 
              'Authorization': `Bearer ${token}`,
              'Accept': 'application/json',
              'ngrok-skip-browser-warning': 'true'
            }
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

  const features = [
    { icon: UtensilsCrossed, label: t.home.dietSuggestion, route: '/diet-suggestions', gradient: ['#10B981', '#059669'] }, // Emerald Green
    { icon: Camera, label: t.home.mealLog, route: '/meal-log', gradient: ['#F59E0B', '#D97706'] }, // Amber Orange
    { icon: BarChart3, label: t.home.progress, route: '/progress', gradient: ['#3B82F6', '#2563EB'] }, // Bright Blue
    { icon: LayoutGrid, label: t.mealDashboard.header, route: '/view-all-meals', gradient: ['#8B5CF6', '#7C3AED'] }, // Modern Purple
  ];

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#F8FAFC', '#F1F5F9', '#E2E8F0']} // Premium 'Studio' Gradient
        style={[StyleSheet.absoluteFill]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 20 }]}
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
        <View style={styles.header}>
          <View>
            <Text style={[styles.greeting, { color: '#1E293B', fontWeight: '800', letterSpacing: -0.5 }]}>
              {t.home.greeting}, {user?.name ? user.name : 'User'}!
            </Text>
            <Text style={[styles.subtitle, { color: '#64748B', fontWeight: '500' }]}>{t.home.subtitle}</Text>
          </View>
          <TouchableOpacity style={styles.profileButton}>
             <LinearGradient
              colors={['#10B981', '#059669']}
              style={styles.profileGradient}
            >
              <Text style={styles.profileInitial}>{(user?.name || 'U').charAt(0).toUpperCase()}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.riskCardContainer}
          activeOpacity={0.9}
          onPress={() => router.push('/prediction' as any)}
        >
          <LinearGradient
            colors={riskLevel === 'High Risk' ? ['#FF4D4D', '#F43F5E'] : ['#10B981', '#059669']}
            style={styles.riskCardGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.riskCardGlass} />
            <View style={styles.riskCardHeader}>
              <View style={styles.aiBadge}>
                <Sparkles size={12} color="#FFF" />
                <Text style={styles.aiBadgeText}>CLINICAL AI ANALYSIS</Text>
              </View>
              {!isUnchanged && (
                <View style={styles.updateBadge}>
                  <Text style={styles.updateBadgeText}>REFRESH NEEDED</Text>
                </View>
              )}
            </View>

            <View style={styles.riskMainContent}>
              <View style={styles.riskScoreWrapper}>
                <Text style={styles.riskScoreTitle}>
                  {riskLevel === 'High Risk' ? 'DIABETIC PROFILE' : 'HEALTHY PROFILE'}
                </Text>
                <Text style={styles.riskScoreValue}>
                  {riskLevel === 'High Risk' ? (t?.home?.riskPositive || "POSITIVE") : (t?.home?.riskNegative || "NEGATIVE")}
                </Text>
              </View>
              <View style={styles.riskIconContainer}>
                 <Brain size={48} color="rgba(255,255,255,0.4)" strokeWidth={1.5} />
              </View>
            </View>

            <View style={styles.riskFooter}>
              <Text style={styles.riskFooterText}>
                {!isUnchanged
                  ? "Biometrics updated. Run a fresh scan for precise results."
                  : (riskLevel === 'Low Risk' ? t.prediction?.lowRiskDesc : t.prediction?.highRiskDesc)}
              </Text>
              <ChevronRight size={20} color="rgba(255,255,255,0.8)" />
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {isGoogleFitConnected && (
          <View style={styles.synergyContainer}>
             <TouchableOpacity
              style={styles.synergyCard}
              activeOpacity={0.8}
              onPress={() => router.push('/progress-impact' as any)}
            >
              <View style={[styles.synergyIcon, { backgroundColor: '#F0FDF4' }]}>
                <ShieldCheck size={24} color="#10B981" />
              </View>
              <View style={styles.synergyText}>
                <Text style={styles.synergyTitleText}>Metabolic Mitigation</Text>
                <Text style={styles.synergyDescText}>
                  {healthMetrics.steps >= 8000
                    ? "Active: Reducing diabetic risk factors."
                    : "Walk 8k steps to activate protection."}
                </Text>
              </View>
              <View style={styles.synergyStatus}>
                <View style={[styles.statusIndicator, { backgroundColor: healthMetrics.steps >= 8000 ? '#10B981' : '#CBD5E1' }]} />
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* Metabolic Pulse Section (Gated by Google Fit) */}
        {!isGoogleFitConnected ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionHeading}>Metabolic Pulse</Text>
            </View>
            <TouchableOpacity 
              activeOpacity={0.9} 
              onPress={connectGoogleFit}
              style={styles.connectPromoCard}
            >
              <LinearGradient 
                colors={['#00B4D8', '#0077B6']} 
                style={styles.connectPromoGradient}
                start={{x:0, y:0}} end={{x:1, y:1}}
              >
                <View style={styles.promoContent}>
                  <View style={styles.promoIconCircle}>
                    <Link size={24} color="#00B4D8" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.promoTitle}>Unlock Real-time Metrics</Text>
                    <Text style={styles.promoDesc}>Connect Google Fit to sync your steps, sleep, and metabolic activity automatically.</Text>
                  </View>
                  <ChevronRight size={20} color="#FFF" />
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionHeading}>Metabolic Pulse</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/wellness' as any)}>
                <Text style={styles.viewMoreText}>{t.common.viewAll}</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.pulseGrid}>
              {[
                { label: 'Steps', value: healthMetrics.steps, goal: dailyGoals.steps, icon: Activity, colors: ['#FFB700', '#FF8E00'], unit: 'steps' },
                { label: 'Calories', value: Math.round(todayNutrition.calories || 0), goal: dailyGoals.calories, icon: Flame, colors: ['#FF512F', '#DD2476'], unit: 'kcal' },
                { label: 'Sleep', value: healthMetrics.sleep, goal: dailyGoals.sleep, icon: Moon, colors: ['#8E2DE2', '#4A00E0'], unit: 'hrs' },
                { label: 'Water', value: healthMetrics.water, goal: dailyGoals.water, icon: Droplet, colors: ['#00B4DB', '#0083B0'], unit: 'gls' },
              ].map((item, idx) => {
                const progress = Math.min((item.value / (item.goal || 1)) * 100, 100);
                return (
                  <View key={idx} style={styles.pulseCard}>
                    <LinearGradient colors={item.colors as any} style={styles.pulseGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                      <View style={styles.pulseIconBox}>
                        <item.icon size={18} color="#FFF" />
                      </View>
                      <Text style={styles.pulseValue}>{item.value}</Text>
                      <Text style={styles.pulseLabel}>{item.label}</Text>
                      <View style={styles.pulseProgressBar}>
                        <View style={[styles.pulseProgressFill, { width: `${progress}%` }]} />
                      </View>
                    </LinearGradient>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Daily Bio-Insight Section (Gated) */}
        <View style={styles.section}>
          <Text style={styles.sectionHeading}>Daily Bio-Insight</Text>
          {!isGoogleFitConnected ? (
            <View style={[styles.reportCard, { backgroundColor: '#F8FAFC', paddingVertical: 30 }]}>
               <View style={{ alignItems: 'center', opacity: 0.6 }}>
                  <ShieldCheck size={40} color="#94A3B8" strokeWidth={1.5} />
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#64748B', marginTop: 10 }}>Analysis Locked</Text>
                  <Text style={{ fontSize: 12, color: '#94A3B8', marginTop: 4 }}>Sync health data to unlock insights</Text>
               </View>
            </View>
          ) : (
            <View style={styles.reportCard}>
              <LinearGradient
                colors={['#FFFFFF', '#F8FAFC']}
                style={styles.reportGradient}
              >
                <View style={styles.reportHeader}>
                  <View style={[styles.reportIconBox, { backgroundColor: '#10B981' + '15' }]}>
                    <BarChart3 size={24} color="#10B981" />
                  </View>
                  <View style={styles.reportHeaderText}>
                    <Text style={styles.reportTitle}>Clinical Daily Summary</Text>
                    <Text style={styles.reportDate}>{new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</Text>
                  </View>
                </View>
                
                <View style={styles.reportDivider} />
                
                <View style={styles.reportGrid}>
                  <View style={styles.reportItem}>
                    <Text style={styles.reportItemVal}>{healthMetrics.steps >= dailyGoals.steps ? 'Optimal' : 'Active'}</Text>
                    <Text style={styles.reportItemLabel}>Activity Level</Text>
                  </View>
                  <View style={styles.reportItem}>
                    <Text style={styles.reportItemVal}>{todayNutrition.calories > 0 ? (todayNutrition.calories < 2500 ? 'Stable' : 'Elevated') : 'Awaiting Data'}</Text>
                    <Text style={styles.reportItemLabel}>Metabolic Load</Text>
                  </View>
                  <View style={styles.reportItem}>
                    <Text style={styles.reportItemVal}>{healthMetrics.water >= 6 ? 'Hydrated' : 'Low'}</Text>
                    <Text style={styles.reportItemLabel}>Hydration</Text>
                  </View>
                </View>

                <TouchableOpacity 
                  style={styles.reportAction}
                  onPress={() => router.push('/daily-report' as any)}
                >
                  <Text style={styles.reportActionText}>View Detailed Bio-Analysis</Text>
                  <ChevronRight size={18} color="#10B981" />
                </TouchableOpacity>
              </LinearGradient>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionHeading}>{t.home.quickActions}</Text>
          <View style={styles.grid}>
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <TouchableOpacity
                  key={index}
                  style={styles.gridCard}
                  activeOpacity={0.9}
                  onPress={() => router.push(feature.route as any)}
                >
                  <LinearGradient
                    colors={feature.gradient as any}
                    style={styles.gridGradient}
                  >
                    <View style={styles.gridGlass} />
                    <View style={styles.gridIconBox}>
                      <Icon size={24} color="#FFF" strokeWidth={2.5} />
                    </View>
                    <Text style={styles.gridLabel}>{feature.label}</Text>
                    <View style={styles.gridFooter}>
                       <View style={styles.activeDot} />
                       <Text style={styles.activeText}>OPTIMIZED</Text>
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.rewardSectionHeader}>
             <Text style={styles.sectionHeading}>{t.home.rewardsSummary}</Text>
             <TouchableOpacity onPress={() => router.push('/(tabs)/rewards' as any)}>
                <Text style={styles.viewMoreText}>{t.common.viewAll}</Text>
             </TouchableOpacity>
          </View>
          <View style={styles.rewardsPlate}>
            <View style={styles.rewardStat}>
               <Trophy size={20} color="#F59E0B" />
               <Text style={styles.rewardStatVal}>{rewardsPoints}</Text>
               <Text style={styles.rewardStatLabel}>{t.home.points}</Text>
            </View>
            <View style={styles.rewardStatDivider} />
            <View style={styles.rewardStat}>
               <Zap size={20} color="#F43F5E" />
               <Text style={styles.rewardStatVal}>{streak}</Text>
               <Text style={styles.rewardStatLabel}>{t.home.streak}</Text>
            </View>
            <View style={styles.rewardStatDivider} />
            <View style={styles.rewardStat}>
               <Sparkles size={20} color="#8B5CF6" />
               <Text style={styles.rewardStatVal}>{unlockedBadges?.length || 0}</Text>
               <Text style={styles.rewardStatLabel}>{t.home.badges}</Text>
            </View>
          </View>
        </View>

        <View style={[styles.section, { marginBottom: 40 }]}>
           <Text style={styles.sectionHeading}>{t.home.healthTips}</Text>
           <View style={styles.tipBox}>
              <LinearGradient
                colors={['#FFFFFF', '#F8FAFC']}
                style={styles.tipGradient}
              >
                <View style={styles.tipIconBox}>
                   <Sparkles size={20} color="#10B981" />
                </View>
                <View style={styles.tipTextContent}>
                  <Text style={styles.tipTitleText}>{t.home.tipStayHydrated}</Text>
                  <Text style={styles.tipDescText}>{t.home.tipStayHydratedDesc}</Text>
                </View>
              </LinearGradient>
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
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  greeting: {
    fontSize: 28,
  },
  subtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  profileButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  profileGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInitial: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '700',
  },
  riskCardContainer: {
    marginHorizontal: 24,
    borderRadius: 32,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#F43F5E',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
  },
  riskCardGradient: {
    padding: 28,
    minHeight: 220,
    justifyContent: 'space-between',
  },
  riskCardGlass: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  riskCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  aiBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  updateBadge: {
    backgroundColor: '#FFF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  updateBadgeText: {
    color: '#F43F5E',
    fontSize: 9,
    fontWeight: '900',
  },
  riskMainContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 20,
  },
  riskScoreWrapper: {
    flex: 1,
  },
  riskScoreTitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  riskScoreValue: {
    color: '#FFF',
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  riskIconContainer: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  riskFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0,0,0,0.1)',
    marginHorizontal: -28,
    marginBottom: -28,
    paddingHorizontal: 28,
    paddingVertical: 16,
  },
  riskFooterText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
    marginRight: 12,
  },
  synergyContainer: {
    paddingHorizontal: 24,
    marginTop: 20,
  },
  synergyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 24,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
  },
  synergyIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  synergyText: {
    flex: 1,
  },
  synergyTitleText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 2,
  },
  synergyDescText: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
  },
  synergyStatus: {
    marginLeft: 12,
  },
  statusIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  connectCard: {
    marginHorizontal: 24,
    marginTop: 20,
    borderRadius: 24,
    overflow: 'hidden',
  },
  connectGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  connectIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  connectInfo: {
    flex: 1,
  },
  connectTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  connectSubtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
  },
  connectAction: {
    backgroundColor: '#FFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  connectActionText: {
    color: '#2563EB',
    fontSize: 11,
    fontWeight: '900',
  },
  section: {
    marginTop: 32,
    paddingHorizontal: 24,
  },
  sectionHeading: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 16,
  },
  gridCard: {
    width: (width - 64) / 2,
    height: (width - 64) / 2,
    borderRadius: 28,
    overflow: 'hidden',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  gridGradient: {
    flex: 1,
    padding: 20,
    justifyContent: 'space-between',
  },
  gridGlass: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  gridIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridLabel: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 22,
    letterSpacing: -0.5,
  },
  gridFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFF',
    opacity: 0.8,
  },
  activeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
    opacity: 0.8,
  },
  rewardSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  viewMoreText: {
    color: '#10B981',
    fontWeight: '700',
    fontSize: 14,
    marginBottom: 16,
  },
  rewardsPlate: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 28,
    padding: 24,
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
  },
  rewardStat: {
    alignItems: 'center',
    flex: 1,
  },
  rewardStatVal: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1E293B',
    marginVertical: 4,
  },
  rewardStatLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  rewardStatDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#E2E8F0',
  },
  tipBox: {
    borderRadius: 28,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
  },
  tipGradient: {
    flexDirection: 'row',
    padding: 20,
    alignItems: 'center',
  },
  tipIconBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  tipTextContent: {
    flex: 1,
  },
  tipTitleText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
  },
  tipDescText: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  pulseContainer: {
    paddingRight: 24,
    paddingBottom: 8,
  },
  pulseGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
  },
  pulseCard: {
    width: (width - 48 - 12) / 2, // 24 padding each side + 12 gap
    height: 145,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#FFF',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
  },
  pulseGradient: {
    flex: 1,
    padding: 20,
    justifyContent: 'space-between',
  },
  pulseIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseValue: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFF',
    letterSpacing: -1,
  },
  pulseLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.9)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  pulseProgressBar: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
    marginTop: 8,
    overflow: 'hidden',
  },
  pulseProgressFill: {
    height: '100%',
    backgroundColor: '#FFF',
    borderRadius: 2,
  },
  reportCard: {
    borderRadius: 32,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 15,
  },
  reportGradient: {
    padding: 24,
  },
  reportHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  reportIconBox: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportHeaderText: {
    flex: 1,
  },
  reportTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1E293B',
  },
  reportDate: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 2,
  },
  reportDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 20,
  },
  reportGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  reportItem: {
    flex: 1,
  },
  reportItemVal: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E293B',
  },
  reportItemLabel: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '700',
    marginTop: 2,
    textTransform: 'uppercase',
  },
  reportAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0FDF4',
    paddingVertical: 14,
    borderRadius: 16,
    gap: 8,
  },
  reportActionText: {
    color: '#10B981',
    fontWeight: '800',
    fontSize: 14,
  },
  connectPromoCard: { borderRadius: 24, overflow: 'hidden', elevation: 8, shadowColor: '#00B4D8', shadowOpacity: 0.15, shadowRadius: 15, marginBottom: 12 },
  connectPromoGradient: { padding: 20 },
  promoContent: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  promoIconCircle: { width: 48, height: 48, borderRadius: 16, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center' },
  promoTitle: { fontSize: 16, fontWeight: '900', color: '#FFF', marginBottom: 4 },
  promoDesc: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.9)', lineHeight: 18 },
});
