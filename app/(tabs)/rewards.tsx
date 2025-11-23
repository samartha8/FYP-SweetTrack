import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Award, Trophy, Star, Gift, Zap, Target, TrendingUp, Heart } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '@/constants/colors';
import { useUser } from '@/contexts/UserContext';

type Badge = {
  id: string;
  name: string;
  description: string;
  icon: typeof Award;
  color: string;
  gradient: readonly string[];
  unlocked: boolean;
};

export default function RewardsScreen() {
  const insets = useSafeAreaInsets();
  const { rewardsPoints, streak } = useUser();

  const badges: Badge[] = [
    {
      id: '1',
      name: 'First Steps',
      description: 'Complete your first day',
      icon: Star,
      color: Colors.warning,
      gradient: Colors.gradient.warning,
      unlocked: true,
    },
    {
      id: '2',
      name: 'Week Warrior',
      description: '7 day streak',
      icon: Zap,
      color: Colors.secondary,
      gradient: Colors.gradient.secondary,
      unlocked: true,
    },
    {
      id: '3',
      name: 'Health Hero',
      description: 'Complete all daily goals',
      icon: Trophy,
      color: Colors.primary,
      gradient: Colors.gradient.success,
      unlocked: true,
    },
    {
      id: '4',
      name: 'Hydration Master',
      description: 'Drink 8 glasses for 7 days',
      icon: Target,
      color: Colors.chart.bmi,
      gradient: [Colors.chart.bmi, Colors.chart.bmi + '80'],
      unlocked: false,
    },
    {
      id: '5',
      name: 'Step Champion',
      description: 'Walk 10,000 steps for 30 days',
      icon: TrendingUp,
      color: Colors.chart.glucose,
      gradient: [Colors.chart.glucose, Colors.chart.glucose + '80'],
      unlocked: false,
    },
    {
      id: '6',
      name: 'Wellness Guru',
      description: 'Maintain 30 day streak',
      icon: Heart,
      color: Colors.error,
      gradient: Colors.gradient.error,
      unlocked: false,
    },
  ];

  const coupons = [
    { id: '1', title: '10% Off Health Supplements', points: 500, available: rewardsPoints >= 500 },
    { id: '2', title: 'Free Fitness Class', points: 1000, available: rewardsPoints >= 1000 },
    { id: '3', title: '20% Off Gym Membership', points: 1500, available: rewardsPoints >= 1500 },
    { id: '4', title: 'Free Health Consultation', points: 2000, available: rewardsPoints >= 2000 },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Rewards</Text>
        <Text style={styles.headerSubtitle}>Your achievements and benefits</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.statsCard}>
          <LinearGradient
            colors={Colors.gradient.primary as unknown as readonly [ColorValue, ColorValue, ...ColorValue[]]}
            style={styles.statsGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Award size={32} color={Colors.textWhite} strokeWidth={2} />
                <Text style={styles.statValue}>{rewardsPoints}</Text>
                <Text style={styles.statLabel}>Points</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Zap size={32} color={Colors.textWhite} strokeWidth={2} />
                <Text style={styles.statValue}>{streak}</Text>
                <Text style={styles.statLabel}>Day Streak</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Trophy size={32} color={Colors.textWhite} strokeWidth={2} />
                <Text style={styles.statValue}>{badges.filter(b => b.unlocked).length}</Text>
                <Text style={styles.statLabel}>Badges</Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Badges</Text>
          <View style={styles.badgesGrid}>
            {badges.map((badge) => {
              const Icon = badge.icon;
              return (
                <View
                  key={badge.id}
                  style={[
                    styles.badgeCard,
                    !badge.unlocked && styles.badgeCardLocked,
                  ]}
                >
                  <LinearGradient
                    colors={badge.unlocked ? badge.gradient as unknown as readonly [ColorValue, ColorValue, ...ColorValue[]] : [Colors.backgroundTertiary, Colors.backgroundTertiary] as unknown as readonly [ColorValue, ColorValue, ...ColorValue[]]}
                    style={styles.badgeIconContainer}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Icon
                      size={32}
                      color={badge.unlocked ? Colors.textWhite : Colors.textLight}
                      strokeWidth={2}
                    />
                  </LinearGradient>
                  <Text style={[
                    styles.badgeName,
                    !badge.unlocked && styles.badgeNameLocked,
                  ]}>
                    {badge.name}
                  </Text>
                  <Text style={styles.badgeDescription}>{badge.description}</Text>
                  {badge.unlocked && (
                    <View style={styles.unlockedBadge}>
                      <Text style={styles.unlockedText}>Unlocked</Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Redeem Rewards</Text>
          {coupons.map((coupon) => (
            <View key={coupon.id} style={styles.couponCard}>
              <View style={styles.couponIcon}>
                <Gift size={24} color={coupon.available ? Colors.primary : Colors.textLight} strokeWidth={2} />
              </View>
              <View style={styles.couponContent}>
                <Text style={[
                  styles.couponTitle,
                  !coupon.available && styles.couponTitleDisabled,
                ]}>
                  {coupon.title}
                </Text>
                <Text style={styles.couponPoints}>{coupon.points} points</Text>
              </View>
              <TouchableOpacity
                style={[
                  styles.redeemButton,
                  !coupon.available && styles.redeemButtonDisabled,
                ]}
                disabled={!coupon.available}
              >
                <Text style={[
                  styles.redeemButtonText,
                  !coupon.available && styles.redeemButtonTextDisabled,
                ]}>
                  {coupon.available ? 'Redeem' : 'Locked'}
                </Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        <View style={styles.tipCard}>
          <TrendingUp size={24} color={Colors.primary} strokeWidth={2} />
          <View style={styles.tipContent}>
            <Text style={styles.tipTitle}>Keep Going!</Text>
            <Text style={styles.tipDescription}>
              Complete your daily goals to earn more points and unlock exclusive rewards.
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
    backgroundColor: Colors.background,
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  headerSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 30,
  },
  statsCard: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 24,
    shadowColor: Colors.cardShadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  statsGradient: {
    padding: 24,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: Colors.textWhite,
    marginTop: 8,
  },
  statLabel: {
    fontSize: 14,
    color: Colors.textWhite,
    opacity: 0.9,
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 16,
  },
  badgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  badgeCard: {
    width: '47%',
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    margin: 6,
    alignItems: 'center',
    shadowColor: Colors.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  badgeCardLocked: {
    opacity: 0.6,
  },
  badgeIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  badgeName: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 4,
  },
  badgeNameLocked: {
    color: Colors.textSecondary,
  },
  badgeDescription: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 16,
  },
  unlockedBadge: {
    backgroundColor: Colors.primary + '20',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
  },
  unlockedText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
  couponCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: Colors.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  couponIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: Colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  couponContent: {
    flex: 1,
  },
  couponTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 4,
  },
  couponTitleDisabled: {
    color: Colors.textSecondary,
  },
  couponPoints: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  redeemButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  redeemButtonDisabled: {
    backgroundColor: Colors.backgroundTertiary,
  },
  redeemButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.textWhite,
  },
  redeemButtonTextDisabled: {
    color: Colors.textLight,
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
