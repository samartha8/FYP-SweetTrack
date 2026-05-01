import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, Dimensions } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TrendingDown, Activity, Utensils, Info, ChevronLeft, ShieldCheck, Zap, ArrowLeft, Sparkles } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/contexts/SettingsContext';
import { useUser } from '@/contexts/UserContext';
import { useMealTracking } from '@/contexts/MealTrackingContext';
import Animated, { FadeInDown, FadeInUp, Layout, ZoomIn } from 'react-native-reanimated';

const { width } = Dimensions.get('window');

export default function ProgressImpactScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { colors, scale } = useTheme();
    const { healthMetrics, riskStatus } = useUser();
    const { mealLogs } = useMealTracking();

    // --- Metabolic Synergy Algorithm ---
    const synergyData = useMemo(() => {
        const steps = healthMetrics.steps || 0;
        let stepImpact = 0;
        let stepStatus = 'Below Target';
        
        if (steps >= 8000) {
            stepImpact = 10.0;
            stepStatus = 'Optimal';
        } else if (steps >= 5000) {
            stepImpact = 4.0; 
            stepStatus = 'Improving';
        } else if (steps < 2000) {
            stepImpact = -8.0; 
            stepStatus = 'Critically Low';
        } else if (steps < 5000) {
            stepImpact = -2.0;
            stepStatus = 'Insufficient';
        }

        const last7Days = new Date();
        last7Days.setDate(last7Days.getDate() - 7);
        const recentLogs = mealLogs.filter(log => new Date(log.date) >= last7Days);
        const healthyMeals = recentLogs.filter(log => (log.nutritionalInfo?.sugar || 0) < 15).length;
        const unhealthyMeals = recentLogs.filter(log => (log.nutritionalInfo?.sugar || 0) >= 25).length;
        const rawMealImpact = (healthyMeals * 1.5) - (unhealthyMeals * 5.0);
        let mealImpact = Math.min(rawMealImpact, 10); 
        let totalImpactNumber = stepImpact + mealImpact;
        const isDownwardSpiral = steps < 2000 && unhealthyMeals > 0;
        let spiralPenalty = 0;
        
        if (isDownwardSpiral) {
            const before = totalImpactNumber;
            totalImpactNumber = totalImpactNumber * 1.5;
            spiralPenalty = totalImpactNumber - before;
        }
        
        const totalImpact = parseFloat(totalImpactNumber.toFixed(1));
        let impactLabel = 'Low';
        if (totalImpact >= 12) impactLabel = 'High';
        else if (totalImpact >= 6) impactLabel = 'Moderate';
        else if (totalImpact <= -18) impactLabel = 'CRITICAL';
        else if (totalImpact < 0) impactLabel = 'Negative';

        let interpretation = "Your daily choices are actively preventing metabolic progression.";
        if (totalImpact <= -18) {
            interpretation = "CRITICAL: High glycemic intake combined with physical inactivity is rapidly accelerating metabolic risk.";
        } else if (totalImpact < 0) {
            interpretation = "Action Required: Current trends are increasing metabolic load and insulin resistance risk.";
        } else if (unhealthyMeals > 0) {
            interpretation = "Some choices today added metabolic load. Increase activity to neutralize this impact.";
        }
        
        if (riskStatus === 'Positive' && totalImpact >= 10) {
            interpretation = "Excellent: Your high synergy is successfully neutralizing your baseline risk factors.";
        }

        return {
            steps,
            stepImpact,
            stepStatus,
            healthyMeals,
            unhealthyMeals,
            totalRecentMeals: recentLogs.length,
            mealImpact,
            isDownwardSpiral,
            spiralPenalty,
            totalImpact: totalImpact,
            impactLabel,
            interpretation,
            isCritical: totalImpact <= -18
        };
    }, [healthMetrics.steps, mealLogs, riskStatus]);

    const themed = useMemo(() => ({
        container: { backgroundColor: 'transparent' },
        headerTitle: { color: colors.text, fontSize: scale(24), fontWeight: '900' as const, letterSpacing: -1 },
        card: { 
            backgroundColor: '#FFF', 
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.08,
            shadowRadius: 20,
            elevation: 5,
            borderRadius: 32,
            borderWidth: 1,
            borderColor: 'rgba(0,0,0,0.03)'
        },
        sectionTitle: { color: colors.text, fontSize: scale(20), fontWeight: '900' as const, letterSpacing: -0.5 },
        impactValue: { fontSize: 24, fontWeight: '900' as const, letterSpacing: -1 },
        impactName: { fontSize: 16, fontWeight: '900' as const, letterSpacing: -0.3 },
        impactDetail: { fontSize: 12, color: colors.textSecondary, fontWeight: '600' as const },
    }), [colors, scale]);

    return (
        <View style={styles.container}>
            <LinearGradient colors={['#F0FDF4', '#F0F9FF']} style={StyleSheet.absoluteFill} />
            <Stack.Screen options={{ headerShown: false }} />
            
            <View style={[styles.header, { paddingTop: insets.top }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <ArrowLeft size={28} color={colors.text} strokeWidth={2.5} />
                </TouchableOpacity>
                <Text style={themed.headerTitle}>Metabolic Synergy</Text>
                <View style={{ width: 44 }} />
            </View>

            <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]} showsVerticalScrollIndicator={false}>
                
                {/* Main Synergy Card */}
                <Animated.View entering={FadeInUp}>
                    <LinearGradient
                        colors={
                            synergyData.totalImpact >= 0 
                                ? ['#10B981', '#059669'] 
                                : synergyData.isCritical 
                                    ? ['#EF4444', '#000'] 
                                    : ['#EF4444', '#DC2626']
                        }
                        style={[styles.mainCard, themed.card]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                    >
                        <View style={styles.synergyHeader}>
                            {synergyData.totalImpact >= 0 ? (
                                <ShieldCheck size={32} color="#FFF" strokeWidth={2.5} />
                            ) : synergyData.isCritical ? (
                                <Zap size={32} color="#FFCC00" strokeWidth={2.5} />
                            ) : (
                                <TrendingDown size={32} color="#FFF" strokeWidth={2.5} />
                            )}
                            <Text style={styles.synergyTitle}>
                                {synergyData.isCritical ? 'CRITICAL LOAD' : 'Synergy Impact'}
                            </Text>
                        </View>

                        <View style={styles.scoreContainer}>
                            <Text style={styles.scoreValue}>
                                {synergyData.totalImpact > 0 ? '+' : ''}{synergyData.totalImpact.toFixed(1)}%
                            </Text>
                            <Text style={styles.scoreLabel}>METABOLIC NEUTRALIZATION</Text>
                        </View>

                        <View style={[styles.impactBadge, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                            <Sparkles size={14} color="#FFF" strokeWidth={2.5} />
                            <Text style={styles.impactBadgeText}>
                                {synergyData.isCritical ? 'SPIRAL DETECTED' : synergyData.totalImpact < 0 ? 'RISK ACTIVE' : `${synergyData.impactLabel} IMPACT`}
                            </Text>
                        </View>

                        <Text style={styles.cardQuote}>
                            "{synergyData.interpretation}"
                        </Text>
                    </LinearGradient>
                </Animated.View>

                <View style={styles.section}>
                    <Text style={[themed.sectionTitle, { marginBottom: 16 }]}>Mitigation Breakdown</Text>

                    {/* Activity Impact */}
                    <Animated.View entering={FadeInDown.delay(100)} style={[styles.impactRow, themed.card]}>
                        <View style={[styles.iconBox, { backgroundColor: '#3B82F610' }]}>
                            <Activity size={24} color="#3B82F6" strokeWidth={2.5} />
                        </View>
                        <View style={styles.impactInfo}>
                            <Text style={[themed.impactName, { color: colors.text }]}>Physical Activity</Text>
                            <Text style={themed.impactDetail}>{synergyData.steps.toLocaleString()} steps • {synergyData.stepStatus}</Text>
                        </View>
                        <Text style={[themed.impactValue, { color: synergyData.stepImpact >= 0 ? '#10B981' : '#EF4444' }]}>
                            {synergyData.stepImpact > 0 ? '+' : ''}{synergyData.stepImpact}%
                        </Text>
                    </Animated.View>

                    {/* Nutrition Impact */}
                    <Animated.View entering={FadeInDown.delay(200)} style={[styles.impactRow, themed.card]}>
                        <View style={[styles.iconBox, { backgroundColor: '#10B98110' }]}>
                            <Utensils size={24} color="#10B981" strokeWidth={2.5} />
                        </View>
                        <View style={styles.impactInfo}>
                            <Text style={[themed.impactName, { color: colors.text }]}>Metabolic Diet</Text>
                            <Text style={themed.impactDetail}>
                                {synergyData.totalRecentMeals === 0 
                                    ? "No meals logged this week"
                                    : `${synergyData.totalRecentMeals} logged • ${synergyData.healthyMeals} optimal • ${synergyData.unhealthyMeals} high-sugar`}
                            </Text>
                        </View>
                        <Text style={[themed.impactValue, { color: synergyData.mealImpact >= 0 ? '#10B981' : '#EF4444' }]}>
                            {synergyData.mealImpact > 0 ? '+' : ''}{synergyData.mealImpact}%
                        </Text>
                    </Animated.View>

                    {/* Synergy Penalty (Compound Risk) */}
                    {synergyData.isDownwardSpiral && synergyData.spiralPenalty < 0 && (
                        <Animated.View entering={FadeInDown.delay(250)} style={[styles.impactRow, themed.card, { borderColor: colors.error + '30', backgroundColor: colors.error + '05', borderWidth: 1 }]}>
                            <View style={[styles.iconBox, { backgroundColor: colors.error + '15' }]}>
                                <Zap size={24} color={colors.error} strokeWidth={2.5} />
                            </View>
                            <View style={styles.impactInfo}>
                                <Text style={[themed.impactName, { color: colors.error }]}>Synergy Penalty</Text>
                                <Text style={[themed.impactDetail, { color: colors.error + '90' }]}>Inactivity + High Sugar</Text>
                            </View>
                            <Text style={[themed.impactValue, { color: colors.error }]}>
                                {synergyData.spiralPenalty.toFixed(1)}%
                            </Text>
                        </Animated.View>
                    )}
                </View>

                {/* Educational Box */}
                <Animated.View entering={FadeInDown.delay(300)} style={[styles.infoBox, { backgroundColor: '#FFF', borderColor: 'rgba(0,0,0,0.05)' }, themed.card]}>
                    <View style={styles.infoIconBox}>
                        <Info size={22} color={colors.primary} strokeWidth={2.5} />
                    </View>
                    <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                        This synergy score calculates how your current physical activity and dietary choices are actively neutralizing your underlying AI-predicted diabetes risk factors.
                    </Text>
                </Animated.View>

            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 24,
        paddingBottom: 20,
    },
    backButton: {
        width: 44,
        height: 44,
        justifyContent: 'center',
    },
    scrollContent: {
        paddingHorizontal: 24,
        paddingTop: 16,
    },
    section: {
        marginBottom: 32,
    },
    mainCard: {
        padding: 32,
        alignItems: 'center',
        marginBottom: 32,
    },
    synergyHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 24,
    },
    synergyTitle: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: '900',
        textTransform: 'uppercase',
        letterSpacing: 2,
    },
    scoreContainer: {
        alignItems: 'center',
        marginBottom: 20,
    },
    scoreValue: {
        color: '#FFF',
        fontSize: 72,
        fontWeight: '900',
        letterSpacing: -3,
    },
    scoreLabel: {
        color: 'rgba(255,255,255,0.85)',
        fontSize: 12,
        fontWeight: '800',
        letterSpacing: 1,
    },
    impactBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 12,
        gap: 8,
        marginBottom: 24,
    },
    impactBadgeText: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: '900',
        letterSpacing: 1,
    },
    cardQuote: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '700',
        lineHeight: 20,
        textAlign: 'center',
        opacity: 0.95,
    },
    impactRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
        marginBottom: 16,
    },
    iconBox: {
        width: 54,
        height: 54,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    impactInfo: {
        flex: 1,
        marginLeft: 16,
    },
    infoBox: {
        flexDirection: 'row',
        padding: 24,
        gap: 16,
        alignItems: 'center',
        marginBottom: 40,
    },
    infoIconBox: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: '#F0F9FF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    infoText: {
        flex: 1,
        fontSize: 13,
        lineHeight: 20,
        fontWeight: '600',
    },
});
