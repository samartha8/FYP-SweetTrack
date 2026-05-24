import { secureFetch as fetch } from '@/lib/apiClient';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Dimensions,
  Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  ChevronRight, 
  Sparkles, 
  ShieldCheck, 
  Zap, 
  ScanLine, 
  Camera,
  Trash2,
  Info,
  CheckCircle2,
  Loader2,
  ArrowLeft,
  Stethoscope,
  Heart,
  User,
  Calendar,
  Activity,
  Droplet
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import Animated, { FadeInDown, FadeInUp, ZoomIn, Layout } from 'react-native-reanimated';
import { useAuth } from '@/contexts/AuthContext';;
import { useTheme } from '@/contexts/SettingsContext';
import { useTranslation } from '@/hooks/use-translation';
import { HEALTH_URL, DIABETES_URL } from '../constants/Api';

const { width } = Dimensions.get('window');

const showAlert = (title: string, message: string) => {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n\n${message}`);
  } else {
    Alert.alert(title, message);
  }
};

type HealthFormData = {
  age: string;
  sex: string;
  height: string;
  weight: string;
  bmi?: string;
  pregnancies?: string;
  highBP: string;
  highChol: string;
  genHlth: string;
  smoker: string;
  physActivity: string;
  heartDiseaseOrAttack: string;
  hba1cEstimated?: string;
  hba1cSource?: 'auto' | 'report' | 'manual';
  bloodGlucoseEstimated?: string;
  glucoseSource?: 'auto' | 'report' | 'manual';
};

type Step = 'features' | 'results' | 'personal' | 'age' | 'lifestyle' | 'medical' | 'review';

export default function HealthSetupScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, ensureAccessToken, updateUser, completeHealthSetup } = useAuth();
  const { colors, scale } = useTheme();
  const { t } = useTranslation();

  const [currentStep, setCurrentStep] = useState<Step>('features');
  const [isLoading, setIsLoading] = useState(false);
  const [entryMode, setEntryMode] = useState<'selection' | 'manual' | 'results'>('selection');
  const [isScanning, setIsScanning] = useState(false);
  const [lastScanResults, setLastScanResults] = useState<{ detected: {label: string, value: string}[], missing: string[] } | null>(null);
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const showSub = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setKeyboardVisible(false));
    return () => { showSub.remove(); hideSub.remove(); };
  }, []);

  const [formData, setFormData] = useState<HealthFormData>({
    age: '', sex: '', height: '', weight: '', bmi: '', pregnancies: '0',
    highBP: '', highChol: '', genHlth: '', smoker: '', physActivity: '',
    heartDiseaseOrAttack: '', hba1cEstimated: '', hba1cSource: 'manual',
    bloodGlucoseEstimated: '', glucoseSource: 'manual'
  });

  // 🧹 Auto-clean 'null' strings and HYDRATE from user profile
  useEffect(() => {
    if (user) {
      setFormData(prev => {
        const anyUser = user as any;
        const health = anyUser.healthData || anyUser;
        
        // Helper to get value with 'null' string protection
        const getSafe = (key: string, fallback: string = '') => {
          const val = health[key];
          if (val === undefined || val === null || val === 'null') return fallback;
          return String(val);
        };

        return {
          ...prev,
          age: getSafe('age'),
          sex: getSafe('sex'),
          height: getSafe('height'),
          weight: getSafe('weight'),
          bmi: getSafe('bmi'),
          pregnancies: getSafe('pregnancies', '0'),
          highBP: getSafe('highBP'),
          highChol: getSafe('highChol'),
          genHlth: getSafe('genHlth'),
          smoker: getSafe('smoker'),
          physActivity: getSafe('physActivity'),
          heartDiseaseOrAttack: getSafe('heartDiseaseOrAttack'),
          hba1cEstimated: getSafe('hba1cEstimated'),
          bloodGlucoseEstimated: getSafe('bloodGlucoseEstimated'),
        };
      });
    }
  }, [user?.id]); // Only hydrate when user changes or on mount

  useEffect(() => {
    const hasNulls = Object.values(formData).some(v => v === 'null');
    if (hasNulls) {
      setFormData(prev => {
        const cleaned = { ...prev };
        Object.keys(cleaned).forEach(key => {
          const k = key as keyof HealthFormData;
          if (cleaned[k] === 'null') (cleaned as any)[k] = '';
        });
        return cleaned;
      });
    }
  }, [formData]);

  const steps: Step[] = ['features', 'personal', 'age', 'lifestyle', 'medical', 'review'];
  // 'results' is an intermediary state, not a main step in the progress bar
  const currentStepIndex = currentStep === 'results' ? 0 : steps.indexOf(currentStep);
  const progress = (currentStepIndex + 1) / steps.length;

  const themed = useMemo(() => ({
    headerTitle: { color: colors.text, fontSize: scale(24), fontWeight: '900' as const, letterSpacing: -1 },
    sectionTitle: { color: colors.text, fontSize: scale(28), fontWeight: '900' as const, letterSpacing: -1.5 },
    card: { backgroundColor: '#FFF', borderRadius: 32, borderWidth: 1, borderColor: 'rgba(0,0,0,0.03)', elevation: 5, shadowOpacity: 0.08, shadowRadius: 20, shadowColor: '#000' },
    label: { color: colors.text, fontSize: 13, fontWeight: '800' as const, textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 8 },
    input: { backgroundColor: '#F8FAFC', borderRadius: 16, padding: 16, fontSize: 16, fontWeight: '600' as const, color: colors.text, borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)' },
    placeholderColor: '#94A3B8',
    buttonText: { color: '#FFF', fontSize: 16, fontWeight: '900' as const, letterSpacing: 1 },
  }), [colors, scale]);

  const handleScanReport = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Permission required', 'Allow access to photos to scan reports.');
        return;
      }
      // Turned off allowsEditing so it takes the full rectangular report without forcing a crop
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: false, quality: 0.4, base64: true });
      if (result.canceled) return;

      setIsScanning(true);
      const token = await ensureAccessToken();
      const response = await fetch(`${HEALTH_URL}/scan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'ngrok-skip-browser-warning': 'true',
          'Authorization': `Bearer ${token || ''}`
        },
        body: JSON.stringify({ imageBase64: result.assets[0].base64 })
      });
      const json = await response.json();
      setIsScanning(false);
      console.log("🚀 [HealthSetup] Scan Response:", json);

      if (json.success && json.data) {
        const d = json.data;
        const mappedData: Partial<HealthFormData> = {};
        
        const safeStr = (val: any) => (val === undefined || val === null || val === 'null') ? '' : String(val);

        if (d.age) {
          const rawAge = parseInt(String(d.age).replace(/\D/g, ''));
          if (!isNaN(rawAge)) {
            let cat = '1';
            if (rawAge >= 80) cat = '13';
            else if (rawAge >= 75) cat = '12';
            else if (rawAge >= 70) cat = '11';
            else if (rawAge >= 65) cat = '10';
            else if (rawAge >= 60) cat = '9';
            else if (rawAge >= 55) cat = '8';
            else if (rawAge >= 50) cat = '7';
            else if (rawAge >= 45) cat = '6';
            else if (rawAge >= 40) cat = '5';
            else if (rawAge >= 35) cat = '4';
            else if (rawAge >= 30) cat = '3';
            else if (rawAge >= 25) cat = '2';
            else cat = '1';
            mappedData.age = cat;
          }
        }

        const w = safeStr(d.weight); if (w) mappedData.weight = w;
        const h = safeStr(d.height); if (h) mappedData.height = h;
        const s = safeStr(d.sex); if (s) mappedData.sex = s;
        
        // Safe BP Normalization
        const bpRaw = d.bloodPressure !== undefined ? d.bloodPressure : d.highBP;
        const bpS = safeStr(bpRaw);
        if (bpS) {
          mappedData.highBP = (bpS === '1' || bpS.toLowerCase() === 'high' || bpS.toLowerCase() === 'true') ? '1' : '0';
        }

        // Safe Cholesterol Normalization
        const cholRaw = d.cholesterol !== undefined ? d.cholesterol : d.highChol;
        const cholS = safeStr(cholRaw);
        if (cholS) {
          mappedData.highChol = (cholS === '1' || cholS.toLowerCase() === 'high' || cholS.toLowerCase() === 'true') ? '1' : '0';
        }

        const gh = safeStr(d.genHlth); if (gh) mappedData.genHlth = gh;
        if (d.hba1cEstimated) { mappedData.hba1cEstimated = String(d.hba1cEstimated); mappedData.hba1cSource = 'report'; }
        if (d.bloodGlucoseEstimated) { mappedData.bloodGlucoseEstimated = String(d.bloodGlucoseEstimated); mappedData.glucoseSource = 'report'; }
        
        // Filter out data that we already have (only update if current is empty)
        const updateData: Partial<HealthFormData> = {};
        let newlyFoundCount = 0;
        
        Object.keys(mappedData).forEach((key) => {
          const k = key as keyof HealthFormData;
          const currentVal = String(formData[k] || '').trim();
          if (!currentVal || currentVal === '' || currentVal === 'null') {
            updateData[k] = mappedData[k] as any;
            newlyFoundCount++;
          }
        });

        console.log("🚀 [HealthSetup] Newly Found Fields:", newlyFoundCount, "at step:", currentStep);

        if (newlyFoundCount === 0 && currentStep === 'results') {
          showAlert("No New Data", "This report does not contain any of the missing metabolic parameters.");
          return;
        }

        const nextFormData = { ...formData, ...updateData };
        setFormData(nextFormData);
        
        const detectedItems = [];
        if (nextFormData.age) detectedItems.push({ label: 'Age Category', value: ['18-24', '25-29', '30-34', '35-39', '40-44', '45-49', '50-54', '55-59', '60-64', '65-69', '70-74', '75-79', '80+'][parseInt(nextFormData.age)-1] });
        if (nextFormData.weight) detectedItems.push({ label: 'Weight', value: `${nextFormData.weight}kg` });
        if (nextFormData.height) detectedItems.push({ label: 'Height', value: `${nextFormData.height}cm` });
        if (nextFormData.sex !== undefined && nextFormData.sex !== '') detectedItems.push({ label: 'Sex', value: nextFormData.sex === '1' ? 'Male' : 'Female' });
        if (nextFormData.highBP !== undefined && nextFormData.highBP !== '') detectedItems.push({ label: 'Blood Pressure', value: nextFormData.highBP === '1' ? 'High' : 'Normal' });
        if (nextFormData.highChol !== undefined && nextFormData.highChol !== '') detectedItems.push({ label: 'Cholesterol', value: nextFormData.highChol === '1' ? 'High' : 'Normal' });
        if (nextFormData.hba1cEstimated) detectedItems.push({ label: 'HbA1c', value: `${nextFormData.hba1cEstimated}%` });
        if (nextFormData.bloodGlucoseEstimated) detectedItems.push({ label: 'Glucose', value: `${nextFormData.bloodGlucoseEstimated} mg/dL` });

        // Identify Remaining Missing Fields
        const missing = [];
        if (!nextFormData.age) missing.push('Age');
        if (!nextFormData.sex) missing.push('Biological Sex');
        if (!nextFormData.height) missing.push('Height');
        if (!nextFormData.weight) missing.push('Weight');
        if (!nextFormData.smoker) missing.push('Smoking History');
        if (!nextFormData.physActivity) missing.push('Physical Activity');
        if (!nextFormData.highBP) missing.push('Blood Pressure');
        if (!nextFormData.highChol) missing.push('Cholesterol');
        if (!nextFormData.genHlth) missing.push('General Health');

        setLastScanResults({ detected: detectedItems, missing });
        setEntryMode('results');
        setCurrentStep('results');
      } else {
        showAlert("Scan Unsuccessful", json.message || "We couldn't extract data from this report. Please ensure the photo is clear and contains metabolic metrics.");
      }
    } catch (e) {
      showAlert("Error", "Could not scan report.");
    } finally {
      setIsScanning(false);
    }
  };

  const calculateBMI = useCallback(() => {
    if (formData.height && formData.weight) {
      const h = parseFloat(formData.height) / 100;
      const w = parseFloat(formData.weight);
      if (h > 0 && w > 0) {
        return (w / (h * h)).toFixed(1);
      }
    }
    return '';
  }, [formData.height, formData.weight]);

  const handleNext = async () => {
    console.log("🚀 [HealthSetup] handleNext called. Current Step:", currentStep);
    if (currentStep === 'features') setCurrentStep('personal');
    else if (currentStep === 'personal') setCurrentStep('age');
    else if (currentStep === 'age') setCurrentStep('lifestyle');
    else if (currentStep === 'lifestyle') setCurrentStep('medical');
    else if (currentStep === 'medical') setCurrentStep('review');
    else if (currentStep === 'review') {
      setIsLoading(true);
      try {
        const token = await ensureAccessToken();
        const bmiVal = calculateBMI();
        
        // Convert actual age to CDC 13-level category
        const ageNum = parseInt(formData.age) || 0;
        let ageCategory = 1;
        if (ageNum >= 80) ageCategory = 13;
        else if (ageNum >= 75) ageCategory = 12;
        else if (ageNum >= 70) ageCategory = 11;
        else if (ageNum >= 65) ageCategory = 10;
        else if (ageNum >= 60) ageCategory = 9;
        else if (ageNum >= 55) ageCategory = 8;
        else if (ageNum >= 50) ageCategory = 7;
        else if (ageNum >= 45) ageCategory = 6;
        else if (ageNum >= 40) ageCategory = 5;
        else if (ageNum >= 35) ageCategory = 4;
        else if (ageNum >= 30) ageCategory = 3;
        else if (ageNum >= 25) ageCategory = 2;
        
        const payload = { 
          ...formData, 
          bmi: parseFloat(bmiVal || '0'),
          age: ageCategory, 
          sex: parseInt(formData.sex), 
          highBP: parseInt(formData.highBP), 
          highChol: parseInt(formData.highChol), 
          genHlth: parseInt(formData.genHlth), 
          smoker: parseInt(formData.smoker), 
          physActivity: parseInt(formData.physActivity), 
          heartDiseaseOrAttack: parseInt(formData.heartDiseaseOrAttack), 
          height: parseFloat(formData.height), 
          weight: parseFloat(formData.weight),
          pregnancies: parseInt(formData.pregnancies || '0'),
          hba1cEstimated: formData.hba1cEstimated ? parseFloat(formData.hba1cEstimated) : undefined,
          bloodGlucoseEstimated: formData.bloodGlucoseEstimated ? parseFloat(formData.bloodGlucoseEstimated) : undefined
        };

        console.log("🚀 [HealthSetup] Submitting Payload:", JSON.stringify(payload, null, 2));
        const res = await fetch(HEALTH_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'ngrok-skip-browser-warning': 'true',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });
        
        if (res.ok) {
          // Trigger DIABETES prediction immediately after saving health metrics
          try {
            await fetch(`${DIABETES_URL}/predict`, {
              method: 'POST',
              headers: { 
                'Authorization': `Bearer ${token}`, 
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'ngrok-skip-browser-warning': 'true'
              },
              body: JSON.stringify(payload)
            });
          } catch (predictionErr) {
            console.error("🚀 [HealthSetup] Auto-prediction failed:", predictionErr);
          }

          // Mark setup as complete and sync ALL data to local storage in one go
          await completeHealthSetup(payload);
          router.replace('/(tabs)/home');
        } else {
          const errorText = await res.text();
          Alert.alert("Server Error", `Failed to save: Status ${res.status}\n\n${errorText}`);
        }
      } catch (e: any) {
        Alert.alert("Network Error", `Could not save health profile: ${e.message}`);
      } finally { setIsLoading(false); }
    }
  };

  const validateStep = (step: Step) => {
    if (step === 'features') return true;
    if (step === 'personal') {
      const h = parseFloat(formData.height);
      const w = parseFloat(formData.weight);
      const pregValid = formData.sex === '0' ? formData.pregnancies !== '' : true;
      return formData.sex !== '' && !isNaN(h) && h > 0 && !isNaN(w) && w > 0 && pregValid;
    }
    if (step === 'age') {
      return formData.age !== '';
    }
    if (step === 'lifestyle') {
      return formData.smoker !== '' && formData.physActivity !== '';
    }
    if (step === 'medical') {
      return (
        formData.highBP !== '' && 
        formData.highChol !== '' && 
        formData.heartDiseaseOrAttack !== '' &&
        formData.genHlth !== '' &&
        formData.hba1cEstimated !== '' &&
        formData.bloodGlucoseEstimated !== ''
      );
    }
    return true;
  };

  const renderProgress = () => (
    <View style={styles.progressContainer}>
      <View style={styles.progressBarBg}>
        <Animated.View style={[styles.progressBarFill, { width: `${progress * 100}%`, backgroundColor: colors.primary }]} layout={Layout.springify()} />
      </View>
      <View style={styles.progressTextRow}>
        <Text style={styles.progressText}>Step {currentStepIndex + 1} of {steps.length}</Text>
        <Text style={styles.progressPercent}>{Math.round(progress * 100)}%</Text>
      </View>
    </View>
  );

  const renderRadio = (label: string, value: string, currentValue: string, onSelect: (val: string) => void) => {
    const isSelected = currentValue === value;
    return (
      <TouchableOpacity 
        activeOpacity={0.7} 
        onPress={() => onSelect(value)} 
        style={[
          styles.radioTile, 
          { borderColor: isSelected ? colors.primary : 'rgba(0,0,0,0.05)', 
            backgroundColor: isSelected ? colors.primary + '08' : '#F8FAFC' }
        ]}
      >
        <Text 
          style={[styles.radioTileLabel, { color: isSelected ? colors.primary : colors.text, flex: 1, marginRight: 8 }]} 
          numberOfLines={1} 
          adjustsFontSizeToFit
        >
          {label}
        </Text>
        <View style={[styles.radioIndicator, { borderColor: isSelected ? colors.primary : 'rgba(0,0,0,0.1)' }]}>
          {isSelected && <View style={[styles.radioIndicatorInner, { backgroundColor: colors.primary }]} />}
        </View>
      </TouchableOpacity>
    );
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 'results':
        return (
          <Animated.View entering={FadeInDown} style={styles.stepContainer}>
            <View style={styles.resultsHeader}>
              <View style={[styles.statusIcon, { backgroundColor: colors.primary + '15' }]}>
                <Sparkles size={32} color={colors.primary} />
              </View>
              <Text style={themed.sectionTitle}>Audit Scan Summary</Text>
              <Text style={[styles.stepDesc, { color: colors.textSecondary }]}>
                Here is what our AI detected from your medical report.
              </Text>
            </View>

            <View style={styles.resultsCard}>
              <Text style={styles.resultsTitle}>DETECTED PARAMETERS</Text>
              {lastScanResults?.detected.map((item, i) => (
                <View key={i} style={styles.resultItem}>
                  <CheckCircle2 size={18} color="#10B981" strokeWidth={3} />
                  <Text style={styles.resultLabel}>{item.label}:</Text>
                  <Text style={styles.resultValue}>{item.value}</Text>
                </View>
              ))}

              {lastScanResults?.missing && lastScanResults.missing.length > 0 && (
                <>
                  <View style={[styles.divider, { marginVertical: 16 }]} />
                  <Text style={[styles.resultsTitle, { color: '#F59E0B' }]}>MISSING DATA</Text>
                  <View style={styles.missingList}>
                    {lastScanResults.missing.map((item, i) => (
                      <View key={i} style={styles.missingItem}>
                        <Info size={14} color="#F59E0B" />
                        <Text style={styles.missingText}>{item}</Text>
                      </View>
                    ))}
                  </View>
                </>
              )}
            </View>

            <View style={styles.resultsActions}>
              <TouchableOpacity activeOpacity={0.8} style={styles.scanAnotherBtn} onPress={handleScanReport}>
                <Camera size={20} color={colors.primary} />
                <Text style={[styles.scanAnotherText, { color: colors.primary }]}>SCAN ANOTHER REPORT</Text>
              </TouchableOpacity>
              
              <Text style={styles.orText}>OR</Text>

              <TouchableOpacity activeOpacity={0.8} style={styles.manualBtn} onPress={() => setCurrentStep('personal')}>
                <LinearGradient colors={[colors.primary, colors.primaryDark]} style={StyleSheet.absoluteFill} />
                <Text style={styles.manualBtnText}>COMPLETE MANUALLY</Text>
                <ChevronRight size={20} color="#FFF" />
              </TouchableOpacity>
            </View>
          </Animated.View>
        );

      case 'features':
        return (
          <Animated.View entering={FadeInDown} style={styles.stepContainer}>
            <Text style={themed.sectionTitle}>Precision Audit Setup</Text>
            <Text style={[styles.stepDesc, { color: colors.textSecondary, marginBottom: 32 }]}>
              Initialize your metabolic baseline. Choose a method to securely import your clinical data.
            </Text>
            
            <View style={styles.choiceGroup}>
              <TouchableOpacity activeOpacity={0.8} style={styles.scanAction} onPress={handleScanReport}>
                <LinearGradient colors={['#00B4D8', '#0077B6']} style={StyleSheet.absoluteFill} start={{x:0,y:0}} end={{x:1,y:1}} />
                <View style={styles.scanContent}>
                  <View style={styles.iconCircle}>
                    <ScanLine size={28} color="#FFF" strokeWidth={2.5} />
                  </View>
                  <View style={styles.textContent}>
                    <View style={styles.badgeRow}>
                      <Text style={styles.scanTitle}>AI Scanner Audit</Text>
                    </View>
                    <Text style={styles.scanSub}>Auto-detect metrics from report</Text>
                    <View style={[styles.recomBadge, { alignSelf: 'flex-start', marginTop: 4 }]}>
                      <Text style={styles.recomText}>RECOMMENDED</Text>
                    </View>
                  </View>
                  <ChevronRight size={20} color="#FFF" opacity={0.6} />
                </View>
              </TouchableOpacity>

              <View style={styles.orDividerContainer}>
                <View style={styles.orLine} />
                <Text style={styles.orLabel}>OR</Text>
                <View style={styles.orLine} />
              </View>

              <TouchableOpacity activeOpacity={0.8} style={[styles.scanAction, { backgroundColor: '#FFF', elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, borderWidth: 1, borderColor: '#F1F5F9' }]} onPress={() => setCurrentStep('personal')}>
                <View style={styles.scanContent}>
                  <View style={[styles.iconCircle, { backgroundColor: '#F1F5F9' }]}>
                    <User size={24} color="#64748B" />
                  </View>
                  <View style={styles.textContent}>
                    <Text style={[styles.scanTitle, { color: '#1E293B' }]}>Manual Data Entry</Text>
                    <Text style={[styles.scanSub, { color: '#94A3B8' }]}>Enter your vitals manually</Text>
                  </View>
                  <ChevronRight size={20} color="#CBD5E1" />
                </View>
              </TouchableOpacity>
            </View>

            <View style={styles.whyAuditSection}>
              <View style={styles.whyHeader}>
                <View style={styles.whyDivider} />
                <Text style={styles.whyTitle}>WHY COMPLETE THIS AUDIT?</Text>
                <View style={styles.whyDivider} />
              </View>
              
              <View style={styles.featureListCondensed}>
                {[
                  { icon: Stethoscope, title: 'Medical Accuracy', desc: 'Validated risk detection models' },
                  { icon: ShieldCheck, title: 'Data Sovereignty', desc: 'Encrypted, local-first data' },
                  { icon: Zap, title: 'Instant Insights', desc: 'Real-time metabolic estimates' }
                ].map((f, i) => (
                  <View key={i} style={styles.featureItemCondensed}>
                    <View style={[styles.smallIconBox, { backgroundColor: colors.primary + '10' }]}>
                      <f.icon size={16} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.fTitleSmall}>{f.title}</Text>
                      <Text style={styles.fDescSmall}>{f.desc}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          </Animated.View>
        );

      case 'personal':
        return (
          <Animated.View entering={FadeInDown} style={styles.stepContainer}>
            <View style={styles.headerTitleRow}>
              <View style={[styles.titleIcon, { backgroundColor: '#E0F2FE' }]}>
                <User size={24} color="#0EA5E9" />
              </View>
              <View>
                <Text style={themed.sectionTitle}>Biometric Baseline</Text>
                <Text style={styles.sectionDesc}>Physical metrics for your metabolic profile.</Text>
              </View>
            </View>
            
            <View style={[styles.questionCard, themed.card]}>
              <View style={styles.labelRow}>
                <Text style={themed.label}>Biological Sex</Text>
                <Info size={14} color="#94A3B8" />
              </View>
              <Text style={styles.inputInfo}>Essential for hormone-based risk analysis.</Text>
              <View style={styles.radioRow}>
                {renderRadio('Male', '1', formData.sex, (v) => setFormData({...formData, sex: v}))}
                {renderRadio('Female', '0', formData.sex, (v) => setFormData({...formData, sex: v}))}
              </View>
            </View>
            
            <View style={[styles.questionCard, themed.card]}>
              <View style={styles.labelRow}>
                <Text style={themed.label}>Physical Measurements</Text>
                <Info size={14} color="#94A3B8" />
              </View>
              <Text style={styles.inputInfo}>Used to calculate your Body Mass Index (BMI).</Text>
              <View style={styles.formRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputUnitLabel}>Height (cm)</Text>
                  <TextInput 
                    style={themed.input} 
                    placeholder="---" 
                    placeholderTextColor={themed.placeholderColor}
                    keyboardType="numeric" 
                    value={formData.height} 
                    onChangeText={(v) => setFormData({...formData, height: v})} 
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 16 }}>
                  <Text style={styles.inputUnitLabel}>Weight (kg)</Text>
                  <TextInput 
                    style={themed.input} 
                    placeholder="---" 
                    placeholderTextColor={themed.placeholderColor}
                    keyboardType="numeric" 
                    value={formData.weight} 
                    onChangeText={(v) => setFormData({...formData, weight: v})} 
                  />
                </View>
              </View>
            </View>

            {formData.sex === '0' && (
              <View style={[styles.questionCard, themed.card]}>
                <View style={styles.labelRow}>
                  <Text style={themed.label}>Reproductive History</Text>
                </View>
                <Text style={styles.inputInfo}>Pregnancies can impact long-term metabolic health.</Text>
                <TextInput 
                  style={themed.input} 
                  placeholder="---" 
                  placeholderTextColor={themed.placeholderColor}
                  keyboardType="numeric" 
                  value={formData.pregnancies} 
                  onChangeText={(v) => setFormData({...formData, pregnancies: v})} 
                />
              </View>
            )}
          </Animated.View>
        );

      case 'age':
        return (
          <Animated.View entering={FadeInDown} style={styles.stepContainer}>
            <View style={styles.headerTitleRow}>
              <View style={[styles.titleIcon, { backgroundColor: '#FEE2E2' }]}>
                <Calendar size={24} color="#EF4444" />
              </View>
              <View>
                <Text style={themed.sectionTitle}>Age Baseline</Text>
                <Text style={styles.sectionDesc}>Risk levels shift significantly with age.</Text>
              </View>
            </View>

            <View style={[styles.questionCard, themed.card]}>
              <View style={styles.labelRow}>
                <Text style={themed.label}>Age Category</Text>
                <Info size={14} color="#94A3B8" />
              </View>
              <Text style={styles.inputInfo}>Select the range that matches your current age.</Text>
              <View style={styles.ageGrid}>
                {['18-24', '25-29', '30-34', '35-39', '40-44', '45-49', '50-54', '55-59', '60-64', '65-69', '70-74', '75-79', '80+'].map((age, i) => (
                  <TouchableOpacity key={i} onPress={() => setFormData({...formData, age: String(i+1)})} style={[styles.ageChipGrid, formData.age === String(i+1) && { backgroundColor: colors.primary, borderColor: colors.primary }]}>
                    <Text style={[styles.ageText, formData.age === String(i+1) && { color: '#FFF' }]}>{age}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </Animated.View>
        );

      case 'lifestyle':
        return (
          <Animated.View entering={FadeInDown} style={styles.stepContainer}>
            <View style={styles.headerTitleRow}>
              <View style={[styles.titleIcon, { backgroundColor: '#FEF3C7' }]}>
                <Zap size={24} color="#F59E0B" />
              </View>
              <View>
                <Text style={themed.sectionTitle}>Metabolic Lifestyle</Text>
                <Text style={styles.sectionDesc}>Daily habits impact your insulin sensitivity.</Text>
              </View>
            </View>
            
            <View style={[styles.questionCard, themed.card]}>
              <View style={styles.labelRow}>
                <Text style={themed.label}>Smoking History</Text>
                <Info size={14} color="#94A3B8" />
              </View>
              <Text style={styles.inputInfo}>Smoking impacts vascular health and insulin resistance.</Text>
              <View style={styles.radioRow}>
                {renderRadio('Smoker', '1', formData.smoker, (v) => setFormData({...formData, smoker: v}))}
                {renderRadio('Non-Smoker', '0', formData.smoker, (v) => setFormData({...formData, smoker: v}))}
              </View>
            </View>

            <View style={[styles.questionCard, themed.card]}>
              <View style={styles.labelRow}>
                <Text style={themed.label}>Physical Activity</Text>
                <Info size={14} color="#94A3B8" />
              </View>
              <Text style={styles.inputInfo}>Regular activity helps regulate blood glucose levels.</Text>
              <View style={styles.radioRow}>
                {renderRadio('Active', '1', formData.physActivity, (v) => setFormData({...formData, physActivity: v}))}
                {renderRadio('Sedentary', '0', formData.physActivity, (v) => setFormData({...formData, physActivity: v}))}
              </View>
            </View>
          </Animated.View>
        );

      case 'medical':
        console.log("🚀 [HealthSetup] DEBUG MEDICAL STATE:", { highBP: formData.highBP, highChol: formData.highChol });
        return (
          <Animated.View entering={FadeInDown} style={styles.stepContainer}>
            <View style={styles.headerTitleRow}>
              <View style={[styles.titleIcon, { backgroundColor: '#DCFCE7' }]}>
                <Stethoscope size={24} color="#10B981" />
              </View>
              <View>
                <Text style={themed.sectionTitle}>Medical Integrity</Text>
                <Text style={styles.sectionDesc}>Clinical indicators for advanced risk analysis.</Text>
              </View>
            </View>
            
            <View style={[styles.questionCard, themed.card]}>
              <View style={styles.labelRow}>
                <Text style={themed.label}>Vitals History</Text>
                <Info size={14} color="#94A3B8" />
              </View>
              <Text style={styles.inputInfo}>Medical history for key clinical markers.</Text>
              
              <View style={styles.vitalRow}>
                <View style={styles.vitalInfo}>
                  <View style={[styles.vitalIcon, { backgroundColor: '#FEE2E2' }]}>
                    <Activity size={18} color="#EF4444" />
                  </View>
                  <Text style={styles.vitalLabel}>Blood Pressure</Text>
                </View>
                <View style={styles.vitalToggle}>
                  <TouchableOpacity onPress={() => setFormData({...formData, highBP: '0'})} style={[styles.toggleOption, formData.highBP == '0' && styles.toggleActive]}>
                    <Text style={[styles.toggleText, formData.highBP == '0' && styles.toggleTextActive]}>Normal</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setFormData({...formData, highBP: '1'})} style={[styles.toggleOption, formData.highBP == '1' && styles.toggleActiveHigh]}>
                    <Text style={[styles.toggleText, formData.highBP == '1' && styles.toggleTextActive]}>High</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={[styles.divider, { marginVertical: 12 }]} />

              <View style={styles.vitalRow}>
                <View style={styles.vitalInfo}>
                  <View style={[styles.vitalIcon, { backgroundColor: '#E0F2FE' }]}>
                    <Droplet size={18} color="#0EA5E9" />
                  </View>
                  <Text style={styles.vitalLabel}>Cholesterol</Text>
                </View>
                <View style={styles.vitalToggle}>
                  <TouchableOpacity onPress={() => setFormData({...formData, highChol: '0'})} style={[styles.toggleOption, formData.highChol == '0' && styles.toggleActive]}>
                    <Text style={[styles.toggleText, formData.highChol == '0' && styles.toggleTextActive]}>Normal</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setFormData({...formData, highChol: '1'})} style={[styles.toggleOption, formData.highChol == '1' && styles.toggleActiveHigh]}>
                    <Text style={[styles.toggleText, formData.highChol == '1' && styles.toggleTextActive]}>High</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={[styles.divider, { marginVertical: 12 }]} />

              <View style={styles.vitalRow}>
                <View style={styles.vitalInfo}>
                  <View style={[styles.vitalIcon, { backgroundColor: '#FEE2E2' }]}>
                    <Heart size={18} color="#EF4444" />
                  </View>
                  <Text style={styles.vitalLabel}>Heart Disease</Text>
                </View>
                <View style={styles.vitalToggle}>
                  <TouchableOpacity onPress={() => setFormData({...formData, heartDiseaseOrAttack: '0'})} style={[styles.toggleOption, formData.heartDiseaseOrAttack == '0' && styles.toggleActive]}>
                    <Text style={[styles.toggleText, formData.heartDiseaseOrAttack == '0' && styles.toggleTextActive]}>No</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setFormData({...formData, heartDiseaseOrAttack: '1'})} style={[styles.toggleOption, formData.heartDiseaseOrAttack == '1' && styles.toggleActiveHigh]}>
                    <Text style={[styles.toggleText, formData.heartDiseaseOrAttack == '1' && styles.toggleTextActive]}>Yes</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            <View style={[styles.questionCard, themed.card]}>
              <View style={styles.labelRow}>
                <Text style={themed.label}>General Health</Text>
              </View>
              <Text style={styles.inputInfo}>Your self-perceived health is a strong metabolic indicator.</Text>
              <View style={styles.ratingRow}>
                {['1','2','3','4','5'].map((r) => (
                  <TouchableOpacity key={r} onPress={() => setFormData({...formData, genHlth: r})} style={[styles.ratingBtn, formData.genHlth === r && { backgroundColor: colors.primary, borderColor: colors.primary }]}>
                    <Text style={[styles.ratingText, formData.genHlth === r && { color: '#FFF' }]}>{['Poor','Fair','Good','V.Good','Excl'][parseInt(r)-1]}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            
            <View style={[styles.questionCard, themed.card, { backgroundColor: '#F8FAFC', borderColor: colors.primary + '20' }]}>
              <View style={styles.labelRow}>
                <Text style={[themed.label, { color: colors.primary }]}>Clinical Measurements</Text>
                <Sparkles size={14} color={colors.primary} />
              </View>
              <Text style={[styles.inputInfo, { color: colors.text, marginBottom: 16 }]}>These lab values are critical for a high-precision metabolic audit.</Text>
              <View style={styles.formRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputUnitLabel}>HbA1c (%)</Text>
                  <TextInput 
                    style={[themed.input, { backgroundColor: '#FFF' }]} 
                    placeholder="---" 
                    placeholderTextColor={themed.placeholderColor}
                    keyboardType="numeric" 
                    value={formData.hba1cEstimated} 
                    onChangeText={(v) => setFormData({...formData, hba1cEstimated: v, hba1cSource: 'manual'})} 
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 16 }}>
                  <Text style={styles.inputUnitLabel}>Glucose (mg/dL)</Text>
                  <TextInput 
                    style={[themed.input, { backgroundColor: '#FFF' }]} 
                    placeholder="---" 
                    placeholderTextColor={themed.placeholderColor}
                    keyboardType="numeric" 
                    value={formData.bloodGlucoseEstimated} 
                    onChangeText={(v) => setFormData({...formData, bloodGlucoseEstimated: v, glucoseSource: 'manual'})} 
                  />
                </View>
              </View>
            </View>
          </Animated.View>
        );

      case 'review':
        const bmiValue = calculateBMI();
        return (
          <Animated.View entering={FadeInDown} style={styles.stepContainer}>
            <View style={styles.headerTitleRow}>
              <View style={[styles.titleIcon, { backgroundColor: colors.primary + '15' }]}>
                <Sparkles size={24} color={colors.primary} />
              </View>
              <View>
                <Text style={themed.sectionTitle}>Audit Confirmation</Text>
                <Text style={styles.sectionDesc}>AI Engine ready to finalize your profile.</Text>
              </View>
            </View>

            <View style={styles.aiGlowContainer}>
              <View style={[styles.reviewCard, themed.card, styles.glassCard]}>
                <View style={styles.diagnosticHeader}>
                  <Text style={styles.diagnosticTitle}>DIAGNOSTIC REPORT #MET-042</Text>
                  <View style={styles.liveIndicator}>
                    <View style={[styles.liveDot, { backgroundColor: '#10B981' }]} />
                    <Text style={styles.liveText}>AI ACTIVE</Text>
                  </View>
                </View>

                <View style={styles.diagnosticItem}>
                  <Text style={styles.diagLabel}>BIOMETRIC DATASTREAM</Text>
                  <View style={styles.diagValueRow}>
                    <User size={16} color={colors.primary} />
                    <Text style={styles.diagValue}>{formData.height}cm / {formData.weight}kg</Text>
                    <View style={styles.diagBadge}>
                      <Text style={styles.diagBadgeText}>BMI: {bmiValue || '--'}</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.diagDivider} />

                <View style={styles.diagnosticItem}>
                  <Text style={styles.diagLabel}>CLINICAL MEASUREMENTS</Text>
                  <View style={styles.diagValueRow}>
                    <Activity size={16} color="#EF4444" />
                    <Text style={styles.diagValue}>HbA1c: {formData.hba1cEstimated || '--'}% • Glu: {formData.bloodGlucoseEstimated || '--'}</Text>
                  </View>
                </View>

                <View style={styles.diagDivider} />

                <View style={styles.diagnosticItem}>
                  <Text style={styles.diagLabel}>METABOLIC PROFILE STATUS</Text>
                  <View style={styles.statusBadgeGrid}>
                    <View style={[styles.statusTag, { backgroundColor: parseInt(formData.highBP) ? '#FEE2E2' : '#DCFCE7' }]}>
                      <Text style={[styles.statusTagText, { color: parseInt(formData.highBP) ? '#B91C1C' : '#15803D' }]}>
                        {parseInt(formData.highBP) ? 'HYPERTENSIVE' : 'NORMOTENSIVE'}
                      </Text>
                    </View>
                    <View style={[styles.statusTag, { backgroundColor: parseInt(formData.highChol) ? '#FEF3C7' : '#DCFCE7' }]}>
                      <Text style={[styles.statusTagText, { color: parseInt(formData.highChol) ? '#92400E' : '#15803D' }]}>
                         {parseInt(formData.highChol) ? 'HIGH CHOLESTEROL' : 'NORMAL LIPIDS'}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>
            
            <View style={[styles.infoBox, { marginTop: 8 }]}>
              <ShieldCheck size={18} color={colors.primary} />
              <Text style={styles.infoText}>Data secured with military-grade AES-256 encryption. Initializing final metabolic risk profile.</Text>
            </View>
          </Animated.View>
        );

    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#F0FDF4', '#F0F9FF']} style={StyleSheet.absoluteFill} />
      <Stack.Screen options={{ headerShown: false }} />
      
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => {
            if (currentStep === 'results') setCurrentStep('features');
            else if (currentStepIndex > 0) setCurrentStep(steps[currentStepIndex-1]);
            else router.back();
          }} style={styles.backBtn}>
            <ArrowLeft size={28} color={colors.text} />
          </TouchableOpacity>
          <Text style={themed.headerTitle}>Metabolic Audit</Text>
          <View style={{ width: 44 }} />
        </View>
        {renderProgress()}
      </View>

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: 180 }]} showsVerticalScrollIndicator={false}>
        {renderStepContent()}
      </ScrollView>

      {!isKeyboardVisible && currentStep !== 'results' && currentStep !== 'features' && (
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 24) }]}>

          <TouchableOpacity 
            activeOpacity={0.8} 
            style={[styles.nextBtn, !validateStep(currentStep) && { opacity: 0.5 }]} 
            onPress={() => {
              console.log("🚀 [HealthSetup] Footer CONTINUE pressed. Valid:", validateStep(currentStep));
              handleNext();
            }} 
            disabled={!validateStep(currentStep) || isLoading}
          >
            <LinearGradient colors={['#00B4D8', '#0077B6']} style={StyleSheet.absoluteFill} />
            {isLoading ? <ActivityIndicator color="#FFF" /> : (
              <View style={styles.btnContent}>
                <Text style={themed.buttonText}>{currentStep === 'review' ? 'AUTHORIZE & INITIALIZE' : 'CONTINUE'}</Text>
                <ChevronRight size={20} color="#FFF" strokeWidth={3} />
              </View>
            )}
          </TouchableOpacity>
        </View>
      )}

      {isScanning && (
        <View style={styles.scanningOverlay}>
          <View style={styles.scanningBox}>
            <Loader2 size={40} color={colors.primary} style={styles.spin} />
            <Text style={styles.scanningText}>AI is performing metabolic audit...</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingBottom: 16 },
  headerContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, marginBottom: 20 },
  backBtn: { width: 44, height: 44, justifyContent: 'center' },
  progressContainer: { paddingHorizontal: 32 },
  progressBarBg: { height: 6, backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: 3, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 3 },
  progressTextRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  progressText: { fontSize: 11, fontWeight: '900', color: '#64748B', textTransform: 'uppercase', letterSpacing: 1 },
  progressPercent: { fontSize: 11, fontWeight: '900', color: '#00B4D8' },
  scrollContent: { paddingHorizontal: 32, paddingTop: 32 },
  stepContainer: { width: '100%' },
  stepDesc: { fontSize: 15, fontWeight: '600', lineHeight: 22, marginTop: 12, marginBottom: 32 },
  scanAction: { height: 110, borderRadius: 24, overflow: 'hidden', justifyContent: 'center', marginBottom: 0, elevation: 8, shadowOpacity: 0.2, shadowRadius: 15, shadowColor: '#00B4D8' },
  scanContent: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, gap: 16 },
  scanTitle: { color: '#FFF', fontSize: 18, fontWeight: '900' },
  scanSub: { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '700' },
  divider: { height: 1, backgroundColor: 'rgba(0,0,0,0.05)', marginBottom: 32 },
  featureList: { gap: 24 },
  featureItem: { flexDirection: 'row', alignItems: 'center' },
  fTitle: { fontSize: 16, fontWeight: '900', color: '#1E293B' },
  fDesc: { fontSize: 13, fontWeight: '600', color: '#64748B', marginTop: 2 },
  formGroup: { marginBottom: 32 },
  formRow: { flexDirection: 'row', marginBottom: 32 },
  radioRow: { flexDirection: 'row', gap: 12 },
  radio: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 60, paddingHorizontal: 16 },
  radioLabel: { fontSize: 14, fontWeight: '800' },
  ageScroll: { marginTop: 12 },
  ageChip: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(0,0,0,0.1)', marginRight: 10, backgroundColor: '#FFF' },
  ageText: { fontSize: 13, fontWeight: '800', color: '#64748B' },
  ratingRow: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 },
  ratingBtn: { minWidth: 60, height: 54, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(0,0,0,0.1)', backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 },
  ratingText: { fontSize: 12, fontWeight: '900', color: '#64748B', textTransform: 'uppercase' },
  inputUnitLabel: { fontSize: 11, fontWeight: '900', color: '#64748B', marginBottom: 6 },
  reviewCard: { padding: 24, marginBottom: 32 },
  reviewItem: { paddingVertical: 12 },
  reviewLabel: { fontSize: 10, fontWeight: '900', color: '#64748B', letterSpacing: 1, marginBottom: 4 },
  reviewVal: { fontSize: 16, fontWeight: '900', color: '#1E293B' },
  infoBox: { flexDirection: 'row', gap: 12, backgroundColor: '#F0FDF4', padding: 16, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: '#DCFCE7' },
  infoText: { flex: 1, fontSize: 12, color: '#166534', fontWeight: '600', lineHeight: 18 },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 32 },
  nextBtn: { height: 64, borderRadius: 24, overflow: 'hidden', justifyContent: 'center', alignItems: 'center', elevation: 8, shadowOpacity: 0.2, shadowRadius: 15, shadowColor: '#000' },
  btnContent: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  scanningOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.95)', justifyContent: 'center', alignItems: 'center', zIndex: 100 },
  scanningBox: { alignItems: 'center' },
  scanningText: { marginTop: 20, fontSize: 16, fontWeight: '900', color: '#00B4D8', letterSpacing: -0.5 },
  spin: { transform: [{ rotate: '0deg' }] },
  resultsHeader: { alignItems: 'center', marginBottom: 24 },
  statusIcon: { width: 64, height: 64, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  resultsCard: { backgroundColor: '#FFF', borderRadius: 24, padding: 24, borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)', marginBottom: 24 },
  resultsTitle: { fontSize: 11, fontWeight: '900', color: '#64748B', letterSpacing: 1, marginBottom: 16 },
  resultItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 10 },
  resultLabel: { fontSize: 14, fontWeight: '700', color: '#64748B' },
  resultValue: { fontSize: 14, fontWeight: '900', color: '#1E293B' },
  missingList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  missingItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF3C7', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, gap: 6 },
  missingText: { fontSize: 12, fontWeight: '800', color: '#92400E' },
  resultsActions: { gap: 12 },
  scanAnotherBtn: { height: 56, borderRadius: 16, borderWidth: 2, borderColor: '#00B4D8', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  scanAnotherText: { fontSize: 14, fontWeight: '900' },
  orText: { textAlign: 'center', fontSize: 12, fontWeight: '800', color: '#94A3B8' },
  manualBtn: { height: 64, borderRadius: 20, overflow: 'hidden', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  manualBtnText: { color: '#FFF', fontSize: 15, fontWeight: '900', letterSpacing: 0.5 },
  ageGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 },
  ageChipGrid: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(0,0,0,0.1)', backgroundColor: '#FFF', minWidth: (width - 64 - 20) / 3 },
  sectionDesc: { fontSize: 14, fontWeight: '600', color: '#64748B', lineHeight: 20, marginTop: 4 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  inputInfo: { fontSize: 12, fontWeight: '600', color: '#94A3B8', marginBottom: 16, lineHeight: 16 },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 32 },
  titleIcon: { width: 52, height: 52, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  questionCard: { padding: 24, marginBottom: 20, borderRadius: 28 },
  radioTile: { flex: 1, height: 60, borderRadius: 18, borderWidth: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12 },
  radioTileLabel: { fontSize: 13, fontWeight: '800' },
  radioIndicator: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  radioIndicatorInner: { width: 10, height: 10, borderRadius: 5 },
  vitalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 },
  vitalInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  vitalIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  vitalLabel: { fontSize: 14, fontWeight: '700', color: '#1E293B' },
  vitalToggle: { flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: 12, padding: 4 },
  toggleOption: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  toggleActive: { backgroundColor: '#059669', elevation: 4, shadowOpacity: 0.3, shadowRadius: 4, shadowColor: '#059669' },
  toggleActiveHigh: { backgroundColor: '#DC2626', elevation: 4, shadowOpacity: 0.3, shadowRadius: 4, shadowColor: '#DC2626' },
  toggleText: { fontSize: 13, fontWeight: '700', color: '#64748B' },
  toggleTextActive: { color: '#FFF', fontWeight: '900' },
  aiGlowContainer: { marginVertical: 16 },
  glassCard: { backgroundColor: 'rgba(255,255,255,0.9)', borderWidth: 1, borderColor: 'rgba(0,180,216,0.2)', elevation: 15, shadowColor: '#00B4D8', shadowOpacity: 0.1, shadowRadius: 30, padding: 28 },
  diagnosticHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  diagnosticTitle: { fontSize: 10, fontWeight: '900', color: '#94A3B8', letterSpacing: 1.5 },
  liveIndicator: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#DCFCE7', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 },
  liveDot: { width: 8, height: 8, borderRadius: 4 },
  liveText: { fontSize: 9, fontWeight: '900', color: '#15803D' },
  diagnosticItem: { gap: 12, marginVertical: 4 },
  diagLabel: { fontSize: 11, fontWeight: '900', color: '#64748B', letterSpacing: 0.5 },
  diagValueRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  diagValue: { fontSize: 20, fontWeight: '900', color: '#1E293B', letterSpacing: -0.5 },
  diagBadge: { backgroundColor: '#F1F5F9', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  diagBadgeText: { fontSize: 11, fontWeight: '900', color: '#00B4D8' },
  diagDivider: { height: 1, backgroundColor: 'rgba(0,0,0,0.03)', marginVertical: 12 },
  statusBadgeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 },
  statusTag: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12 },
  statusTagText: { fontSize: 11, fontWeight: '900' },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  recomBadge: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  recomText: { color: '#FFF', fontSize: 8, fontWeight: '900' },
  iconCircle: { width: 52, height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center' },
  choiceGroup: { gap: 16, marginBottom: 40 },
  whyAuditSection: { marginTop: 8 },
  whyHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  whyDivider: { flex: 1, height: 1, backgroundColor: 'rgba(0,0,0,0.05)' },
  whyTitle: { fontSize: 10, fontWeight: '900', color: '#94A3B8', letterSpacing: 1.5 },
  featureListCondensed: { gap: 16 },
  featureItemCondensed: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  smallIconBox: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  fTitleSmall: { fontSize: 14, fontWeight: '900', color: '#1E293B' },
  fDescSmall: { fontSize: 12, fontWeight: '600', color: '#64748B' },
  textContent: { flex: 1, marginLeft: 16, justifyContent: 'center' },
  orDividerContainer: { flexDirection: 'row', alignItems: 'center', gap: 16, marginVertical: 16 },
  orLine: { flex: 1, height: 1, backgroundColor: 'rgba(0,0,0,0.05)' },
  orLabel: { fontSize: 12, fontWeight: '900', color: '#CBD5E1', letterSpacing: 1 },
});