import { secureFetch as fetch } from '@/lib/apiClient';
import Colors from '@/constants/colors';
import { API_BASE_URL } from '@/constants/Api';
import { Language, useSettings, Settings } from '@/contexts/SettingsContext';
import { useAuth } from '@/contexts/AuthContext';;
import { useHealth } from '@/contexts/HealthContext';
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
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from '@/hooks/use-translation';
import { LinearGradient } from 'expo-linear-gradient';
import { Sparkles, Languages, Monitor, Goal } from 'lucide-react-native';

const DEFAULT_CALORIE_GOAL = 2000;
const DEFAULT_GOALS = {
  steps: 10000,
  water: 8,
  sleep: 8,
  calories: DEFAULT_CALORIE_GOAL,
  pushEnabled: true,
};

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [goals, setGoals] = useState<{ steps: number; water: number; sleep: number; calories: number; pushEnabled: boolean }>(DEFAULT_GOALS);
  const [isGoalsLoading, setGoalsLoading] = useState<boolean>(false);
  const [isRegisteringPush, setRegisteringPush] = useState<boolean>(false);
  const [isTestingPush, setTestingPush] = useState<boolean>(false);
  const {
    settings,
    colors: palette,
    scale,
    updateSettings,
    resetSettings,
  } = useSettings();
  const { ensureAccessToken, registerPushNotifications } = useAuth();
  const { updateDailyGoals } = useHealth();

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
    container: { flex: 1 },
    header: { backgroundColor: 'transparent', borderBottomColor: 'transparent' },
    headerTitle: { color: palette.text, fontSize: scale(20), fontWeight: '900' as const, letterSpacing: -1 },
    sectionTitle: { color: palette.text, fontSize: scale(18), fontWeight: '900' as const, letterSpacing: -0.5 },
    card: { backgroundColor: 'rgba(255, 255, 255, 0.9)', borderColor: 'rgba(255, 255, 255, 0.3)', borderWidth: 1 },
    cardTitle: { color: palette.text, fontSize: scale(13), fontWeight: '800' as const, letterSpacing: 0.5, opacity: 0.7 },
    optionLabel: { color: palette.text, fontSize: scale(15), fontWeight: '800' as const, letterSpacing: -0.3 },
    optionDescription: { color: palette.textSecondary, fontSize: scale(12), fontWeight: '600' as const, lineHeight: 16, opacity: 0.6 },
    segmentButtonText: { fontSize: scale(13), fontWeight: '700' as const },
    segmentButtonTextActive: { fontSize: scale(13), fontWeight: '900' as const },
    resetButtonText: { fontSize: scale(16), fontWeight: '800' as const },
    footerText: { color: palette.textLight, fontSize: scale(11), fontWeight: '600' as const, opacity: 0.5 },
    numberInput: { borderColor: 'rgba(0,0,0,0.1)', backgroundColor: 'rgba(255,255,255,0.8)', color: palette.text, fontWeight: '700' as const },
    saveButton: { backgroundColor: palette.primary },
    saveButtonText: { fontSize: scale(16), fontWeight: '900' as const, letterSpacing: 0.5 },
  }), [palette, scale]);

  const loadGoals = useCallback(async () => {
    try {
      setGoalsLoading(true);
      const token = await ensureAccessToken();
      if (!token) return;

      console.log('Fetching goals from:', `${API_BASE_URL}/notifications/goals`);

      const res = await fetch(`${API_BASE_URL}/notifications/goals`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'ngrok-skip-browser-warning': 'true'
        }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setGoals({
          steps: data.goals?.steps ?? DEFAULT_GOALS.steps,
          water: data.goals?.water ?? DEFAULT_GOALS.water,
          sleep: data.goals?.sleep ?? DEFAULT_GOALS.sleep,
          calories: Number(data.goals?.calories) > 0 ? Number(data.goals.calories) : DEFAULT_CALORIE_GOAL,
          pushEnabled: data.goals?.pushEnabled ?? DEFAULT_GOALS.pushEnabled,
        });
      }
    } catch (error) {
      console.error('Load goals error:', error);
    } finally {
      setGoalsLoading(false);
    }
  }, [ensureAccessToken]);

  const [isSavingGoals, setSavingGoals] = useState(false);

  const saveGoals = async () => {
    try {
      setSavingGoals(true);
      const token = await ensureAccessToken();
      if (!token) return;

      const updates = {
        steps: Math.max(0, goals.steps || 0),
        water: Math.max(0, goals.water || 0),
        sleep: Math.max(0, goals.sleep || 0),
        calories: Number(goals.calories) > 0 ? Number(goals.calories) : DEFAULT_CALORIE_GOAL,
        pushEnabled: goals.pushEnabled,
      };

      if (updates.pushEnabled) {
        const pushResult = await registerPushNotifications();
        if (!pushResult.success) {
          Alert.alert('Push not enabled', pushResult.message || 'Goal saved, but push notifications could not be enabled.');
        }
      }

      const res = await fetch(`${API_BASE_URL}/notifications/goals`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'ngrok-skip-browser-warning': 'true',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        Alert.alert('Error', data.message || 'Could not save goals');
        return;
      }
      setGoals({
        steps: data.goals?.steps ?? updates.steps,
        water: data.goals?.water ?? updates.water,
        sleep: data.goals?.sleep ?? updates.sleep,
        calories: Number(data.goals?.calories) > 0 ? Number(data.goals.calories) : DEFAULT_CALORIE_GOAL,
        pushEnabled: data.goals?.pushEnabled ?? updates.pushEnabled,
      });
      updateDailyGoals({
        steps: data.goals?.steps ?? updates.steps,
        water: data.goals?.water ?? updates.water,
        sleep: data.goals?.sleep ?? updates.sleep,
        calories: Number(data.goals?.calories) > 0 ? Number(data.goals.calories) : DEFAULT_CALORIE_GOAL,
      });
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

  const handleNotificationToggle = async (
    key: keyof Settings['notifications'],
    value: boolean
  ) => {
    const nextNotifications = {
      ...(pendingSettings?.notifications ?? settings.notifications),
      [key]: value,
    };
    const nextSettings = {
      ...(pendingSettings ?? settings),
      notifications: nextNotifications,
    };

    setPendingSettings(nextSettings);
    await updateSettings({ notifications: nextNotifications });

    if (value && (key === 'enabled' || key === 'dailyReminders' || key === 'goalAlerts' || key === 'healthTips')) {
      const result = await registerPushNotifications();
      if (!result.success) {
        Alert.alert('Push not enabled', result.message || 'Please allow notifications from Android settings.');
      }
    }
  };

  const handleToggleGoalPush = async (value: boolean) => {
    setGoals(prev => prev ? { ...prev, pushEnabled: value } : prev);
    if (!value) return;

    setRegisteringPush(true);
    const result = await registerPushNotifications();
    setRegisteringPush(false);
    if (!result.success) {
      setGoals(prev => prev ? { ...prev, pushEnabled: false } : prev);
      Alert.alert('Push not enabled', result.message || 'Please allow notifications from Android settings.');
    }
  };

  const handleTestPush = async () => {
    try {
      setTestingPush(true);
      const registration = await registerPushNotifications();
      if (!registration.success) {
        Alert.alert('Push not enabled', registration.message || 'Please allow notifications from Android settings.');
        return;
      }

      const token = await ensureAccessToken();
      if (!token) {
        Alert.alert('Error', 'Please log in again.');
        return;
      }

      const res = await fetch(`${API_BASE_URL}/notifications/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`,
          'ngrok-skip-browser-warning': 'true',
        },
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        Alert.alert('Test failed', data.message || 'Could not send test notification.');
        return;
      }
      const failedTicket = Array.isArray(data.tickets)
        ? data.tickets.find((ticket: any) => ticket?.status === 'error')
        : null;
      if (failedTicket) {
        Alert.alert('Test failed', failedTicket.message || failedTicket.details?.error || 'Expo rejected the notification.');
        return;
      }
      Alert.alert('Test sent', 'Check your notification tray.');
    } catch (error) {
      console.error('Test push error:', error);
      Alert.alert('Test failed', 'Could not send test notification.');
    } finally {
      setTestingPush(false);
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
    <LinearGradient
      colors={['#F0FDF4', '#F0F9FF']} // Signature Metabolic Gradient
      style={[styles.container, { paddingTop: insets.top }]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[styles.header, themed.header]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
          <X size={26} color={palette.text} strokeWidth={3} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, themed.headerTitle]}>{t.settings.header.toUpperCase()}</Text>
        <TouchableOpacity style={styles.headerButton}>
          <Sparkles size={22} color={palette.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        automaticallyAdjustKeyboardInsets
      >
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Languages size={20} color={palette.primary} strokeWidth={2.5} />
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
            <Monitor size={20} color={palette.primary} strokeWidth={2.5} />
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
                onValueChange={(value) => handleNotificationToggle('enabled', value)}
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
                onValueChange={(value) => handleNotificationToggle('dailyReminders', value)}
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
                onValueChange={(value) => handleNotificationToggle('goalAlerts', value)}
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
                onValueChange={(value) => handleNotificationToggle('healthTips', value)}
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

            <TouchableOpacity
              style={[
                styles.outlineButton,
                { borderColor: palette.primary, opacity: isTestingPush ? 0.7 : 1 },
              ]}
              onPress={handleTestPush}
              disabled={isTestingPush}
            >
              <Text style={[styles.outlineButtonText, { color: palette.primary }]}>
                {isTestingPush ? 'Sending Test...' : 'Send Test Notification'}
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
                    value={goals.pushEnabled}
                    onValueChange={handleToggleGoalPush}
                    trackColor={{ false: palette.border, true: palette.primary }}
                    thumbColor={palette.text}
                    disabled={isRegisteringPush}
                    accessibilityLabel="Toggle push goal alerts"
                    accessibilityRole="switch"
                    accessibilityState={{ checked: goals.pushEnabled }}
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
                      returnKeyType="done"
                      selectTextOnFocus
                      value={String((goals as any)[item.key] ?? (DEFAULT_GOALS as any)[item.key])}
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

                <TouchableOpacity
                  style={[
                    styles.outlineButton,
                    { borderColor: palette.primary, opacity: isTestingPush ? 0.7 : 1 },
                  ]}
                  onPress={handleTestPush}
                  disabled={isTestingPush}
                >
                  <Text style={[styles.outlineButtonText, { color: palette.primary }]}>
                    {isTestingPush ? 'Sending Test...' : 'Send Test Notification'}
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
    </LinearGradient>
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
    paddingBottom: 120,
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
    ...Platform.select({
      web: { boxShadow: `0px 2px 8px ${Colors.cardShadow || 'rgba(0,0,0,0.1)'}` },
      native: {
        shadowColor: Colors.cardShadow || '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
      }
    }),
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
    fontWeight: '800' as const,
  },
  optionDescription: {
    lineHeight: 16,
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
  outlineButton: {
    marginTop: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    paddingVertical: 13,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.65)',
  },
  outlineButtonText: {
    fontWeight: '800' as const,
    fontSize: 15,
  },
  floatingSaveContainer: {
    paddingTop: 20,
    width: '100%',
  },
  mainSaveButton: {
    ...Platform.select({
      web: { boxShadow: `0px 4px 8px ${Colors.primary}4D` }, // 0.3 opacity
      native: {
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
      }
    }),
  },
});
