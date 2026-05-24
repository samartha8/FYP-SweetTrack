import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ColorValue, Alert, Platform, Dimensions, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Award, Trophy, Star, Gift, Zap, Target, TrendingUp, Heart, CheckCircle2, Droplets, Lock, ChevronRight, Sparkles, ShieldCheck, Medal } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInUp, ZoomIn, Layout } from 'react-native-reanimated';
import { useAuth } from '@/contexts/AuthContext';
import { useHealth } from '@/contexts/HealthContext';
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
  const { user } = useAuth();
  const { rewardsPoints, redeemedRewards, redeemReward, streak, unlockedBadges } = useHealth();
  const { colors, scale } = useTheme();
  const { t } = useTranslation();
  const [isRedeeming, setIsRedeeming] = useState<string | null>(null);
  const [claimedRewardTitle, setClaimedRewardTitle] = useState<string | null>(null);

  const safeUnlockedBadges = useMemo(() => Array.isArray(unlockedBadges) ? unlockedBadges : [], [unlockedBadges]);

  const badges: Badge[] = useMemo(() => [
    {
      id: '1',
      name: t.rewards.badge1Name,
      description: t.rewards.badge1Desc,
      icon: Star,
      color: '#FFB700',
      gradient: ['#F8FAFC', '#F1F5F9'],
      unlockedGradient: ['#F59E0B', '#D97706'],
      unlocked: safeUnlockedBadges.includes('1'),
    },
    {
      id: '2',
      name: t.rewards.badge2Name,
      description: t.rewards.badge2Desc,
      icon: Zap,
      color: '#6366F1',
      gradient: ['#F8FAFC', '#F1F5F9'],
      unlockedGradient: ['#6366F1', '#4F46E5'],
      unlocked: safeUnlockedBadges.includes('2'),
    },
    {
      id: '3',
      name: t.rewards.badge3Name,
      description: t.rewards.badge3Desc,
      icon: Trophy,
      color: '#10B981',
      gradient: ['#F8FAFC', '#F1F5F9'],
      unlockedGradient: ['#10B981', '#059669'],
      unlocked: safeUnlockedBadges.includes('3'),
    },
    {
      id: '4',
      name: t.rewards.badge4Name,
      description: t.rewards.badge4Desc,
      icon: Droplets,
      color: '#0EA5E9',
      gradient: ['#F8FAFC', '#F1F5F9'],
      unlockedGradient: ['#0EA5E9', '#0284C7'],
      unlocked: safeUnlockedBadges.includes('4'),
    },
    {
      id: '5',
      name: t.rewards.badge5Name,
      description: t.rewards.badge5Desc,
      icon: TrendingUp,
      color: '#8B5CF6',
      gradient: ['#F8FAFC', '#F1F5F9'],
      unlockedGradient: ['#8B5CF6', '#7C3AED'],
      unlocked: safeUnlockedBadges.includes('5'),
    },
    {
      id: '6',
      name: t.rewards.badge6Name,
      description: t.rewards.badge6Desc,
      icon: Heart,
      color: '#EF4444',
      gradient: ['#F8FAFC', '#F1F5F9'],
      unlockedGradient: ['#EF4444', '#DC2626'],
      unlocked: safeUnlockedBadges.includes('6'),
    },
  ], [t, safeUnlockedBadges]);

  const coupons = useMemo(() => [
    { id: 'bhat_bhateni_500', title: 'Bhat-Bhateni Rs. 500 Voucher', points: 1000 },
    { id: 'qfx_ticket', title: 'QFX Cinemas Movie Ticket', points: 1500 },
  ].map(c => ({
    ...c,
    isRedeemed: (redeemedRewards || []).includes(c.id),
    available: (rewardsPoints || 0) >= c.points
  })), [rewardsPoints, redeemedRewards]);

  const handleRedeem = async (couponId: string, title: string, cost: number) => {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm(`Are you sure you want to redeem "${title}" for ${cost} points?`);
      if (confirmed) {
        setIsRedeeming(couponId);
        const res = await redeemReward(couponId, cost);
        setIsRedeeming(null);
        if (res.success) setClaimedRewardTitle(title);
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
            if (res.success) setClaimedRewardTitle(title);
            else Alert.alert("Error", res.message || "Failed.");
          }
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#F8FAFC', '#F1F5F9', '#E2E8F0']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
           <Text style={styles.headerTitle}>Achievements</Text>
           <Text style={styles.headerSubtitle}>Unlock badges and redeem rewards</Text>
        </View>

        <Animated.View entering={FadeInUp} style={styles.heroCard}>
          <LinearGradient
            colors={['#10B981', '#059669']}
            style={styles.heroGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.heroGlass} />
            <View style={styles.heroStats}>
              <View style={styles.heroStatItem}>
                 <Award size={24} color="#FFF" />
                 <Text style={styles.heroStatVal}>{rewardsPoints?.toLocaleString() || '0'}</Text>
                 <Text style={styles.heroStatLabel}>POINTS</Text>
              </View>
              <View style={styles.heroStatDivider} />
              <View style={styles.heroStatItem}>
                 <Zap size={24} color="#FFF" />
                 <Text style={styles.heroStatVal}>{streak || '0'}</Text>
                 <Text style={styles.heroStatLabel}>STREAK</Text>
              </View>
              <View style={styles.heroStatDivider} />
              <View style={styles.heroStatItem}>
                 <Trophy size={24} color="#FFF" />
                 <Text style={styles.heroStatVal}>{safeUnlockedBadges.length}</Text>
                 <Text style={styles.heroStatLabel}>BADGES</Text>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionHeading}>Badges</Text>
            <View style={styles.badgeCounter}>
                <Text style={styles.badgeCounterText}>{safeUnlockedBadges.length} / {badges.length}</Text>
            </View>
          </View>
          <View style={styles.badgesGrid}>
            {badges.map((badge, index) => {
              const Icon = badge.icon;
              return (
                <Animated.View 
                  key={badge.id} 
                  entering={FadeInDown.delay(index * 100)} 
                  style={[styles.badgeCard, !badge.unlocked && styles.badgeLocked]}
                >
                  <LinearGradient 
                    colors={badge.unlocked ? (badge.unlockedGradient as any) : (['#E2E8F0', '#CBD5E1'] as any)} 
                    style={styles.badgeIconBox}
                  >
                    <Icon size={32} color="#FFF" strokeWidth={2.5} />
                    {badge.unlocked && (
                      <View style={styles.unlockedTag}>
                        <CheckCircle2 size={12} color="#FFF" />
                      </View>
                    )}
                    {!badge.unlocked && (
                      <View style={styles.lockedTag}>
                        <Lock size={12} color="#FFF" />
                      </View>
                    )}
                  </LinearGradient>
                  <Text style={[styles.badgeName, !badge.unlocked && { color: '#64748B' }]}>{badge.name}</Text>
                  <Text style={styles.badgeDesc}>{badge.description}</Text>
                  {badge.unlocked && (
                    <View style={styles.earnedTag}>
                       <Text style={styles.earnedTagText}>EARNED</Text>
                    </View>
                  )}
                </Animated.View>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionHeading}>Marketplace</Text>
          {coupons.map((coupon, index) => (
            <Animated.View key={coupon.id} entering={FadeInDown.delay(400 + index * 100)} style={styles.couponCard}>
              <View style={[styles.couponIconBox, { backgroundColor: coupon.available ? '#F0FDF4' : '#F1F5F9' }]}>
                <Gift size={24} color={coupon.available ? '#10B981' : '#94A3B8'} />
              </View>
              <View style={styles.couponContent}>
                <Text style={[styles.couponTitle, !coupon.available && { color: '#94A3B8' }]}>{coupon.title}</Text>
                <View style={styles.pointsReq}>
                   <Medal size={14} color={coupon.available ? '#F59E0B' : '#94A3B8'} />
                   <Text style={[styles.couponPoints, { color: coupon.available ? '#F59E0B' : '#94A3B8' }]}>{coupon.points} points</Text>
                </View>
              </View>
              <TouchableOpacity
                activeOpacity={0.8}
                style={[styles.redeemBtn, (!coupon.available || coupon.isRedeemed) ? { backgroundColor: '#F1F5F9' } : { backgroundColor: '#10B981' }]}
                disabled={!coupon.available || coupon.isRedeemed || isRedeeming === coupon.id}
                onPress={() => handleRedeem(coupon.id, coupon.title, coupon.points)}
              >
                <Text style={[styles.redeemBtnText, { color: (!coupon.available || coupon.isRedeemed) ? '#94A3B8' : '#FFF' }]}>
                  {isRedeeming === coupon.id ? '...' : coupon.isRedeemed ? 'USED' : 'CLAIM'}
                </Text>
              </TouchableOpacity>
            </Animated.View>
          ))}
        </View>

        <Animated.View entering={FadeInDown.delay(600)} style={styles.tipBox}>
           <LinearGradient
            colors={['#FFF', '#F8FAFC']}
            style={styles.tipGradient}
           >
              <View style={styles.tipIconBox}>
                <Sparkles size={22} color="#10B981" />
              </View>
              <View style={styles.tipText}>
                <Text style={styles.tipTitle}>Pro Strategy</Text>
                <Text style={styles.tipDesc}>Keep your streak alive to unlock rare badges and boost your point multiplier!</Text>
              </View>
           </LinearGradient>
        </Animated.View>
      </ScrollView>

      {/* Success Modal Overlay */}
      <Modal
        visible={claimedRewardTitle !== null}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <Animated.View entering={ZoomIn.springify()} style={styles.modalContent}>
            <LinearGradient
              colors={['#10B981', '#059669']}
              style={styles.modalGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.modalIconBox}>
                <Gift size={48} color="#10B981" strokeWidth={2} />
              </View>
              <Text style={styles.modalTitle}>Reward Claimed!</Text>
              <Text style={styles.modalDesc}>
                You successfully claimed {claimedRewardTitle}. Check your email for the voucher details!
              </Text>
              
              <TouchableOpacity 
                style={styles.modalButton}
                activeOpacity={0.9}
                onPress={() => setClaimedRewardTitle(null)}
              >
                <Text style={styles.modalButtonText}>Awesome</Text>
              </TouchableOpacity>
            </LinearGradient>
          </Animated.View>
        </View>
      </Modal>
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
    paddingHorizontal: 24,
    paddingBottom: 100,
  },
  header: {
    marginBottom: 32,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1E293B',
    letterSpacing: -1,
  },
  headerSubtitle: {
    fontSize: 15,
    color: '#64748B',
    marginTop: 4,
  },
  heroCard: {
    borderRadius: 32,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    marginBottom: 40,
  },
  heroGradient: {
    padding: 32,
  },
  heroGlass: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  heroStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroStatItem: {
    alignItems: 'center',
    flex: 1,
  },
  heroStatVal: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFF',
    marginVertical: 4,
    letterSpacing: -0.5,
  },
  heroStatLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.8)',
    letterSpacing: 1,
  },
  heroStatDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  section: {
    marginBottom: 40,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  sectionHeading: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1E293B',
    letterSpacing: -0.5,
  },
  badgeCounter: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  badgeCounterText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748B',
  },
  badgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 16,
  },
  badgeCard: {
    width: (width - 64) / 2,
    backgroundColor: '#FFF',
    borderRadius: 28,
    padding: 24,
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
  },
  badgeLocked: {
    opacity: 0.7,
  },
  badgeIconBox: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  unlockedTag: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#10B981',
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  lockedTag: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#94A3B8',
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  badgeName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E293B',
    textAlign: 'center',
    marginBottom: 4,
  },
  badgeDesc: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 16,
  },
  earnedTag: {
    marginTop: 12,
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  earnedTagText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#10B981',
    letterSpacing: 0.5,
  },
  couponCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 24,
    marginBottom: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
  },
  couponIconBox: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  couponContent: {
    flex: 1,
  },
  couponTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
  },
  pointsReq: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  couponPoints: {
    fontSize: 13,
    fontWeight: '700',
  },
  redeemBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    minWidth: 80,
    alignItems: 'center',
  },
  redeemBtnText: {
    fontSize: 12,
    fontWeight: '900',
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
    padding: 24,
    alignItems: 'center',
  },
  tipIconBox: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 20,
  },
  tipText: {
    flex: 1,
  },
  tipTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 4,
  },
  tipDesc: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    borderRadius: 32,
    overflow: 'hidden',
    elevation: 24,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
  },
  modalGradient: {
    padding: 32,
    alignItems: 'center',
  },
  modalIconBox: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  modalTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFF',
    marginBottom: 12,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  modalDesc: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  modalButton: {
    backgroundColor: '#FFF',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 16,
    width: '100%',
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#10B981',
  }
});
