import { useState, useMemo, useEffect } from 'react';
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
import { useUser } from '@/contexts/UserContext';
import { useTheme } from '@/contexts/SettingsContext';
import { useTranslation } from '@/hooks/use-translation';


export default function EditProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useTranslation();
  const { user, updateUser } = useUser();
  const { colors, scale } = useTheme();

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
    header: { backgroundColor: colors.background, borderBottomColor: colors.border },
    headerTitle: { color: colors.text, fontSize: scale(18) },
    sectionTitle: { color: colors.text, fontSize: scale(20) },
    inputGroup: { backgroundColor: colors.card, shadowColor: colors.cardShadow },
    inputIcon: { backgroundColor: colors.primary + '20' },
    inputLabel: { color: colors.textSecondary, fontSize: scale(12) },
    input: { color: colors.text, fontSize: scale(15) },
    genderButton: { backgroundColor: colors.backgroundSecondary, borderColor: colors.border },
    genderButtonActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    genderButtonText: { color: colors.text, fontSize: scale(14) },
    genderButtonTextActive: { color: colors.textWhite },
    addConditionInput: {
      backgroundColor: colors.card,
      color: colors.text,
      borderColor: colors.border,
      fontSize: scale(15)
    },
    addConditionButton: { backgroundColor: colors.primary },
    conditionsList: { backgroundColor: colors.card },
    conditionItem: { borderBottomColor: colors.backgroundSecondary },
    conditionText: { color: colors.text, fontSize: scale(15) },
    emptyText: { color: colors.textSecondary, fontSize: scale(14) },
    saveButtonText: { color: colors.textWhite, fontSize: scale(16) },
    saveButton: { backgroundColor: colors.primary, shadowColor: colors.cardShadow },
    selectorText: { color: colors.text, fontSize: scale(15) },
    modalOverlay: { backgroundColor: colors.overlay },
    modalContent: { backgroundColor: colors.background },
    modalHeader: { marginBottom: 20 },
    modalTitle: { color: colors.text, fontSize: scale(20) },
    modalItem: { borderBottomColor: colors.border },
    modalItemActive: { backgroundColor: colors.primary + '10' },
    modalItemText: { color: colors.text, fontSize: scale(16) },
    modalItemTextActive: { color: colors.primary },
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
    const h = parseFloat(formData.height);
    const w = parseFloat(formData.weight);
    const age = parseInt(formData.age);
    const genHlth = parseInt(formData.genHlth);
    const highChol = parseInt(formData.highChol);
    const highBP = parseInt(formData.highBP);

    if (!isNaN(h) && !isNaN(w) && h > 0 && !isNaN(age) && !isNaN(genHlth)) {
      const hMeters = h / 100;
      const bmi = w / (hMeters * hMeters);

      // Matching health-setup.tsx formulas
      const calculatedHba1c = 4.5 + (bmi - 25) * 0.03 + (age - 7) * 0.15 + genHlth * 0.4 + highChol * 0.8 + highBP * 0.6;
      const calculatedGlucose = 85 + (bmi - 25) * 1.2 + (age - 7) * 3.0 + genHlth * 8 + highChol * 15 + highBP * 12;

      setFormData(prev => ({
        ...prev,
        hba1c: Math.max(3.5, Math.min(15.0, calculatedHba1c)).toFixed(2),
        glucose: Math.max(70, Math.min(300, calculatedGlucose)).toFixed(1),
      }));
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

      await updateUser(updates);

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
                  onChangeText={(text) => setFormData({ ...formData, glucose: text })}
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
                  onChangeText={(text) => setFormData({ ...formData, hba1c: text })}
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
          <View style={{ backgroundColor: colors.card, padding: 24, borderRadius: 16, alignItems: 'center', shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84, elevation: 5 }}>
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
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontWeight: '700',
    marginBottom: 16,
  },
  inputGroup: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  inputIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  inputWrapper: {
    flex: 1,
  },
  inputLabel: {
    marginBottom: 6,
    fontWeight: '600',
  },
  input: {
    paddingVertical: Platform.OS === 'ios' ? 8 : 4,
  },
  genderContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  genderButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  genderButtonActive: {
  },
  genderButtonText: {
    fontWeight: '600',
  },
  genderButtonTextActive: {
  },
  addConditionContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  addConditionInput: {
    flex: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginRight: 12,
    borderWidth: 1,
  },
  addConditionButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  conditionsList: {
    borderRadius: 12,
    padding: 16,
  },
  conditionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  conditionText: {
    flex: 1,
  },
  removeButton: {
    padding: 4,
  },
  emptyText: {
    textAlign: 'center',
    fontStyle: 'italic',
  },
  saveButton: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonText: {
    fontWeight: '700',
  },
  selectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Platform.OS === 'ios' ? 8 : 4,
  },
  selectorText: {
  },
  modalOverlay: {
    flex: 1,
    paddingTop: 100, // Just a safe area top padding
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '60%',
    padding: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    fontWeight: '700',
  },
  modalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalItemActive: {
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  modalItemText: {
  },
  modalItemTextActive: {
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#F0F0F0',
    borderRadius: 8,
    padding: 2,
    marginTop: 8,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  toggleButtonActive: {
    // backgroundColor set dynamically
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    elevation: 2,
  },
  toggleText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  toggleTextActive: {
    color: '#FFF',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
});
