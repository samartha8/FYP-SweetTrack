import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
        heartDisease?: number;
        age: number;
        sex?: number;
        hba1c?: number;
        hba1cEstimated?: number;
        bloodGlucoseEstimated?: number;
        pregnancies?: number;
        height?: number;
        weight?: number;
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

    // Helper to extract health values from user object (handles nesting in healthData)
    const getHealthVal = useCallback((userObj: any, key: string, fallbackKey?: string) => {
        if (!userObj) return undefined;
        if (userObj[key] !== undefined) return userObj[key];
        if (userObj.healthData && userObj.healthData[key] !== undefined) return userObj.healthData[key];
        if (fallbackKey) {
            if (userObj[fallbackKey] !== undefined) return userObj[fallbackKey];
            if (userObj.healthData && userObj.healthData[fallbackKey] !== undefined) return userObj.healthData[fallbackKey];
        }
        return undefined;
    }, []);

    // Memoized current health data for comparison and display
    const currentHealth = useMemo(() => {
        if (!user) return null;
        const anyUser = user as any;
        return {
            age: Number(getHealthVal(anyUser, 'age') || 5),
            sex: Number(getHealthVal(anyUser, 'sex') || 0),
            height: Number(getHealthVal(anyUser, 'height') || 0),
            weight: Number(getHealthVal(anyUser, 'weight') || 0),
            bmi: Number(getHealthVal(anyUser, 'bmi') || 0),
            highBP: Number(getHealthVal(anyUser, 'highBP') || 0),
            highChol: Number(getHealthVal(anyUser, 'highChol') || 0),
            smoker: Number(getHealthVal(anyUser, 'smoker') || 0),
            physActivity: Number(getHealthVal(anyUser, 'physActivity') || 0),
            genHlth: Number(getHealthVal(anyUser, 'genHlth') || 3),
            heartDiseaseOrAttack: Number(getHealthVal(anyUser, 'heartDiseaseOrAttack') || 0),
            pregnancies: Number(getHealthVal(anyUser, 'pregnancies') || 0),
            hba1cEstimated: Number(getHealthVal(anyUser, 'hba1cEstimated', 'hba1c') || 0),
            bloodGlucoseEstimated: Number(getHealthVal(anyUser, 'bloodGlucoseEstimated', 'glucose') || 0)
        };
    }, [user, getHealthVal]);

    const fetchingRef = useRef(false);

    const fetchPrediction = useCallback(async (retryLimit = 1) => {
        if (fetchingRef.current && retryLimit === 1) return;
        
        try {
            if (!user) return;
            fetchingRef.current = true;
            if (__DEV__) console.log(`🔄 [Prediction] Fetching latest prediction (Attempt: ${2 - retryLimit})...`);
            
            if (retryLimit === 1) setLoading(true);

            let token = await ensureAccessToken();
            const response = await fetch(`${DIABETES_URL}/latest`, {
                headers: {
                    'Authorization': `Bearer ${token || ''}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.status === 401 && retryLimit > 0) {
                if (__DEV__) console.warn("🔄 [Prediction] 401 Unauthorized - forcing token refresh and retrying fetch...");
                token = await ensureAccessToken(true); // Force refresh
                if (token) {
                    fetchingRef.current = false;
                    return fetchPrediction(retryLimit - 1);
                }
            }

            if (!response.ok) {
                if (__DEV__) console.warn(`🔄 [Prediction] Fetch failed with status ${response.status}`);
                return;
            }

            const json = await response.json();
            if (json.success) {
                setData(json);
            }
        } catch (e) {
            console.error("Fetch Prediction Error:", e);
        } finally {
            setLoading(false);
            fetchingRef.current = false;
        }
    }, [user?.id, user?.email, ensureAccessToken]);

    const runPrediction = async (retryLimit = 1): Promise<void> => {
        if (retryLimit === 1) setAnalyzing(true);
        try {
            if (!user || !currentHealth) return;

            const payload = {
                ...currentHealth,
                // Add aliases for backend/ML script if needed
                glucose: currentHealth.bloodGlucoseEstimated,
                hba1c: currentHealth.hba1cEstimated
            };

            if (__DEV__) console.log(`🚀 [Prediction] Sending Prediction Payload (Attempt: ${2 - retryLimit}):`, payload);

            let token = await ensureAccessToken();
            if (!token) return;

            const response = await fetch(`${DIABETES_URL}/predict`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (response.status === 401 && retryLimit > 0) {
                if (__DEV__) console.warn("🚀 [Prediction] 401 Unauthorized - forcing token refresh and retrying predict...");
                token = await ensureAccessToken(true); // Force refresh
                if (token) {
                    return runPrediction(retryLimit - 1);
                }
            }

            if (!response.ok) {
                if (__DEV__) console.warn(`🚀 [Prediction] Predict failed with status ${response.status}`);
                const errorJson = await response.json().catch(() => ({}));
                Alert.alert(t.prediction.analysisFailed, errorJson.message || 'Could not complete prediction.');
                return;
            }

            const json = await response.json();
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
        let isMounted = true;
        
        const loadInitialData = async () => {
            if (isMounted) {
                await fetchPrediction();
            }
        };

        loadInitialData();
        
        return () => {
            isMounted = false;
        };
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

    let isUnchanged = false;
    if (data?.inputData && currentHealth) {
        const isSame = (val1: any, val2: any) => {
            const n1 = (val1 === undefined || val1 === null) ? 0 : Number(val1);
            const n2 = (val2 === undefined || val2 === null) ? 0 : Number(val2);
            return Math.abs(n1 - n2) < 0.001;
        };

        const prevData = data.inputData || {} as any;
        
        // Define all comparisons
        const checks = {
            bmi: isSame(currentHealth.bmi, prevData.bmi),
            age: isSame(currentHealth.age, prevData.age),
            sex: isSame(currentHealth.sex, prevData.sex),
            highBP: isSame(currentHealth.highBP, prevData.highBP),
            highChol: isSame(currentHealth.highChol, prevData.highChol),
            smoker: isSame(currentHealth.smoker, prevData.smoker),
            physActivity: isSame(currentHealth.physActivity, prevData.physActivity),
            genHlth: isSame(currentHealth.genHlth, prevData.genHlth),
            heartDiseaseOrAttack: isSame(currentHealth.heartDiseaseOrAttack, prevData.heartDiseaseOrAttack ?? prevData.heartDisease),
            pregnancies: isSame(currentHealth.pregnancies, prevData.pregnancies),
            height: isSame(currentHealth.height, prevData.height ?? currentHealth.height),
            weight: isSame(currentHealth.weight, prevData.weight ?? currentHealth.weight),
        };

        if (__DEV__) {
            const failingFields = Object.entries(checks)
                .filter(([_, value]) => !value)
                .map(([key]) => key);
            
            if (failingFields.length > 0) {
                console.log("🔍 [Prediction] isUnchanged FAILING fields:", failingFields);
            } else {
                console.log("✅ [Prediction] isUnchanged: EVERYTHING MATCHES");
            }
        }

        isUnchanged = Object.values(checks).every(v => v === true);
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
                <TouchableOpacity onPress={() => fetchPrediction()} style={styles.backButton}>
                    <RefreshCw size={20} color={colors.text} />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 20 }]}>

                {/* Main Score Card */}
                <LinearGradient
                    colors={[riskColor, riskColor + '90'] as any}
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

                {/* Action Button - Only show if data has changed or no history */}
                <View style={{ marginBottom: 32 }}>
                    {!isUnchanged ? (
                        <TouchableOpacity
                            style={[
                                styles.analyzeButton,
                                {
                                    opacity: analyzing ? 0.5 : 1,
                                    backgroundColor: colors.primary,
                                    shadowColor: colors.primary,
                                }
                            ]}
                            onPress={() => runPrediction()}
                            disabled={analyzing}
                        >
                            {analyzing ? (
                                <ActivityIndicator color="#FFF" />
                            ) : (
                                <>
                                    <TrendingUp size={20} color="#FFF" style={{ marginRight: 8 }} />
                                    <Text style={[styles.analyzeButtonText, themed.analyzingText]}>
                                        {t.prediction.runAnalysis}
                                    </Text>
                                </>
                            )}
                        </TouchableOpacity>
                    ) : (
                        <View style={[styles.upToDateContainer, { backgroundColor: colors.success + '10', borderColor: colors.success + '30' }]}>
                            <CheckCircle size={20} color={colors.success} style={{ marginRight: 10 }} />
                            <Text style={[styles.upToDateText, { color: colors.success }]}>
                                {t.prediction.analysisComplete || "Analysis Done"}
                            </Text>
                        </View>
                    )}
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
                        {/* 1. BMI */}
                        <View style={[styles.factorItem, themed.factorCard]}>
                            <Text style={[styles.factorLabel, themed.factorLabel]}>{t.prediction.bmi}</Text>
                            <Text style={[styles.factorValue, themed.factorValue]}>
                                {(data?.inputData?.bmi ?? currentHealth?.bmi ?? 0).toFixed(1)}
                            </Text>
                        </View>
                        {/* 2. Glucose */}
                        <View style={[styles.factorItem, themed.factorCard]}>
                            <Text style={[styles.factorLabel, themed.factorLabel]}>{t.prediction.glucoseEst}</Text>
                            <Text style={[styles.factorValue, themed.factorValue]}>
                                {(data?.inputData?.glucose ?? currentHealth?.bloodGlucoseEstimated ?? 0).toFixed(0)}
                            </Text>
                        </View>
                        {/* 3. Blood Pressure */}
                        <View style={[styles.factorItem, themed.factorCard]}>
                            <Text style={[styles.factorLabel, themed.factorLabel]}>{t.prediction.highBP}</Text>
                            <Text style={[styles.factorValue, themed.factorValue]}>
                                {(data?.inputData?.highBP ?? currentHealth?.highBP) === 1 ? t.prediction.high : t.prediction.normal}
                            </Text>
                        </View>
                        {/* 4. Cholesterol */}
                        <View style={[styles.factorItem, themed.factorCard]}>
                            <Text style={[styles.factorLabel, themed.factorLabel]}>{t.prediction.highChol}</Text>
                            <Text style={[styles.factorValue, themed.factorValue]}>
                                {(data?.inputData?.highChol ?? currentHealth?.highChol) === 1 ? t.prediction.high : t.prediction.normal}
                            </Text>
                        </View>
                        {/* 5. Age */}
                        <View style={[styles.factorItem, themed.factorCard]}>
                            <Text style={[styles.factorLabel, themed.factorLabel]}>{t.prediction.age}</Text>
                            <Text style={[styles.factorValue, themed.factorValue]}>
                                {(() => {
                                    const age = data?.inputData?.age ?? currentHealth?.age;
                                    return age ? (AGE_GROUP_LABELS[age.toString()] || age) : '-';
                                })()}
                            </Text>
                        </View>
                        {/* 6. Heart Health */}
                        <View style={[styles.factorItem, themed.factorCard]}>
                            <Text style={[styles.factorLabel, themed.factorLabel]}>{t.prediction.heartDisease}</Text>
                            <Text style={[styles.factorValue, themed.factorValue]}>
                                {(data?.inputData?.heartDiseaseOrAttack ?? data?.inputData?.heartDisease ?? currentHealth?.heartDiseaseOrAttack) === 1 ? t.prediction.high : t.prediction.normal}
                            </Text>
                        </View>
                        {/* 7. Smoker */}
                        <View style={[styles.factorItem, themed.factorCard]}>
                            <Text style={[styles.factorLabel, themed.factorLabel]}>{t.prediction.smoker}</Text>
                            <Text style={[styles.factorValue, themed.factorValue]}>
                                {(data?.inputData?.smoker ?? currentHealth?.smoker) === 1 ? t.prediction.high : t.prediction.normal}
                            </Text>
                        </View>
                        {/* 8. Physical Activity */}
                        <View style={[styles.factorItem, themed.factorCard]}>
                            <Text style={[styles.factorLabel, themed.factorLabel]}>{t.prediction.physActivity}</Text>
                            <Text style={[styles.factorValue, themed.factorValue]}>
                                {(data?.inputData?.physActivity ?? currentHealth?.physActivity) === 1 ? t.prediction.normal : t.prediction.high}
                            </Text>
                        </View>
                        {/* 9. General Health */}
                        <View style={[styles.factorItem, themed.factorCard]}>
                            <Text style={[styles.factorLabel, themed.factorLabel]}>{t.prediction.genHlth}</Text>
                            <Text style={[styles.factorValue, themed.factorValue]}>
                                {(data?.inputData?.genHlth ?? currentHealth?.genHlth ?? 3) <= 2 ? t.prediction.normal : t.prediction.high}
                            </Text>
                        </View>
                        {/* 10. Pregnancies (if female) */}
                        {((data?.inputData?.sex ?? currentHealth?.sex) === 0) && (
                            <View style={[styles.factorItem, themed.factorCard]}>
                                <Text style={[styles.factorLabel, themed.factorLabel]}>{t.prediction.pregnancies}</Text>
                                <Text style={[styles.factorValue, themed.factorValue]}>
                                    {data?.inputData?.pregnancies ?? currentHealth?.pregnancies ?? 0}
                                </Text>
                            </View>
                        )}
                        {/* 11. BMI Details (Height/Weight) */}
                        <View style={[styles.factorItem, themed.factorCard]}>
                            <Text style={[styles.factorLabel, themed.factorLabel]}>{t.prediction.height} cm</Text>
                            <Text style={[styles.factorValue, themed.factorValue]}>
                                {data?.inputData?.height ?? currentHealth?.height ?? '-'}
                            </Text>
                        </View>
                        <View style={[styles.factorItem, themed.factorCard]}>
                            <Text style={[styles.factorLabel, themed.factorLabel]}>{t.prediction.weight} kg</Text>
                            <Text style={[styles.factorValue, themed.factorValue]}>
                                {data?.inputData?.weight ?? currentHealth?.weight ?? '-'}
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
    },
    upToDateContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderStyle: 'dashed',
    },
    upToDateText: {
        fontWeight: '700',
        fontSize: 16,
    }
});
