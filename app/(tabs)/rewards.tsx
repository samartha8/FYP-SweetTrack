import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Award, Trophy, Star, Gift, Zap, Target, TrendingUp, Heart } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useUser } from '@/contexts/UserContext';
import { useTheme } from '@/contexts/SettingsContext';
import { useTranslation } from '@/hooks/use-translation';
import { useMemo } from 'react';

type Badge = {
  id: string;
  name: string;
  description: string;
  icon: typeof Award;
  color: string;
  gradient: readonly string[];
  unlocked: boolean;
  unlockedGradient: readonly string[];
};

export default function RewardsScreen() {
  const insets = useSafeAreaInsets();
  const { rewardsPoints, streak, unlockedBadges = [] } = useUser();
  const { colors, scale } = useTheme();
  const { t } = useTranslation();

  // Dynamic Styles
  const themed = useMemo(() => ({
    container: { backgroundColor: colors.backgroundSecondary },
    header: { backgroundColor: colors.background },
    headerTitle: { color: colors.text, fontSize: scale(28) },
    headerSubtitle: { color: colors.textSecondary, fontSize: scale(14) },
    statsValue: { color: colors.textWhite, fontSize: scale(28) },
    statsLabel: { color: colors.textWhite, fontSize: scale(14) },
    sectionTitle: { color: colors.text, fontSize: scale(20) },
    card: { backgroundColor: colors.card, shadowColor: colors.cardShadow },
    badgeName: { color: colors.text, fontSize: scale(14) },
    badgeDescription: { color: colors.textSecondary, fontSize: scale(12) },
    couponTitle: { color: colors.text, fontSize: scale(15) },
    couponPoints: { color: colors.textSecondary, fontSize: scale(13) },
    tipTitle: { color: colors.text, fontSize: scale(16) },
    tipDescription: { color: colors.textSecondary, fontSize: scale(14) },
    unlockedBadge: { backgroundColor: colors.primary + '20' },
    unlockedText: { color: colors.primary, fontSize: scale(11) },
    redeemButton: { backgroundColor: colors.primary },
    redeemButtonText: { fontSize: scale(14) },
    lockedText: { color: colors.textSecondary, fontSize: scale(14) },
    couponIcon: { backgroundColor: colors.backgroundSecondary },
  }), [colors, scale]);

  const badges: Badge[] = useMemo(() => [
    {
      id: '1',
      name: t.rewards.badge1Name,
      description: t.rewards.badge1Desc,
      icon: Star,
      color: colors.warning,
      gradient: [colors.backgroundTertiary, colors.backgroundTertiary],
      unlockedGradient: colors.gradient.warning,
      unlocked: Array.isArray(unlockedBadges) ? unlockedBadges.includes('1') : false,
    },
    {
      id: '2',
      name: t.rewards.badge2Name,
      description: t.rewards.badge2Desc,
      icon: Zap,
      color: colors.secondary,
      gradient: [colors.backgroundTertiary, colors.backgroundTertiary],
      unlockedGradient: colors.gradient.secondary,
      unlocked: Array.isArray(unlockedBadges) ? unlockedBadges.includes('2') : false,
    },
    {
      id: '3',
      name: t.rewards.badge3Name,
      description: t.rewards.badge3Desc,
      icon: Trophy,
      color: colors.primary,
      gradient: [colors.backgroundTertiary, colors.backgroundTertiary],
      unlockedGradient: colors.gradient.success,
      unlocked: Array.isArray(unlockedBadges) ? unlockedBadges.includes('3') : false,
    },
    {
      id: '4',
      name: t.rewards.badge4Name,
      description: t.rewards.badge4Desc,
      icon: Target,
      color: colors.chart?.bmi || '#FFD60A',
      gradient: [colors.backgroundTertiary, colors.backgroundTertiary],
      unlockedGradient: [colors.chart?.bmi || '#FFD60A', (colors.chart?.bmi || '#FFD60A') + '80'],
      unlocked: Array.isArray(unlockedBadges) ? unlockedBadges.includes('4') : false,
    },
    {
      id: '5',
      name: t.rewards.badge5Name,
      description: t.rewards.badge5Desc,
      icon: TrendingUp,
      color: colors.chart?.glucose || '#30D158',
      gradient: [colors.backgroundTertiary, colors.backgroundTertiary],
      unlockedGradient: [colors.chart?.glucose || '#30D158', (colors.chart?.glucose || '#30D158') + '80'],
      unlocked: Array.isArray(unlockedBadges) ? unlockedBadges.includes('5') : false,
    },
    {
      id: '6',
      name: t.rewards.badge6Name,
      description: t.rewards.badge6Desc,
      icon: Heart,
      color: colors.error,
      gradient: [colors.backgroundTertiary, colors.backgroundTertiary],
      unlockedGradient: colors.gradient.error,
      unlocked: Array.isArray(unlockedBadges) ? unlockedBadges.includes('6') : false,
    },
  ], [colors, t, unlockedBadges]);

  const coupons = useMemo(() => [
    { id: '1', title: t.rewards.coupon1, points: 500, available: rewardsPoints >= 500 },
    { id: '2', title: t.rewards.coupon2, points: 1000, available: rewardsPoints >= 1000 },
    { id: '3', title: t.rewards.coupon3, points: 1500, available: rewardsPoints >= 1500 },
    { id: '4', title: t.rewards.coupon4, points: 2000, available: rewardsPoints >= 2000 },
  ], [rewardsPoints, t]);

  return (
    <View style={[styles.container, themed.container, { paddingTop: insets.top }]}>
      <View style={[styles.header, themed.header]}>
        <Text style={[styles.headerTitle, themed.headerTitle]}>{t.rewards.header}</Text>
        <Text style={[styles.headerSubtitle, themed.headerSubtitle]}>{t.rewards.subtitle}</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.statsCard, themed.card]}>
          <LinearGradient
            colors={colors.gradient.primary as any}
            style={styles.statsGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Award size={32} color={colors.textWhite} strokeWidth={2} />
                <Text style={[styles.statValue, themed.statsValue]}>{rewardsPoints}</Text>
                <Text style={[styles.statLabel, themed.statsLabel]}>{t.rewards.statsPoints}</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Zap size={32} color={colors.textWhite} strokeWidth={2} />
                <Text style={[styles.statValue, themed.statsValue]}>{streak}</Text>
                <Text style={[styles.statLabel, themed.statsLabel]}>{t.rewards.statsStreak}</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Trophy size={32} color={colors.textWhite} strokeWidth={2} />
                <Text style={[styles.statValue, themed.statsValue]}>{badges.filter(b => b.unlocked).length}</Text>
                <Text style={[styles.statLabel, themed.statsLabel]}>{t.rewards.statsBadges}</Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, themed.sectionTitle]}>{t.rewards.badgesTitle}</Text>
          <View style={styles.badgesGrid}>
            {badges.map((badge) => {
              const Icon = badge.icon;
              return (
                <View
                  key={badge.id}
                  style={[
                    styles.badgeCard,
                    themed.card,
                    !badge.unlocked && styles.badgeCardLocked,
                  ]}
                >
                  <LinearGradient
                    colors={badge.unlocked ? (colors.gradient.success as any) : (['#E0E0E0', '#BDBDBD'] as any)}
                    style={styles.badgeIconContainer}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Icon
                      size={32}
                      color={badge.unlocked ? colors.textWhite : colors.textLight}
                      strokeWidth={2}
                    />
                  </LinearGradient>
                  <Text style={[
                    styles.badgeName,
                    themed.badgeName,
                    !badge.unlocked && themed.lockedText,
                  ]}>
                    {badge.name}
                  </Text>
                  <Text style={[styles.badgeDescription, themed.badgeDescription]}>{badge.description}</Text>
                  {badge.unlocked && (
                    <View style={[styles.unlockedBadge, themed.unlockedBadge]}>
                      <Text style={[styles.unlockedText, themed.unlockedText]}>{t.rewards.unlocked}</Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, themed.sectionTitle]}>{t.rewards.redeemTitle}</Text>
          {coupons.map((coupon) => (
            <View key={coupon.id} style={[styles.couponCard, themed.card]}>
              <View style={[styles.couponIcon, themed.couponIcon]}>
                <Gift size={24} color={coupon.available ? colors.primary : colors.textLight} strokeWidth={2} />
              </View>
              <View style={styles.couponContent}>
                <Text style={[
                  styles.couponTitle,
                  themed.couponTitle,
                  !coupon.available && themed.lockedText,
                ]}>
                  {coupon.title}
                </Text>
                <Text style={[styles.couponPoints, themed.couponPoints]}>{coupon.points} {t.rewards.pointsSuffix}</Text>
              </View>
              <TouchableOpacity
                style={[
                  styles.redeemButton,
                  themed.redeemButton,
                  !coupon.available && { backgroundColor: colors.backgroundTertiary },
                ]}
                disabled={!coupon.available}
              >
                <Text style={[
                  styles.redeemButtonText,
                  themed.redeemButtonText,
                  { color: colors.textWhite },
                  !coupon.available && { color: colors.textLight },
                ]}>
                  {coupon.available ? t.rewards.redeem : t.rewards.locked}
                </Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        <View style={[styles.tipCard, themed.card]}>
          <TrendingUp size={24} color={colors.primary} strokeWidth={2} />
          <View style={styles.tipContent}>
            <Text style={[styles.tipTitle, themed.tipTitle]}>{t.rewards.tipTitle}</Text>
            <Text style={[styles.tipDescription, themed.tipDescription]}>
              {t.rewards.tipDescription}
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
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  headerTitle: {
    fontWeight: '700',
  },
  headerSubtitle: {
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
    fontWeight: '700',
    marginTop: 8,
  },
  statLabel: {
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
    fontWeight: '700',
    marginBottom: 16,
  },
  badgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: 0,
    justifyContent: 'space-between',
  },
  badgeCard: {
    width: '46%', // Slightly reduced to ensure 2 columns fit with margins
    borderRadius: 16,
    padding: 16,
    margin: '2%', // Uniform margin
    alignItems: 'center',
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
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 4,
  },
  badgeDescription: {
    textAlign: 'center',
    lineHeight: 16,
  },
  unlockedBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
  },
  unlockedText: {
    fontWeight: '600',
  },
  couponCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  couponIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  couponContent: {
    flex: 1,
  },
  couponTitle: {
    fontWeight: '600',
    marginBottom: 4,
  },
  couponPoints: {},
  redeemButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  redeemButtonText: {
    fontWeight: '600',
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
    fontWeight: '700',
    marginBottom: 4,
  },
  tipDescription: {
    lineHeight: 20,
  },
});
