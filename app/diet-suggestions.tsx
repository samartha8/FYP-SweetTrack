import { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  X,
  Apple,
  Heart,
  Activity,
  Target,
  Leaf,
  ChevronRight,
  UtensilsCrossed,
  Sparkles,
  CheckCircle2,
  Flame,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { useUser } from '@/contexts/UserContext';

import { DIET_PLANS, DietPlan } from '@/constants/foodData';
import { useMealTracking } from '@/contexts/MealTrackingContext';
import { useTheme } from '@/contexts/SettingsContext';
import { useTranslation } from '@/hooks/use-translation';

const dietIcons = {
  apple: Apple,
  target: Target,
  heart: Heart,
  activity: Activity,
  dumbbell: Activity,
  leaf: Leaf,
};

export default function DietSuggestionsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { selectedDietPlan, setSelectedDietPlan } = useMealTracking();
  const { user, riskStatus } = useUser();
  
  const recommendedPlanId = useMemo(() => {
    if (riskStatus === 'Positive') return 'diabetic';
    const highBP = user?.highBP ?? (user as any)?.healthData?.highBP;
    if (highBP === 1) return 'heart-healthy';
    const bmi = user?.bmi ?? (user as any)?.healthData?.bmi;
    if (bmi && bmi > 25) return 'weight-loss';
    return 'balanced';
  }, [riskStatus, user]);

  const { colors, scale } = useTheme();
  const { t } = useTranslation();
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null);

  // Dynamic Styles
  const themed = useMemo(() => ({
    container: { backgroundColor: 'transparent' },
    header: { backgroundColor: 'transparent', borderBottomWidth: 0 },
    headerTitle: { color: colors.text, fontSize: scale(18) },
    introCard: { backgroundColor: colors.primary + '10' },
    introTitle: { color: colors.text, fontSize: scale(20) },
    introText: { color: colors.textSecondary, fontSize: scale(14) },
    sectionTitle: { color: colors.text, fontSize: scale(20) },
    sectionSubtitle: { color: colors.textSecondary, fontSize: scale(14) },
    planCard: { backgroundColor: colors.card, shadowColor: colors.cardShadow },
    planHeaderSelected: { backgroundColor: colors.primary + '08' },
    planName: { color: colors.text, fontSize: scale(16) },
    selectedBadgeText: { color: colors.textWhite, fontSize: scale(11) },
    planDescription: { color: colors.textSecondary, fontSize: scale(13) },
    planDetails: { borderTopColor: colors.border },
    detailSectionTitle: { color: colors.text, fontSize: scale(15) },
    tagText: { fontSize: scale(12) },
    calorieCard: { backgroundColor: colors.warning + '10' },
    calorieText: { color: colors.text, fontSize: scale(15) },
    macroGrid: { backgroundColor: colors.backgroundSecondary },
    macroValue: { color: colors.primary, fontSize: scale(24) },
    macroLabel: { color: colors.textSecondary, fontSize: scale(12) },
    listText: { color: colors.text, fontSize: scale(14) },
    selectButtonText: { color: colors.textWhite, fontSize: scale(15) },
    noteCard: { backgroundColor: colors.warning + '10', borderLeftColor: colors.warning },
    noteTitle: { color: colors.text, fontSize: scale(14) },
    noteText: { color: colors.textSecondary, fontSize: scale(13) },
  }), [colors, scale]);

  const handleSelectPlan = (planId: string) => {
    setSelectedDietPlan(planId);
    Alert.alert(
      t.dietSuggestions.alertTitle,
      t.dietSuggestions.alertMsg,
      [{ text: t.common.ok }]
    );
  };

  const toggleExpand = (planId: string) => {
    setExpandedPlan(expandedPlan === planId ? null : planId);
  };

  const renderDietPlan = (plan: DietPlan) => {
    const isSelected = selectedDietPlan === plan.id;
    const isExpanded = expandedPlan === plan.id;
    const IconComponent = dietIcons[plan.icon as keyof typeof dietIcons] || Activity;

    return (
      <View key={plan.id} style={[styles.planCard, themed.planCard]}>
        <TouchableOpacity
          style={[styles.planHeader, isSelected && themed.planHeaderSelected]}
          onPress={() => toggleExpand(plan.id)}
          activeOpacity={0.8}
        >
          <View style={[styles.planIconContainer, { backgroundColor: plan.color + '20' }]}>
            <IconComponent size={28} color={plan.color} strokeWidth={2} />
          </View>

          <View style={styles.planHeaderText}>
            <View style={styles.planTitleRow}>
              <Text style={[styles.planName, themed.planName]}>{t.dietSuggestions.plans[plan.id as keyof typeof t.dietSuggestions.plans] || plan.name}</Text>
              {isSelected && (
                <View style={[styles.selectedBadge, { backgroundColor: plan.color }]}>
                  <CheckCircle2 size={14} color={colors.textWhite} strokeWidth={2.5} />
                  <Text style={[styles.selectedBadgeText, themed.selectedBadgeText]}>{t.dietSuggestions.active}</Text>
                </View>
              )}
              {plan.id === recommendedPlanId && !isSelected && (
                <View style={[styles.selectedBadge, { backgroundColor: colors.warning + '20' }]}>
                  <Sparkles size={12} color={colors.warning} strokeWidth={2.5} />
                  <Text style={[styles.selectedBadgeText, themed.selectedBadgeText, { color: colors.warning }]}>AI Recommended</Text>
                </View>
              )}
            </View>
            <Text style={[styles.planDescription, themed.planDescription]} numberOfLines={2}>
              {t.dietSuggestions.planDescriptions[plan.id as keyof typeof t.dietSuggestions.planDescriptions] || plan.description}
            </Text>
          </View>

          <ChevronRight
            size={24}
            color={colors.textSecondary}
            strokeWidth={2}
            style={[
              styles.expandIcon,
              isExpanded && { transform: [{ rotate: '90deg' }] },
            ]}
          />
        </TouchableOpacity>

        {isExpanded && (
          <View style={[styles.planDetails, themed.planDetails]}>
            <View style={styles.detailSection}>
              <Text style={[styles.detailSectionTitle, themed.detailSectionTitle]}>{t.dietSuggestions.targetConditions}</Text>
              <View style={styles.tagContainer}>
                {(t.dietSuggestions.planDetails[plan.id as keyof typeof t.dietSuggestions.planDetails]?.conditions || plan.targetCondition).map((condition, idx) => (
                  <View key={idx} style={[styles.tag, { borderColor: plan.color }]}>
                    <Text style={[styles.tagText, themed.tagText, { color: plan.color }]}>{condition}</Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.detailSection}>
              <Text style={[styles.detailSectionTitle, themed.detailSectionTitle]}>{t.dietSuggestions.dailyCalorieTarget}</Text>
              <View style={[styles.calorieCard, themed.calorieCard]}>
                <Flame size={20} color={colors.warning} strokeWidth={2} />
                <Text style={[styles.calorieText, themed.calorieText]}>{plan.dailyCalorieTarget} {t.wellness.unitCalories} {t.dietSuggestions.perDay}</Text>
              </View>
            </View>

            <View style={styles.detailSection}>
              <Text style={[styles.detailSectionTitle, themed.detailSectionTitle]}>{t.dietSuggestions.macroRatio}</Text>
              <View style={[styles.macroGrid, themed.macroGrid]}>
                <View style={styles.macroItem}>
                  <Text style={[styles.macroValue, themed.macroValue]}>{plan.macroRatio.protein}%</Text>
                  <Text style={[styles.macroLabel, themed.macroLabel]}>{t.progress.protein}</Text>
                </View>
                <View style={styles.macroItem}>
                  <Text style={[styles.macroValue, themed.macroValue]}>{plan.macroRatio.carbs}%</Text>
                  <Text style={[styles.macroLabel, themed.macroLabel]}>{t.progress.carbs}</Text>
                </View>
                <View style={styles.macroItem}>
                  <Text style={[styles.macroValue, themed.macroValue]}>{plan.macroRatio.fat}%</Text>
                  <Text style={[styles.macroLabel, themed.macroLabel]}>{t.progress.fat}</Text>
                </View>
              </View>
            </View>

            <View style={styles.detailSection}>
              <Text style={[styles.detailSectionTitle, themed.detailSectionTitle]}>{t.dietSuggestions.recommendations}</Text>
              {(t.dietSuggestions.planDetails[plan.id as keyof typeof t.dietSuggestions.planDetails]?.recs || plan.recommendations).map((rec, idx) => (
                <View key={idx} style={styles.listItem}>
                  <View style={[styles.listDot, { backgroundColor: plan.color }]} />
                  <Text style={[styles.listText, themed.listText]}>{rec}</Text>
                </View>
              ))}
            </View>

            <View style={styles.detailSection}>
              <Text style={[styles.detailSectionTitle, themed.detailSectionTitle]}>{t.dietSuggestions.foodsToAvoid}</Text>
              {(t.dietSuggestions.planDetails[plan.id as keyof typeof t.dietSuggestions.planDetails]?.avoid || plan.avoidFoods).map((food, idx) => (
                <View key={idx} style={styles.listItem}>
                  <View style={[styles.listDot, { backgroundColor: colors.error }]} />
                  <Text style={[styles.listText, themed.listText]}>{food}</Text>
                </View>
              ))}
            </View>

            {!isSelected && (
              <TouchableOpacity
                style={[styles.selectButton, { backgroundColor: plan.color }]}
                onPress={() => handleSelectPlan(plan.id)}
                activeOpacity={0.8}
              >
                <Text style={[styles.selectButtonText, themed.selectButtonText]}>{t.dietSuggestions.selectThisPlan}</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    );
  };

  const safeBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  };

  return (
    <LinearGradient 
      colors={['#F0FDF4', '#F0F9FF']} 
      style={[styles.container, { paddingTop: insets.top }]} 
      start={{ x: 0, y: 0 }} 
      end={{ x: 1, y: 1 }}
    >
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[styles.header, themed.header]}>
        <TouchableOpacity onPress={safeBack} style={styles.headerButton}>
          <X size={24} color={colors.text} strokeWidth={2.5} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, themed.headerTitle]}>{t.dietSuggestions.header}</Text>
        <View style={styles.headerButton} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.introCard, themed.introCard]}>
          <UtensilsCrossed size={32} color={colors.primary} strokeWidth={2} />
          <Text style={[styles.introTitle, themed.introTitle]}>{t.dietSuggestions.introTitle}</Text>
          <Text style={[styles.introText, themed.introText]}>
            {t.dietSuggestions.introText}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, themed.sectionTitle]}>{t.dietSuggestions.availablePlans}</Text>
          <Text style={[styles.sectionSubtitle, themed.sectionSubtitle]}>
            {t.dietSuggestions.selectPlanSubtitle}
          </Text>
        </View>

        {DIET_PLANS.map(renderDietPlan)}

        <View style={[styles.noteCard, themed.noteCard]}>
          <Text style={[styles.noteTitle, themed.noteTitle]}>{t.dietSuggestions.note}</Text>
          <Text style={[styles.noteText, themed.noteText]}>
            {t.dietSuggestions.noteText}
          </Text>
        </View>
      </ScrollView>
    </LinearGradient>
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
  introCard: {
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    marginBottom: 28,
  },
  introTitle: {
    fontWeight: '800',
    marginTop: 12,
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  introText: {
    textAlign: 'center',
    lineHeight: 22,
    fontWeight: '500',
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontWeight: '700',
    marginBottom: 4,
  },
  sectionSubtitle: {
  },
  planCard: {
    borderRadius: 24,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  planIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planHeaderText: {
    flex: 1,
    marginLeft: 16,
  },
  planTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  planName: {
    fontWeight: '700',
  },
  selectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
    gap: 4,
  },
  selectedBadgeText: {
    fontWeight: '700',
  },
  planDescription: {
    lineHeight: 18,
  },
  expandIcon: {
    marginLeft: 8,
  },
  planDetails: {
    padding: 16,
    paddingTop: 0,
    borderTopWidth: 1,
  },
  detailSection: {
    marginBottom: 20,
  },
  detailSectionTitle: {
    fontWeight: '700',
    marginBottom: 12,
  },
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  tagText: {
    fontWeight: '600',
  },
  calorieCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    gap: 8,
  },
  calorieText: {
    fontWeight: '600',
  },
  macroGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 16,
    borderRadius: 12,
  },
  macroItem: {
    alignItems: 'center',
  },
  macroValue: {
    fontWeight: '700',
    marginBottom: 4,
  },
  macroLabel: {
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  listDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 6,
    marginRight: 10,
  },
  listText: {
    flex: 1,
    lineHeight: 20,
  },
  selectButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  selectButtonText: {
    fontWeight: '700',
  },
  noteCard: {
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    borderLeftWidth: 4,
  },
  noteTitle: {
    fontWeight: '700',
    marginBottom: 8,
  },
  noteText: {
    lineHeight: 18,
  },
});
