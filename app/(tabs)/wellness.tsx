import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Activity, Droplet, Moon, Flame, X, TrendingUp } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '@/constants/colors';
import { useUser } from '@/contexts/UserContext';

type MetricType = 'steps' | 'water' | 'sleep' | 'calories';

export default function WellnessScreen() {
  const insets = useSafeAreaInsets();
  const { healthMetrics, dailyGoals, updateHealthMetrics } = useUser();
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState<MetricType | null>(null);
  const [inputValue, setInputValue] = useState('');

  const metrics = [
    {
      type: 'steps' as MetricType,
      icon: Activity,
      label: 'Steps',
      value: healthMetrics.steps,
      goal: dailyGoals.steps,
      unit: 'steps',
      color: Colors.chart.bmi,
      gradient: [Colors.chart.bmi, Colors.chart.bmi + '80'],
    },
    {
      type: 'water' as MetricType,
      icon: Droplet,
      label: 'Water',
      value: healthMetrics.water,
      goal: dailyGoals.water,
      unit: 'glasses',
      color: Colors.secondary,
      gradient: [Colors.secondary, Colors.secondaryLight],
    },
    {
      type: 'sleep' as MetricType,
      icon: Moon,
      label: 'Sleep',
      value: healthMetrics.sleep,
      goal: dailyGoals.sleep,
      unit: 'hours',
      color: Colors.chart.glucose,
      gradient: [Colors.chart.glucose, Colors.chart.glucose + '80'],
    },
    {
      type: 'calories' as MetricType,
      icon: Flame,
      label: 'Calories',
      value: healthMetrics.calories,
      goal: dailyGoals.calories,
      unit: 'kcal',
      color: Colors.warning,
      gradient: [Colors.warning, Colors.warning + '80'],
    },
  ];

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
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Wellness Tracker</Text>
        <Text style={styles.headerSubtitle}>Track your daily health goals</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {metrics.map((metric, index) => {
          const progress = Math.min((metric.value / metric.goal) * 100, 100);
          const Icon = metric.icon;

          return (
            <View key={index} style={styles.metricCard}>
              <LinearGradient
                colors={metric.gradient as unknown as readonly [ColorValue, ColorValue, ...ColorValue[]]}
                style={styles.metricGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <View style={styles.metricHeader}>
                  <View style={styles.metricIconContainer}>
                    <Icon size={28} color={Colors.textWhite} strokeWidth={2} />
                  </View>
                  <TouchableOpacity
                    style={styles.editButton}
                    onPress={() => handleOpenModal(metric.type)}
                  >
                    <Text style={styles.editButtonText}>Edit</Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.metricLabel}>{metric.label}</Text>
                <View style={styles.metricValueContainer}>
                  <Text style={styles.metricValue}>{metric.value}</Text>
                  <Text style={styles.metricUnit}> / {metric.goal} {metric.unit}</Text>
                </View>

                <View style={styles.progressBarContainer}>
                  <View style={styles.progressBarBackground}>
                    <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
                  </View>
                  <Text style={styles.progressText}>{Math.round(progress)}%</Text>
                </View>

                <View style={styles.quickActions}>
                  {metric.type === 'steps' && (
                    <>
                      <TouchableOpacity
                        style={styles.quickButton}
                        onPress={() => handleQuickAdd(metric.type, 1000)}
                      >
                        <Text style={styles.quickButtonText}>+1000</Text>
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

        <View style={styles.tipsCard}>
          <TrendingUp size={24} color={Colors.primary} strokeWidth={2} />
          <View style={styles.tipsContent}>
            <Text style={styles.tipsTitle}>Weekly Summary</Text>
            <Text style={styles.tipsDescription}>
              You&apos;re doing great! Keep tracking your daily activities to maintain a healthy lifestyle.
            </Text>
          </View>
        </View>
      </ScrollView>

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Update {metrics.find(m => m.type === selectedMetric)?.label}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.modalInput}
              value={inputValue}
              onChangeText={setInputValue}
              keyboardType="numeric"
              placeholder="Enter value"
              placeholderTextColor={Colors.textLight}
            />

            <TouchableOpacity style={styles.modalButton} onPress={handleSave}>
              <LinearGradient
                colors={Colors.gradient.primary as unknown as readonly [ColorValue, ColorValue, ...ColorValue[]]}
                style={styles.modalButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.modalButtonText}>Save</Text>
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
  metricCard: {
    marginBottom: 20,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: Colors.cardShadow,
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
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.textWhite,
  },
  metricLabel: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.textWhite,
    marginBottom: 8,
  },
  metricValueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 16,
  },
  metricValue: {
    fontSize: 36,
    fontWeight: '700' as const,
    color: Colors.textWhite,
  },
  metricUnit: {
    fontSize: 16,
    color: Colors.textWhite,
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
    backgroundColor: Colors.textWhite,
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.textWhite,
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
    fontWeight: '600' as const,
    color: Colors.textWhite,
  },
  tipsCard: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    marginTop: 10,
    shadowColor: Colors.cardShadow,
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
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 4,
  },
  tipsDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: Colors.card,
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
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  modalInput: {
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: Colors.text,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.border,
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
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.textWhite,
  },
});
