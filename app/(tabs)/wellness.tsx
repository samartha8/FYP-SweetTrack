import { useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, RefreshControl, Platform, Dimensions } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Activity, Droplet, Moon, Flame, X, TrendingUp, Link, ChevronRight, Plus, CheckCircle2, Sparkles } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, Layout, ZoomIn, FadeIn, SlideInRight } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useUser } from '@/contexts/UserContext';
import { useTheme } from '@/contexts/SettingsContext';
import { useTranslation } from '@/hooks/use-translation';
import { useMealTracking } from '@/contexts/MealTrackingContext';

const { width } = Dimensions.get('window');
type MetricType = 'steps' | 'water' | 'sleep' | 'calories';

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

export default function WellnessScreen() {
  const insets = useSafeAreaInsets();
  const { healthMetrics, dailyGoals, updateHealthMetrics, isGoogleFitConnected, connectGoogleFit, syncGoogleFitData } = useUser();
  const { colors, scale } = useTheme();
  const { t } = useTranslation();
  const { todayNutrition } = useMealTracking();
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState<MetricType | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Refresh health metrics when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      syncGoogleFitData();
    }, [syncGoogleFitData])
  );

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await syncGoogleFitData();
    setIsRefreshing(false);
  }, [syncGoogleFitData]);

  const metrics = useMemo(() => [
    {
      type: 'steps' as MetricType,
      icon: Activity,
      label: t.wellness.steps,
      value: healthMetrics.steps || 0,
      goal: dailyGoals.steps || 10000,
      unit: t.wellness.unitSteps,
      colors: ['#FFB700', '#FF8E00'], 
      accent: '#FFF',
    },
    {
      type: 'water' as MetricType,
      icon: Droplet,
      label: t.wellness.water,
      value: healthMetrics.water || 0,
      goal: dailyGoals.water || 8,
      unit: t.wellness.unitWater,
      colors: ['#00B4DB', '#0083B0'], 
      accent: '#FFF',
    },
    {
      type: 'sleep' as MetricType,
      icon: Moon,
      label: t.wellness.sleep,
      value: healthMetrics.sleep || 0,
      goal: dailyGoals.sleep || 8,
      unit: t.wellness.unitSleep,
      colors: ['#8E2DE2', '#4A00E0'], 
      accent: '#FFF',
    },
    {
      type: 'calories' as MetricType,
      icon: Flame,
      label: t.wellness.calories,
      value: healthMetrics.calories || 0, 
      consumed: todayNutrition.calories || 0,
      goal: dailyGoals.calories || 2000,
      unit: t.wellness.unitCalories,
      colors: ['#FF512F', '#DD2476'], 
      accent: '#FFF',
    },
  ], [healthMetrics, dailyGoals, t, todayNutrition.calories]);

  const handleOpenModal = (type: MetricType) => {
    setSelectedMetric(type);
    const metric = metrics.find(m => m.type === type);
    setInputValue(metric?.value.toString() || '0');
    setModalVisible(true);
  };

  const notifySuccess = () => {
      if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
  };

  const handleSave = () => {
    if (selectedMetric && inputValue) {
      const value = parseFloat(inputValue);
      if (!isNaN(value)) {
        const goal = dailyGoals[selectedMetric === 'sleep' ? 'sleep' : selectedMetric] || 1;
        if (value >= goal) notifySuccess();
        updateHealthMetrics({ [selectedMetric]: value });
      }
    }
    setModalVisible(false);
    setSelectedMetric(null);
    setInputValue('');
  };

  const handleQuickAdd = (type: MetricType, amount: number) => {
    const currentValue = healthMetrics[type] || 0;
    const newValue = currentValue + amount;
    const goal = dailyGoals[type === 'sleep' ? 'sleep' : type] || 1;
    
    if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    
    // Notify if this specific push crosses the goal
    if (currentValue < goal && newValue >= goal) {
        notifySuccess();
    }
    
    updateHealthMetrics({ [type]: newValue });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.backgroundSecondary, paddingTop: insets.top }]}>
      <LinearGradient
        colors={['#DCFCE7', '#F0FDF4', '#FFFFFF']}
        style={StyleSheet.absoluteFill}
      />
      
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.headerTitle, { color: colors.text, fontSize: scale(32) }]}>{t.wellness.header}</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary, fontSize: scale(15) }]}>{t.wellness.subtitle}</Text>
        </View>
        <TouchableOpacity style={[styles.profileBrief, { backgroundColor: '#FFF' }]} activeOpacity={0.7}>
            <Activity size={24} color={colors.primary} strokeWidth={2.5} />
        </TouchableOpacity>
      </View>

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
        {isGoogleFitConnected ? (
          <>
            {metrics.map((metric, index) => {
              const denominator = metric.goal > 0 ? metric.goal : 1;
              const rawValue = metric.type === 'calories' ? (metric.consumed || 0) : metric.value;
              const rawPercentage = (rawValue / denominator) * 100;
              const progressPercent = Math.min(Math.max(rawPercentage, 0), 100);
              const isCompleted = rawPercentage >= 100;
              const Icon = metric.icon;

              return (
                <Animated.View 
                    key={metric.type} 
                    entering={FadeInDown.delay(index * 100)}
                    layout={Layout.springify()}
                    style={styles.metricCard}
                >
                  <LinearGradient
                    colors={metric.colors as any}
                    style={[styles.metricGradient, isCompleted && styles.completedCardBorder]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    {/* Header Row */}
                    <View style={styles.metricCardHeader}>
                      <View style={styles.iconCircle}>
                        <Icon size={scale(24)} color={metric.accent} strokeWidth={2.5} />
                      </View>
                      
                      <TouchableOpacity
                        style={styles.glassEditButton}
                        onPress={() => handleOpenModal(metric.type)}
                      >
                        <Text style={styles.editButtonText}>{t.common.edit}</Text>
                      </TouchableOpacity>
                    </View>

                    {/* Title */}
                    <View style={styles.labelRow}>
                        <Text style={[styles.metricLabel, { fontSize: scale(16) }]}>{metric.label}</Text>
                        {isCompleted && (
                            <Animated.View entering={ZoomIn} style={styles.badge}>
                                <CheckCircle2 size={12} color="#FFF" />
                                <Text style={styles.badgeText}>Goal Hit</Text>
                            </Animated.View>
                        )}
                    </View>

                    {/* Values Display */}
                    {metric.type === 'calories' ? (
                      <View style={styles.calorieGrid}>
                        <View style={styles.calorieStat}>
                          <Text style={[styles.calorieValueText, { fontSize: scale(22) }]}>{Math.round(metric.consumed || 0)}</Text>
                          <Text style={[styles.calorieLabelText, { fontSize: scale(10) }]}>{t.wellness.caloriesEaten}</Text>
                        </View>
                        <View style={styles.calorieDivider} />
                        <View style={styles.calorieStat}>
                          <Text style={[styles.calorieValueText, { fontSize: scale(22) }]}>{Math.round(metric.value)}</Text>
                          <Text style={[styles.calorieLabelText, { fontSize: scale(10) }]}>{t.wellness.caloriesBurned}</Text>
                        </View>
                        <View style={styles.calorieDivider} />
                        <View style={styles.calorieStat}>
                          <Text style={[styles.calorieValueText, { fontSize: scale(22) }]}>
                            {Math.round((metric.consumed || 0) - metric.value)}
                          </Text>
                          <Text style={[styles.calorieLabelText, { fontSize: scale(10) }]}>Net</Text>
                        </View>
                      </View>
                    ) : (
                      <View style={styles.mainValueRow}>
                        <Text style={[styles.largeValue, { fontSize: scale(48) }]}>{metric.value}</Text>
                        <Text style={[styles.goalText, { fontSize: scale(18) }]}>/ {metric.goal} {metric.unit}</Text>
                      </View>
                    )}

                    {/* Percentage Display */}
                    <View style={styles.progressContainer}>
                      <View style={styles.progressTrack}>
                        <View style={[styles.progressFill, { 
                          width: `${progressPercent}%`,
                          backgroundColor: metric.accent
                        }]} />
                      </View>
                      <Text style={[styles.percentageText, { fontSize: scale(16) }]}>
                        {Math.round(rawPercentage)}%
                      </Text>
                    </View>

                    {/* Quick Addition Row */}
                    <View style={styles.actionsRow}>
                      {metric.type === 'steps' && (
                        <>
                          <QuickAddButton label="+1000" onPress={() => handleQuickAdd('steps', 1000)} />
                          <QuickAddButton label="+5000" onPress={() => handleQuickAdd('steps', 5000)} />
                        </>
                      )}
                      {metric.type === 'water' && (
                        <>
                          <QuickAddButton label={`+1 ${metric.unit}`} onPress={() => handleQuickAdd('water', 1)} />
                          <QuickAddButton label={`+2 ${metric.unit}`} onPress={() => handleQuickAdd('water', 2)} />
                        </>
                      )}
                      {metric.type === 'sleep' && (
                        <>
                          <QuickAddButton label="+1 hr" onPress={() => handleQuickAdd('sleep', 1)} />
                          <QuickAddButton label="+2 hrs" onPress={() => handleQuickAdd('sleep', 2)} />
                        </>
                      )}
                      {metric.type === 'calories' && (
                        <>
                          <QuickAddButton label="+100" onPress={() => handleQuickAdd('calories', 100)} />
                          <QuickAddButton label="+500" onPress={() => handleQuickAdd('calories', 500)} />
                        </>
                      )}
                    </View>
                  </LinearGradient>
                </Animated.View>
              );
            })}

            {/* Bottom Status Tips */}
            <Animated.View entering={FadeIn} style={[styles.weeklySummary, { backgroundColor: '#FFF' }]}>
              <View style={[styles.summaryIcon, { backgroundColor: colors.primary + '15' }]}>
                <TrendingUp size={24} color={colors.primary} />
              </View>
              <View style={styles.summaryText}>
                <Text style={[styles.summaryTitle, { color: colors.text, fontSize: scale(18) }]}>{t.wellness.weeklySummary}</Text>
                <Text style={[styles.summaryDesc, { color: colors.textSecondary, fontSize: scale(14) }]}>
                  {t.wellness.keepTracking}
                </Text>
              </View>
            </Animated.View>
          </>
        ) : (
          <Animated.View entering={FadeInDown} style={styles.lockedStateContainer}>
            <View style={[styles.lockedIconBox, { backgroundColor: colors.primary + '10' }]}>
              <Sparkles size={40} color={colors.primary} />
            </View>
            <Text style={[styles.lockedTitle, { color: colors.text }]}>{t.wellness.lockedTitle}</Text>
            <Text style={[styles.lockedDesc, { color: colors.textSecondary }]}>
              {t.wellness.lockedDesc}
            </Text>
            <TouchableOpacity
              style={[styles.connectButton, { backgroundColor: colors.primary }]}
              onPress={connectGoogleFit}
            >
              <Text style={styles.connectButtonText}>{t.home.btnConnect}</Text>
              <ChevronRight size={20} color="#FFF" />
            </TouchableOpacity>
          </Animated.View>
        )}
      </ScrollView>

      {/* Input Modal */}
      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.4)' }]}>
          <Animated.View entering={FadeInDown} style={[styles.modalContent, { backgroundColor: '#FFF' }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text, fontSize: scale(22) }]}>
                {t.common.update} {metrics.find(m => m.type === selectedMetric)?.label}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={[styles.modalInput, { backgroundColor: '#F8FAFC', color: colors.text, borderColor: '#E2E8F0' }]}
              value={inputValue}
              onChangeText={setInputValue}
              keyboardType="numeric"
              placeholder={t.wellness.enterValue}
              placeholderTextColor={colors.textLight}
              autoFocus
            />

            <TouchableOpacity activeOpacity={0.8} style={styles.saveButton} onPress={handleSave}>
              <LinearGradient colors={['#00B4D8', '#0077B6'] as any} style={styles.saveButtonGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                <Text style={[styles.saveButtonText, { fontSize: scale(18) }]}>{t.common.save}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

function QuickAddButton({ label, onPress }: { label: string; onPress: () => void }) {
    return (
        <AnimatedTouchableOpacity activeOpacity={0.7} onPress={onPress} style={styles.quickAdd}>
            <Plus size={14} color="#FFF" style={{ marginRight: 4 }} />
            <Text style={styles.quickAddText}>{label}</Text>
        </AnimatedTouchableOpacity>
    );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 20,
  },
  headerTitle: { fontSize: 32, fontWeight: '900', letterSpacing: -1 },
  headerSubtitle: { fontSize: 15, fontWeight: '500', marginTop: 2, opacity: 0.8 },
  profileBrief: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
        native: { elevation: 3, shadowOpacity: 0.1, shadowRadius: 10 }
    })
  },
  scrollView: { flex: 1 },
  scrollContent: { padding: 24, paddingBottom: 50 },
  googleFitCard: {
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 24,
    ...Platform.select({
        native: { elevation: 12, shadowColor: '#4285F4', shadowOpacity: 0.2, shadowRadius: 15 }
    })
  },
  googleFitGradient: { padding: 24, flexDirection: 'row', alignItems: 'center' },
  googleFitIconBox: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  googleFitTextContainer: { flex: 1 },
  googleFitTitle: { fontSize: 20, fontWeight: '800', color: '#FFF' },
  googleFitDesc: { fontSize: 14, color: '#FFF', opacity: 0.85 },
  metricCard: {
    borderRadius: 30,
    overflow: 'hidden',
    marginBottom: 20,
    ...Platform.select({
        native: { elevation: 8, shadowOpacity: 0.15, shadowRadius: 20 }
    })
  },
  metricGradient: { padding: 24 },
  completedCardBorder: { borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)' },
  metricCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  glassEditButton: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  editButtonText: { fontSize: 13, fontWeight: '800', color: '#FFF', textTransform: 'uppercase' },
  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  metricLabel: { fontSize: 16, fontWeight: '800', color: '#FFF', textTransform: 'uppercase' },
  badge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, gap: 4 },
  badgeText: { fontSize: 10, color: '#FFF', fontWeight: '900', textTransform: 'uppercase' },
  mainValueRow: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 20 },
  largeValue: { fontSize: 48, fontWeight: '900', color: '#FFF' },
  goalText: { fontSize: 18, color: '#FFF', opacity: 0.7, marginLeft: 8 },
  calorieGrid: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20, padding: 16, marginBottom: 20, alignItems: 'center' },
  calorieStat: { flex: 1, alignItems: 'center' },
  calorieValueText: { fontSize: 22, fontWeight: '900', color: '#FFF' },
  calorieLabelText: { fontSize: 10, color: '#FFF', opacity: 0.8, fontWeight: '700', textTransform: 'uppercase' },
  calorieDivider: { width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.2)' },
  progressContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  progressTrack: { flex: 1, height: 12, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 6, overflow: 'hidden', marginRight: 12 },
  progressFill: { height: '100%', borderRadius: 6 },
  percentageText: { fontSize: 16, fontWeight: '900', color: '#FFF', width: 65, textAlign: 'right' },
  actionsRow: { flexDirection: 'row', gap: 12 },
  quickAdd: { flex: 1, flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.2)', paddingVertical: 14, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  quickAddText: { fontSize: 15, fontWeight: '800', color: '#FFF' },
  weeklySummary: { flexDirection: 'row', padding: 20, borderRadius: 24, alignItems: 'center', marginTop: 10 },
  summaryIcon: { width: 52, height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  summaryText: { flex: 1 },
  summaryTitle: { fontSize: 18, fontWeight: '800' },
  summaryDesc: { fontSize: 14, fontWeight: '500', opacity: 0.8 },
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalContent: { width: '100%', maxWidth: 400, borderRadius: 30, padding: 30 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 22, fontWeight: '900' },
  modalInput: { borderRadius: 18, paddingHorizontal: 20, paddingVertical: 18, fontSize: 18, fontWeight: '700', marginBottom: 24, borderWidth: 1.5 },
  saveButton: { borderRadius: 18, overflow: 'hidden' },
  saveButtonGradient: { paddingVertical: 18, alignItems: 'center' },
  saveButtonText: { fontSize: 18, fontWeight: '800', color: '#FFF' },
  lockedStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginTop: 20,
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  lockedIconBox: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  lockedTitle: {
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 10,
    textAlign: 'center',
  },
  lockedDesc: {
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 22,
    opacity: 0.7,
    marginBottom: 30,
  },
  connectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 25,
    paddingVertical: 15,
    borderRadius: 15,
    gap: 10,
  },
  connectButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
});

