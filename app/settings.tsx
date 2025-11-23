import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  X,
  Globe,
  Eye,
  Bell,
  Smartphone,
  RefreshCw,
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useSettings, Language } from '@/contexts/SettingsContext';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const {
    settings,
    toggleHighContrast,
    setLanguage,
    setFontSize,
    updateNotifications,
    updateAccessibility,
    resetSettings,
  } = useSettings();

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

  const handleResetSettings = () => {
    Alert.alert(
      'Reset Settings',
      'Are you sure you want to reset all settings to default?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            resetSettings();
            Alert.alert('Success', 'Settings have been reset to default');
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
          <X size={24} color={Colors.text} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={styles.headerButton} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Globe size={20} color={Colors.primary} strokeWidth={2} />
            <Text style={styles.sectionTitle}>Language</Text>
          </View>
          <View style={styles.card}>
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
                <Text style={styles.optionLabel}>{lang.name}</Text>
                <View
                  style={[
                    styles.radioOuter,
                    settings.language === lang.code && styles.radioOuterActive,
                  ]}
                >
                  {settings.language === lang.code && <View style={styles.radioInner} />}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Eye size={20} color={Colors.primary} strokeWidth={2} />
            <Text style={styles.sectionTitle}>Display</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.optionRow}>
              <View style={styles.optionContent}>
                <Text style={styles.optionLabel}>High Contrast Mode</Text>
                <Text style={styles.optionDescription}>
                  Increases contrast for better visibility
                </Text>
              </View>
              <Switch
                value={settings.highContrast}
                onValueChange={toggleHighContrast}
                trackColor={{ false: Colors.border, true: Colors.primary }}
                thumbColor={Colors.textWhite}
                accessibilityLabel="Toggle high contrast mode"
                accessibilityRole="switch"
                accessibilityState={{ checked: settings.highContrast }}
              />
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Font Size</Text>
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
                      settings.fontSize === size.value && styles.segmentButtonTextActive,
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
            <Bell size={20} color={Colors.primary} strokeWidth={2} />
            <Text style={styles.sectionTitle}>Notifications</Text>
          </View>

          <View style={styles.card}>
            <View style={[styles.optionRow, styles.optionRowBorder]}>
              <View style={styles.optionContent}>
                <Text style={styles.optionLabel}>Enable Notifications</Text>
                <Text style={styles.optionDescription}>
                  Receive app notifications
                </Text>
              </View>
              <Switch
                value={settings.notifications.enabled}
                onValueChange={(value) => updateNotifications({ enabled: value })}
                trackColor={{ false: Colors.border, true: Colors.primary }}
                thumbColor={Colors.textWhite}
                accessibilityLabel="Toggle notifications"
                accessibilityRole="switch"
                accessibilityState={{ checked: settings.notifications.enabled }}
              />
            </View>

            <View style={[styles.optionRow, styles.optionRowBorder]}>
              <View style={styles.optionContent}>
                <Text style={styles.optionLabel}>Daily Reminders</Text>
                <Text style={styles.optionDescription}>
                  Get daily health reminders
                </Text>
              </View>
              <Switch
                value={settings.notifications.dailyReminders}
                onValueChange={(value) => updateNotifications({ dailyReminders: value })}
                trackColor={{ false: Colors.border, true: Colors.primary }}
                thumbColor={Colors.textWhite}
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
                <Text style={styles.optionLabel}>Goal Alerts</Text>
                <Text style={styles.optionDescription}>
                  Alerts when approaching goals
                </Text>
              </View>
              <Switch
                value={settings.notifications.goalAlerts}
                onValueChange={(value) => updateNotifications({ goalAlerts: value })}
                trackColor={{ false: Colors.border, true: Colors.primary }}
                thumbColor={Colors.textWhite}
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
                <Text style={styles.optionLabel}>Health Tips</Text>
                <Text style={styles.optionDescription}>
                  Daily wellness tips
                </Text>
              </View>
              <Switch
                value={settings.notifications.healthTips}
                onValueChange={(value) => updateNotifications({ healthTips: value })}
                trackColor={{ false: Colors.border, true: Colors.primary }}
                thumbColor={Colors.textWhite}
                disabled={!settings.notifications.enabled}
                accessibilityLabel="Toggle health tips"
                accessibilityRole="switch"
                accessibilityState={{ 
                  checked: settings.notifications.healthTips,
                  disabled: !settings.notifications.enabled 
                }}
              />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Smartphone size={20} color={Colors.primary} strokeWidth={2} />
            <Text style={styles.sectionTitle}>Accessibility</Text>
          </View>

          <View style={styles.card}>
            <View style={[styles.optionRow, styles.optionRowBorder]}>
              <View style={styles.optionContent}>
                <Text style={styles.optionLabel}>Screen Reader Support</Text>
                <Text style={styles.optionDescription}>
                  Optimize for screen readers
                </Text>
              </View>
              <Switch
                value={settings.accessibility.screenReader}
                onValueChange={(value) => updateAccessibility({ screenReader: value })}
                trackColor={{ false: Colors.border, true: Colors.primary }}
                thumbColor={Colors.textWhite}
                accessibilityLabel="Toggle screen reader support"
                accessibilityRole="switch"
                accessibilityState={{ checked: settings.accessibility.screenReader }}
              />
            </View>

            <View style={[styles.optionRow, styles.optionRowBorder]}>
              <View style={styles.optionContent}>
                <Text style={styles.optionLabel}>Haptic Feedback</Text>
                <Text style={styles.optionDescription}>
                  Vibrations for interactions
                </Text>
              </View>
              <Switch
                value={settings.accessibility.hapticFeedback}
                onValueChange={(value) => updateAccessibility({ hapticFeedback: value })}
                trackColor={{ false: Colors.border, true: Colors.primary }}
                thumbColor={Colors.textWhite}
                accessibilityLabel="Toggle haptic feedback"
                accessibilityRole="switch"
                accessibilityState={{ checked: settings.accessibility.hapticFeedback }}
              />
            </View>

            <View style={styles.optionRow}>
              <View style={styles.optionContent}>
                <Text style={styles.optionLabel}>Voice Input</Text>
                <Text style={styles.optionDescription}>
                  Enable voice commands
                </Text>
              </View>
              <Switch
                value={settings.accessibility.voiceInput}
                onValueChange={(value) => updateAccessibility({ voiceInput: value })}
                trackColor={{ false: Colors.border, true: Colors.primary }}
                thumbColor={Colors.textWhite}
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
          <Text style={styles.resetButtonText}>Reset to Default</Text>
        </TouchableOpacity>

        <Text style={styles.footerText}>
          These settings are designed to meet WCAG 2.1 AA accessibility standards
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
});
