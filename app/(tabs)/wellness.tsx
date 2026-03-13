import { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Activity, Droplet, Moon, Flame, X, TrendingUp, Link } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useUser } from '@/contexts/UserContext';
import { useTheme } from '@/contexts/SettingsContext';
import { useTranslation } from '@/hooks/use-translation';

type MetricType = 'steps' | 'water' | 'sleep' | 'calories';

export default function WellnessScreen() {
  const insets = useSafeAreaInsets();
  const { healthMetrics, dailyGoals, updateHealthMetrics, isGoogleFitConnected, connectGoogleFit } = useUser();
  const { colors, scale } = useTheme();
  const { t } = useTranslation();
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState<MetricType | null>(null);
  const [inputValue, setInputValue] = useState('');

  // Dynamic Styles
  const themed = useMemo(() => ({
    container: { backgroundColor: colors.backgroundSecondary },
    header: { backgroundColor: colors.background },
    headerTitle: { color: colors.text, fontSize: scale(28) },
    headerSubtitle: { color: colors.textSecondary, fontSize: scale(14) },
    card: { backgroundColor: colors.card, shadowColor: colors.cardShadow },
    tipsTitle: { color: colors.text, fontSize: scale(16) },
    tipsDescription: { color: colors.textSecondary, fontSize: scale(14) },
    modalOverlay: { backgroundColor: colors.overlay },
    modalContent: { backgroundColor: colors.card },
    modalTitle: { color: colors.text, fontSize: scale(20) },
    modalInput: { backgroundColor: colors.backgroundSecondary, color: colors.text, borderColor: colors.border },
    modalButtonText: { color: colors.textWhite, fontSize: scale(16) },
    googleFitTitle: { fontSize: scale(24) },
    googleFitDescription: { fontSize: scale(16) },
    metricLabel: { fontSize: scale(18) },
    metricValue: { fontSize: scale(36) },
    metricUnit: { fontSize: scale(16) },
    progressText: { fontSize: scale(14) },
    editButtonText: { fontSize: scale(14) },
    quickButtonText: { fontSize: scale(14) },
  }), [colors, scale]);

  const metrics = useMemo(() => [
    {
      type: 'steps' as MetricType,
      icon: Activity,
      label: t.wellness.steps,
      value: healthMetrics.steps,
      goal: dailyGoals.steps,
      unit: t.wellness.unitSteps,
      color: colors.chart?.bmi || '#FFD60A',
      gradient: [colors.chart?.bmi || '#FFD60A', (colors.chart?.bmi || '#FFD60A') + '80'],
    },
    {
      type: 'water' as MetricType,
      icon: Droplet,
      label: t.wellness.water,
      value: healthMetrics.water,
      goal: dailyGoals.water,
      unit: t.wellness.unitWater,
      color: colors.secondary,
      gradient: [colors.secondary, colors.secondary + '80'], // Fallback if light var missing
    },
    {
      type: 'sleep' as MetricType,
      icon: Moon,
      label: t.wellness.sleep,
      value: healthMetrics.sleep,
      goal: dailyGoals.sleep,
      unit: t.wellness.unitSleep,
      color: colors.chart?.glucose || '#30D158',
      gradient: [colors.chart?.glucose || '#30D158', (colors.chart?.glucose || '#30D158') + '80'],
    },
    {
      type: 'calories' as MetricType,
      icon: Flame,
      label: t.wellness.calories,
      value: healthMetrics.calories,
      goal: dailyGoals.calories,
      unit: t.wellness.unitCalories,
      color: colors.warning,
      gradient: [colors.warning, colors.warning + '80'],
    },
  ], [healthMetrics, dailyGoals, colors, t]);

  const handleOpenModal = (type: MetricType) => {
    setSelectedMetric(type);
    const metric = metrics.find(m => m.type === type);
    setInputValue(metric?.value.toString() || '0');
    setModalVisible(true);
  };

  const handleSave = () => {
    if (selectedMetric && inputValue) {
      const value = parseFloat(inputValue);
      if (!isNaN(value)) {
        updateHealthMetrics({ [selectedMetric]: value });
      }
    }
    setModalVisible(false);
    setSelectedMetric(null);
    setInputValue('');
  };

  const handleQuickAdd = (type: MetricType, amount: number) => {
    const currentValue = healthMetrics[type];
    updateHealthMetrics({ [type]: currentValue + amount });
  };

  return (
    <View style={[styles.container, themed.container, { paddingTop: insets.top }]}>
      <View style={[styles.header, themed.header]}>
        <Text style={[styles.headerTitle, themed.headerTitle]}>{t.wellness.header}</Text>
        <Text style={[styles.headerSubtitle, themed.headerSubtitle]}>{t.wellness.subtitle}</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {!isGoogleFitConnected ? (
          <TouchableOpacity
            style={styles.googleFitCard}
            activeOpacity={0.8}
            onPress={connectGoogleFit}
          >
            <LinearGradient
              colors={colors.gradient.primary as unknown as readonly [ColorValue, ColorValue, ...ColorValue[]]}
              style={styles.googleFitGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.googleFitContent}>
                <View style={styles.googleFitIconContainer}>
                  <Link size={40} color={colors.textWhite} strokeWidth={2} />
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
        ) : (
          <>
            {metrics.map((metric, index) => {
              const progress = Math.min((metric.value / metric.goal) * 100, 100);
              const Icon = metric.icon;

              return (
                <View key={index} style={[styles.metricCard, themed.card]}>
                  <LinearGradient
                    colors={metric.gradient as unknown as readonly [ColorValue, ColorValue, ...ColorValue[]]}
                    style={styles.metricGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <View style={styles.metricHeader}>
                      <View style={styles.metricIconContainer}>
                        <Icon size={28} color={colors.textWhite} strokeWidth={2} />
                      </View>
                      <TouchableOpacity
                        style={styles.editButton}
                        onPress={() => handleOpenModal(metric.type)}
                      >
                        <Text style={[styles.editButtonText, themed.editButtonText]}>{t.common.edit}</Text>
                      </TouchableOpacity>
                    </View>

                    <Text style={[styles.metricLabel, themed.metricLabel]}>{metric.label}</Text>
                    <View style={styles.metricValueContainer}>
                      <Text style={[styles.metricValue, themed.metricValue]}>{metric.value}</Text>
                      <Text style={[styles.metricUnit, themed.metricUnit]}> / {metric.goal} {metric.unit}</Text>
                    </View>

                    <View style={styles.progressBarContainer}>
                      <View style={styles.progressBarBackground}>
                        <View style={[styles.progressBarFill, { width: `${progress}%`, backgroundColor: colors.textWhite }]} />
                      </View>
                      <Text style={[styles.progressText, themed.progressText]}>{Math.round(progress)}%</Text>
                    </View>

                    <View style={styles.quickActions}>
                      {metric.type === 'steps' && (
                        <>
                          <TouchableOpacity
                            style={styles.quickButton}
                            onPress={() => handleQuickAdd(metric.type, 1000)}
                          >
                            <Text style={[styles.quickButtonText, themed.quickButtonText]}>+1000</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.quickButton}
                            onPress={() => handleQuickAdd(metric.type, 5000)}
                          >
                            <Text style={styles.quickButtonText}>+5000</Text>
                          </TouchableOpacity>
                        </>
                      )}
                      {metric.type === 'water' && (
                        <>
                          <TouchableOpacity
                            style={styles.quickButton}
                            onPress={() => handleQuickAdd(metric.type, 1)}
                          >
                            <Text style={styles.quickButtonText}>+1 glass</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.quickButton}
                            onPress={() => handleQuickAdd(metric.type, 2)}
                          >
                            <Text style={styles.quickButtonText}>+2 glasses</Text>
                          </TouchableOpacity>
                        </>
                      )}
                      {metric.type === 'sleep' && (
                        <>
                          <TouchableOpacity
                            style={styles.quickButton}
                            onPress={() => handleQuickAdd(metric.type, 1)}
                          >
                            <Text style={styles.quickButtonText}>+1 hr</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.quickButton}
                            onPress={() => handleQuickAdd(metric.type, 2)}
                          >
                            <Text style={styles.quickButtonText}>+2 hrs</Text>
                          </TouchableOpacity>
                        </>
                      )}
                      {metric.type === 'calories' && (
                        <>
                          <TouchableOpacity
                            style={styles.quickButton}
                            onPress={() => handleQuickAdd(metric.type, 100)}
                          >
                            <Text style={styles.quickButtonText}>+100</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.quickButton}
                            onPress={() => handleQuickAdd(metric.type, 500)}
                          >
                            <Text style={styles.quickButtonText}>+500</Text>
                          </TouchableOpacity>
                        </>
                      )}
                    </View>
                  </LinearGradient>
                </View>
              );
            })}
          </>
        )}

        {isGoogleFitConnected && (
          <View style={[styles.tipsCard, themed.card]}>
            <TrendingUp size={24} color={colors.primary} strokeWidth={2} />
            <View style={styles.tipsContent}>
              <Text style={[styles.tipsTitle, themed.tipsTitle]}>{t.wellness.weeklySummary}</Text>
              <Text style={[styles.tipsDescription, themed.tipsDescription]}>
                {t.wellness.keepTracking}
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={[styles.modalOverlay, themed.modalOverlay]}>
          <View style={[styles.modalContent, themed.modalContent]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, themed.modalTitle]}>
                {t.common.update} {metrics.find(m => m.type === selectedMetric)?.label}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={[styles.modalInput, themed.modalInput]}
              value={inputValue}
              onChangeText={setInputValue}
              keyboardType="numeric"
              placeholder={t.wellness.enterValue}
              placeholderTextColor={colors.textLight}
            />

            <TouchableOpacity style={styles.modalButton} onPress={handleSave}>
              <LinearGradient
                colors={colors.gradient.primary as unknown as readonly [ColorValue, ColorValue, ...ColorValue[]]}
                style={styles.modalButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={[styles.modalButtonText, themed.modalButtonText]}>{t.common.save}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  metricCard: {
    marginBottom: 20,
    borderRadius: 20,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  metricGradient: {
    padding: 20,
  },
  metricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  metricIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  editButtonText: {
    fontWeight: '600',
    color: '#FFF',
  },
  metricLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFF',
    marginBottom: 8,
  },
  metricValueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 16,
  },
  metricValue: {
    fontSize: 36,
    fontWeight: '700',
    color: '#FFF',
  },
  metricUnit: {
    fontSize: 16,
    color: '#FFF',
    opacity: 0.8,
  },
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  progressBarBackground: {
    flex: 1,
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 4,
    overflow: 'hidden',
    marginRight: 12,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFF',
    minWidth: 40,
    textAlign: 'right',
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
  },
  quickButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  quickButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
  tipsCard: {
    flexDirection: 'row',
    borderRadius: 16,
    padding: 16,
    marginTop: 10,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  tipsContent: {
    flex: 1,
    marginLeft: 16,
  },
  tipsTitle: {
    fontWeight: '700',
    marginBottom: 4,
  },
  tipsDescription: {
    lineHeight: 20,
  },
  googleFitCard: {
    marginBottom: 20,
    borderRadius: 20,
    overflow: 'hidden',
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
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 20,
  },
  googleFitTextContainer: {
    flex: 1,
  },
  googleFitTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 8,
  },
  googleFitDescription: {
    fontSize: 16,
    color: '#FFF',
    opacity: 0.9,
    lineHeight: 22,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 20,
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontWeight: '700',
  },
  modalInput: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    marginBottom: 20,
    borderWidth: 1,
  },
  modalButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  modalButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  modalButtonText: {
    fontWeight: '700',
  },
});
