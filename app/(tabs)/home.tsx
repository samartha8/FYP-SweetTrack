import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, ColorValue } from 'react-native';
import { useState, useEffect } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Heart, Activity, Droplet, Moon, Flame, TrendingUp, UtensilsCrossed, Camera, BarChart3, List, Link } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '@/constants/colors';
import { useUser } from '@/contexts/UserContext';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 60) / 2;

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, healthMetrics, dailyGoals, rewardsPoints, streak, isGoogleFitConnected, connectGoogleFit, ensureAccessToken } = useUser();
  const [predictionData, setPredictionData] = useState({ riskScore: 0, riskLevel: 'Low', hasHistory: false });

  useEffect(() => {
    const fetchPrediction = async () => {
      try {
        if (!user) return;
        const token = await ensureAccessToken();
        // Adjust URL for your environment (emulator vs device)
        const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:5000';
        const response = await fetch(`${API_URL}/api/diabetes/latest`, {
          headers: { 'Authorization': `Bearer ${token || ''}` }
        });
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
  }, [user]);

  const { riskScore, riskLevel } = predictionData;
  const riskColor = riskLevel === 'High' ? Colors.risk.high : riskLevel === 'Moderate' ? Colors.risk.moderate : Colors.risk.low;

  const quickStats = [
    { icon: Activity, label: 'Steps', value: healthMetrics.steps, goal: dailyGoals.steps, unit: '', color: Colors.chart.bmi },
    { icon: Droplet, label: 'Water', value: healthMetrics.water, goal: dailyGoals.water, unit: 'glasses', color: Colors.secondary },
    { icon: Moon, label: 'Sleep', value: healthMetrics.sleep, goal: dailyGoals.sleep, unit: 'hrs', color: Colors.chart.glucose },
    { icon: Flame, label: 'Calories', value: healthMetrics.calories, goal: dailyGoals.calories, unit: 'kcal', color: Colors.warning },
  ];

  const features = [
    { icon: UtensilsCrossed, label: 'Diet Suggestion', route: '/diet-suggestions', gradient: Colors.gradient.success },
    { icon: Camera, label: 'Meal Log', route: '/meal-log', gradient: Colors.gradient.warning },
    { icon: BarChart3, label: 'Progress', route: '/progress', gradient: Colors.gradient.secondary },
    { icon: List, label: 'View All', route: '/view-all-meals', gradient: Colors.gradient.error },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hello, {user?.name || 'User'}!</Text>
            <Text style={styles.subtitle}>Let&apos;s check your health today</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.riskCard}
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
              <Heart size={32} color={Colors.textWhite} strokeWidth={2} />
              <View style={styles.riskBadge}>
                <Text style={styles.riskBadgeText}>{riskLevel} Risk</Text>
              </View>
            </View>
            <Text style={styles.riskScore}>{riskScore}%</Text>
            <Text style={styles.riskLabel}>Health Risk Score</Text>
            <Text style={styles.riskDescription}>
              Your health indicators look great! Keep up the good work.
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        {isGoogleFitConnected && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Today&apos;s Progress</Text>
              <TouchableOpacity onPress={() => router.push('/progress' as any)}>
                <Text style={styles.sectionLink}>View All</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.statsGrid}>
              {quickStats.map((stat, index) => {
                const progress = Math.min((stat.value / stat.goal) * 100, 100);
                const Icon = stat.icon;

                return (
                  <View key={index} style={styles.statCard}>
                    <View style={[styles.statIconContainer, { backgroundColor: stat.color + '20' }]}>
                      <Icon size={24} color={stat.color} strokeWidth={2} />
                    </View>
                    <Text style={styles.statValue}>
                      {stat.value}
                      {stat.unit && <Text style={styles.statUnit}> {stat.unit}</Text>}
                    </Text>
                    <Text style={styles.statLabel}>{stat.label}</Text>
                    <View style={styles.progressBar}>
                      <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: stat.color }]} />
                    </View>
                    <Text style={styles.statGoal}>Goal: {stat.goal}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {!isGoogleFitConnected && (
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.googleFitCard}
              activeOpacity={0.8}
              onPress={connectGoogleFit}
            >
              <LinearGradient
                colors={Colors.gradient.primary as unknown as readonly [ColorValue, ColorValue, ...ColorValue[]]}
                style={styles.googleFitGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.googleFitContent}>
                  <View style={styles.googleFitIconContainer}>
                    <Link size={32} color={Colors.textWhite} strokeWidth={2} />
                  </View>
                  <View style={styles.googleFitTextContainer}>
                    <Text style={styles.googleFitTitle}>Connect to Google Fit</Text>
                    <Text style={styles.googleFitDescription}>
                      Connect to Google Fit to view your health data.
                    </Text>
                  </View>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
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
                    style={styles.featureGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Icon size={32} color={Colors.textWhite} strokeWidth={2} />
                  </LinearGradient>
                  <Text style={styles.featureLabel}>{feature.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Rewards Summary</Text>
          <View style={styles.rewardsCard}>
            <View style={styles.rewardsRow}>
              <View style={styles.rewardItem}>
                <Text style={styles.rewardValue}>{rewardsPoints}</Text>
                <Text style={styles.rewardLabel}>Points</Text>
              </View>
              <View style={styles.rewardDivider} />
              <View style={styles.rewardItem}>
                <Text style={styles.rewardValue}>{streak}</Text>
                <Text style={styles.rewardLabel}>Streak</Text>
              </View>
              <View style={styles.rewardDivider} />
              <View style={styles.rewardItem}>
                <Text style={styles.rewardValue}>3</Text>
                <Text style={styles.rewardLabel}>Badges</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.rewardsButton}
              onPress={() => router.push('/(tabs)/rewards' as any)}
            >
              <Text style={styles.rewardsButtonText}>View All Rewards</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Health Tips</Text>
          <View style={styles.tipCard}>
            <TrendingUp size={24} color={Colors.primary} strokeWidth={2} />
            <View style={styles.tipContent}>
              <Text style={styles.tipTitle}>Stay Hydrated</Text>
              <Text style={styles.tipDescription}>
                Drink at least 8 glasses of water daily to maintain optimal health and energy levels.
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
    backgroundColor: Colors.backgroundSecondary,
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
    backgroundColor: Colors.background,
  },
  greeting: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  googleFitCard: {
    marginHorizontal: 0,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: Colors.cardShadow,
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
    color: Colors.textWhite,
    marginBottom: 8,
  },
  googleFitDescription: {
    fontSize: 14,
    color: Colors.textWhite,
    opacity: 0.9,
    lineHeight: 20,
  },
  riskCard: {
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: Colors.cardShadow,
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
    color: Colors.textWhite,
  },
  riskScore: {
    fontSize: 48,
    fontWeight: '700' as const,
    color: Colors.textWhite,
    marginBottom: 4,
  },
  riskLabel: {
    fontSize: 16,
    color: Colors.textWhite,
    opacity: 0.9,
    marginBottom: 12,
  },
  riskDescription: {
    fontSize: 14,
    color: Colors.textWhite,
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
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  sectionLink: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  statCard: {
    width: CARD_WIDTH,
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    margin: 6,
    shadowColor: Colors.cardShadow,
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
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 4,
  },
  statUnit: {
    fontSize: 14,
    fontWeight: '400' as const,
    color: Colors.textSecondary,
  },
  statLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 12,
  },
  progressBar: {
    height: 6,
    backgroundColor: Colors.backgroundSecondary,
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
    color: Colors.textLight,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  featureCard: {
    width: CARD_WIDTH,
    alignItems: 'center',
    margin: 6,
  },
  featureGradient: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: Colors.cardShadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  featureLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
    textAlign: 'center',
  },
  rewardsCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 20,
    shadowColor: Colors.cardShadow,
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
    color: Colors.primary,
    marginBottom: 4,
  },
  rewardLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  rewardDivider: {
    width: 1,
    backgroundColor: Colors.border,
  },
  rewardsButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  rewardsButtonText: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.textWhite,
  },
  tipCard: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    shadowColor: Colors.cardShadow,
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
    color: Colors.text,
    marginBottom: 4,
  },
  tipDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
});
