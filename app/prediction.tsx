import { secureFetch } from '../lib/apiClient';
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, ActivityIndicator, Alert, RefreshControl, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, Brain, TrendingUp, AlertTriangle, CheckCircle, RefreshCw, Info, Camera, Sparkles } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/SettingsContext';
import { useTranslation } from '@/hooks/use-translation';
import { HEALTH_URL, DIABETES_URL } from '../constants/Api';

const AGE_GROUP_LABELS: { [key: string]: string } = {
  '1': '18-24', '2': '25-29', '3': '30-34', '4': '35-39',
  '5': '40-44', '6': '45-49', '7': '50-54', '8': '55-59',
  '9': '60-64', '10': '65-69', '11': '70-74', '12': '75-79', '13': '80+'
};

type PredictionData = {
  prediction: number;
  probability: number;
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
  mainReasons?: string[];
  mode?: 'LIFESTYLE' | 'CLINICAL';
  confidenceScore?: number;
};

export default function PredictionScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, ensureAccessToken, updateUser } = useAuth();
  const { colors, scale } = useTheme();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
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
    
    // Check root and healthData, prioritizing non-zero values for metrics that should be positive
    const valAtRoot = userObj[key];
    const valInHealthData = userObj.healthData?.[key];
    
    // If it's height/weight/bmi/age, zero or "0" is usually a placeholder/unset value
    const isMetric = ['height', 'weight', 'bmi', 'age', 'glucose', 'bloodGlucoseEstimated', 'hba1cEstimated'].includes(key);
    
    const isValid = (v: any) => {
      if (v === undefined || v === null || v === '' || v === 'null') return false;
      if (isMetric && Number(v) <= 0) return false;
      return true;
    };

    if (isValid(valAtRoot)) return valAtRoot;
    if (isValid(valInHealthData)) return valInHealthData;

    if (fallbackKey) {
      const fbAtRoot = userObj[fallbackKey];
      const fbInHealthData = userObj.healthData?.[fallbackKey];
      
      if (isValid(fbAtRoot)) return fbAtRoot;
      if (isValid(fbInHealthData)) return fbInHealthData;
    }
    
    return undefined;
  }, []);

  // Memoized current health data for comparison and display
  const currentHealth = useMemo(() => {
    if (!user) return null;
    const anyUser = user as any;
    
    // Explicitly parse everything as floats to avoid comparison issues
    const safeNum = (val: any) => {
      const n = parseFloat(val);
      return isNaN(n) ? 0 : n;
    };

    return {
      age: safeNum(getHealthVal(anyUser, 'age') || 5),
      sex: safeNum(getHealthVal(anyUser, 'sex') || 0),
      height: safeNum(getHealthVal(anyUser, 'height') || 0),
      weight: safeNum(getHealthVal(anyUser, 'weight') || 0),
      bmi: safeNum(getHealthVal(anyUser, 'bmi') || 0),
      highBP: safeNum(getHealthVal(anyUser, 'highBP') || 0),
      highChol: safeNum(getHealthVal(anyUser, 'highChol') || 0),
      smoker: safeNum(getHealthVal(anyUser, 'smoker') || 0),
      physActivity: safeNum(getHealthVal(anyUser, 'physActivity') || 0),
      genHlth: safeNum(getHealthVal(anyUser, 'genHlth') || 3),
      heartDiseaseOrAttack: safeNum(getHealthVal(anyUser, 'heartDiseaseOrAttack') || 0),
      pregnancies: safeNum(getHealthVal(anyUser, 'pregnancies') || 0),
      hba1cEstimated: getHealthVal(anyUser, 'hba1cEstimated', 'hba1c') ? safeNum(getHealthVal(anyUser, 'hba1cEstimated', 'hba1c')) : null,
      bloodGlucoseEstimated: getHealthVal(anyUser, 'bloodGlucoseEstimated', 'glucose') ? safeNum(getHealthVal(anyUser, 'bloodGlucoseEstimated', 'glucose')) : null
    };
  }, [user, getHealthVal]);

  const hasClinicalData = currentHealth?.hba1cEstimated !== null && currentHealth?.bloodGlucoseEstimated !== null;

  const fetchingRef = useRef(false);

  const fetchPrediction = useCallback(async (retryLimit = 1) => {
    if (fetchingRef.current && retryLimit === 1) return;

    try {
      if (!user) return;
      fetchingRef.current = true;
      if (__DEV__) console.log(`🔄 [Prediction] Fetching latest prediction (Attempt: ${2 - retryLimit})...`);

      if (retryLimit === 1) setLoading(true);

      const response = await secureFetch(`${DIABETES_URL}/latest`);

      if (response.status === 401 && retryLimit > 0) {
        if (__DEV__) console.warn("🔄 [Prediction] 401 Unauthorized - forcing token refresh and retrying fetch...");
        await ensureAccessToken(true); // Force refresh
        fetchingRef.current = false;
        return fetchPrediction(retryLimit - 1);
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

  const runPrediction = async (retryLimit = 1, manualPayload?: any): Promise<void> => {
    if (retryLimit === 1) setAnalyzing(true);
    try {
      const payload = manualPayload || currentHealth;
      if (!user || !payload) return;

      const requestPayload = {
        ...payload,
        // Add aliases for backend/ML script if needed
        glucose: payload.bloodGlucoseEstimated,
        hba1c: payload.hba1cEstimated
      };

      if (__DEV__) console.log(`🚀 [Prediction] Sending Prediction Payload (Attempt: ${2 - retryLimit}):`, payload);

      const res = await secureFetch(`${DIABETES_URL}/predict`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestPayload),
      });

      if (res.status === 401 && retryLimit > 0) {
        if (__DEV__) console.warn("🚀 [Prediction] 401 Unauthorized - forcing token refresh and retrying predict...");
        await ensureAccessToken(true); // Force refresh
        return runPrediction(retryLimit - 1);
      }

      if (!res.ok) {
        if (__DEV__) console.warn(`🚀 [Prediction] Predict failed with status ${res.status}`);
        const errorJson = await res.json().catch(() => ({}));
        Alert.alert(t.prediction.analysisFailed, errorJson.message || 'Could not complete prediction.');
        return;
      }

      const json = await res.json();
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

  const handleScanReport = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Permission required', 'Allow access to photos to scan reports.');
        return;
      }
      
      const result = await ImagePicker.launchImageLibraryAsync({ 
        mediaTypes: ImagePicker.MediaTypeOptions.Images, 
        allowsEditing: true, 
        quality: 0.4, 
        base64: true 
      });
      
      if (result.canceled) return;

      setIsScanning(true);
      const response = await secureFetch(`${HEALTH_URL}/scan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ imageBase64: result.assets[0].base64 }),
      });
      
      const json = await response.json();

      if (json.success && json.data) {
        // Prepare data for update - process ALL possible fields from the AI scan with safety checks
        const updatePayload: any = {};
        const fields = ['age', 'weight', 'height', 'sex', 'highBP', 'highChol', 'genHlth', 'hba1cEstimated', 'bloodGlucoseEstimated'];
        
        // Define 'dataFromAI' with type safety
        const dataFromAI: Record<string, any> = json.data || {};
        
        fields.forEach(field => {
          const rawValue = dataFromAI[field];
          if (rawValue !== undefined && rawValue !== null && rawValue !== '') {
            const cleanedValue = String(rawValue).replace(/[^\d.]/g, '');
            
            if (cleanedValue !== '') {
              let processedValue = parseFloat(cleanedValue);
              
              // CRITICAL: Map actual age (e.g. 23) to age category index (1-13) if field is 'age'
              if (field === 'age' && processedValue > 13) {
                const rawAge = Math.round(processedValue);
                if (rawAge >= 80) processedValue = 13;
                else if (rawAge >= 75) processedValue = 12;
                else if (rawAge >= 70) processedValue = 11;
                else if (rawAge >= 65) processedValue = 10;
                else if (rawAge >= 60) processedValue = 9;
                else if (rawAge >= 55) processedValue = 8;
                else if (rawAge >= 50) processedValue = 7;
                else if (rawAge >= 45) processedValue = 6;
                else if (rawAge >= 40) processedValue = 5;
                else if (rawAge >= 35) processedValue = 4;
                else if (rawAge >= 30) processedValue = 3;
                else if (rawAge >= 25) processedValue = 2;
                else processedValue = 1;
              }

              updatePayload[field] = (field === 'sex' || field === 'highBP' || field === 'highChol' || field === 'genHlth' || field === 'age') 
                ? Math.round(processedValue) 
                : processedValue;
            }
          }
        });
        
        // If we found ANY clinical or health data, update the record
        if (Object.keys(updatePayload).length > 0) {
           // IMPORTANT: Merge with current health data to satisfy backend validation
           // MERGE and SANITIZE the payload
                       const existingMetrics = { ...(currentHealth || {}) };
            ['_id', 'id', 'user', '__v', 'createdAt', 'updatedAt'].forEach(k => delete (existingMetrics as any)[k]);

           
           const fullPayload = {
             ...existingMetrics,
             ...updatePayload
           };

           const res = await secureFetch(HEALTH_URL, {
             method: 'POST',
             headers: {
               'Content-Type': 'application/json',
             },
             body: JSON.stringify(fullPayload)
           });
           
           if (res.ok) {
             const updatedUserJson = await res.json();
             // IMPORTANT: Sync local state so runPrediction uses the NEW lab values
             if (updatedUserJson.success) {
                await updateUser(updatedUserJson.user);
             }
           }
           
           // Trigger a fresh prediction with the new clinical data IMMEDIATELY
           Alert.alert('Scan Successful', 'Clinical data extracted. Running fresh analysis...');
           await runPrediction(1, fullPayload);
        } else {
           Alert.alert('Scan Result', 'No specific lab values (HbA1c/Glucose) were detected in this image.');
        }
      }
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Could not scan report.");
    } finally {
      setIsScanning(false);
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
        <Text style={[styles.headerTitle, themed.headerTitle]}>Risk Analysis</Text>
        <TouchableOpacity onPress={() => fetchPrediction()} style={styles.backButton}>
          <RefreshCw size={20} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 20 }]}>

        {/* Main Score Card - Premium Midnight Theme */}
        <View style={[styles.scoreCard, { backgroundColor: '#0F172A', overflow: 'hidden', padding: 0 }]}>
           <LinearGradient
            colors={['rgba(255,255,255,0.05)', 'transparent'] as any}
            style={StyleSheet.absoluteFill}
          />
          
          {/* Left Risk Glow Accent */}
          <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 6, backgroundColor: riskColor }} />

          <View style={{ padding: 24 }}>
            <View style={[styles.scoreHeader, { flexWrap: 'wrap', gap: 8, marginBottom: 15 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 }}>
                <View style={{ backgroundColor: riskColor + '20', padding: 8, borderRadius: 10 }}>
                  <Brain size={scale(20)} color={riskColor} strokeWidth={2.5} />
                </View>
                <View>
                  <Text style={{ fontSize: scale(10), fontWeight: '900', letterSpacing: 1.5, color: '#94A3B8', textTransform: 'uppercase' }}>
                    {data?.mode === 'CLINICAL' ? 'Clinical Metabolic Analysis' : 'Lifestyle Risk Estimate'}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                    <CheckCircle size={scale(10)} color={colors.primary} />
                    <Text style={{ fontSize: scale(9), color: colors.primary, fontWeight: '700' }}>{data?.mode === 'CLINICAL' ? 'LEVEL 1 (DATA-DRIVEN)' : 'LEVEL 2 (STATISTICAL)'}</Text>
                  </View>
                </View>
              </View>
            </View>

            <View style={{ marginTop: 10, marginBottom: 20 }}>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
                <Text style={[styles.scoreValue, { color: '#FFF', fontSize: scale(36), fontWeight: '900', letterSpacing: -1 }]}>
                  {data?.prediction === 1 ? 'POSITIVE' : 'NEGATIVE'}
                </Text>
                <View style={[styles.badge, { backgroundColor: riskColor + '30', borderColor: riskColor + '50', borderWidth: 1, borderRadius: 8, paddingVertical: 4 }]}>
                  <Text style={[styles.badgeText, { color: riskColor, fontSize: scale(10), fontWeight: '900' }]}>{tRiskLevel.toUpperCase()}</Text>
                </View>
              </View>
              
              <Text style={{ color: '#94A3B8', fontSize: scale(14), fontWeight: '600', marginTop: 4 }}>
                {data?.riskScore !== undefined 
                  ? `${data.riskScore}% Metabolic Risk Index` 
                  : `${((data?.probability || 0) * 100).toFixed(1)}% Statistical Risk`
                }
              </Text>
            </View>

            {/* Confidence Bar - Sleeker */}
            <View style={{ backgroundColor: 'rgba(255,255,255,0.03)', padding: 15, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text style={{ color: '#64748B', fontSize: scale(10), fontWeight: '800', letterSpacing: 0.5 }}>CLINICAL DATA CONFIDENCE</Text>
                  <Text style={{ color: '#FFF', fontSize: scale(10), fontWeight: '900' }}>{Math.round(data?.confidenceScore ?? 70)}%</Text>
              </View>
              <View style={{ height: 6, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow: 'hidden' }}>
                  <LinearGradient 
                    colors={[colors.primary, '#34D399'] as any} 
                    start={{x:0, y:0}} end={{x:1, y:0}}
                    style={{ height: '100%', width: `${data?.confidenceScore ?? 70}%` }} 
                  />
              </View>
            </View>

            <View style={{ marginTop: 20, flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
              <View style={{ backgroundColor: 'rgba(255,255,255,0.05)', padding: 8, borderRadius: 8 }}>
                <Info size={scale(16)} color="#94A3B8" />
              </View>
              <Text style={{ color: '#94A3B8', fontSize: scale(12), lineHeight: scale(18), flex: 1, fontWeight: '500' }}>
                {riskLevel === 'Low Risk'
                  ? "Your metabolic markers are currently stable. Maintain current physical activity levels."
                  : "The AI engine detected patterns associated with elevated insulin resistance. Clinical review recommended."}
              </Text>
            </View>

            {/* Action Buttons Container */}
            <View style={{ marginTop: 20, gap: 10 }}>
               {data?.mode !== 'CLINICAL' && (
                 <View style={{ backgroundColor: colors.warning + '15', padding: 12, borderRadius: 12, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.warning + '30' }}>
                   <AlertTriangle size={scale(16)} color={colors.warning} style={{ marginRight: 8 }} />
                   <Text style={{ color: colors.warning, fontSize: scale(10), fontWeight: '700', flex: 1, lineHeight: scale(14) }}>
                     {t.prediction.lifestyleWarning || "Lifestyle Estimate. Upload lab reports for Clinical Analysis."}
                   </Text>
                 </View>
               )}

               <TouchableOpacity 
                 activeOpacity={0.8}
                 onPress={handleScanReport}
                 disabled={isScanning}
                 style={{ 
                   backgroundColor: data?.mode === 'CLINICAL' ? 'rgba(255,255,255,0.08)' : colors.primary, 
                   paddingVertical: 14, 
                   borderRadius: 14, 
                   flexDirection: 'row', 
                   alignItems: 'center', 
                   justifyContent: 'center',
                   borderWidth: 1,
                   borderColor: data?.mode === 'CLINICAL' ? 'rgba(255,255,255,0.1)' : colors.primary,
                 }}
               >
                 {isScanning ? (
                   <ActivityIndicator color="#FFF" size="small" />
                 ) : (
                   <>
                     <Camera size={18} color="#FFF" style={{ marginRight: 8 }} />
                     <Text style={{ color: '#FFF', fontSize: scale(12), fontWeight: '800', letterSpacing: 1 }}>
                       {data?.mode === 'CLINICAL' ? 'UPDATE LAB REPORT' : 'SCAN LAB REPORT'}
                     </Text>
                     <Sparkles size={14} color="#FFF" style={{ marginLeft: 6, opacity: 0.8 }} />
                   </>
                 )}
               </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Main Reasons Section (Explained AI) */}
        {data?.mainReasons && data.mainReasons.length > 0 && (
          <View style={[styles.section, { marginTop: 10 }]}>
            <Text style={[styles.sectionTitle, themed.sectionTitle]}>Key Diagnostic Factors</Text>
            <View style={{ backgroundColor: colors.primary + '10', padding: 20, borderRadius: 16, borderLeftWidth: 4, borderLeftColor: colors.primary }}>
              <Text style={{ color: colors.text, fontSize: scale(15), fontWeight: '600', marginBottom: 10 }}>
                Primary risk drivers identified by AI:
              </Text>
              {data.mainReasons.map((reason, idx) => (
                <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary, marginRight: 12 }} />
                  <Text style={{ color: colors.text, fontSize: scale(15), fontWeight: '500' }}>{reason}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

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
                {(currentHealth?.bmi || data?.inputData?.bmi || 0).toFixed(1)}
              </Text>
            </View>
            {/* 2. Glucose */}
            <View style={[styles.factorItem, themed.factorCard]}>
              <Text style={[styles.factorLabel, themed.factorLabel]}>{t.prediction.glucoseEst}</Text>
              <Text style={[styles.factorValue, themed.factorValue]}>
                {(currentHealth?.bloodGlucoseEstimated || data?.inputData?.glucose || 0).toFixed(0)}
              </Text>
            </View>
            {/* 3. Blood Pressure */}
            <View style={[styles.factorItem, themed.factorCard]}>
              <Text style={[styles.factorLabel, themed.factorLabel]}>{t.prediction.highBP}</Text>
              <Text style={[styles.factorValue, themed.factorValue]}>
                {(currentHealth?.highBP ?? data?.inputData?.highBP) === 1 ? t.prediction.high : t.prediction.normal}
              </Text>
            </View>
            {/* 4. Cholesterol */}
            <View style={[styles.factorItem, themed.factorCard]}>
              <Text style={[styles.factorLabel, themed.factorLabel]}>{t.prediction.highChol}</Text>
              <Text style={[styles.factorValue, themed.factorValue]}>
                {(currentHealth?.highChol ?? data?.inputData?.highChol) === 1 ? t.prediction.high : t.prediction.normal}
              </Text>
            </View>
            {/* 5. Age */}
            <View style={[styles.factorItem, themed.factorCard]}>
              <Text style={[styles.factorLabel, themed.factorLabel]}>{t.prediction.age}</Text>
              <Text style={[styles.factorValue, themed.factorValue]}>
                {(() => {
                  const age = currentHealth?.age || data?.inputData?.age;
                  return age ? (AGE_GROUP_LABELS[age.toString()] || age) : '-';
                })()}
              </Text>
            </View>
            {/* 6. Heart Health */}
            <View style={[styles.factorItem, themed.factorCard]}>
              <Text style={[styles.factorLabel, themed.factorLabel]}>{t.prediction.heartDisease}</Text>
              <Text style={[styles.factorValue, themed.factorValue]}>
                {(currentHealth?.heartDiseaseOrAttack ?? data?.inputData?.heartDiseaseOrAttack ?? data?.inputData?.heartDisease) === 1 ? t.prediction.high : t.prediction.normal}
              </Text>
            </View>
            {/* 7. Smoker */}
            <View style={[styles.factorItem, themed.factorCard]}>
              <Text style={[styles.factorLabel, themed.factorLabel]}>{t.prediction.smoker}</Text>
              <Text style={[styles.factorValue, themed.factorValue]}>
                {(currentHealth?.smoker ?? data?.inputData?.smoker) === 1 ? t.prediction.high : t.prediction.normal}
              </Text>
            </View>
            {/* 8. Physical Activity */}
            <View style={[styles.factorItem, themed.factorCard]}>
              <Text style={[styles.factorLabel, themed.factorLabel]}>{t.prediction.physActivity}</Text>
              <Text style={[styles.factorValue, themed.factorValue]}>
                {(currentHealth?.physActivity ?? data?.inputData?.physActivity) === 1 ? t.prediction.normal : t.prediction.high}
              </Text>
            </View>
            {/* 9. General Health */}
            <View style={[styles.factorItem, themed.factorCard]}>
              <Text style={[styles.factorLabel, themed.factorLabel]}>{t.prediction.genHlth}</Text>
              <Text style={[styles.factorValue, themed.factorValue]}>
                {(currentHealth?.genHlth ?? data?.inputData?.genHlth ?? 3) <= 2 ? t.prediction.normal : t.prediction.high}
              </Text>
            </View>
            {/* 10. Pregnancies (if female) */}
            {((currentHealth?.sex ?? data?.inputData?.sex) === 0) && (
              <View style={[styles.factorItem, themed.factorCard]}>
                <Text style={[styles.factorLabel, themed.factorLabel]}>{t.prediction.pregnancies}</Text>
                <Text style={[styles.factorValue, themed.factorValue]}>
                  {currentHealth?.pregnancies ?? data?.inputData?.pregnancies ?? 0}
                </Text>
              </View>
            )}
            {/* 11. BMI Details (Height/Weight) */}
            <View style={[styles.factorItem, themed.factorCard]}>
              <Text style={[styles.factorLabel, themed.factorLabel]}>{t.prediction.height} cm</Text>
              <Text style={[styles.factorValue, themed.factorValue]}>
                {currentHealth?.height || data?.inputData?.height || '-'}
              </Text>
            </View>
            <View style={[styles.factorItem, themed.factorCard]}>
              <Text style={[styles.factorLabel, themed.factorLabel]}>{t.prediction.weight} kg</Text>
              <Text style={[styles.factorValue, themed.factorValue]}>
                {currentHealth?.weight || data?.inputData?.weight || '-'}
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
    ...Platform.select({
      web: {
        boxShadow: '0px 8px 16px rgba(0, 0, 0, 0.25)',
      },
      native: {
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
        elevation: 8,
      },
    }),
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
    ...Platform.select({
      web: {
        boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.3)',
      },
      native: {
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
      },
    }),
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
    ...Platform.select({
      web: {
        boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.05)',
      },
      native: {
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
      },
    }),
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
