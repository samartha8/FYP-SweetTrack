import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Dimensions, Platform } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeInUp, ZoomIn, Layout } from 'react-native-reanimated';
import { ArrowLeft, Target, Flame, Candy, Wheat, Beef, ShieldCheck, ShieldAlert, Zap, Calendar, Sparkles } from 'lucide-react-native';
import { useMealTracking } from '@/contexts/MealTrackingContext';
import { useTheme } from '@/contexts/SettingsContext';

const { width } = Dimensions.get('window');

export default function DailyRecapScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors, scale: fontScale } = useTheme();
  const { getDailyRecap } = useMealTracking();

  const [loading, setLoading] = useState(true);
  const [recapData, setRecapData] = useState<any>(null);

  useEffect(() => { fetchRecap(); }, []);

  const fetchRecap = async () => {
    setLoading(true);
    try {
        const data = await getDailyRecap();
        setRecapData(data);
    } catch (e) {
        console.error(e);
    } finally {
        setLoading(false);
    }
  };

  const themed = useMemo(() => ({
    headerTitle: { color: colors.text, fontSize: fontScale(24), fontWeight: '900' as const, letterSpacing: -1 },
    sectionTitle: { color: colors.text, fontSize: fontScale(22), fontWeight: '900' as const, letterSpacing: -0.5 },
    card: { backgroundColor: '#FFF', borderRadius: 28, borderWidth: 1, borderColor: 'rgba(0,0,0,0.03)', elevation: 5, shadowOpacity: 0.08, shadowRadius: 20, shadowColor: '#000' },
    statValue: { color: colors.text, fontSize: fontScale(18), fontWeight: '900' as const, letterSpacing: -0.5 },
    statLabel: { color: colors.textSecondary, fontSize: fontScale(11), fontWeight: '800' as const, textTransform: 'uppercase' as const, letterSpacing: 1 },
    insightTitle: { color: colors.text, fontSize: fontScale(17), fontWeight: '900' as const, letterSpacing: -0.3 },
    insightBody: { color: colors.textSecondary, fontSize: fontScale(14), lineHeight: 22, fontWeight: '600' as const },
    actionTitle: { color: colors.primary, fontSize: fontScale(14), fontWeight: '900' as const, letterSpacing: 1.5 },
    tipText: { color: colors.text, fontSize: fontScale(15), fontWeight: '700' as const },
  }), [colors, fontScale]);

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: '#F0FDF4', justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ color: colors.textSecondary, fontSize: fontScale(16), fontWeight: '700', marginTop: 16 }}>Auditing your metabolic day...</Text>
      </View>
    );
  }

  if (!recapData || recapData.status === 'empty') {
    return (
      <View style={[styles.container, { backgroundColor: '#F0FDF4' }]}>
        <LinearGradient colors={['#F0FDF4', '#F0F9FF']} style={StyleSheet.absoluteFill} />
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[styles.header, { paddingTop: insets.top }]}>
          <TouchableOpacity onPress={() => router.back()}><ArrowLeft size={28} color={colors.text} /></TouchableOpacity>
        </View>
        <View style={styles.emptyState}>
          <Calendar size={80} color={colors.primary} opacity={0.3} />
          <Text style={{ color: colors.text, fontSize: fontScale(28), fontWeight: '900', marginTop: 24 }}>No Data Today</Text>
          <Text style={{ color: colors.textSecondary, fontSize: fontScale(16), textAlign: 'center', marginTop: 10 }}>Log meals to generate audit.</Text>
          <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: colors.primary, marginTop: 24 }]} onPress={() => router.push('/meal-login')}>
            <LinearGradient colors={['#00B4D8', '#0077B6']} style={StyleSheet.absoluteFill} />
            <Text style={{ color: '#FFF', fontWeight: '900' }}>Start Logging</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const { totals, report } = recapData;
  const isPositive = report.risks.length === 0;

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#F0FDF4', '#F0F9FF']} style={StyleSheet.absoluteFill} />
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => router.back()}><ArrowLeft size={28} color={colors.text} /></TouchableOpacity>
        <Text style={themed.headerTitle}>Daily Audit</Text>
        <View style={{ width: 28 }} />
      </View>
      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInUp}>
          <LinearGradient colors={isPositive ? ['#10B981', '#059669'] : ['#EF4444', '#DC2626']} style={styles.statusCard}>
            <View style={styles.statusIconBox}>{isPositive ? <ShieldCheck size={32} color="#FFF" /> : <ShieldAlert size={32} color="#FFF" />}</View>
            <View style={{ flex: 1, marginLeft: 16 }}>
              <Text style={styles.statusTitle}>{isPositive ? 'Metabolic Peak' : 'Metabolic Risk'}</Text>
              <Text style={styles.statusMessage}>{report.summary}</Text>
            </View>
          </LinearGradient>
        </Animated.View>
        <View style={styles.statGrid}>
          {[
            { icon: Flame, color: '#F59E0B', value: totals.calories, label: 'Calories' },
            { icon: Candy, color: '#EF4444', value: `${totals.sugar}g`, label: 'Sugar' },
            { icon: Wheat, color: '#10B981', value: `${totals.fiber}g`, label: 'Fiber' },
            { icon: Beef, color: '#8B5CF6', value: `${totals.protein}g`, label: 'Protein' },
          ].map((stat, i) => (
            <Animated.View key={i} entering={FadeInDown.delay(100 + i * 50)} style={[styles.statCard, themed.card]}>
              <stat.icon size={22} color={stat.color} />
              <Text style={themed.statValue}>{stat.value}</Text>
              <Text style={themed.statLabel}>{stat.label}</Text>
            </Animated.View>
          ))}
        </View>
        {report.wins.length > 0 && (
          <View style={styles.section}>
            <Text style={themed.sectionTitle}>Metabolic Wins</Text>
            {report.wins.map((win: any, i: number) => (
              <Animated.View key={i} entering={FadeInDown.delay(400)} style={[styles.insightCard, { borderLeftColor: '#10B981' }, themed.card]}>
                <Text style={themed.insightTitle}>{win.title}</Text>
                <Text style={themed.insightBody}>{win.detail}</Text>
              </Animated.View>
            ))}
          </View>
        )}
        <Animated.View entering={FadeInDown.delay(600)} style={[styles.actionContainer, themed.card]}>
          <Text style={themed.actionTitle}>NEXT DAY STRATEGY</Text>
          {report.tips.map((tip: string, i: number) => (
            <Text key={i} style={[themed.tipText, { marginTop: 8 }]}>• {tip}</Text>
          ))}
        </Animated.View>
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 24) }]}>
        <TouchableOpacity style={styles.doneBtn} onPress={() => router.replace('/(tabs)/home')}>
          <LinearGradient colors={['#00B4D8', '#0077B6']} style={StyleSheet.absoluteFill} />
          <Text style={{ color: '#FFF', fontWeight: '900' }}>Return Home</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingBottom: 16 },
  scrollContent: { paddingHorizontal: 24, paddingTop: 16 },
  statusCard: { padding: 24, borderRadius: 32, marginBottom: 24, flexDirection: 'row', alignItems: 'center' },
  statusIconBox: { width: 60, height: 60, backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  statusTitle: { color: '#FFF', fontSize: 22, fontWeight: '900' },
  statusMessage: { color: '#FFF', fontSize: 14, opacity: 0.9, marginTop: 4 },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 32 },
  statCard: { width: (width - 48 - 12) / 2, padding: 20, alignItems: 'center' },
  section: { marginBottom: 32 },
  insightCard: { padding: 20, borderLeftWidth: 5, marginBottom: 16 },
  actionContainer: { padding: 28, marginBottom: 32 },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 24 },
  doneBtn: { height: 56, borderRadius: 20, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  primaryBtn: { paddingHorizontal: 36, paddingVertical: 18, borderRadius: 24, overflow: 'hidden' },
});
