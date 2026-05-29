import { useState, useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Platform,
  Modal,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Save, User as UserIcon, Mail, Calendar, Ruler, Weight, Plus, ChevronDown, Check, Activity, Heart, Cigarette, Thermometer } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';;
import { useTheme } from '@/contexts/SettingsContext';
import { useTranslation } from '@/hooks/use-translation';
import { LinearGradient } from 'expo-linear-gradient';
import { secureFetch } from '@/lib/apiClient';
import { AUTH_URL, HEALTH_URL } from '@/constants/Api';


export default function EditProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useTranslation();
  const { user, updateUser } = useAuth();
  const { colors, scale } = useTheme();
  const manualLabEditRef = useRef(false);

  const LOCALIZED_AGE_GROUPS = useMemo(() => [
    { value: '1', label: '18-24' },
    { value: '2', label: '25-29' },
    { value: '3', label: '30-34' },
    { value: '4', label: '35-39' },
    { value: '5', label: '40-44' },
    { value: '6', label: '45-49' },
    { value: '7', label: '50-54' },
    { value: '8', label: '55-59' },
    { value: '9', label: '60-64' },
    { value: '10', label: '65-69' },
    { value: '11', label: '70-74' },
    { value: '12', label: '75-79' },
    { value: '13', label: '80+' },
  ], []);

  const GENDERS = useMemo(() => [
    { value: 'Male', label: t.profile.male },
    { value: 'Female', label: t.profile.female },
    { value: 'Other', label: t.profile.other },
  ], [t]);

  // Dynamic Styles
  const themed = useMemo(() => ({
    container: { backgroundColor: colors.backgroundSecondary },
    header: { backgroundColor: 'transparent' },
    headerTitle: { color: colors.text, fontSize: scale(20), fontWeight: '900' as const, letterSpacing: -1 },
    sectionTitle: { color: colors.text, fontSize: scale(22), fontWeight: '900' as const, letterSpacing: -0.5 },
    inputGroup: { backgroundColor: '#FFF', shadowColor: '#000' },
    inputIcon: { backgroundColor: colors.primary + '15' },
    inputLabel: { color: colors.textSecondary, fontSize: scale(11), fontWeight: '800' as const, textTransform: 'uppercase' as const, letterSpacing: 0.5 },
    input: { color: colors.text, fontSize: scale(16), fontWeight: '700' as const },
    genderButton: { backgroundColor: '#F8FAFC', borderColor: '#E2E8F0' },
    genderButtonActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    genderButtonText: { color: colors.text, fontSize: scale(14), fontWeight: '700' as const },
    genderButtonTextActive: { color: colors.textWhite, fontWeight: '800' as const },
    addConditionInput: {
      backgroundColor: '#FFF',
      color: colors.text,
      borderColor: '#E2E8F0',
      fontSize: scale(15),
      fontWeight: '600' as const
    },
    addConditionButton: { backgroundColor: colors.primary },
    conditionsList: { backgroundColor: '#FFF' },
    conditionItem: { borderBottomColor: '#F1F5F9' },
    conditionText: { color: colors.text, fontSize: scale(15), fontWeight: '700' as const },
    emptyText: { color: colors.textSecondary, fontSize: scale(14), fontWeight: '600' as const },
    saveButtonText: { color: colors.textWhite, fontSize: scale(18), fontWeight: '900' as const, letterSpacing: 1 },
    saveButton: { backgroundColor: colors.primary },
    selectorText: { color: colors.text, fontSize: scale(16), fontWeight: '700' as const },
    modalOverlay: { backgroundColor: 'rgba(0,0,0,0.4)' },
    modalContent: { backgroundColor: '#FFF' },
    modalHeader: { marginBottom: 24 },
    modalTitle: { color: colors.text, fontSize: scale(22), fontWeight: '900' as const, letterSpacing: -0.5 },
    modalItem: { borderBottomColor: '#F1F5F9' },
    modalItemActive: { backgroundColor: colors.primary + '10' },
    modalItemText: { color: colors.text, fontSize: scale(17), fontWeight: '700' as const },
    modalItemTextActive: { color: colors.primary, fontWeight: '800' as const },
  }), [colors, scale]);

  // Helper to get gender string from sex code
  const getGenderString = (sex?: number) => {
    if (sex === 1) return 'Male';
    if (sex === 0) return 'Female';
    return '';
  };

  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    age: user?.age?.toString() || '',
    gender: getGenderString(user?.sex) || '',
    height: user?.height?.toString() || '',
    weight: user?.weight?.toString() || '',
    // Maintain strict typing for numeric fields
    highBP: user?.highBP?.toString() || '0',
    highChol: user?.highChol?.toString() || '0',
    smoker: user?.smoker?.toString() || '0',
    physActivity: user?.physActivity?.toString() || '0',
    heartDiseaseOrAttack: user?.heartDiseaseOrAttack?.toString() || '0',
    genHlth: user?.genHlth?.toString() || '3', // Default to Good (3)
    glucose: user?.bloodGlucoseEstimated?.toString() || '',
    hba1c: user?.hba1cEstimated?.toString() || '',
  });

  // ✅ AUTO-CALCULATION LOGIC: Update estimates when lifestyle factors change
  useEffect(() => {
    if (manualLabEditRef.current || formData.glucose || formData.hba1c) {
      return;
    }

    const h = parseFloat(formData.height);
    const w = parseFloat(formData.weight);
    const age = parseInt(formData.age);
    const genHlth = parseInt(formData.genHlth);
    const highChol = parseInt(formData.highChol);
    const highBP = parseInt(formData.highBP);

    if (!isNaN(h) && !isNaN(w) && h > 0 && !isNaN(age) && !isNaN(genHlth)) {
      const hMeters = h / 100;
      const bmi = w / (hMeters * hMeters);

      // Only calculate estimates if BMI is within valid risk-model range
      if (bmi >= 12 && bmi <= 98) {
        // Matching health-setup.tsx formulas
        const calculatedHba1c = 4.5 + (bmi - 25) * 0.03 + (age - 7) * 0.15 + genHlth * 0.4 + highChol * 0.8 + highBP * 0.6;
        const calculatedGlucose = 85 + (bmi - 25) * 1.2 + (age - 7) * 3.0 + genHlth * 8 + highChol * 15 + highBP * 12;

        setFormData(prev => ({
          ...prev,
          hba1c: Math.max(3.5, Math.min(15.0, calculatedHba1c)).toFixed(2),
          glucose: Math.max(70, Math.min(300, calculatedGlucose)).toFixed(1),
        }));
      } else {
        // Clear estimates if BMI is out of safe bounds
        setFormData(prev => ({
          ...prev,
          hba1c: '',
          glucose: '',
        }));
      }
    }
  }, [formData.height, formData.weight, formData.age, formData.genHlth, formData.highChol, formData.highBP]);

  const [medicalHistory, setMedicalHistory] = useState<string[]>(user?.medicalHistory || []);
  const [newCondition, setNewCondition] = useState('');
  const [showAgeModal, setShowAgeModal] = useState(false); // ✅ Age Modal State

  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!formData.name || !formData.email) {
      Alert.alert(t.profile.editScreen.errorTitle, t.profile.editScreen.errorRequired);
      return;
    }

    setSaving(true);
    try {
      // Map gender string back to sex code
      let sex: number | undefined;
      if (formData.gender === 'Male') sex = 1;
      else if (formData.gender === 'Female') sex = 0;
      else sex = undefined; // 'Other' or empty maps to undefined for backend enum [0, 1] compatibility

      // Recalculate BMI if height and weight are present
      let calculatedBmi: number | undefined;
      const h = parseFloat(formData.height);
      const w = parseFloat(formData.weight);
      if (!isNaN(h) && !isNaN(w) && h > 0) {
        calculatedBmi = Number((w / ((h / 100) ** 2)).toFixed(1));
        
        // Block save if BMI is out of range
        if (calculatedBmi < 12 || calculatedBmi > 98) {
          Alert.alert(t.profile.editScreen.errorTitle, t.healthSetup.fields.bmiRangeError);
          setSaving(false);
          return;
        }
      }

      const updates = {
        name: formData.name,
        email: formData.email,
        age: formData.age ? parseInt(formData.age) : undefined,
        sex: sex, // Save as sex
        // Legacy gender field update just in case
        gender: formData.gender,
        height: formData.height ? parseFloat(formData.height) : undefined,
        weight: formData.weight ? parseFloat(formData.weight) : undefined,
        bmi: calculatedBmi,
        medicalHistory,
        // New Health Fields
        highBP: parseInt(formData.highBP),
        highChol: parseInt(formData.highChol),
        smoker: parseInt(formData.smoker),
        physActivity: parseInt(formData.physActivity),
        heartDiseaseOrAttack: parseInt(formData.heartDiseaseOrAttack),
        genHlth: parseInt(formData.genHlth),
        bloodGlucoseEstimated: formData.glucose ? parseFloat(formData.glucose) : undefined,
        hba1cEstimated: formData.hba1c ? parseFloat(formData.hba1c) : undefined,
      };

      const [profileResponse, healthResponse] = await Promise.all([
        secureFetch(`${AUTH_URL}/profile`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: updates.name, email: updates.email }),
        }),
        secureFetch(HEALTH_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        }),
      ]);

      if (!profileResponse.ok || !healthResponse.ok) {
        const profileError = !profileResponse.ok ? await profileResponse.text() : '';
        const healthError = !healthResponse.ok ? await healthResponse.text() : '';
        throw new Error(profileError || healthError || 'Profile update failed');
      }

      const profileJson = await profileResponse.json();
      const healthJson = await healthResponse.json();
      await updateUser({
        ...(profileJson.user || {}),
        ...(healthJson.healthData || updates),
      });

      // ✅ Explicit Success Message
      Alert.alert(
        t.profile.editScreen.profileSaved,
        t.profile.editScreen.profileUpdateSuccess,
        [{ text: t.common.ok, onPress: () => router.back() }]
      );
    } catch (error) {
      Alert.alert(t.profile.editScreen.errorTitle, t.profile.editScreen.errorSave);
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const addMedicalCondition = () => {
    if (newCondition.trim()) {
      setMedicalHistory([...medicalHistory, newCondition.trim()]);
      setNewCondition('');
    }
  };

  const removeMedicalCondition = (index: number) => {
    setMedicalHistory(medicalHistory.filter((_, i) => i !== index));
  };

  const getAgeLabel = (value: string) => {
    return LOCALIZED_AGE_GROUPS.find(g => g.value === value)?.label || t.profile.editScreen.selectAgeGroup;
  };

  return (
    <View style={[styles.container, themed.container, { paddingTop: insets.top }]}>
      <LinearGradient
        colors={['#F0FDF4', '#F0F9FF']}
        style={StyleSheet.absoluteFill}
      />
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[styles.header, themed.header]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
          <X size={24} color={colors.text} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, themed.headerTitle]}>{t.profile.editProfile}</Text>
        <TouchableOpacity onPress={handleSave} style={styles.headerButton}>
          <Save size={24} color={colors.primary} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, themed.sectionTitle]}>{t.profile.personalInfo}</Text>

          <View style={[styles.inputGroup, themed.inputGroup]}>
            <View style={[styles.inputIcon, themed.inputIcon]}>
              <UserIcon size={20} color={colors.primary} strokeWidth={2} />
            </View>
            <View style={styles.inputWrapper}>
              <Text style={[styles.inputLabel, themed.inputLabel]}>{t.profile.editScreen.fullName}</Text>
              <TextInput
                style={[styles.input, themed.input]}
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
                placeholder={t.profile.editScreen.fullNamePlaceholder}
                placeholderTextColor={colors.textLight}
                accessibilityLabel="Full name input"
                accessibilityHint="Enter your full name"
              />
            </View>
          </View>

          <View style={[styles.inputGroup, themed.inputGroup]}>
            <View style={[styles.inputIcon, themed.inputIcon]}>
              <Mail size={20} color={colors.primary} strokeWidth={2} />
            </View>
            <View style={styles.inputWrapper}>
              <Text style={[styles.inputLabel, themed.inputLabel]}>{t.profile.email} *</Text>
              <TextInput
                style={[styles.input, themed.input, { color: colors.textLight }]}
                value={formData.email}
                editable={false}
                placeholder={t.profile.editScreen.emailPlaceholder || t.profile.email}
                placeholderTextColor={colors.textLight}
                accessibilityLabel="Email input"
                accessibilityHint="Email cannot be edited"
              />
            </View>
          </View>

          <View style={[styles.inputGroup, themed.inputGroup]}>
            <View style={[styles.inputIcon, themed.inputIcon]}>
              <Calendar size={20} color={colors.primary} strokeWidth={2} />
            </View>
            <View style={styles.inputWrapper}>
              <Text style={[styles.inputLabel, themed.inputLabel]}>{t.profile.editScreen.ageGroup}</Text>
              <TouchableOpacity
                style={styles.selectorButton}
                onPress={() => setShowAgeModal(true)}
              >
                <Text style={[styles.selectorText, themed.selectorText]}>
                  {getAgeLabel(formData.age)}
                </Text>
                <ChevronDown size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={[styles.inputGroup, themed.inputGroup]}>
            <View style={[styles.inputIcon, themed.inputIcon]}>
              <UserIcon size={20} color={colors.primary} strokeWidth={2} />
            </View>
            <View style={styles.inputWrapper}>
              <Text style={[styles.inputLabel, themed.inputLabel]}>{t.profile.gender}</Text>
              <View style={styles.genderContainer}>
                {GENDERS.map((gender) => (
                  <TouchableOpacity
                    key={gender.value}
                    style={[
                      styles.genderButton,
                      themed.genderButton,
                      formData.gender === gender.value && themed.genderButtonActive,
                    ]}
                    onPress={() => setFormData({ ...formData, gender: gender.value })}
                    accessibilityRole="button"
                    accessibilityLabel={`Select ${gender.label}`}
                    accessibilityState={{ selected: formData.gender === gender.value }}
                  >
                    <Text
                      style={[
                        styles.genderButtonText,
                        themed.genderButtonText,
                        formData.gender === gender.value && themed.genderButtonTextActive,
                      ]}
                    >
                      {gender.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          <View style={[styles.inputGroup, themed.inputGroup]}>
            <View style={[styles.inputIcon, themed.inputIcon]}>
              <Ruler size={20} color={colors.primary} strokeWidth={2} />
            </View>
            <View style={styles.inputWrapper}>
              <Text style={[styles.inputLabel, themed.inputLabel]}>{t.profile.editScreen.heightCm}</Text>
              <TextInput
                style={[styles.input, themed.input]}
                value={formData.height}
                onChangeText={(text) => setFormData({ ...formData, height: text })}
                placeholder={t.profile.editScreen.heightPlaceholder}
                placeholderTextColor={colors.textLight}
                keyboardType="decimal-pad"
                accessibilityLabel="Height input"
                accessibilityHint="Enter your height in centimeters"
              />
            </View>
          </View>

          <View style={[styles.inputGroup, themed.inputGroup]}>
            <View style={[styles.inputIcon, themed.inputIcon]}>
              <Weight size={20} color={colors.primary} strokeWidth={2} />
            </View>
            <View style={styles.inputWrapper}>
              <Text style={[styles.inputLabel, themed.inputLabel]}>{t.profile.editScreen.weightKg}</Text>
              <TextInput
                style={[styles.input, themed.input]}
                value={formData.weight}
                onChangeText={(text) => setFormData({ ...formData, weight: text })}
                placeholder={t.profile.editScreen.weightPlaceholder}
                placeholderTextColor={colors.textLight}
                keyboardType="decimal-pad"
                accessibilityLabel="Weight input"
                accessibilityHint="Enter your weight in kilograms"
              />
            </View>
          </View>

          {/* BMI Display */}
          {(() => {
            const h = parseFloat(formData.height);
            const w = parseFloat(formData.weight);
            if (!isNaN(h) && !isNaN(w) && h > 0) {
              const bmi = Number((w / ((h / 100) ** 2)).toFixed(1));
              const isInvalid = bmi < 12 || bmi > 98;
              return (
                <View style={[styles.inputGroup, themed.inputGroup, isInvalid && { borderColor: colors.error, borderWidth: 1 }]}>
                  <View style={[styles.inputIcon, themed.inputIcon]}>
                    <Activity size={20} color={isInvalid ? colors.error : colors.primary} strokeWidth={2} />
                  </View>
                  <View style={styles.inputWrapper}>
                    <Text style={[styles.inputLabel, themed.inputLabel]}>{t.healthSetup.fields.bmi}</Text>
                    <Text style={{ fontSize: 16, color: colors.text, fontWeight: '700' }}>
                      {bmi}
                    </Text>
                    {isInvalid ? (
                      <Text style={{ color: colors.error, fontSize: 12, marginTop: 4, fontWeight: '600' }}>
                        {t.healthSetup.fields.bmiRangeError}
                      </Text>
                    ) : (
                      <Text style={{ color: colors.textLight, fontSize: 12, marginTop: 4 }}>
                        {bmi < 18.5 ? 'Underweight' :
                          bmi < 25 ? 'Normal weight' :
                            bmi < 30 ? 'Overweight' : 'Obese'}
                      </Text>
                    )}
                  </View>
                </View>
              );
            }
            return null;
          })()}
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, themed.sectionTitle]}>{t.profile.editScreen.medicalMeasurements}</Text>

          {/* High BP & High Chol Row */}
          <View style={styles.row}>
            <View style={[styles.inputGroup, themed.inputGroup, { flex: 1, marginRight: 8, padding: 12 }]}>
              <View style={styles.inputWrapper}>
                <View style={styles.labelRow}>
                  <Activity size={16} color={colors.primary} style={{ marginRight: 6 }} />
                  <Text style={[styles.inputLabel, themed.inputLabel, { marginBottom: 0 }]}>{t.profile.editScreen.highBP}</Text>
                </View>
                <View style={styles.toggleContainer}>
                  <TouchableOpacity
                    style={[styles.toggleButton, formData.highBP === '1' && { backgroundColor: colors.error }]} // Red for Yes (Risk)
                    onPress={() => setFormData({ ...formData, highBP: '1' })}
                  >
                    <Text style={[styles.toggleText, formData.highBP === '1' && styles.toggleTextActive]}>{t.profile.editScreen.yes}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.toggleButton, formData.highBP === '0' && { backgroundColor: colors.primary }]} // Primary for No
                    onPress={() => setFormData({ ...formData, highBP: '0' })}
                  >
                    <Text style={[styles.toggleText, formData.highBP === '0' && styles.toggleTextActive]}>{t.profile.editScreen.no}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            <View style={[styles.inputGroup, themed.inputGroup, { flex: 1, marginLeft: 8, padding: 12 }]}>
              <View style={styles.inputWrapper}>
                <View style={styles.labelRow}>
                  <Activity size={16} color={colors.primary} style={{ marginRight: 6 }} />
                  <Text style={[styles.inputLabel, themed.inputLabel, { marginBottom: 0 }]}>{t.profile.editScreen.highChol}</Text>
                </View>
                <View style={styles.toggleContainer}>
                  <TouchableOpacity
                    style={[styles.toggleButton, formData.highChol === '1' && { backgroundColor: colors.error }]}
                    onPress={() => setFormData({ ...formData, highChol: '1' })}
                  >
                    <Text style={[styles.toggleText, formData.highChol === '1' && styles.toggleTextActive]}>{t.profile.editScreen.yes}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.toggleButton, formData.highChol === '0' && { backgroundColor: colors.primary }]}
                    onPress={() => setFormData({ ...formData, highChol: '0' })}
                  >
                    <Text style={[styles.toggleText, formData.highChol === '0' && styles.toggleTextActive]}>{t.profile.editScreen.no}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>

          {/* Heart Disease & Smoker Row */}
          <View style={styles.row}>
            <View style={[styles.inputGroup, themed.inputGroup, { flex: 1, marginRight: 8, padding: 12 }]}>
              <View style={styles.inputWrapper}>
                <View style={styles.labelRow}>
                  <Heart size={16} color={colors.primary} style={{ marginRight: 6 }} />
                  <Text style={[styles.inputLabel, themed.inputLabel, { marginBottom: 0 }]}>{t.profile.editScreen.heartDisease}</Text>
                </View>
                <View style={styles.toggleContainer}>
                  <TouchableOpacity
                    style={[styles.toggleButton, formData.heartDiseaseOrAttack === '1' && { backgroundColor: colors.error }]}
                    onPress={() => setFormData({ ...formData, heartDiseaseOrAttack: '1' })}
                  >
                    <Text style={[styles.toggleText, formData.heartDiseaseOrAttack === '1' && styles.toggleTextActive]}>{t.profile.editScreen.yes}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.toggleButton, formData.heartDiseaseOrAttack === '0' && { backgroundColor: colors.primary }]}
                    onPress={() => setFormData({ ...formData, heartDiseaseOrAttack: '0' })}
                  >
                    <Text style={[styles.toggleText, formData.heartDiseaseOrAttack === '0' && styles.toggleTextActive]}>{t.profile.editScreen.no}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            <View style={[styles.inputGroup, themed.inputGroup, { flex: 1, marginLeft: 8, padding: 12 }]}>
              <View style={styles.inputWrapper}>
                <View style={styles.labelRow}>
                  <Cigarette size={16} color={colors.primary} style={{ marginRight: 6 }} />
                  <Text style={[styles.inputLabel, themed.inputLabel, { marginBottom: 0 }]}>{t.profile.editScreen.smoker}</Text>
                </View>
                <View style={styles.toggleContainer}>
                  <TouchableOpacity
                    style={[styles.toggleButton, formData.smoker === '1' && { backgroundColor: colors.error }]}
                    onPress={() => setFormData({ ...formData, smoker: '1' })}
                  >
                    <Text style={[styles.toggleText, formData.smoker === '1' && styles.toggleTextActive]}>{t.profile.editScreen.yes}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.toggleButton, formData.smoker === '0' && { backgroundColor: colors.primary }]}
                    onPress={() => setFormData({ ...formData, smoker: '0' })}
                  >
                    <Text style={[styles.toggleText, formData.smoker === '0' && styles.toggleTextActive]}>{t.profile.editScreen.no}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>

          {/* Physical Activity */}
          <View style={[styles.inputGroup, themed.inputGroup, { padding: 12 }]}>
            <View style={styles.inputWrapper}>
              <View style={styles.labelRow}>
                <Activity size={16} color={colors.primary} style={{ marginRight: 6 }} />
                <Text style={[styles.inputLabel, themed.inputLabel, { marginBottom: 0 }]}>{t.profile.editScreen.physActivity}</Text>
              </View>
              <View style={styles.toggleContainer}>
                <TouchableOpacity
                  style={[styles.toggleButton, formData.physActivity === '1' && { backgroundColor: colors.primary }]} // Primary for Yes (Good)
                  onPress={() => setFormData({ ...formData, physActivity: '1' })}
                >
                  <Text style={[styles.toggleText, formData.physActivity === '1' && styles.toggleTextActive]}>{t.profile.editScreen.yes}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.toggleButton, formData.physActivity === '0' && { backgroundColor: colors.error }]} // Red for No (Bad)
                  onPress={() => setFormData({ ...formData, physActivity: '0' })}
                >
                  <Text style={[styles.toggleText, formData.physActivity === '0' && styles.toggleTextActive]}>{t.profile.editScreen.no}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* General Health */}
          <View style={[styles.inputGroup, themed.inputGroup, { padding: 12 }]}>
            <View style={styles.inputWrapper}>
              <View style={styles.labelRow}>
                <Activity size={16} color={colors.primary} style={{ marginRight: 6 }} />
                <Text style={[styles.inputLabel, themed.inputLabel, { marginBottom: 0 }]}>{t.profile.editScreen.genHlth}</Text>
              </View>
              <View style={styles.toggleContainer}>
                {[1, 2, 3, 4, 5].map((level) => (
                  <TouchableOpacity
                    key={level}
                    style={[
                      styles.toggleButton,
                      formData.genHlth === level.toString() && { backgroundColor: level <= 2 ? colors.primary : level === 3 ? colors.warning : colors.error },
                      { flex: 1 }
                    ]}
                    onPress={() => setFormData({ ...formData, genHlth: level.toString() })}
                  >
                    <Text style={[styles.toggleText, formData.genHlth === level.toString() && styles.toggleTextActive]}>{level}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* Glucose & HbA1c */}
          <View style={styles.row}>
            <View style={[styles.inputGroup, themed.inputGroup, { flex: 1, marginRight: 8, padding: 12 }]}>
              <View style={styles.inputWrapper}>
                <View style={styles.labelRow}>
                  <Thermometer size={16} color={colors.primary} style={{ marginRight: 6 }} />
                  <Text style={[styles.inputLabel, themed.inputLabel, { marginBottom: 0 }]}>{t.profile.editScreen.glucose}</Text>
                </View>
                <TextInput
                  style={[styles.input, themed.input, { marginTop: 8 }]}
                  value={formData.glucose}
                  onChangeText={(text) => {
                    manualLabEditRef.current = true;
                    setFormData({ ...formData, glucose: text });
                  }}
                  placeholder={t.profile.editScreen.glucosePlaceholder}
                  keyboardType="numeric"
                  placeholderTextColor={colors.textLight}
                />
              </View>
            </View>

            <View style={[styles.inputGroup, themed.inputGroup, { flex: 1, marginLeft: 8, padding: 12 }]}>
              <View style={styles.inputWrapper}>
                <View style={styles.labelRow}>
                  <Thermometer size={16} color={colors.primary} style={{ marginRight: 6 }} />
                  <Text style={[styles.inputLabel, themed.inputLabel, { marginBottom: 0 }]}>{t.profile.editScreen.hba1c}</Text>
                </View>
                <TextInput
                  style={[styles.input, themed.input, { marginTop: 8 }]}
                  value={formData.hba1c}
                  onChangeText={(text) => {
                    manualLabEditRef.current = true;
                    setFormData({ ...formData, hba1c: text });
                  }}
                  placeholder={t.profile.editScreen.hba1cPlaceholder}
                  keyboardType="numeric"
                  placeholderTextColor={colors.textLight}
                />
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, themed.sectionTitle]}>{t.profile.medicalHistory}</Text>

          <View style={styles.addConditionContainer}>
            <TextInput
              style={[styles.addConditionInput, themed.addConditionInput]}
              value={newCondition}
              onChangeText={setNewCondition}
              placeholder={t.profile.editScreen.addConditionPlaceholder}
              placeholderTextColor={colors.textLight}
              accessibilityLabel="New medical condition input"
              accessibilityHint="Enter a medical condition to add to your history"
            />
            <TouchableOpacity
              style={[styles.addConditionButton, themed.addConditionButton]}
              onPress={addMedicalCondition}
              accessibilityRole="button"
              accessibilityLabel="Add medical condition"
            >
              <Plus size={20} color={colors.textWhite} strokeWidth={2} />
            </TouchableOpacity>
          </View>

          <View style={[styles.conditionsList, themed.conditionsList]}>
            {medicalHistory.length > 0 ? (
              medicalHistory.map((condition, index) => (
                <View key={index} style={[styles.conditionItem, themed.conditionItem]}>
                  <Text style={[styles.conditionText, themed.conditionText]}>{condition}</Text>
                  <TouchableOpacity
                    onPress={() => removeMedicalCondition(index)}
                    style={styles.removeButton}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${condition}`}
                  >
                    <X size={18} color={colors.error} strokeWidth={2} />
                  </TouchableOpacity>
                </View>
              ))
            ) : (
              <Text style={[styles.emptyText, themed.emptyText]}>{t.profile.noHistory}</Text>
            )}
          </View>
        </View>

        <TouchableOpacity style={[styles.saveButton, themed.saveButton]} onPress={handleSave}>
          <Text style={[styles.saveButtonText, themed.saveButtonText]}>{t.profile.editScreen.saveChanges}</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal
        visible={showAgeModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowAgeModal(false)}
      >
        <View style={[styles.modalOverlay, themed.modalOverlay]}>
          <View style={[styles.modalContent, themed.modalContent]}>
            <View style={[styles.modalHeader, themed.modalHeader]}>
              <Text style={[styles.modalTitle, themed.modalTitle]}>{t.profile.editScreen.selectAgeGroup}</Text>
              <TouchableOpacity onPress={() => setShowAgeModal(false)}>
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={LOCALIZED_AGE_GROUPS}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.modalItem,
                    themed.modalItem,
                    formData.age === item.value && themed.modalItemActive
                  ]}
                  onPress={() => {
                    setFormData({ ...formData, age: item.value });
                    setShowAgeModal(false);
                  }}
                >
                  <Text style={[
                    styles.modalItemText,
                    themed.modalItemText,
                    formData.age === item.value && themed.modalItemTextActive
                  ]}>
                    {item.label}
                  </Text>
                  {formData.age === item.value && (
                    <Check size={20} color={colors.primary} />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* Saving Loading Modal */}
      <Modal
        visible={saving}
        transparent={true}
        animationType="fade"
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={[
            { backgroundColor: colors.card, padding: 24, borderRadius: 16, alignItems: 'center' },
            Platform.select({
              web: { boxShadow: '0px 2px 3.84px rgba(0, 0, 0, 0.25)' },
              native: {
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.25,
                shadowRadius: 3.84,
                elevation: 5
              }
            })
          ]}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={{ marginTop: 16, color: colors.text, fontSize: scale(16), fontWeight: '600' }}>{t.profile.editScreen.savingProfile}</Text>
          </View>
        </View>
      </Modal>
    </View>
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
    paddingVertical: 18,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      web: { boxShadow: '0px 4px 10px rgba(0,0,0,0.05)' },
      native: { elevation: 3, shadowOpacity: 0.1, shadowRadius: 5, shadowColor: '#000' }
    })
  },
  headerTitle: {
    fontWeight: '900',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 60,
  },
  section: {
    marginBottom: 36,
  },
  sectionTitle: {
    fontWeight: '900',
    marginBottom: 20,
  },
  inputGroup: {
    flexDirection: 'row',
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
    ...Platform.select({
      web: { boxShadow: '0px 8px 20px rgba(0, 0, 0, 0.06)' },
      native: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.06,
        shadowRadius: 15,
        elevation: 4,
      }
    }),
  },
  inputIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  inputWrapper: {
    flex: 1,
    justifyContent: 'center',
  },
  inputLabel: {
    marginBottom: 4,
  },
  input: {
    paddingVertical: Platform.OS === 'ios' ? 4 : 0,
  },
  genderContainer: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  genderButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  genderButtonActive: {
  },
  genderButtonText: {
    fontWeight: '800',
  },
  genderButtonTextActive: {
  },
  addConditionContainer: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  addConditionInput: {
    flex: 1,
    borderRadius: 18,
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginRight: 12,
    borderWidth: 2,
  },
  addConditionButton: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      web: { boxShadow: '0px 4px 12px rgba(0,0,0,0.1)' },
      native: { elevation: 4, shadowOpacity: 0.1, shadowRadius: 8, shadowColor: '#000' }
    })
  },
  conditionsList: {
    borderRadius: 24,
    padding: 24,
    ...Platform.select({
      web: { boxShadow: '0px 8px 20px rgba(0, 0, 0, 0.06)' },
      native: { elevation: 3, shadowOpacity: 0.06, shadowRadius: 15, shadowColor: '#000' }
    })
  },
  conditionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1.5,
  },
  conditionText: {
    flex: 1,
  },
  removeButton: {
    padding: 6,
  },
  emptyText: {
    textAlign: 'center',
    fontStyle: 'italic',
  },
  saveButton: {
    borderRadius: 22,
    paddingVertical: 20,
    alignItems: 'center',
    marginTop: 24,
    ...Platform.select({
      web: { boxShadow: '0px 10px 20px rgba(0, 0, 0, 0.15)' },
      native: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.15,
        shadowRadius: 15,
        elevation: 8,
      }
    }),
  },
  saveButtonText: {
  },
  selectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Platform.OS === 'ios' ? 6 : 0,
  },
  selectorText: {
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    height: '70%',
    padding: 28,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: -10,
    },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
  },
  modalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 18,
    borderBottomWidth: 1.5,
  },
  modalItemActive: {
    marginHorizontal: -28,
    paddingHorizontal: 28,
  },
  modalItemText: {
  },
  modalItemTextActive: {
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 4,
    marginTop: 10,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  toggleButtonActive: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    elevation: 3,
  },
  toggleText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '700',
  },
  toggleTextActive: {
    color: '#FFF',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
});
