import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { User as UserIcon, Mail, Calendar, Ruler, Weight, Heart, Settings, LogOut, ChevronRight } from 'lucide-react-native';
import { useUser } from '@/contexts/UserContext';
import { useTheme } from '@/contexts/SettingsContext';
import { useState, useMemo } from 'react';
import { useTranslation } from '@/hooks/use-translation';

import { useFocusEffect } from 'expo-router';
import { DIABETES_URL } from '@/constants/Api';
import { useCallback } from 'react';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, logout, ensureAccessToken } = useUser();
  const { colors, scale } = useTheme();
  const { t } = useTranslation();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [latestRecord, setLatestRecord] = useState<any>(null);

  useFocusEffect(
    useCallback(() => {
      const fetchLatestRecord = async (retryLimit = 1): Promise<void> => {
        try {
          let token = await ensureAccessToken();
          const response = await fetch(`${DIABETES_URL}/latest`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });

          if (response.status === 401 && retryLimit > 0) {
            token = await ensureAccessToken(true); // Force refresh
            if (token) {
              return fetchLatestRecord(retryLimit - 1);
            }
          }

          const json = await response.json();
          if (json.success && json.hasHistory) {
            setLatestRecord(json);
          }
        } catch (e) {
          console.log("Failed to fetch latest record", e);
        }
      };
      fetchLatestRecord();
    }, [])
  );

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'High Risk': return colors.risk.high;
      case 'Medium Risk': return colors.risk.moderate;
      default: return colors.risk.low;
    }
  };

  // Dynamic Styles
  const themed = useMemo(() => ({
    container: { backgroundColor: colors.backgroundSecondary },
    header: { backgroundColor: colors.background },
    headerTitle: { color: colors.text, fontSize: scale(28) },
    card: { backgroundColor: colors.card, shadowColor: colors.cardShadow },
    text: { color: colors.text },
    textSecondary: { color: colors.textSecondary },
    sectionTitle: { color: colors.text, fontSize: scale(18) },
    infoLabel: { color: colors.textSecondary, fontSize: scale(12) },
    infoValue: { color: colors.text, fontSize: scale(15) },
    menuLabel: { color: colors.text, fontSize: scale(16) },
    logoutButton: { backgroundColor: colors.card, borderColor: colors.error + '40' },
  }), [colors, scale]);

  const handleLogout = () => {
    if (isLoggingOut) return;
    Alert.alert(
      t.profile.logoutConfirmTitle,
      t.profile.logoutConfirmDesc,
      [
        { text: t.common.cancel, style: 'cancel' },
        {
          text: t.profile.logout,
          style: 'destructive',
          onPress: async () => {
            try {
              setIsLoggingOut(true);
              await logout();
              router.replace('/login' as any);
            } finally {
              setIsLoggingOut(false);
            }
          },
        },
      ]
    );
  };

  // Helper to map sex code to string
  const getGenderString = (sex?: number) => {
    if (sex === 1) return t.profile.male;
    if (sex === 0) return t.profile.female;
    return t.profile.notSet;
  };

  // Helper to get age display
  const getAgeDisplay = (age?: number) => {
    if (!age) return t.profile.notSet;
    // If age is a category (1-13), map to range
    if (age <= 13) {
      const ranges = ['18-24', '25-29', '30-34', '35-39', '40-44', '45-49', '50-54', '55-59', '60-64', '65-69', '70-74', '75-79', '80+'];
      const range = ranges[age - 1]; // 1-based index
      return range ? `${t.profile.group}${range}` : `${age}${t.profile.years}`;
    }
    // Otherwise assume valid age years
    return `${age}${t.profile.years}`;
  };

  const profileInfo = [
    { icon: Mail, label: t.profile.email, value: user?.email || t.profile.notSet },
    { icon: Calendar, label: t.profile.age, value: getAgeDisplay(user?.age) },
    { icon: UserIcon, label: t.profile.gender, value: getGenderString(user?.sex) },
    { icon: Ruler, label: t.profile.height, value: user?.height ? `${user.height} cm` : t.profile.notSet },
    { icon: Weight, label: t.profile.weight, value: user?.weight ? `${user.weight} kg` : t.profile.notSet },
  ];

  const menuItems = [
    { icon: Settings, label: t.settings.header, route: '/settings', color: colors.primary },
    { icon: Heart, label: t.profile.healthRecords.header, route: '/health-history', color: colors.error },
  ];

  return (
    <View style={[styles.container, themed.container, { paddingTop: insets.top }]}>
      <View style={[styles.header, themed.header]}>
        <Text style={[styles.headerTitle, themed.headerTitle]}>{t.profile.header}</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.profileCard, themed.card]}>
          <View style={styles.avatarContainer}>
            <View style={[styles.avatar, { backgroundColor: colors.primary + '20' }]}>
              <UserIcon size={48} color={colors.primary} strokeWidth={2} />
            </View>
          </View>
          <Text style={[styles.userName, themed.text, { fontSize: scale(24) }]}>{user?.name || t.profile.male}</Text>
          <Text style={[styles.userEmail, themed.textSecondary, { fontSize: scale(14) }]}>{user?.email || 'email@example.com'}</Text>

          <TouchableOpacity style={[styles.editButton, { backgroundColor: colors.primary }]} onPress={() => router.push('/edit-profile' as any)}>
            <Text style={[styles.editButtonText, { color: colors.textWhite, fontSize: scale(14) }]}>{t.profile.editProfile}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, themed.sectionTitle]}>{t.profile.personalInfo}</Text>
          {profileInfo.map((item, index) => {
            const Icon = item.icon;
            return (
              <View key={index} style={[styles.infoCard, themed.card]}>
                <View style={[styles.infoIcon, { backgroundColor: colors.primary + '20' }]}>
                  <Icon size={20} color={colors.primary} strokeWidth={2} />
                </View>
                <View style={styles.infoContent}>
                  <Text style={[styles.infoLabel, themed.infoLabel]}>{item.label}</Text>
                  <Text style={[styles.infoValue, themed.infoValue]}>{item.value}</Text>
                </View>
              </View>
            );
          })}
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, themed.sectionTitle]}>{t.profile.quickAccess}</Text>
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <TouchableOpacity
                key={index}
                style={[styles.menuCard, themed.card]}
                onPress={() => router.push(item.route as any)}
              >
                <View style={[styles.menuIcon, { backgroundColor: item.color + '20' }]}>
                  <Icon size={24} color={item.color} strokeWidth={2} />
                </View>
                <Text style={[styles.menuLabel, themed.menuLabel]}>{item.label}</Text>
                <ChevronRight size={20} color={colors.textSecondary} strokeWidth={2} />
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, themed.sectionTitle]}>{t.profile.medicalHistory}</Text>
          <View style={[styles.historyCard, themed.card]}>
            {latestRecord ? (
              <View>
                <View style={styles.historyItem}>
                  <View style={[styles.historyDot, { backgroundColor: getRiskColor(latestRecord.riskLevel) }]} />
                  <Text style={[styles.historyText, themed.text, { fontSize: scale(14), fontWeight: '600' }]}>
                    {latestRecord.riskLevel} ({latestRecord.riskScore}%)
                  </Text>
                </View>
                <Text style={[themed.textSecondary, { fontSize: scale(12), marginLeft: 20 }]}>
                  {new Date(latestRecord.timestamp).toLocaleDateString()}
                </Text>
              </View>
            ) : (
              <Text style={[styles.emptyText, themed.textSecondary, { fontSize: scale(14) }]}>{t.profile.noHistory}</Text>
            )}
          </View>
        </View>

        <TouchableOpacity style={[styles.logoutButton, themed.logoutButton]} onPress={handleLogout} disabled={isLoggingOut}>
          <LogOut size={20} color={colors.error} strokeWidth={2} />
          <Text style={[styles.logoutText, { color: colors.error, fontSize: scale(16) }]}>{isLoggingOut ? t.profile.loggingOut : t.profile.logout}</Text>
        </TouchableOpacity>

        <Text style={[styles.versionText, { color: colors.textLight, fontSize: scale(12) }]}>SweetTrack v1.0.0</Text>
      </ScrollView>
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
    fontWeight: '700' as const,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 30,
  },
  profileCard: {
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userName: {
    fontWeight: '700' as const,
    marginBottom: 4,
  },
  userEmail: {
    marginBottom: 16,
  },
  editButton: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
  },
  editButtonText: {
    fontWeight: '600' as const,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontWeight: '700' as const,
    marginBottom: 12,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    marginBottom: 2,
  },
  infoValue: {
    fontWeight: '600' as const,
  },
  menuCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  menuIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  menuLabel: {
    flex: 1,
    fontWeight: '600' as const,
  },
  historyCard: {
    borderRadius: 12,
    padding: 16,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  historyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 12,
  },
  historyText: {
    flex: 1,
  },
  emptyText: {
    textAlign: 'center',
    fontStyle: 'italic' as const,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  logoutText: {
    fontWeight: '600' as const,
    marginLeft: 8,
  },
  versionText: {
    textAlign: 'center',
  },
});
