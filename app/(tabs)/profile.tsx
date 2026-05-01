import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform } from 'react-native';
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
import { LinearGradient } from 'expo-linear-gradient';
import { ShieldCheck, Sparkles } from 'lucide-react-native';

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
    container: { flex: 1 },
    header: { backgroundColor: 'transparent' },
    headerTitle: { color: colors.text, fontSize: scale(28) },
    card: { backgroundColor: 'rgba(255, 255, 255, 0.9)', borderColor: 'rgba(255, 255, 255, 0.3)', borderWidth: 1 },
    text: { color: colors.text },
    textSecondary: { color: colors.textSecondary },
    sectionTitle: { color: colors.text, fontSize: scale(18) },
    infoLabel: { color: colors.textSecondary, fontSize: scale(11) },
    infoValue: { color: colors.text, fontSize: scale(15) },
    menuLabel: { color: colors.text, fontSize: scale(16) },
    logoutButton: { borderContent: 'transparent' },
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
    <LinearGradient
      colors={['#F0FDF4', '#F0F9FF']} // Signature Metabolic Gradient
      style={[styles.container, { paddingTop: insets.top }]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <View style={[styles.header, themed.header]}>
        <View style={styles.headerContent}>
          <Text style={[styles.headerTitle, themed.headerTitle]}>{t.profile.header}</Text>
          <Sparkles size={24} color={colors.primary} />
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.profileCard, themed.card]}>
          <LinearGradient
            colors={['#10B981', '#3B82F6']}
            style={styles.profileCardGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
          <View style={styles.avatarContainer}>
            <View style={styles.avatarOutline}>
              <View style={[styles.avatar, { backgroundColor: '#FFFFFF' }]}>
                <UserIcon size={scale(48)} color="#10B981" strokeWidth={2.5} />
              </View>
            </View>
          </View>
          <Text style={[styles.userName, themed.text, { fontSize: scale(24) }]}>{user?.name || 'anna'}</Text>
          <Text style={[styles.userEmail, themed.textSecondary, { fontSize: scale(14) }]}>{user?.email || 'anna@gmail.com'}</Text>

          <TouchableOpacity 
            activeOpacity={0.8}
            onPress={() => router.push('/edit-profile' as any)}
          >
            <LinearGradient
              colors={['#00B4D8', '#0077B6']}
              style={styles.editButton}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.editButtonText}>{t.profile.editProfile}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, themed.sectionTitle]}>{t.profile.personalInfo}</Text>
            <ShieldCheck size={18} color={colors.primary} />
          </View>
          <View style={styles.infoGrid}>
            {/* Email is full width at top */}
            <View style={[styles.infoCardFull, themed.card]}>
              <View style={[styles.infoIcon, { backgroundColor: colors.primary + '15' }]}>
                <Mail size={18} color={colors.primary} strokeWidth={2.5} />
              </View>
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, themed.infoLabel]}>{t.profile.email.toUpperCase()}</Text>
                <Text style={[styles.infoValue, themed.infoValue]}>{user?.email || 'anna@gmail.com'}</Text>
              </View>
            </View>

            {/* Other stats in 2 columns */}
            <View style={styles.infoRow}>
              {[
                { icon: Calendar, label: t.profile.age, value: getAgeDisplay(user?.age), color: '#3B82F6' },
                { icon: UserIcon, label: t.profile.gender, value: getGenderString(user?.sex), color: '#10B981' },
                { icon: Ruler, label: t.profile.height, value: user?.height ? `${user.height} cm` : t.profile.notSet, color: '#F59E0B' },
                { icon: Weight, label: t.profile.weight, value: user?.weight ? `${user.weight} kg` : t.profile.notSet, color: '#EC4899' },
              ].map((item, index) => {
                const Icon = item.icon;
                return (
                  <View key={index} style={[styles.infoCardHalf, themed.card]}>
                    <View style={[styles.infoIcon, { backgroundColor: item.color + '15' }]}>
                      <Icon size={18} color={item.color} strokeWidth={2.5} />
                    </View>
                    <View style={styles.infoContent}>
                      <Text style={[styles.infoLabel, themed.infoLabel]}>{item.label.toUpperCase()}</Text>
                      <Text style={[styles.infoValue, themed.infoValue]}>{item.value}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, themed.sectionTitle]}>{t.profile.quickAccess}</Text>
          <View style={styles.menuGrid}>
            {menuItems.map((item, index) => {
              const Icon = item.icon;
              return (
                <TouchableOpacity
                  key={index}
                  style={[styles.menuCard, themed.card]}
                  onPress={() => router.push(item.route as any)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.menuIcon, { backgroundColor: item.color + '15' }]}>
                    <Icon size={22} color={item.color} strokeWidth={2.5} />
                  </View>
                  <Text style={[styles.menuLabel, themed.menuLabel]}>{item.label}</Text>
                  <ChevronRight size={18} color={colors.textLight} strokeWidth={3} />
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, themed.sectionTitle]}>{t.profile.medicalHistory}</Text>
          <View style={[styles.historyCard, themed.card]}>
            <View style={styles.historyAccent} />
            <View style={styles.historyContent}>
              {latestRecord ? (
                <View style={styles.historyRow}>
                  <View style={styles.historyInfo}>
                    <View style={styles.historyBadge}>
                      <View style={[styles.historyDot, { backgroundColor: getRiskColor(latestRecord.riskLevel) }]} />
                      <Text style={[styles.historyText, { color: getRiskColor(latestRecord.riskLevel) }]}>
                        {latestRecord.riskLevel === 'High Risk' ? t.profile.healthHistory.riskLevelHigh : t.profile.healthHistory.riskLevelLow}
                      </Text>
                    </View>
                    <Text style={[styles.historyDate, themed.textSecondary]}>
                      {new Date(latestRecord.timestamp).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}
                    </Text>
                  </View>
                  <ChevronRight size={16} color={colors.textLight} />
                </View>
              ) : (
                <Text style={[styles.emptyText, themed.textSecondary]}>{t.profile.noHistory}</Text>
              )}
            </View>
          </View>
        </View>

        <TouchableOpacity 
          activeOpacity={0.8}
          onPress={handleLogout} 
          disabled={isLoggingOut}
          style={styles.logoutWrapper}
        >
          <LinearGradient
            colors={['#FF5F6D', '#FF3131']}
            style={styles.logoutButton}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <LogOut size={20} color="#FFFFFF" strokeWidth={2.5} />
            <Text style={styles.logoutText}>
              {isLoggingOut ? t.profile.loggingOut : t.profile.logout}
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        <Text style={[styles.versionText, { color: colors.textLight, fontSize: scale(11) }]}>
          SweetTrack Metabolic Engine v1.0.0
        </Text>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontWeight: '900' as const,
    letterSpacing: -1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  profileCard: {
    borderRadius: 32,
    padding: 24,
    alignItems: 'center',
    marginBottom: 32,
    overflow: 'hidden',
    ...Platform.select({
      web: { boxShadow: '0px 10px 30px rgba(0, 0, 0, 0.08)' },
      native: {
        elevation: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
      }
    }),
  },
  profileCardGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 100,
    opacity: 0.8,
  },
  avatarContainer: {
    marginTop: 20,
    marginBottom: 16,
  },
  avatarOutline: {
    width: 110,
    height: 110,
    borderRadius: 55,
    padding: 4,
    backgroundColor: '#FFFFFF',
    ...Platform.select({
      web: { boxShadow: '0px 4px 15px rgba(0, 0, 0, 0.1)' },
      native: {
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
      }
    }),
  },
  avatar: {
    flex: 1,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userName: {
    fontWeight: '900' as const,
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  userEmail: {
    marginBottom: 20,
    opacity: 0.6,
  },
  editButton: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 20,
    ...Platform.select({
      web: { boxShadow: '0px 4px 12px rgba(0, 180, 216, 0.3)' },
      native: {
        elevation: 4,
        shadowColor: '#00B4D8',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      }
    }),
  },
  editButtonText: {
    fontWeight: '800' as const,
    color: '#FFFFFF',
    fontSize: 14,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontWeight: '800' as const,
    letterSpacing: -0.5,
  },
  infoGrid: {
    gap: 12,
  },
  infoCardFull: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 24,
    padding: 18,
    marginBottom: 4,
  },
  infoRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  infoCardHalf: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    padding: 14,
  },
  infoIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    letterSpacing: 1,
    marginBottom: 2,
    fontWeight: '700',
  },
  infoValue: {
    fontWeight: '800' as const,
  },
  menuGrid: {
    gap: 12,
  },
  menuCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    padding: 16,
  },
  menuIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  menuLabel: {
    flex: 1,
    fontWeight: '800' as const,
    fontSize: 16,
  },
  historyCard: {
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  historyAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 6,
    backgroundColor: '#10B981',
  },
  historyContent: {
    flex: 1,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  historyInfo: {
    gap: 4,
  },
  historyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  historyDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  historyText: {
    fontWeight: '800',
    fontSize: 16,
  },
  historyDate: {
    fontSize: 12,
    fontWeight: '600',
    opacity: 0.6,
  },
  emptyText: {
    textAlign: 'center',
    fontStyle: 'italic' as const,
    opacity: 0.5,
  },
  logoutWrapper: {
    marginBottom: 16,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    padding: 18,
    gap: 12,
    ...Platform.select({
      web: { boxShadow: '0px 4px 15px rgba(255, 49, 49, 0.25)' },
      native: {
        elevation: 4,
        shadowColor: '#FF3131',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
      }
    }),
  },
  logoutText: {
    fontWeight: '800' as const,
    color: '#FFFFFF',
    fontSize: 16,
  },
  versionText: {
    textAlign: 'center',
    fontWeight: '600',
    marginTop: 8,
  },
});
