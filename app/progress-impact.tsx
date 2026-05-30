import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, Dimensions, Alert } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TrendingDown, Activity, Utensils, Info, ChevronLeft, ShieldCheck, Zap, ArrowLeft, Sparkles, Download } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useTheme } from '@/contexts/SettingsContext';
import { useHealth } from '@/contexts/HealthContext';
import { useMealTracking } from '@/contexts/MealTrackingContext';
import { useAuth } from '@/contexts/AuthContext';
import Animated, { FadeInDown, FadeInUp, Layout, ZoomIn } from 'react-native-reanimated';

const { width } = Dimensions.get('window');

export default function ProgressImpactScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { colors, scale } = useTheme();
    const { healthMetrics, riskStatus } = useHealth();
    const { mealLogs } = useMealTracking();
    const { user } = useAuth();

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

        const today = new Date().toLocaleDateString('sv-SE');
        const recentLogs = mealLogs.filter(log => new Date(log.date).toLocaleDateString('sv-SE') === today);
        const healthyMeals = recentLogs.filter(log => (log.nutritionalInfo?.sugar || 0) < 15).length;
        const unhealthyMeals = recentLogs.filter(log => (log.nutritionalInfo?.sugar || 0) >= 25).length;
        const highCalorieMeals = recentLogs.filter(log => (log.nutritionalInfo?.calories || 0) >= 600).length;
        const totalCalories = recentLogs.reduce((sum, log) => sum + (log.nutritionalInfo?.calories || 0), 0);
        const calorieLoadPenalty = totalCalories >= 2500 ? -6.0 : totalCalories >= 2000 ? -3.0 : 0;
        const frequentEatingPenalty = recentLogs.length >= 5 ? -4.0 : 0;
        const rawMealImpact = (healthyMeals * 3.0) - (unhealthyMeals * 7.0) - (highCalorieMeals * 4.0) + calorieLoadPenalty + frequentEatingPenalty; 
        let mealImpact = Math.min(rawMealImpact, 15); 
        let totalImpactNumber = stepImpact + mealImpact;
        const isDownwardSpiral = steps < 2000 && (unhealthyMeals > 0 || highCalorieMeals > 0 || totalCalories >= 2000 || recentLogs.length >= 5);
        let spiralPenalty = 0;
        
        if (isDownwardSpiral) {
            const before = totalImpactNumber;
            if (totalImpactNumber > 0) {
                totalImpactNumber = -totalImpactNumber;
            }
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
        } else if (steps < 2000 && (totalCalories >= 2000 || recentLogs.length >= 5)) {
            interpretation = "Warning: food intake is accumulating while activity is critically low. A short walk can help reduce post-meal glucose pressure.";
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
            highCalorieMeals,
            totalCalories,
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

    const exportToPDF = async () => {
        try {
            const htmlContent = `
                <!DOCTYPE html>
                <html>
                    <head>
                        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
                        <style>
                            body { font-family: 'Helvetica', sans-serif; padding: 40px; color: #1e293b; background: #fff; }
                            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #f1f5f9; padding-bottom: 20px; margin-bottom: 30px; }
                            .logo { font-size: 24px; font-weight: 900; color: #10b981; }
                            .main-card { 
                                background: ${synergyData.totalImpact >= 0 ? '#10b981' : synergyData.isCritical ? '#7f1d1d' : '#ef4444'}; 
                                color: #fff; border-radius: 24px; padding: 40px; text-align: center; margin-bottom: 30px; 
                            }
                            .score { font-size: 64px; font-weight: 900; margin-bottom: 10px; }
                            .label { font-size: 14px; font-weight: 800; opacity: 0.8; letter-spacing: 1px; }
                            .interpretation { font-style: italic; font-size: 16px; margin-top: 20px; line-height: 1.5; }
                            .section-title { font-size: 18px; font-weight: 800; color: #1e293b; margin-bottom: 15px; text-transform: uppercase; letter-spacing: 0.5px; }
                            .row { display: flex; align-items: center; background: #f8fafc; padding: 20px; border-radius: 16px; margin-bottom: 12px; border: 1px solid #e2e8f0; }
                            .row-info { flex: 1; }
                            .row-name { font-size: 16px; font-weight: 800; color: #1e293b; }
                            .row-detail { font-size: 13px; color: #64748b; margin-top: 2px; }
                            .row-value { font-size: 20px; font-weight: 900; color: #10b981; }
                            .negative { color: #ef4444; }
                        </style>
                    </head>
                    <body>
                        <div class="header">
                            <div>
                                <div class="logo">Metabolic Synergy Report</div>
                                <div style="font-size: 14px; color: #64748b; margin-top: 4px;">Patient: ${user?.name || 'Anonymous User'}</div>
                            </div>
                            <div style="text-align: right; color: #64748b; font-size: 12px;">
                                DATE: ${new Date().toLocaleDateString()}<br/>
                                STATUS: ${synergyData.impactLabel}
                            </div>
                        </div>

                        <div class="main-card">
                            <div class="label">METABOLIC NEUTRALIZATION</div>
                            <div class="score">${synergyData.totalImpact > 0 ? '+' : ''}${synergyData.totalImpact}%</div>
                            <div class="interpretation">"${synergyData.interpretation}"</div>
                        </div>

                        <div class="section-title">Mitigation Breakdown</div>
                        
                        <div class="row">
                            <div class="row-info">
                                <div class="row-name">Physical Activity</div>
                                <div class="row-detail">${synergyData.steps.toLocaleString()} steps • ${synergyData.stepStatus}</div>
                            </div>
                            <div class="row-value ${synergyData.stepImpact < 0 ? 'negative' : ''}">
                                ${synergyData.stepImpact > 0 ? '+' : ''}${synergyData.stepImpact}%
                            </div>
                        </div>

                        <div class="row">
                            <div class="row-info">
                                <div class="row-name">Metabolic Diet</div>
                                <div class="row-detail">${synergyData.totalRecentMeals} logged • ${synergyData.healthyMeals} optimal</div>
                            </div>
                            <div class="row-value ${synergyData.mealImpact < 0 ? 'negative' : ''}">
                                ${synergyData.mealImpact > 0 ? '+' : ''}${synergyData.mealImpact}%
                            </div>
                        </div>

                        ${synergyData.isDownwardSpiral ? `
                            <div class="row" style="border-color: #fecdd3; background: #fff1f2;">
                                <div class="row-info">
                                    <div class="row-name" style="color: #ef4444;">Synergy Penalty</div>
                                    <div class="row-detail">Inactivity + High Glycemic Load</div>
                                </div>
                                <div class="row-value negative">${synergyData.spiralPenalty.toFixed(1)}%</div>
                            </div>
                        ` : ''}

                        <div style="margin-top: 40px; padding: 20px; background: #f0f9ff; border-radius: 12px; font-size: 13px; line-height: 1.6; color: #0369a1;">
                            <strong>What is this score?</strong><br/>
                            This synergy score calculates how your current physical activity and dietary choices are actively neutralizing your underlying AI-predicted diabetes risk factors.
                        </div>

                    </body>
                </html>
            `;

            const result = await Print.printToFileAsync({ html: htmlContent });
            if (Platform.OS === 'web') {
                await Print.printAsync({ html: htmlContent });
            } else if (result && result.uri) {
                await Sharing.shareAsync(result.uri, { UTI: '.pdf', mimeType: 'application/pdf' });
            }
        } catch (error) {
            console.error("PDF Export Error:", error);
            Alert.alert("Export Failed", "Could not generate the synergy report.");
        }
    };

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
                <TouchableOpacity onPress={exportToPDF} style={styles.downloadButton}>
                    <Download size={24} color={colors.primary} strokeWidth={2.5} />
                </TouchableOpacity>
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
    downloadButton: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FFF',
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
});
