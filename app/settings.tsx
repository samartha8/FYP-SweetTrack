import Colors from '@/constants/colors';
import { Language, useSettings } from '@/contexts/SettingsContext';
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

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [goals, setGoals] = useState<{ steps: number; water: number; sleep: number; calories: number; pushEnabled: boolean } | null>(null);
  const [isGoalsLoading, setGoalsLoading] = useState<boolean>(false);
  const [isRegisteringPush, setRegisteringPush] = useState<boolean>(false);
  const {
    settings,
    toggleHighContrast,
    setLanguage,
    setFontSize,
    updateNotifications,
    updateAccessibility,
    resetSettings,
  } = useSettings();
  const { registerPushNotifications, ensureAccessToken } = useUser();

  const languages = [
    { code: 'en' as Language, name: 'English' },
    { code: 'ne' as Language, name: 'नेपाली (Nepali)' },
    { code: 'hi' as Language, name: 'हिन्दी (Hindi)' },
  ];

  const fontSizes = [
    { value: 'small' as const, label: 'Small' },
    { value: 'medium' as const, label: 'Medium' },
    { value: 'large' as const, label: 'Large' },
  ];

  const translations = useMemo(() => ({
    en: {
      header: 'Settings',
      language: 'Language',
      display: 'Display',
      highContrast: 'High Contrast Mode',
      highContrastDesc: 'Increases contrast for better visibility',
      fontSize: 'Font Size',
      notifications: 'Notifications',
      enableNotifications: 'Enable Notifications',
      enableNotificationsDesc: 'Receive app notifications',
      dailyReminders: 'Daily Reminders',
      dailyRemindersDesc: 'Get daily health reminders',
      goalAlerts: 'Goal Alerts',
      goalAlertsDesc: 'Alerts when approaching goals',
      healthTips: 'Health Tips',
      healthTipsDesc: 'Daily wellness tips',
      registerPush: 'Register Push Device',
      registering: 'Registering...',
      goals: 'Daily Goals & Alerts',
      pushGoalAlerts: 'Push Goal Alerts',
      pushGoalAlertsDesc: 'Allow push reminders for goals',
      stepsGoal: 'Steps Goal',
      waterGoal: 'Water Goal',
      sleepGoal: 'Sleep Goal',
      caloriesGoal: 'Calories Goal',
      saveGoals: 'Save Goals',
      accessibility: 'Accessibility',
      screenReader: 'Screen Reader Support',
      screenReaderDesc: 'Optimize for screen readers',
      haptics: 'Haptic Feedback',
      hapticsDesc: 'Vibrations for interactions',
      voiceInput: 'Voice Input',
      voiceInputDesc: 'Enable voice commands',
      reset: 'Reset to Default',
      resetConfirm: 'Are you sure you want to reset all settings to default?',
      resetSuccess: 'Settings have been reset to default',
      footer: 'These settings are designed to meet WCAG 2.1 AA accessibility standards',
    },
    ne: {
      header: 'सेटिङ्स',
      language: 'भाषा',
      display: 'प्रदर्शन',
      highContrast: 'उच्च कन्ट्रास्ट',
      highContrastDesc: 'देख्न सजिलोका लागि कन्ट्रास्ट बढाउँछ',
      fontSize: 'फन्ट साइज',
      notifications: 'सूचनाहरू',
      enableNotifications: 'सूचना सक्षम गर्नुहोस्',
      enableNotificationsDesc: 'एप सूचना प्राप्त गर्नुहोस्',
      dailyReminders: 'दैनिक सम्झना',
      dailyRemindersDesc: 'दैनिक स्वास्थ्य सम्झना',
      goalAlerts: 'लक्ष्य अलर्ट',
      goalAlertsDesc: 'लक्ष्य नजिक हुँदा सूचना',
      healthTips: 'स्वास्थ्य सुझाव',
      healthTipsDesc: 'दैनिक स्वास्थ्य सुझाव',
      registerPush: 'पुष डिभाइस दर्ता',
      registering: 'दर्ता भइरहेको...',
      goals: 'दैनिक लक्ष्य र अलर्ट',
      pushGoalAlerts: 'पुष लक्ष्य अलर्ट',
      pushGoalAlertsDesc: 'लक्ष्यका लागि पुष सम्झना',
      stepsGoal: 'हिँडाइ लक्ष्य',
      waterGoal: 'पानी लक्ष्य',
      sleepGoal: 'निन्द्रा लक्ष्य',
      caloriesGoal: 'क्यालोरी लक्ष्य',
      saveGoals: 'लक्ष्य बचत गर्नुहोस्',
      accessibility: 'सुगमता',
      screenReader: 'स्क्रिन रिडर समर्थन',
      screenReaderDesc: 'स्क्रिन रिडरका लागि अनुकूल',
      haptics: 'ह्याप्टिक प्रतिक्रिया',
      hapticsDesc: 'इन्टर्याक्शनका लागि कम्पन',
      voiceInput: 'भ्वाइस इनपुट',
      voiceInputDesc: 'भ्वाइस कमान्ड सक्षम',
      reset: 'डिफल्टमा फर्काउनुहोस्',
      resetConfirm: 'सबै सेटिङ्स डिफल्टमा फर्काउनुहोस्?',
      resetSuccess: 'सेटिङ्स डिफल्टमा पुन: सेट गरियो',
      footer: 'यी सेटिङहरू WCAG 2.1 AA मापदण्ड पूरा गर्न डिजाइन गरिएका छन्',
    },
    hi: {
      header: 'सेटिंग्स',
      language: 'भाषा',
      display: 'डिस्प्ले',
      highContrast: 'हाई कॉन्ट्रास्ट मोड',
      highContrastDesc: 'बेहतर दृश्यता के लिए कॉन्ट्रास्ट बढ़ाता है',
      fontSize: 'फ़ॉन्ट आकार',
      notifications: 'सूचनाएं',
      enableNotifications: 'सूचनाएं चालू करें',
      enableNotificationsDesc: 'ऐप सूचनाएं प्राप्त करें',
      dailyReminders: 'दैनिक रिमाइंडर',
      dailyRemindersDesc: 'दैनिक स्वास्थ्य रिमाइंडर',
      goalAlerts: 'लक्ष्य अलर्ट',
      goalAlertsDesc: 'लक्ष्य के पास पहुँचते समय अलर्ट',
      healthTips: 'स्वास्थ्य सुझाव',
      healthTipsDesc: 'दैनिक स्वास्थ्य टिप्स',
      registerPush: 'पुश डिवाइस रजिस्टर करें',
      registering: 'रजिस्टर हो रहा है...',
      goals: 'दैनिक लक्ष्य और अलर्ट',
      pushGoalAlerts: 'पुश लक्ष्य अलर्ट',
      pushGoalAlertsDesc: 'लक्ष्यों के लिए पुश रिमाइंडर',
      stepsGoal: 'कदम लक्ष्य',
      waterGoal: 'पानी लक्ष्य',
      sleepGoal: 'नींद लक्ष्य',
      caloriesGoal: 'कैलोरी लक्ष्य',
      saveGoals: 'लक्ष्य सहेजें',
      accessibility: 'एक्सेसिबिलिटी',
      screenReader: 'स्क्रीन रीडर समर्थन',
      screenReaderDesc: 'स्क्रीन रीडर के लिए अनुकूल',
      haptics: 'हैप्टिक फीडबैक',
      hapticsDesc: 'इंटरैक्शन के लिए वाइब्रेशन',
      voiceInput: 'वॉयस इनपुट',
      voiceInputDesc: 'वॉयस कमांड सक्षम करें',
      reset: 'डिफ़ॉल्ट पर रीसेट',
      resetConfirm: 'सभी सेटिंग्स को डिफ़ॉल्ट पर रीसेट करें?',
      resetSuccess: 'सेटिंग्स डिफ़ॉल्ट पर रीसेट हुईं',
      footer: 'ये सेटिंग्स WCAG 2.1 AA मानकों को पूरा करने के लिए डिज़ाइन की गई हैं',
    },
  }), []);

  const t = translations[settings.language] || translations.en;

  const palette = settings.highContrast ? {
    primary: '#FFD60A',
    text: '#FFFFFF',
    textSecondary: '#E5E7EB',
    textLight: '#D1D5DB',
    background: '#000000',
    backgroundSecondary: '#0F172A',
    border: '#374151',
    card: '#111827',
    cardShadow: 'rgba(255, 255, 255, 0.18)',
  } : {
    primary: Colors.primary,
    text: Colors.text,
    textSecondary: Colors.textSecondary,
    textLight: Colors.textLight,
    background: Colors.background,
    backgroundSecondary: Colors.backgroundSecondary,
    border: Colors.border,
    card: Colors.card,
    cardShadow: Colors.cardShadow,
  };

  const fontScale = { small: 0.9, medium: 1, large: 1.15 }[settings.fontSize] || 1;
  const scale = useMemo(() => (size: number) => Math.round(size * fontScale), [fontScale]);

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
  }), [palette, fontScale, scale]);

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

  const saveGoals = async () => {
    try {
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
      t.reset,
      t.resetConfirm,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: t.reset,
          style: 'destructive',
          onPress: () => {
            resetSettings();
            Alert.alert(t.reset, t.resetSuccess);
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, themed.container, { paddingTop: insets.top }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
          <X size={24} color={palette.text} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, themed.headerTitle]}>{t.header}</Text>
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
            <Text style={[styles.sectionTitle, themed.sectionTitle]}>{t.language}</Text>
          </View>
          <View style={[styles.card, themed.card]}>
            {languages.map((lang, index) => (
              <TouchableOpacity
                key={lang.code}
                style={[
                  styles.optionRow,
                  index < languages.length - 1 && styles.optionRowBorder,
                ]}
                onPress={() => setLanguage(lang.code)}
                accessibilityRole="radio"
                accessibilityLabel={`Select ${lang.name} language`}
                accessibilityState={{ selected: settings.language === lang.code }}
              >
                <Text style={[styles.optionLabel, themed.optionLabel]}>{lang.name}</Text>
                <View
                  style={[
                    styles.radioOuter,
                    { borderColor: palette.border },
                    settings.language === lang.code && { borderColor: palette.primary },
                  ]}
                >
                  {settings.language === lang.code && <View style={[styles.radioInner, { backgroundColor: palette.primary }]} />}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Eye size={20} color={palette.primary} strokeWidth={2} />
            <Text style={[styles.sectionTitle, themed.sectionTitle]}>{t.display}</Text>
          </View>

          <View style={[styles.card, themed.card]}>
            <View style={styles.optionRow}>
              <View style={styles.optionContent}>
                <Text style={[styles.optionLabel, themed.optionLabel]}>{t.highContrast}</Text>
                <Text style={[styles.optionDescription, themed.optionDescription]}>
                  {t.highContrastDesc}
                </Text>
              </View>
              <Switch
                value={settings.highContrast}
                onValueChange={toggleHighContrast}
                trackColor={{ false: palette.border, true: palette.primary }}
                thumbColor={Colors.text}
                accessibilityLabel="Toggle high contrast mode"
                accessibilityRole="switch"
                accessibilityState={{ checked: settings.highContrast }}
              />
            </View>
          </View>

          <View style={[styles.card, themed.card]}>
            <Text style={[styles.cardTitle, themed.cardTitle]}>{t.fontSize}</Text>
            <View style={styles.segmentedControl}>
              {fontSizes.map((size) => (
                <TouchableOpacity
                  key={size.value}
                  style={[
                    styles.segmentButton,
                    settings.fontSize === size.value && styles.segmentButtonActive,
                  ]}
                  onPress={() => setFontSize(size.value)}
                  accessibilityRole="button"
                  accessibilityLabel={`Set font size to ${size.label}`}
                  accessibilityState={{ selected: settings.fontSize === size.value }}
                >
                  <Text
                    style={[
                      styles.segmentButtonText,
                      themed.segmentButtonText,
                      settings.fontSize === size.value && styles.segmentButtonTextActive,
                      settings.fontSize === size.value && themed.segmentButtonTextActive,
                    ]}
                  >
                    size.label
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Bell size={20} color={palette.primary} strokeWidth={2} />
            <Text style={[styles.sectionTitle, themed.sectionTitle]}>{t.notifications}</Text>
          </View>

          <View style={[styles.card, themed.card]}>
            <View style={[styles.optionRow, styles.optionRowBorder]}>
              <View style={styles.optionContent}>
                <Text style={[styles.optionLabel, themed.optionLabel]}>{t.enableNotifications}</Text>
                <Text style={[styles.optionDescription, themed.optionDescription]}>
                  {t.enableNotificationsDesc}
                </Text>
              </View>
              <Switch
                value={settings.notifications.enabled}
                onValueChange={(value) => updateNotifications({ enabled: value })}
                trackColor={{ false: palette.border, true: palette.primary }}
                thumbColor={palette.text}
                accessibilityLabel="Toggle notifications"
                accessibilityRole="switch"
                accessibilityState={{ checked: settings.notifications.enabled }}
              />
            </View>

            <View style={[styles.optionRow, styles.optionRowBorder]}>
              <View style={styles.optionContent}>
                <Text style={[styles.optionLabel, themed.optionLabel]}>{t.dailyReminders}</Text>
                <Text style={[styles.optionDescription, themed.optionDescription]}>
                  {t.dailyRemindersDesc}
                </Text>
              </View>
              <Switch
                value={settings.notifications.dailyReminders}
                onValueChange={(value) => updateNotifications({ dailyReminders: value })}
                trackColor={{ false: palette.border, true: palette.primary }}
                thumbColor={palette.text}
                disabled={!settings.notifications.enabled}
                accessibilityLabel="Toggle daily reminders"
                accessibilityRole="switch"
                accessibilityState={{
                  checked: settings.notifications.dailyReminders,
                  disabled: !settings.notifications.enabled
                }}
              />
            </View>

            <View style={[styles.optionRow, styles.optionRowBorder]}>
              <View style={styles.optionContent}>
                <Text style={[styles.optionLabel, themed.optionLabel]}>{t.goalAlerts}</Text>
                <Text style={[styles.optionDescription, themed.optionDescription]}>
                  {t.goalAlertsDesc}
                </Text>
              </View>
              <Switch
                value={settings.notifications.goalAlerts}
                onValueChange={(value) => updateNotifications({ goalAlerts: value })}
                trackColor={{ false: palette.border, true: palette.primary }}
                thumbColor={palette.text}
                disabled={!settings.notifications.enabled}
                accessibilityLabel="Toggle goal alerts"
                accessibilityRole="switch"
                accessibilityState={{
                  checked: settings.notifications.goalAlerts,
                  disabled: !settings.notifications.enabled
                }}
              />
            </View>

            <View style={styles.optionRow}>
              <View style={styles.optionContent}>
                <Text style={[styles.optionLabel, themed.optionLabel]}>{t.healthTips}</Text>
                <Text style={[styles.optionDescription, themed.optionDescription]}>
                  {t.healthTipsDesc}
                </Text>
              </View>
              <Switch
                value={settings.notifications.healthTips}
                onValueChange={(value) => updateNotifications({ healthTips: value })}
                trackColor={{ false: palette.border, true: palette.primary }}
                thumbColor={palette.text}
                disabled={!settings.notifications.enabled}
                accessibilityLabel="Toggle health tips"
                accessibilityRole="switch"
                accessibilityState={{
                  checked: settings.notifications.healthTips,
                  disabled: !settings.notifications.enabled
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
                {isRegisteringPush ? t.registering : t.registerPush}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Target size={20} color={palette.primary} strokeWidth={2} />
            <Text style={[styles.sectionTitle, themed.sectionTitle]}>{t.goals}</Text>
          </View>
          <View style={[styles.card, themed.card]}>
            {isGoalsLoading && !goals ? (
              <ActivityIndicator color={Colors.primary} />
            ) : (
              <>
                <View style={[styles.optionRow, styles.optionRowBorder]}>
                  <View style={styles.optionContent}>
                    <Text style={[styles.optionLabel, themed.optionLabel]}>{t.pushGoalAlerts}</Text>
                    <Text style={[styles.optionDescription, themed.optionDescription]}>{t.pushGoalAlertsDesc}</Text>
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
                  { key: 'steps', label: t.stepsGoal, suffix: 'steps/day' },
                  { key: 'water', label: t.waterGoal, suffix: 'glasses/day' },
                  { key: 'sleep', label: t.sleepGoal, suffix: 'hours/night' },
                  { key: 'calories', label: t.caloriesGoal, suffix: 'kcal/day' },
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

                <TouchableOpacity style={[styles.saveButton, themed.saveButton]} onPress={saveGoals}>
                  <Text style={[styles.saveButtonText, themed.saveButtonText]}>{t.saveGoals}</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Smartphone size={20} color={palette.primary} strokeWidth={2} />
            <Text style={[styles.sectionTitle, themed.sectionTitle]}>{t.accessibility}</Text>
          </View>

          <View style={[styles.card, themed.card]}>
            <View style={[styles.optionRow, styles.optionRowBorder]}>
              <View style={styles.optionContent}>
                <Text style={[styles.optionLabel, themed.optionLabel]}>{t.screenReader}</Text>
                <Text style={[styles.optionDescription, themed.optionDescription]}>
                  {t.screenReaderDesc}
                </Text>
              </View>
              <Switch
                value={settings.accessibility.screenReader}
                onValueChange={(value) => updateAccessibility({ screenReader: value })}
                trackColor={{ false: palette.border, true: palette.primary }}
                thumbColor={palette.text}
                accessibilityLabel="Toggle screen reader support"
                accessibilityRole="switch"
                accessibilityState={{ checked: settings.accessibility.screenReader }}
              />
            </View>

            <View style={[styles.optionRow, styles.optionRowBorder]}>
              <View style={styles.optionContent}>
                <Text style={[styles.optionLabel, themed.optionLabel]}>{t.haptics}</Text>
                <Text style={[styles.optionDescription, themed.optionDescription]}>
                  {t.hapticsDesc}
                </Text>
              </View>
              <Switch
                value={settings.accessibility.hapticFeedback}
                onValueChange={(value) => updateAccessibility({ hapticFeedback: value })}
                trackColor={{ false: palette.border, true: palette.primary }}
                thumbColor={palette.text}
                accessibilityLabel="Toggle haptic feedback"
                accessibilityRole="switch"
                accessibilityState={{ checked: settings.accessibility.hapticFeedback }}
              />
            </View>

            <View style={styles.optionRow}>
              <View style={styles.optionContent}>
                <Text style={[styles.optionLabel, themed.optionLabel]}>{t.voiceInput}</Text>
                <Text style={[styles.optionDescription, themed.optionDescription]}>
                  {t.voiceInputDesc}
                </Text>
              </View>
              <Switch
                value={settings.accessibility.voiceInput}
                onValueChange={(value) => updateAccessibility({ voiceInput: value })}
                trackColor={{ false: palette.border, true: palette.primary }}
                thumbColor={palette.text}
                accessibilityLabel="Toggle voice input"
                accessibilityRole="switch"
                accessibilityState={{ checked: settings.accessibility.voiceInput }}
              />
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={styles.resetButton}
          onPress={handleResetSettings}
          accessibilityRole="button"
          accessibilityLabel="Reset all settings to default"
        >
          <RefreshCw size={20} color={Colors.error} strokeWidth={2} />
          <Text style={[styles.resetButtonText, themed.resetButtonText]}>{t.reset}</Text>
        </TouchableOpacity>

        <Text style={[styles.footerText, themed.footerText]}>
          {t.footer}
        </Text>
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
});
