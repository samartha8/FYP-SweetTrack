import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ColorValue, Alert, Platform, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Award, Trophy, Star, Gift, Zap, Target, TrendingUp, Heart, CheckCircle2, Droplets, Lock, ChevronRight, Sparkles } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInUp, ZoomIn, Layout } from 'react-native-reanimated';
import { useUser } from '@/contexts/UserContext';
import { useTheme } from '@/contexts/SettingsContext';
import { useTranslation } from '@/hooks/use-translation';
import { useMemo, useState } from 'react';

const { width } = Dimensions.get('window');

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
  const { rewardsPoints, streak, unlockedBadges = [], redeemedRewards = [], redeemReward } = useUser();
  const { colors, scale } = useTheme();
  const { t } = useTranslation();
  const [isRedeeming, setIsRedeeming] = useState<string | null>(null);

  const themed = useMemo(() => ({
    container: { backgroundColor: 'transparent' },
    headerTitle: { color: colors.text, fontSize: scale(32), fontWeight: '900' as const, letterSpacing: -1.5 },
    headerSubtitle: { color: colors.textSecondary, fontSize: scale(15), fontWeight: '600' as const, opacity: 0.8 },
    statsValue: { color: '#FFF', fontSize: scale(32), fontWeight: '900' as const, letterSpacing: -1 },
    statsLabel: { color: '#FFF', fontSize: scale(11), fontWeight: '800' as const, textTransform: 'uppercase' as const, letterSpacing: 1, opacity: 0.9 },
    sectionTitle: { color: colors.text, fontSize: scale(22), fontWeight: '900' as const, letterSpacing: -0.5 },
    card: { 
      backgroundColor: '#FFF', 
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.08,
      shadowRadius: 20,
      elevation: 5,
      borderRadius: 28,
      borderWidth: 1,
      borderColor: 'rgba(0,0,0,0.03)'
    },
    badgeName: { color: colors.text, fontSize: scale(16), fontWeight: '900' as const, letterSpacing: -0.3 },
    badgeDescription: { color: colors.textSecondary, fontSize: scale(12), lineHeight: 18, fontWeight: '500' as const },
    couponTitle: { color: colors.text, fontSize: scale(17), fontWeight: '800' as const, letterSpacing: -0.3 },
    couponPoints: { color: colors.primary, fontSize: scale(14), fontWeight: '700' as const },
    tipTitle: { color: colors.text, fontSize: scale(19), fontWeight: '900' as const, letterSpacing: -0.5 },
    tipDescription: { color: colors.textSecondary, fontSize: scale(14), lineHeight: 22, fontWeight: '600' as const },
    unlockedText: { color: '#FFF', fontSize: scale(10), fontWeight: '900' as const, letterSpacing: 0.5 },
    redeemButtonText: { fontSize: scale(14), fontWeight: '900' as const, textTransform: 'uppercase' as const },
  }), [colors, scale]);

  const badges: Badge[] = useMemo(() => [
    {
      id: '1',
      name: t.rewards.badge1Name,
      description: t.rewards.badge1Desc,
      icon: Star,
      color: '#FFB700',
      gradient: ['#F8FAFC', '#F1F5F9'],
      unlockedGradient: ['#FFB700', '#FF8E00'],
      unlocked: Array.isArray(unlockedBadges) ? unlockedBadges.includes('1') : false,
    },
    {
      id: '2',
      name: t.rewards.badge2Name,
      description: t.rewards.badge2Desc,
      icon: Zap,
      color: '#6366F1',
      gradient: ['#F8FAFC', '#F1F5F9'],
      unlockedGradient: ['#6366F1', '#4F46E5'],
      unlocked: Array.isArray(unlockedBadges) ? unlockedBadges.includes('2') : false,
    },
    {
      id: '3',
      name: t.rewards.badge3Name,
      description: t.rewards.badge3Desc,
      icon: Trophy,
      color: '#10B981',
      gradient: ['#F8FAFC', '#F1F5F9'],
      unlockedGradient: ['#10B981', '#059669'],
      unlocked: Array.isArray(unlockedBadges) ? unlockedBadges.includes('3') : false,
    },
    {
      id: '4',
      name: t.rewards.badge4Name,
      description: t.rewards.badge4Desc,
      icon: Droplets,
      color: '#0EA5E9',
      gradient: ['#F8FAFC', '#F1F5F9'],
      unlockedGradient: ['#0EA5E9', '#0284C7'],
      unlocked: Array.isArray(unlockedBadges) ? unlockedBadges.includes('4') : false,
    },
    {
      id: '5',
      name: t.rewards.badge5Name,
      description: t.rewards.badge5Desc,
      icon: TrendingUp,
      color: '#8B5CF6',
      gradient: ['#F8FAFC', '#F1F5F9'],
      unlockedGradient: ['#8B5CF6', '#7C3AED'],
      unlocked: Array.isArray(unlockedBadges) ? unlockedBadges.includes('5') : false,
    },
    {
      id: '6',
      name: t.rewards.badge6Name,
      description: t.rewards.badge6Desc,
      icon: Heart,
      color: '#EF4444',
      gradient: ['#F8FAFC', '#F1F5F9'],
      unlockedGradient: ['#EF4444', '#DC2626'],
      unlocked: Array.isArray(unlockedBadges) ? unlockedBadges.includes('6') : false,
    },
  ], [colors, t, unlockedBadges]);

  const coupons = useMemo(() => [
    { id: 'bhat_bhateni_500', title: 'Bhat-Bhateni Rs. 500 Voucher', points: 1000 },
    { id: 'qfx_ticket', title: 'QFX Cinemas Movie Ticket', points: 1500 },
  ].map(c => ({
    ...c,
    isRedeemed: redeemedRewards.includes(c.id),
    available: (rewardsPoints || 0) >= c.points
  })), [rewardsPoints, redeemedRewards]);

  const handleRedeem = async (couponId: string, title: string, cost: number) => {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm(`Are you sure you want to redeem "${title}" for ${cost} points?`);
      if (confirmed) {
        setIsRedeeming(couponId);
        const res = await redeemReward(couponId, cost);
        setIsRedeeming(null);
        if (res.success) window.alert(`Success!\nYou claimed ${title}. Check email.`);
        else window.alert(`Error: ${res.message || "Failed."}`);
      }
      return;
    }

    Alert.alert(
      "Confirm Redemption",
      `Redeem "${title}" for ${cost} points?`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Redeem", 
          onPress: async () => {
            setIsRedeeming(couponId);
            const res = await redeemReward(couponId, cost);
            setIsRedeeming(null);
            if (res.success) Alert.alert("Success!", `Claimed ${title}. Check email.`);
            else Alert.alert("Error", res.message || "Failed.");
          }
        }
      ]
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient colors={['#F0FDF4', '#F0F9FF']} style={StyleSheet.absoluteFill} />
      
      <View style={styles.header}>
        <Text style={themed.headerTitle}>Rewards <Text style={{ color: '#00B4D8' }}>&</Text> <Text style={{ color: '#FF9F1C' }}>Badges</Text></Text>
        <Text style={themed.headerSubtitle}>Your achievements and benefits</Text>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInUp} style={[styles.statsCard, themed.card]}>
          <LinearGradient colors={['#00B4D8', '#4CAF50', '#FF9F1C']} style={styles.statsGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Award size={22} color="#FFF" strokeWidth={2.5} style={styles.statIcon} />
                <Text style={themed.statsValue}>{rewardsPoints?.toLocaleString() || '0'}</Text>
                <Text style={themed.statsLabel}>Points</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Zap size={22} color="#FFF" strokeWidth={2.5} style={styles.statIcon} />
                <Text style={themed.statsValue}>{streak || '0'}</Text>
                <Text style={themed.statsLabel}>Day Streak</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Trophy size={22} color="#FFF" strokeWidth={2.5} style={styles.statIcon} />
                <Text style={themed.statsValue}>{badges.filter(b => b.unlocked).length}</Text>
                <Text style={themed.statsLabel}>Badges</Text>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={themed.sectionTitle}>Badges</Text>
            <View style={styles.badgeCounterContainer}>
                <Text style={styles.badgeCounter}>{badges.filter(b => b.unlocked).length} / {badges.length}</Text>
            </View>
          </View>
          <View style={styles.badgesGrid}>
            {badges.map((badge, index) => {
              const Icon = badge.icon;
              return (
                <Animated.View key={badge.id} entering={FadeInDown.delay(index * 100)} style={[styles.badgeCard, themed.card, !badge.unlocked && styles.badgeCardLocked]}>
                  <LinearGradient colors={badge.unlocked ? (badge.unlockedGradient as any) : (['#E2E8F0', '#CBD5E1'] as any)} style={styles.badgeIconContainer}>
                    <Icon size={scale(32)} color="#FFF" strokeWidth={2.5} />
                    {badge.unlocked && (
                      <Animated.View entering={ZoomIn} style={styles.unlockedIndicator}>
                        <CheckCircle2 size={14} color="#FFF" />
                      </Animated.View>
                    )}
                    {!badge.unlocked && (
                      <View style={styles.lockedIndicator}>
                        <Lock size={14} color="#FFF" />
                      </View>
                    )}
                  </LinearGradient>
                  <Text style={[themed.badgeName, !badge.unlocked && { color: colors.textSecondary, opacity: 0.7 }]}>{badge.name}</Text>
                  <Text style={themed.badgeDescription}>{badge.description}</Text>
                  {badge.unlocked && (
                    <View style={styles.unlockedBadgeBadge}>
                      <Text style={themed.unlockedText}>EARNED</Text>
                    </View>
                  )}
                </Animated.View>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[themed.sectionTitle, { marginBottom: 20 }]}>Redeem Rewards</Text>
          {coupons.map((coupon, index) => (
            <Animated.View key={coupon.id} entering={FadeInDown.delay(400 + index * 100)} style={[styles.couponCard, themed.card]}>
              <View style={[styles.couponIcon, { backgroundColor: coupon.available ? colors.primary + '10' : '#F1F5F9' }]}>
                <Gift size={24} color={coupon.available ? colors.primary : '#94A3B8'} strokeWidth={2.5} />
              </View>
              <View style={styles.couponContent}>
                <Text style={[themed.couponTitle, !coupon.available && { color: '#94A3B8' }]}>{coupon.title}</Text>
                <Text style={themed.couponPoints}>{coupon.points} points</Text>
              </View>
              <TouchableOpacity
                activeOpacity={0.8}
                style={[styles.redeemButton, (!coupon.available || coupon.isRedeemed) ? { backgroundColor: '#F1F5F9' } : { backgroundColor: colors.primary }]}
                disabled={!coupon.available || coupon.isRedeemed || isRedeeming === coupon.id}
                onPress={() => handleRedeem(coupon.id, coupon.title, coupon.points)}
              >
                {coupon.available && !coupon.isRedeemed && (
                    <LinearGradient colors={['#00B4D8', '#0077B6']} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />
                )}
                <Text style={[themed.redeemButtonText, { color: (!coupon.available || coupon.isRedeemed) ? '#94A3B8' : '#FFF' }]}>
                  {isRedeeming === coupon.id ? '...' : coupon.isRedeemed ? 'Used' : coupon.available ? 'Redeem' : 'Locked'}
                </Text>
              </TouchableOpacity>
            </Animated.View>
          ))}
        </View>

        <Animated.View entering={FadeInDown.delay(600)} style={[styles.tipCard, themed.card]}>
          <View style={[styles.tipIconContainer, { backgroundColor: '#4CAF5015' }]}>
            <Sparkles size={24} color="#4CAF50" strokeWidth={2.5} />
          </View>
          <View style={styles.tipContent}>
            <Text style={themed.tipTitle}>Pro Tip</Text>
            <Text style={themed.tipDescription}>Log your meals and activities daily to maintain your streak and earn exclusive badges!</Text>
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 24, paddingVertical: 24 },
  scrollView: { flex: 1 },
  scrollContent: { padding: 24, paddingBottom: 60 },
  statsCard: { borderRadius: 32, overflow: 'hidden', marginBottom: 36 },
  statsGradient: { padding: 32 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  statItem: { alignItems: 'center', flex: 1 },
  statIcon: { marginBottom: 8, opacity: 0.9 },
  statDivider: { width: 1.5, height: 40, backgroundColor: 'rgba(255, 255, 255, 0.25)' },
  section: { marginBottom: 36 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  badgeCounterContainer: { backgroundColor: '#F1F5F9', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  badgeCounter: { fontSize: 13, color: '#64748B', fontWeight: '800' },
  badgesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  badgeCard: { width: (width - 64) / 2, padding: 24, alignItems: 'center' },
  badgeCardLocked: { opacity: 0.9 },
  badgeIconContainer: { width: 84, height: 84, borderRadius: 42, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  unlockedIndicator: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#10B981', borderRadius: 12, borderWidth: 3, borderColor: '#FFF', padding: 2 },
  lockedIndicator: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#94A3B8', borderRadius: 12, borderWidth: 3, borderColor: '#FFF', padding: 2 },
  unlockedBadgeBadge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 10, backgroundColor: '#10B981', marginTop: 16 },
  couponCard: { flexDirection: 'row', alignItems: 'center', padding: 20, marginBottom: 16 },
  couponIcon: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  couponContent: { flex: 1 },
  redeemButton: { paddingHorizontal: 18, paddingVertical: 12, borderRadius: 16, minWidth: 90, alignItems: 'center', overflow: 'hidden', justifyContent: 'center' },
  tipCard: { flexDirection: 'row', padding: 28, alignItems: 'center', marginTop: 10 },
  tipIconContainer: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  tipContent: { flex: 1, marginLeft: 20 },
});
