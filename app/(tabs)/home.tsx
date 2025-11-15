import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Heart, Activity, Droplet, Moon, Flame, TrendingUp, UtensilsCrossed, Camera, BarChart3, List } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '@/constants/colors';
import { useUser } from '@/contexts/UserContext';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 60) / 2;

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, healthMetrics, dailyGoals, rewardsPoints, streak } = useUser();

  const riskScore = 35;
  const riskLevel = 'Low' as const;
  const riskColor = Colors.risk.low;

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
          <View style={styles.streakContainer}>
            <Text style={styles.streakNumber}>{streak}</Text>
            <Text style={styles.streakLabel}>Day Streak</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.riskCard}
          activeOpacity={0.8}
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

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Today&apos;s Progress</Text>
            <TouchableOpacity>
              <TrendingUp size={24} color={Colors.primary} strokeWidth={2} />
            </TouchableOpacity>
          </View>
          <View style={styles.statsGrid}>
            {quickStats.map((stat, index) => {
              const Icon = stat.icon;
              const progress = Math.min((stat.value / stat.goal) * 100, 100);
              return (
                <View key={index} style={styles.statCard}>
                  <View style={[styles.statIconContainer, { backgroundColor: stat.color + '20' }]}>
                    <Icon size={24} color={stat.color} strokeWidth={2} />
                  </View>
                  <Text style={styles.statValue}>{stat.value}</Text>
                  <Text style={styles.statLabel}>{stat.label}</Text>
                  <View style={styles.progressBarContainer}>
                    <View style={[styles.progressBar, { width: `${progress}%`, backgroundColor: stat.color }]} />
                  </View>
                  <Text style={styles.statGoal}>{stat.goal} {stat.unit}</Text>
                </View>
              );
            })}
          </View>
        </View>

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
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  greeting: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  streakContainer: {
    alignItems: 'center',
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  streakNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.primary,
  },
  streakLabel: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '600',
  },
  riskCard: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 24,
    shadowColor: Colors.cardShadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
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
    backgroundColor: Colors.textWhite + '30',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  riskBadgeText: {
    color: Colors.textWhite,
    fontSize: 12,
    fontWeight: '700',
  },
  riskScore: {
    fontSize: 48,
    fontWeight: '700',
    color: Colors.textWhite,
    marginBottom: 4,
  },
  riskLabel: {
    fontSize: 16,
    color: Colors.textWhite,
    marginBottom: 8,
  },
  riskDescription: {
    fontSize: 14,
    color: Colors.textWhite,
    opacity: 0.9,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    width: (Dimensions.get('window').width - 52) / 2,
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
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
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  progressBarContainer: {
    height: 4,
    backgroundColor: Colors.borderLight,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBar: {
    height: '100%',
    borderRadius: 2,
  },
  statGoal: {
    fontSize: 12,
    color: Colors.textLight,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  featureCard: {
    width: (Dimensions.get('window').width - 52) / 2,
    alignItems: 'center',
  },
  featureGradient: {
    width: 80,
    height: 80,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  featureLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    textAlign: 'center',
  },
});