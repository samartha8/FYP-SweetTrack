import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, ActivityIndicator, Alert, RefreshControl, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, Brain, TrendingUp, AlertTriangle, CheckCircle, RefreshCw, Info } from 'lucide-react-native';
import { useUser } from '@/contexts/UserContext';
import { useTheme } from '@/contexts/SettingsContext';
import { useTranslation } from '@/hooks/use-translation';
import { DIABETES_URL } from '../constants/Api';

const AGE_GROUP_LABELS: { [key: string]: string } = {
    '1': '18-24', '2': '25-29', '3': '30-34', '4': '35-39',
    '5': '40-44', '6': '45-49', '7': '50-54', '8': '55-59',
    '9': '60-64', '10': '65-69', '11': '70-74', '12': '75-79', '13': '80+'
};

type PredictionData = {
    riskLevel: 'Low Risk' | 'Medium Risk' | 'High Risk';
    riskScore: number;
    insights: string[];
    hasHistory?: boolean;
    success: boolean;
    inputData?: {
        bmi: number;
        glucose: number;
        bloodPressure?: number;
        highBP?: number;
        highChol?: number;
        smoker?: number;
        physActivity?: number;
        genHlth?: number;
        heartDiseaseOrAttack?: number;
        age: number;
    };
};

export default function PredictionScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { user, ensureAccessToken } = useUser();
    const { colors, scale } = useTheme();
    const { t } = useTranslation();
    const [loading, setLoading] = useState(true);
    const [analyzing, setAnalyzing] = useState(false);
    const [data, setData] = useState<PredictionData | null>(null);

    // Dynamic Styles
    const themed = useMemo(() => ({
        container: { backgroundColor: colors.backgroundSecondary },
        header: { backgroundColor: colors.background },
        headerTitle: { color: colors.text, fontSize: scale(18) },
        text: { color: colors.text },
        textSecondary: { color: colors.textSecondary },
        scoreLabel: { fontSize: scale(16), fontWeight: '600' as const },
        scoreDesc: { fontSize: scale(14), lineHeight: 20 },
        sectionTitle: { color: colors.text, fontSize: scale(18) },
        analyzingText: { color: '#FFF', fontSize: scale(16) },
        insightCard: { backgroundColor: colors.card, shadowColor: colors.cardShadow },
        insightText: { color: colors.text, fontSize: scale(14) },
        factorCard: { backgroundColor: colors.card },
        factorLabel: { color: colors.textSecondary, fontSize: scale(12) },
        factorValue: { color: colors.text, fontSize: scale(16) },
        badgeText: { fontSize: scale(12) },
        scoreValue: { fontSize: scale(64) },
    }), [colors, scale]);

    const fetchPrediction = useCallback(async () => {
        try {
            if (!user) return;

            const token = await ensureAccessToken();
            const response = await fetch(`${DIABETES_URL}/latest`, {
                headers: {
                    'Authorization': `Bearer ${token || ''}`,
                    'Content-Type': 'application/json'
                }
            });
            const json = await response.json();
            if (json.success) {
                setData(json);
            }
        } catch (e) {
            console.error("Fetch Prediction Error:", e);
        } finally {
            setLoading(false);
        }
    }, [user, ensureAccessToken]);

    const runPrediction = async () => {
        setAnalyzing(true);
        try {
            if (!user) return;
            const anyUser = user as any;

            const payload = {
                age: anyUser.age,
                sex: anyUser.sex,
                bmi: anyUser.bmi,
                highBP: anyUser.highBP,
                highChol: anyUser.highChol,
                smoker: anyUser.smoker,
                physActivity: anyUser.physActivity,
                genHlth: anyUser.genHlth,
                heartDiseaseOrAttack: anyUser.heartDiseaseOrAttack,
                glucose: anyUser.bloodGlucoseEstimated,
                hba1c: anyUser.hba1cEstimated,
                // Add specific aliases the model might expect
                bloodGlucoseEstimated: anyUser.bloodGlucoseEstimated,
                hba1cEstimated: anyUser.hba1cEstimated
            };

            if (__DEV__) console.log("Sending Prediction Payload:", payload);

            let token = await ensureAccessToken();
            let response = await fetch(`${DIABETES_URL}/predict`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token || ''}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            // ✅ 401 Retry Logic
            if (response.status === 401) {
                console.log("Token expired, refreshing...");
                token = await ensureAccessToken(true); // Force refresh
                if (token) {
                    response = await fetch(`${DIABETES_URL}/predict`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(payload)
                    });
                }
            }

            console.log("Prediction API Status:", response.status);
            const json = await response.json();
            console.log("Prediction API Response:", json);

            if (json.success) {
                setData(json);
                Alert.alert(t.prediction.analysisComplete, 'Your health metrics have been analyzed.');
            } else {
                Alert.alert(t.prediction.analysisFailed, json.message || 'Could not complete prediction. Please check your data.');
            }
        } catch (e) {
            console.error("Run Prediction Error:", e);
            Alert.alert(t.prediction.connectionError, 'Failed to reach the analysis server. Please check your connection.');
        } finally {
            setAnalyzing(false);
        }
    };

    useEffect(() => {
        fetchPrediction();
    }, [fetchPrediction]);

    if (loading) {
        return (
            <View style={[styles.container, themed.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={[{ marginTop: 20 }, themed.textSecondary]}>{t.prediction.loadingInsights}</Text>
            </View>
        );
    }

    const riskLevel = data?.riskLevel || 'Low Risk';
    const riskScore = data?.riskScore || 0;
    const insights = data?.insights || [];

    const anyUser = user as any;

    let isUnchanged = false;
    if (data?.inputData && user) {
        const isSame = (val1: any, val2: any) => {
            if (val1 === undefined || val2 === undefined) return false;
            return Math.abs(Number(val1) - Number(val2)) < 0.01;
        };

        const getVal = (userObj: any, key: string, fallbackKey?: string) => {
            if (userObj[key] !== undefined) return userObj[key];
            if (userObj.healthData && userObj.healthData[key] !== undefined) return userObj.healthData[key];
            if (fallbackKey) {
                if (userObj[fallbackKey] !== undefined) return userObj[fallbackKey];
                if (userObj.healthData && userObj.healthData[fallbackKey] !== undefined) return userObj.healthData[fallbackKey];
            }
            return undefined;
        };

        const currentPayload = {
            bmi: getVal(anyUser, 'bmi'),
            glucose: getVal(anyUser, 'bloodGlucoseEstimated', 'glucose'),
            age: getVal(anyUser, 'age'),
            highBP: getVal(anyUser, 'highBP'),
            highChol: getVal(anyUser, 'highChol'),
            smoker: getVal(anyUser, 'smoker'),
            physActivity: getVal(anyUser, 'physActivity'),
            genHlth: getVal(anyUser, 'genHlth'),
            heartDiseaseOrAttack: getVal(anyUser, 'heartDiseaseOrAttack'),
        };

        const prevGlucose = data.inputData.glucose !== undefined
            ? data.inputData.glucose
            : (data.inputData as any).bloodGlucoseEstimated;

        isUnchanged =
            isSame(currentPayload.bmi, data.inputData.bmi) &&
            isSame(currentPayload.glucose, prevGlucose) &&
            isSame(currentPayload.age, data.inputData.age) &&
            isSame(currentPayload.highBP, data.inputData.highBP) &&
            isSame(currentPayload.highChol, data.inputData.highChol) &&
            isSame(currentPayload.smoker, data.inputData.smoker) &&
            isSame(currentPayload.physActivity, data.inputData.physActivity) &&
            isSame(currentPayload.genHlth, data.inputData.genHlth) &&
            isSame(currentPayload.heartDiseaseOrAttack, data.inputData.heartDiseaseOrAttack);
    }

    const tRiskLevel = riskLevel === 'High Risk' ? t.home.riskHigh : riskLevel === 'Medium Risk' ? t.home.riskMedium : t.home.riskLow;
    const riskColor = riskLevel === 'High Risk' ? colors.risk.high : riskLevel === 'Medium Risk' ? colors.risk.moderate : colors.risk.low;

    return (
        <View style={[styles.container, themed.container]}>
            <View style={[styles.header, themed.header, { paddingTop: insets.top }]}>
                <TouchableOpacity
                    onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/home')}
                    style={styles.backButton}
                >
                    <ChevronLeft size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, themed.headerTitle]}>{t.prediction.header}</Text>
                <TouchableOpacity onPress={fetchPrediction} style={styles.backButton}>
                    <RefreshCw size={20} color={colors.text} />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 20 }]}>

                {/* Main Score Card */}
                <LinearGradient
                    colors={[riskColor, riskColor + '90']}
                    style={styles.scoreCard}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                >
                    <View style={styles.scoreHeader}>
                        <Brain size={32} color="#FFF" />
                        <View style={styles.badge}>
                            <Text style={[styles.badgeText, themed.badgeText, { color: '#FFF' }]}>{tRiskLevel}</Text>
                        </View>
                    </View>

                    <View style={styles.gaugeContainer}>
                        <Text style={[styles.scoreValue, themed.scoreValue, { color: '#FFF' }]}>{riskScore}%</Text>
                        <Text style={[styles.scoreLabel, themed.scoreLabel, { color: 'rgba(255,255,255,0.9)' }]}>{t.prediction.score}</Text>
                    </View>

                    <Text style={[styles.scoreDesc, themed.scoreDesc, { color: 'rgba(255,255,255,0.85)' }]}>
                        {riskLevel === 'Low Risk'
                            ? t.prediction.lowRiskDesc
                            : t.prediction.highRiskDesc}
                    </Text>
                </LinearGradient>

                {/* Action Button */}
                <View style={{ marginBottom: 32 }}>
                    <TouchableOpacity
                        style={[
                            styles.analyzeButton,
                            {
                                opacity: (analyzing || isUnchanged) ? 0.5 : 1,
                                backgroundColor: isUnchanged ? colors.textSecondary : colors.primary,
                                shadowColor: colors.primary,
                            }
                        ]}
                        onPress={runPrediction}
                        disabled={analyzing || isUnchanged}
                    >
                        {analyzing ? (
                            <ActivityIndicator color="#FFF" />
                        ) : (
                            <>
                                <TrendingUp size={20} color="#FFF" style={{ marginRight: 8 }} />
                                <Text style={[styles.analyzeButtonText, themed.analyzingText]}>
                                    {isUnchanged ? t.prediction.upToDate : t.prediction.runAnalysis}
                                </Text>
                            </>
                        )}
                    </TouchableOpacity>
                    {isUnchanged && (
                        <Text style={[styles.disabledInfoText, themed.textSecondary]}>
                            {t.prediction.factorsDesc}
                        </Text>
                    )}
                </View>

                {/* Insights Section */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, themed.sectionTitle]}>{t.prediction.insights}</Text>
                    {insights.length > 0 ? (
                        insights.map((insight, index) => (
                            <View key={index} style={[styles.insightCard, themed.insightCard]}>
                                <AlertTriangle size={20} color={colors.primary} style={{ marginTop: 2 }} />
                                <Text style={[styles.insightText, themed.insightText]}>{insight}</Text>
                            </View>
                        ))
                    ) : (
                        <View style={[styles.insightCard, themed.insightCard]}>
                            <CheckCircle size={20} color={colors.success} />
                            <Text style={[styles.insightText, themed.insightText]}>{t.common.allGood}</Text>
                        </View>
                    )}
                </View>

                {/* Factors Breakdown */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, themed.sectionTitle]}>{t.prediction.factors}</Text>
                    <View style={styles.factorsGrid}>
                        <View style={[styles.factorItem, themed.factorCard]}>
                            <Text style={[styles.factorLabel, themed.factorLabel]}>{t.prediction.bmi}</Text>
                            <Text style={[styles.factorValue, themed.factorValue]}>{data?.inputData?.bmi ? data.inputData.bmi.toFixed(1) : ((user as any)?.bmi || '-')}</Text>
                        </View>
                        <View style={[styles.factorItem, themed.factorCard]}>
                            <Text style={[styles.factorLabel, themed.factorLabel]}>{t.prediction.glucoseEst}</Text>
                            <Text style={[styles.factorValue, themed.factorValue]}>{data?.inputData?.glucose ? data.inputData.glucose.toFixed(0) : ((user as any)?.bloodGlucoseEstimated || '-')}</Text>
                        </View>
                        <View style={[styles.factorItem, themed.factorCard]}>
                            <Text style={[styles.factorLabel, themed.factorLabel]}>{t.wellness.bloodPressure || 'Blood Pressure'}</Text>
                            <Text style={[styles.factorValue, themed.factorValue]}>
                                {data?.inputData?.highBP !== undefined
                                    ? (data.inputData.highBP === 1 ? t.prediction.high : t.prediction.normal)
                                    : ((user as any)?.highBP ? t.prediction.high : t.prediction.normal)}
                            </Text>
                        </View>
                        <View style={[styles.factorItem, themed.factorCard]}>
                            <Text style={[styles.factorLabel, themed.factorLabel]}>{t.prediction.age}</Text>
                            <Text style={[styles.factorValue, themed.factorValue]}>
                                {data?.inputData?.age
                                    ? (AGE_GROUP_LABELS[data.inputData.age.toString()] || data.inputData.age)
                                    : ((user as any)?.age ? (AGE_GROUP_LABELS[(user as any).age.toString()] || (user as any).age) : '-')}
                            </Text>
                        </View>
                    </View>
                </View>

            </ScrollView >
        </View >
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
    },
    headerTitle: {
        fontWeight: '700',
    },
    backButton: {
        padding: 8,
    },
    scrollContent: {
        padding: 20,
    },
    scoreCard: {
        borderRadius: 24,
        padding: 24,
        marginBottom: 24,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
        elevation: 8,
    },
    scoreHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 24,
    },
    badge: {
        backgroundColor: 'rgba(255,255,255,0.25)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    badgeText: {
        color: '#FFF',
        fontWeight: '700',
        fontSize: 12,
    },
    gaugeContainer: {
        alignItems: 'center',
        marginBottom: 16,
    },
    scoreValue: {
        fontSize: 64,
        fontWeight: '800',
        color: '#FFF',
        lineHeight: 70,
    },
    scoreLabel: {
        fontSize: 16,
        color: 'rgba(255,255,255,0.9)',
        fontWeight: '600',
    },
    scoreDesc: {
        color: 'rgba(255,255,255,0.85)',
        textAlign: 'center',
        fontSize: 14,
        lineHeight: 20,
    },
    analyzeButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: 16,
        marginBottom: 32,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    analyzeButtonText: {
        color: '#FFF',
        fontWeight: '700',
        fontSize: 16,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontWeight: '700',
        marginBottom: 16,
    },
    insightCard: {
        flexDirection: 'row',
        padding: 16,
        borderRadius: 16,
        marginBottom: 12,
        alignItems: 'flex-start',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    insightText: {
        marginLeft: 12,
        fontSize: 14,
        flex: 1,
        lineHeight: 20,
    },
    factorsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginHorizontal: -6,
    },
    factorItem: {
        width: (Dimensions.get('window').width - 52) / 2,
        padding: 16,
        borderRadius: 16,
        margin: 6,
        alignItems: 'center',
    },
    factorLabel: {
        fontSize: 12,
        marginBottom: 4,
    },
    factorValue: {
        fontSize: 16,
        fontWeight: '700',
    },
    disabledInfoText: {
        textAlign: 'center',
        fontSize: 12,
        marginTop: 8,
    }
});
