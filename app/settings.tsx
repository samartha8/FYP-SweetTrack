import Colors from '@/constants/colors';
import { Language, useSettings, Settings } from '@/contexts/SettingsContext';
import { useUser } from '@/contexts/UserContext';
import { Stack, useRouter } from 'expo-router';
import {
  Bell,
  Eye,
  Globe,
  RefreshCw,
  Smartphone,
  Target,
  X,
} from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from '@/hooks/use-translation';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [goals, setGoals] = useState<{ steps: number; water: number; sleep: number; calories: number; pushEnabled: boolean } | null>(null);
  const [isGoalsLoading, setGoalsLoading] = useState<boolean>(false);
  const [isRegisteringPush, setRegisteringPush] = useState<boolean>(false);
  const {
    settings,
    colors: palette,
    scale,
    updateSettings,
    resetSettings,
  } = useSettings();
  const { registerPushNotifications, ensureAccessToken } = useUser();

  // Local state for pending changes
  const [pendingSettings, setPendingSettings] = useState<Settings | null>(null);

  // Sync with global settings on initial load
  useEffect(() => {
    if (settings && !pendingSettings) {
      setPendingSettings(settings);
    }
  }, [settings]);

  const hasPendingChanges = useMemo(() => {
    if (!settings || !pendingSettings) return false;
    return JSON.stringify(settings) !== JSON.stringify(pendingSettings);
  }, [settings, pendingSettings]);

  const handleSaveSettings = async () => {
    if (!pendingSettings) return;
    try {
      await updateSettings(pendingSettings);
      Alert.alert('Success', (t.settings as any).saveSettingsSuccess || 'Settings updated successfully');
    } catch (err) {
      console.error('Save settings error:', err);
      Alert.alert('Error', 'Failed to save settings');
    }
  };

  const languages = [
    { code: 'en' as Language, name: 'English' },
    { code: 'ne' as Language, name: 'नेपाली (Nepali)' },
    { code: 'ja' as Language, name: '日本語 (Japanese)' },
  ];

  const fontSizes = [
    { value: 'small' as const, label: 'Small' },
    { value: 'medium' as const, label: 'Medium' },
    { value: 'large' as const, label: 'Large' },
  ];

  const { t } = useTranslation();

  // Use memoized styles based on dynamic palette and scale
  const themed = useMemo(() => ({
    container: { backgroundColor: palette.backgroundSecondary },
    header: { backgroundColor: palette.background, borderBottomColor: palette.border },
    headerTitle: { color: palette.text, fontSize: scale(18) },
    sectionTitle: { color: palette.text, fontSize: scale(18) },
    card: { backgroundColor: palette.card, shadowColor: palette.cardShadow, borderColor: palette.border },
    cardTitle: { color: palette.text, fontSize: scale(14) },
    optionLabel: { color: palette.text, fontSize: scale(15) },
    optionDescription: { color: palette.textSecondary, fontSize: scale(13) },
    segmentButtonText: { fontSize: scale(14) },
    segmentButtonTextActive: { fontSize: scale(14) },
    resetButtonText: { fontSize: scale(16) },
    footerText: { color: palette.textLight, fontSize: scale(12) },
    numberInput: { borderColor: palette.border, backgroundColor: palette.backgroundSecondary, color: palette.text },
    saveButton: { backgroundColor: palette.primary },
    saveButtonText: { fontSize: scale(16) },
  }), [palette, scale]);

  const API_BASE_URL = (() => {
    const normalize = (url: string) => {
      const trimmed = url.replace(/\/$/, '');
      return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
    };

    const envBase = process.env.EXPO_PUBLIC_API_BASE_URL || process.env.API_BASE_URL;
    if (envBase) return normalize(envBase);

    // Default to backend dev port for web
    if (typeof window !== 'undefined') return 'http://localhost:5000/api';

    const hostOverride = process.env.EXPO_PUBLIC_API_HOST || process.env.API_HOST;
    const port = process.env.EXPO_PUBLIC_API_PORT || process.env.API_PORT || '5000';
    const defaultIP = '10.0.2.2';
    const hostIP = hostOverride || (__DEV__ ? defaultIP : '192.168.0.111');
    return `http://${hostIP}:${port}/api`;
  })();

  const loadGoals = useCallback(async () => {
    try {
      setGoalsLoading(true);
      const token = await ensureAccessToken();
      if (!token) return;

      console.log('Fetching goals from:', `${API_BASE_URL}/notifications/goals`);

      const res = await fetch(`${API_BASE_URL}/notifications/goals`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setGoals({
          steps: data.goals?.steps ?? 10000,
          water: data.goals?.water ?? 8,
          sleep: data.goals?.sleep ?? 8,
          calories: data.goals?.calories ?? 2000,
          pushEnabled: data.goals?.pushEnabled ?? true,
        });
      }
    } catch (error) {
      console.error('Load goals error:', error);
    } finally {
      setGoalsLoading(false);
    }
  }, [ensureAccessToken, API_BASE_URL]);

  const [isSavingGoals, setSavingGoals] = useState(false);

  const saveGoals = async () => {
    try {
      setSavingGoals(true);
      const token = await ensureAccessToken();
      if (!token || !goals) return;
      const res = await fetch(`${API_BASE_URL}/notifications/goals`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(goals),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        Alert.alert('Error', data.message || 'Could not save goals');
        return;
      }
      Alert.alert('Saved', 'Goals updated successfully');
    } catch (error) {
      console.error('Save goals error:', error);
      Alert.alert('Error', 'Could not save goals');
    } finally {
      setSavingGoals(false);
    }
  };

  const handleRegisterPush = async () => {
    setRegisteringPush(true);
    const result = await registerPushNotifications();
    setRegisteringPush(false);
    if (result.success) {
      Alert.alert('Enabled', 'Push notifications registered');
    } else {
      Alert.alert('Push not enabled', result.message || 'Try again later');
    }
  };

  useEffect(() => {
    loadGoals();
  }, [loadGoals]);

  const handleResetSettings = () => {
    Alert.alert(
      t.settings.reset,
      t.settings.resetConfirm,
      [
        { text: t.common.cancel, style: 'cancel' },
        {
          text: t.settings.reset,
          style: 'destructive',
          onPress: () => {
            resetSettings();
            Alert.alert(t.settings.reset, t.settings.resetSuccess);
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, themed.container, { paddingTop: insets.top }]}>
      <Stack.Screen options={{ headerShown: false }} />


      <View style={[styles.header, themed.header]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
          <X size={24} color={palette.text} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, themed.headerTitle]}>{t.settings.header}</Text>
        <View style={styles.headerButton} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Globe size={20} color={palette.primary} strokeWidth={2} />
            <Text style={[styles.sectionTitle, themed.sectionTitle]}>{t.settings.language}</Text>
          </View>
          <View style={[styles.card, themed.card]}>
            {languages.map((lang, index) => (
              <TouchableOpacity
                key={lang.code}
                style={[
                  styles.optionRow,
                  index < languages.length - 1 && styles.optionRowBorder,
                ]}
                onPress={() => setPendingSettings((prev: Settings | null) => prev ? { ...prev, language: lang.code } : null)}
                accessibilityRole="radio"
                accessibilityLabel={`Select ${lang.name} language`}
                accessibilityState={{ selected: (pendingSettings?.language || settings.language) === lang.code }}
              >
                <Text style={[styles.optionLabel, themed.optionLabel]}>{lang.name}</Text>
                <View
                  style={[
                    styles.radioOuter,
                    { borderColor: palette.border },
                    (pendingSettings?.language || settings.language) === lang.code && { borderColor: palette.primary },
                  ]}
                >
                  {(pendingSettings?.language || settings.language) === lang.code && <View style={[styles.radioInner, { backgroundColor: palette.primary }]} />}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Eye size={20} color={palette.primary} strokeWidth={2} />
            <Text style={[styles.sectionTitle, themed.sectionTitle]}>{t.settings.display}</Text>
          </View>

          <View style={[styles.card, themed.card]}>
            <View style={styles.optionRow}>
              <View style={styles.optionContent}>
                <Text style={[styles.optionLabel, themed.optionLabel]}>{t.settings.highContrast}</Text>
                <Text style={[styles.optionDescription, themed.optionDescription]}>
                  {t.settings.highContrastDesc}
                </Text>
              </View>
              <Switch
                value={pendingSettings?.highContrast ?? settings.highContrast}
                onValueChange={(val) => setPendingSettings((prev: Settings | null) => prev ? { ...prev, highContrast: val } : null)}
                trackColor={{ false: palette.border, true: palette.primary }}
                thumbColor={palette.text}
                accessibilityLabel="Toggle high contrast mode"
                accessibilityRole="switch"
                accessibilityState={{ checked: pendingSettings?.highContrast ?? settings.highContrast }}
              />
            </View>
          </View>

          <View style={[styles.card, themed.card]}>
            <Text style={[styles.cardTitle, themed.cardTitle]}>{t.settings.fontSize}</Text>
            <View style={styles.segmentedControl}>
              {fontSizes.map((size) => (
                <TouchableOpacity
                  key={size.value}
                  style={[
                    styles.segmentButton,
                    (pendingSettings?.fontSize || settings.fontSize) === size.value && styles.segmentButtonActive,
                  ]}
                  onPress={() => setPendingSettings((prev: Settings | null) => prev ? { ...prev, fontSize: size.value } : null)}
                  accessibilityRole="button"
                  accessibilityLabel={`Set font size to ${size.label}`}
                  accessibilityState={{ selected: (pendingSettings?.fontSize || settings.fontSize) === size.value }}
                >
                  <Text
                    style={[
                      styles.segmentButtonText,
                      themed.segmentButtonText,
                      (pendingSettings?.fontSize || settings.fontSize) === size.value && styles.segmentButtonTextActive,
                      (pendingSettings?.fontSize || settings.fontSize) === size.value && themed.segmentButtonTextActive,
                    ]}
                  >
                    {size.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Bell size={20} color={palette.primary} strokeWidth={2} />
            <Text style={[styles.sectionTitle, themed.sectionTitle]}>{t.settings.notifications}</Text>
          </View>

          <View style={[styles.card, themed.card]}>
            <View style={[styles.optionRow, styles.optionRowBorder]}>
              <View style={styles.optionContent}>
                <Text style={[styles.optionLabel, themed.optionLabel]}>{t.settings.enableNotifications}</Text>
                <Text style={[styles.optionDescription, themed.optionDescription]}>
                  {t.settings.enableNotificationsDesc}
                </Text>
              </View>
              <Switch
                value={pendingSettings?.notifications.enabled ?? settings.notifications.enabled}
                onValueChange={(value) => setPendingSettings((prev: Settings | null) => prev ? { ...prev, notifications: { ...prev.notifications, enabled: value } } : null)}
                trackColor={{ false: palette.border, true: palette.primary }}
                thumbColor={palette.text}
                accessibilityLabel="Toggle notifications"
                accessibilityRole="switch"
                accessibilityState={{ checked: pendingSettings?.notifications.enabled ?? settings.notifications.enabled }}
              />
            </View>

            <View style={[styles.optionRow, styles.optionRowBorder]}>
              <View style={styles.optionContent}>
                <Text style={[styles.optionLabel, themed.optionLabel]}>{t.settings.dailyReminders}</Text>
                <Text style={[styles.optionDescription, themed.optionDescription]}>
                  {t.settings.dailyRemindersDesc}
                </Text>
              </View>
              <Switch
                value={pendingSettings?.notifications.dailyReminders ?? settings.notifications.dailyReminders}
                onValueChange={(value) => setPendingSettings((prev: Settings | null) => prev ? { ...prev, notifications: { ...prev.notifications, dailyReminders: value } } : null)}
                trackColor={{ false: palette.border, true: palette.primary }}
                thumbColor={palette.text}
                disabled={!(pendingSettings?.notifications.enabled ?? settings.notifications.enabled)}
                accessibilityLabel="Toggle daily reminders"
                accessibilityRole="switch"
                accessibilityState={{
                  checked: pendingSettings?.notifications.dailyReminders ?? settings.notifications.dailyReminders,
                  disabled: !(pendingSettings?.notifications.enabled ?? settings.notifications.enabled)
                }}
              />
            </View>

            <View style={[styles.optionRow, styles.optionRowBorder]}>
              <View style={styles.optionContent}>
                <Text style={[styles.optionLabel, themed.optionLabel]}>{t.settings.goalAlerts}</Text>
                <Text style={[styles.optionDescription, themed.optionDescription]}>
                  {t.settings.goalAlertsDesc}
                </Text>
              </View>
              <Switch
                value={pendingSettings?.notifications.goalAlerts ?? settings.notifications.goalAlerts}
                onValueChange={(value) => setPendingSettings((prev: Settings | null) => prev ? { ...prev, notifications: { ...prev.notifications, goalAlerts: value } } : null)}
                trackColor={{ false: palette.border, true: palette.primary }}
                thumbColor={palette.text}
                disabled={!(pendingSettings?.notifications.enabled ?? settings.notifications.enabled)}
                accessibilityLabel="Toggle goal alerts"
                accessibilityRole="switch"
                accessibilityState={{
                  checked: pendingSettings?.notifications.goalAlerts ?? settings.notifications.goalAlerts,
                  disabled: !(pendingSettings?.notifications.enabled ?? settings.notifications.enabled)
                }}
              />
            </View>

            <View style={styles.optionRow}>
              <View style={styles.optionContent}>
                <Text style={[styles.optionLabel, themed.optionLabel]}>{t.settings.healthTips}</Text>
                <Text style={[styles.optionDescription, themed.optionDescription]}>
                  {t.settings.healthTipsDesc}
                </Text>
              </View>
              <Switch
                value={pendingSettings?.notifications.healthTips ?? settings.notifications.healthTips}
                onValueChange={(value) => setPendingSettings((prev: Settings | null) => prev ? { ...prev, notifications: { ...prev.notifications, healthTips: value } } : null)}
                trackColor={{ false: palette.border, true: palette.primary }}
                thumbColor={palette.text}
                disabled={!(pendingSettings?.notifications.enabled ?? settings.notifications.enabled)}
                accessibilityLabel="Toggle health tips"
                accessibilityRole="switch"
                accessibilityState={{
                  checked: pendingSettings?.notifications.healthTips ?? settings.notifications.healthTips,
                  disabled: !(pendingSettings?.notifications.enabled ?? settings.notifications.enabled)
                }}
              />
            </View>

            <TouchableOpacity
              style={[
                styles.saveButton,
                themed.saveButton,
                { marginTop: 12, opacity: isRegisteringPush ? 0.7 : 1 },
              ]}
              onPress={handleRegisterPush}
              disabled={isRegisteringPush}
            >
              <Text style={[styles.saveButtonText, themed.saveButtonText]}>
                {isRegisteringPush ? t.settings.registering : t.settings.registerPush}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Target size={20} color={palette.primary} strokeWidth={2} />
            <Text style={[styles.sectionTitle, themed.sectionTitle]}>{t.settings.goals}</Text>
          </View>
          <View style={[styles.card, themed.card]}>
            {isGoalsLoading && !goals ? (
              <ActivityIndicator color={Colors.primary} />
            ) : (
              <>
                <View style={[styles.optionRow, styles.optionRowBorder]}>
                  <View style={styles.optionContent}>
                    <Text style={[styles.optionLabel, themed.optionLabel]}>{t.settings.pushGoalAlerts}</Text>
                    <Text style={[styles.optionDescription, themed.optionDescription]}>{t.settings.pushGoalAlertsDesc}</Text>
                  </View>
                  <Switch
                    value={goals?.pushEnabled ?? true}
                    onValueChange={(value) => setGoals(prev => prev ? { ...prev, pushEnabled: value } : prev)}
                    trackColor={{ false: palette.border, true: palette.primary }}
                    thumbColor={palette.text}
                    accessibilityLabel="Toggle push goal alerts"
                    accessibilityRole="switch"
                    accessibilityState={{ checked: goals?.pushEnabled }}
                  />
                </View>

                {[
                  { key: 'steps', label: t.settings.stepsGoal, suffix: 'steps/day' },
                  { key: 'water', label: t.settings.waterGoal, suffix: 'glasses/day' },
                  { key: 'sleep', label: t.settings.sleepGoal, suffix: 'hours/night' },
                  { key: 'calories', label: t.settings.caloriesGoal, suffix: 'kcal/day' },
                ].map(item => (
                  <View key={item.key} style={[styles.optionRow, styles.optionRowBorder]}>
                    <View style={styles.optionContent}>
                      <Text style={[styles.optionLabel, themed.optionLabel]}>{item.label}</Text>
                      <Text style={[styles.optionDescription, themed.optionDescription]}>{item.suffix}</Text>
                    </View>
                    <TextInput
                      style={[styles.numberInput, themed.numberInput]}
                      keyboardType="numeric"
                      value={goals ? String((goals as any)[item.key] ?? '') : ''}
                      onChangeText={(text) => {
                        const val = parseInt(text || '0', 10) || 0;
                        setGoals(prev => prev ? { ...prev, [item.key]: val } as any : prev);
                      }}
                    />
                  </View>
                ))}

                <TouchableOpacity
                  style={[styles.saveButton, themed.saveButton, { opacity: isSavingGoals ? 0.7 : 1 }]}
                  onPress={saveGoals}
                  disabled={isSavingGoals}
                >
                  <Text style={[styles.saveButtonText, themed.saveButtonText]}>
                    {isSavingGoals ? t.common.loading : t.settings.saveGoals}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>



        <TouchableOpacity
          style={styles.resetButton}
          onPress={handleResetSettings}
          accessibilityRole="button"
          accessibilityLabel="Reset all settings to default"
        >
          <RefreshCw size={20} color={Colors.error} strokeWidth={2} />
          <Text style={[styles.resetButtonText, themed.resetButtonText]}>{t.settings.reset}</Text>
        </TouchableOpacity>

        <Text style={[styles.footerText, themed.footerText]}>
          {t.settings.footer}
        </Text>

        {hasPendingChanges && (
          <View style={[styles.floatingSaveContainer, { bottom: insets.bottom + 20 }]}>
            <TouchableOpacity
              style={[styles.saveButton, themed.saveButton, styles.mainSaveButton]}
              onPress={handleSaveSettings}
            >
              <Text style={[styles.saveButtonText, themed.saveButtonText]}>
                {(t.settings as any).saveSettings || 'Save Changes'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    shadowColor: Colors.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 12,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 56,
    paddingVertical: 8,
  },
  optionRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.backgroundSecondary,
    marginBottom: 8,
    paddingBottom: 16,
  },
  optionContent: {
    flex: 1,
    marginRight: 16,
  },
  optionLabel: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterActive: {
    borderColor: Colors.primary,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.primary,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 8,
    padding: 4,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 6,
  },
  segmentButtonActive: {
    backgroundColor: Colors.primary,
  },
  segmentButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  segmentButtonTextActive: {
    color: Colors.textWhite,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.error + '40',
    gap: 8,
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.error,
  },
  footerText: {
    fontSize: 12,
    color: Colors.textLight,
    textAlign: 'center',
    lineHeight: 18,
  },
  numberInput: {
    width: 90,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    textAlign: 'center',
    color: Colors.text,
    backgroundColor: Colors.backgroundSecondary,
  },
  saveButton: {
    marginTop: 12,
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveButtonText: {
    color: Colors.textWhite,
    fontWeight: '700' as const,
    fontSize: 16,
  },
  floatingSaveContainer: {
    paddingTop: 20,
    width: '100%',
  },
  mainSaveButton: {
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
