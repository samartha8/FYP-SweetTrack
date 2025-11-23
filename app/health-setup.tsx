import Colors from '@/constants/colors';
import { useUser } from '@/contexts/UserContext';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { ChevronRight, Info } from 'lucide-react-native';
import { useState } from 'react';
import {
  ColorValue,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type HealthFormData = {
  age: string;
  gender: string;
  height: string; // cm - used to calculate BMI
  weight: string; // kg - used to calculate BMI
  bmi?: string; // computed (display only) — kept as string for UI
  bloodGlucose: string; // mg/dL
  hba1c: string; // %
  bloodPressureSystolic: string;
  bloodPressureDiastolic: string;
  cholesterol: string; // mg/dL or highchol (text)
  smoking: string; // Never/Former/Current
  physicalActivityMinutes: string; // minutes per week
  dailySteps: string; // steps per day
  hypertension: string; // Yes/No
  heartDiseaseHistory: string; // Yes/No
};

type Step = 'features' | 'personal' | 'lifestyle' | 'medical' | 'review';

const featureHighlights = [
  { title: 'Blood Glucose Level', description: 'Monitor fasting and random glucose trends to catch spikes early.' },
  { title: 'HbA1c', description: 'Track 3-month blood sugar average to understand long-term control.' },
  { title: 'BMI', description: 'Automatically calculated from your height and weight for risk scoring.' },
  { title: 'Age', description: 'Age-adjusted insights personalize prevention strategies.' },
  { title: 'Blood Pressure', description: 'Keep systolic/diastolic readings to spot hypertension risk.' },
  { title: 'Cholesterol / HighChol', description: 'Document lipid levels to understand cardiovascular impact.' },
  { title: 'Smoking history', description: 'Identify lifestyle risks that affect glucose sensitivity.' },
  { title: 'Physical activity minutes', description: 'Log weekly movement to unlock precise coaching tips.' },
  { title: 'Daily steps', description: 'Sync or enter step counts to fuel rewards and streaks.' },
  { title: 'Hypertension', description: 'Record diagnoses to tailor risk warnings and nudges.' },
  { title: 'Heart disease history', description: 'Capture cardiac history for proactive monitoring.' },
];

export default function HealthSetupScreen() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, updateUser, completeHealthSetup } = useUser();

  const [currentStep, setCurrentStep] = useState<Step>('features');
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState<HealthFormData>({
    age: '',
    gender: '',
    height: '',
    weight: '',
    bmi: '',
    bloodGlucose: '',
    hba1c: '',
    bloodPressureSystolic: '',
    bloodPressureDiastolic: '',
    cholesterol: '',
    smoking: '',
    physicalActivityMinutes: '',
    dailySteps: '',
    hypertension: '',
    heartDiseaseHistory: '',
  });

  const steps: { key: Step; title: string; description: string }[] = [
    { key: 'features', title: 'Top Health Priorities', description: 'Review the 11 essentials we track after signup' },
    { key: 'personal', title: 'Personal Information', description: 'Age and BMI to shape baseline risk' },
    { key: 'lifestyle', title: 'Lifestyle', description: 'Smoking, activity minutes and daily steps' },
    { key: 'medical', title: 'Medical Measurements', description: 'Glucose, HbA1c, Cholesterol and BP' },
    { key: 'review', title: 'Review & Submit', description: 'Quick summary before saving' },
  ];

  const currentStepIndex = steps.findIndex(s => s.key === currentStep);
  const progress = ((currentStepIndex + 1) / steps.length) * 100;

  const updateField = (field: keyof HealthFormData, value: string) => {
    // If height or weight change, update BMI immediately
    setFormData(prev => {
      const next = { ...prev, [field]: value };

      if (field === 'height' || field === 'weight') {
        const h = parseFloat(field === 'height' ? value : next.height);
        const w = parseFloat(field === 'weight' ? value : next.weight);

        if (!Number.isNaN(h) && !Number.isNaN(w) && h > 0 && w > 0) {
          const hMeters = h / 100;
          const bmiVal = Number((w / (hMeters * hMeters)).toFixed(1));
          next.bmi = bmiVal.toString();
        } else {
          next.bmi = '';
        }
      }

      return next;
    });
  };

  const validateStep = (step: Step): boolean => {
    switch (step) {
      case 'features':
        return true;
      case 'personal':
        // age is required, height and weight to compute BMI (but allow manual bmi if present)
        return !!(formData.age && ((formData.height && formData.weight) || formData.bmi));
      case 'lifestyle':
        return !!(formData.smoking && formData.physicalActivityMinutes && formData.dailySteps);
      case 'medical':
        // require at least bloodGlucose or hba1c or cholesterol (we still encourage BP and hypertension)
        return !!(formData.bloodGlucose || formData.hba1c || formData.cholesterol || (formData.bloodPressureSystolic && formData.bloodPressureDiastolic));
      case 'review':
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (!validateStep(currentStep)) return;

    const stepOrder: Step[] = steps.map(s => s.key);
    const currentIndex = stepOrder.indexOf(currentStep);
    if (currentIndex < stepOrder.length - 1) setCurrentStep(stepOrder[currentIndex + 1]);
    else handleSubmit();
  };

  const handleBack = () => {
    const stepOrder: Step[] = steps.map(s => s.key);
    const currentIndex = stepOrder.indexOf(currentStep);
    if (currentIndex > 0) setCurrentStep(stepOrder[currentIndex - 1]);
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      // Prepare payload converting strings to numbers where appropriate
      const heightNum = formData.height ? parseFloat(formData.height) : undefined;
      const weightNum = formData.weight ? parseFloat(formData.weight) : undefined;
      const bmiNum = formData.bmi ? parseFloat(formData.bmi) : (heightNum && weightNum ? Number(((weightNum) / ((heightNum / 100) ** 2)).toFixed(1)) : undefined);

      const healthData = {
        age: formData.age ? parseInt(formData.age, 10) : undefined,
        gender: formData.gender || undefined,
        height: heightNum,
        weight: weightNum,
        bmi: bmiNum,
        bloodGlucose: formData.bloodGlucose ? parseFloat(formData.bloodGlucose) : undefined,
        hba1c: formData.hba1c ? parseFloat(formData.hba1c) : undefined,
        bloodPressure: (formData.bloodPressureSystolic && formData.bloodPressureDiastolic)
          ? {
              systolic: parseInt(formData.bloodPressureSystolic, 10),
              diastolic: parseInt(formData.bloodPressureDiastolic, 10),
            }
          : undefined,
        cholesterol: formData.cholesterol || undefined,
        smoking: formData.smoking || undefined,
        physicalActivityMinutes: formData.physicalActivityMinutes ? parseInt(formData.physicalActivityMinutes, 10) : undefined,
        dailySteps: formData.dailySteps ? parseInt(formData.dailySteps, 10) : undefined,
        hypertension: formData.hypertension || undefined,
        heartDiseaseHistory: formData.heartDiseaseHistory || undefined,
      };

      if (!user) {
        await updateUser({
          id: Date.now().toString(),
          name: 'User',
          email: '',
          ...healthData,
        } as any);
      } else {
        await updateUser(healthData as any);
      }

      await completeHealthSetup();
      router.replace('/(tabs)/home' as any);
    } catch (err) {
      console.error('Error saving health data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  /* --- Renderers for each step --- */

  const renderFeatureOverview = () => (
    <View style={styles.stepContent}>
      <View style={styles.infoCard}>
        <Info size={20} color={Colors.primary} />
        <Text style={styles.infoText}>
          First-time users see the exact health signals SweetTrack tracks to personalize diabetes prevention.
        </Text>
      </View>

      <View style={styles.featuresGrid}>
        {featureHighlights.map((feature, index) => (
          <View key={feature.title} style={styles.featureCard}>
            <View style={styles.featureBadge}>
              <Text style={styles.featureBadgeText}>{index + 1}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.featureTitle}>{feature.title}</Text>
              <Text style={styles.featureDescription}>{feature.description}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.infoFooter}>
        <Text style={styles.infoFooterText}>
          Continue to fill in your details so we can tailor recommendations using these 11 signals.
        </Text>
      </View>
    </View>
  );

  const renderPersonalInfo = () => (
    <View style={styles.stepContent}>
      <View style={styles.infoCard}>
        <Info size={20} color={Colors.primary} />
        <Text style={styles.infoText}>
          Provide age and body measurements so we can compute baseline BMI and risk.
        </Text>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Age <Text style={styles.required}>*</Text></Text>
        <TextInput
          style={[styles.input, { width: width * 0.9, maxWidth: 400 }]}
          placeholder="Enter your age"
          placeholderTextColor={Colors.textLight}
          value={formData.age}
          onChangeText={(text) => updateField('age', text.replace(/[^0-9]/g, ''))}
          keyboardType="number-pad"
        />
      </View>

      <View style={styles.row}>
        <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
          <Text style={styles.label}>Height (cm)</Text>
          <TextInput
            style={[styles.input, { width: '100%' }]}
            placeholder="e.g., 175"
            placeholderTextColor={Colors.textLight}
            value={formData.height}
            onChangeText={(text) => updateField('height', text.replace(/[^0-9.]/g, ''))}
            keyboardType="decimal-pad"
          />
        </View>
        <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
          <Text style={styles.label}>Weight (kg)</Text>
          <TextInput
            style={[styles.input, { width: '100%' }]}
            placeholder="e.g., 70"
            placeholderTextColor={Colors.textLight}
            value={formData.weight}
            onChangeText={(text) => updateField('weight', text.replace(/[^0-9.]/g, ''))}
            keyboardType="decimal-pad"
          />
        </View>
      </View>

      <View style={{ marginTop: 8 }}>
        <Text style={styles.helperText}>BMI will be calculated from height and weight.</Text>
        <View style={[styles.featureCard, { marginTop: 12 }]}>
          <Text style={styles.featureTitle}>BMI</Text>
          <Text style={[styles.featureDescription, { marginTop: 4 }]}>
            {formData.bmi ? `${formData.bmi} kg/m²` : 'Enter height and weight to calculate BMI'}
          </Text>
        </View>
      </View>
    </View>
  );

  const renderLifestyle = () => (
    <View style={styles.stepContent}>
      <View style={styles.infoCard}>
        <Info size={20} color={Colors.primary} />
        <Text style={styles.infoText}>
          Lifestyle details let us personalize recommendations — be honest.
        </Text>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Smoking History <Text style={styles.required}>*</Text></Text>
        <View style={styles.radioGroup}>
          {['Never', 'Former', 'Current'].map(option => (
            <TouchableOpacity
              key={option}
              style={[styles.radioButton, formData.smoking === option && styles.radioButtonActive, { width: (width * 0.9 - 40) / 3, maxWidth: 120 }]}
              onPress={() => updateField('smoking', option)}
            >
              <Text style={[styles.radioText, formData.smoking === option && styles.radioTextActive]}>{option}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Physical Activity (minutes per week) <Text style={styles.required}>*</Text></Text>
        <TextInput
          style={[styles.input, { width: width * 0.9, maxWidth: 400 }]}
          placeholder="e.g., 150"
          placeholderTextColor={Colors.textLight}
          value={formData.physicalActivityMinutes}
          onChangeText={(text) => updateField('physicalActivityMinutes', text.replace(/[^0-9]/g, ''))}
          keyboardType="number-pad"
        />
        <Text style={styles.helperText}>WHO recommends ≥150 minutes of moderate activity weekly for adults.</Text>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Daily Steps <Text style={styles.required}>*</Text></Text>
        <TextInput
          style={[styles.input, { width: width * 0.9, maxWidth: 400 }]}
          placeholder="e.g., 7000"
          placeholderTextColor={Colors.textLight}
          value={formData.dailySteps}
          onChangeText={(text) => updateField('dailySteps', text.replace(/[^0-9]/g, ''))}
          keyboardType="number-pad"
        />
        <Text style={styles.helperText}>Daily steps help tailor activity targets and rewards.</Text>
      </View>
    </View>
  );

  const renderMedical = () => (
    <View style={styles.stepContent}>
      <View style={styles.infoCard}>
        <Info size={20} color={Colors.primary} />
        <Text style={styles.infoText}>
          Add your recent medical measurements. These improve prediction accuracy.
        </Text>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Blood Glucose Level (mg/dL)</Text>
        <TextInput
          style={[styles.input, { width: width * 0.9, maxWidth: 400 }]}
          placeholder="e.g., 95"
          placeholderTextColor={Colors.textLight}
          value={formData.bloodGlucose}
          onChangeText={(text) => updateField('bloodGlucose', text.replace(/[^0-9.]/g, ''))}
          keyboardType="decimal-pad"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>HbA1c (%)</Text>
        <TextInput
          style={[styles.input, { width: width * 0.9, maxWidth: 400 }]}
          placeholder="e.g., 5.6"
          placeholderTextColor={Colors.textLight}
          value={formData.hba1c}
          onChangeText={(text) => updateField('hba1c', text.replace(/[^0-9.]/g, ''))}
          keyboardType="decimal-pad"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Cholesterol / HighChol</Text>
        <TextInput
          style={[styles.input, { width: width * 0.9, maxWidth: 400 }]}
          placeholder="e.g., 190"
          placeholderTextColor={Colors.textLight}
          value={formData.cholesterol}
          onChangeText={(text) => updateField('cholesterol', text.replace(/[^0-9.]/g, ''))}
          keyboardType="decimal-pad"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Blood Pressure</Text>
        <View style={styles.row}>
          <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
            <Text style={styles.sublabel}>Systolic</Text>
            <TextInput
              style={[styles.input, { width: '100%' }]}
              placeholder="120"
              placeholderTextColor={Colors.textLight}
              value={formData.bloodPressureSystolic}
              onChangeText={(text) => updateField('bloodPressureSystolic', text.replace(/[^0-9]/g, ''))}
              keyboardType="number-pad"
            />
          </View>
          <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
            <Text style={styles.sublabel}>Diastolic</Text>
            <TextInput
              style={[styles.input, { width: '100%' }]}
              placeholder="80"
              placeholderTextColor={Colors.textLight}
              value={formData.bloodPressureDiastolic}
              onChangeText={(text) => updateField('bloodPressureDiastolic', text.replace(/[^0-9]/g, ''))}
              keyboardType="number-pad"
            />
          </View>
        </View>
        <Text style={styles.helperText}>Normal: &lt;120/80 mmHg. High BP increases diabetes risk.</Text>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Hypertension (Doctor-diagnosed)</Text>
        <View style={styles.radioGroup}>
          {['No', 'Yes'].map(option => (
            <TouchableOpacity
              key={option}
              style={[styles.radioButton, formData.hypertension === option && styles.radioButtonActive, { width: (width * 0.9 - 40) / 2, maxWidth: 140 }]}
              onPress={() => updateField('hypertension', option)}
            >
              <Text style={[styles.radioText, formData.hypertension === option && styles.radioTextActive]}>{option}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Heart Disease History</Text>
        <View style={styles.radioGroup}>
          {['No', 'Yes'].map(option => (
            <TouchableOpacity
              key={option}
              style={[styles.radioButton, formData.heartDiseaseHistory === option && styles.radioButtonActive, { width: (width * 0.9 - 40) / 2, maxWidth: 140 }]}
              onPress={() => updateField('heartDiseaseHistory', option)}
            >
              <Text style={[styles.radioText, formData.heartDiseaseHistory === option && styles.radioTextActive]}>{option}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );

  const renderReview = () => (
    <View style={styles.stepContent}>
      <View style={styles.infoCard}>
        <Info size={20} color={Colors.primary} />
        <Text style={styles.infoText}>
          Review the values below. You can go back to change anything before saving.
        </Text>
      </View>

      <View style={styles.featureCard}>
        <Text style={styles.featureTitle}>Age</Text>
        <Text style={styles.featureDescription}>{formData.age || '—'}</Text>
      </View>

      <View style={[styles.featureCard, { marginTop: 12 }]}>
        <Text style={styles.featureTitle}>BMI</Text>
        <Text style={styles.featureDescription}>{formData.bmi ? `${formData.bmi} kg/m²` : '—'}</Text>
      </View>

      <View style={[styles.featureCard, { marginTop: 12 }]}>
        <Text style={styles.featureTitle}>Blood Pressure</Text>
        <Text style={styles.featureDescription}>
          {formData.bloodPressureSystolic && formData.bloodPressureDiastolic
            ? `${formData.bloodPressureSystolic}/${formData.bloodPressureDiastolic} mmHg`
            : '—'}
        </Text>
      </View>

      <View style={[styles.featureCard, { marginTop: 12 }]}>
        <Text style={styles.featureTitle}>Blood Glucose</Text>
        <Text style={styles.featureDescription}>{formData.bloodGlucose || '—'}</Text>
      </View>

      <View style={[styles.featureCard, { marginTop: 12 }]}>
        <Text style={styles.featureTitle}>HbA1c</Text>
        <Text style={styles.featureDescription}>{formData.hba1c || '—'}</Text>
      </View>

      <View style={[styles.featureCard, { marginTop: 12 }]}>
        <Text style={styles.featureTitle}>Cholesterol</Text>
        <Text style={styles.featureDescription}>{formData.cholesterol || '—'}</Text>
      </View>

      <View style={[styles.featureCard, { marginTop: 12 }]}>
        <Text style={styles.featureTitle}>Smoking</Text>
        <Text style={styles.featureDescription}>{formData.smoking || '—'}</Text>
      </View>

      <View style={[styles.featureCard, { marginTop: 12 }]}>
        <Text style={styles.featureTitle}>Physical Activity (min/week)</Text>
        <Text style={styles.featureDescription}>{formData.physicalActivityMinutes || '—'}</Text>
      </View>

      <View style={[styles.featureCard, { marginTop: 12 }]}>
        <Text style={styles.featureTitle}>Daily Steps</Text>
        <Text style={styles.featureDescription}>{formData.dailySteps || '—'}</Text>
      </View>

      <View style={[styles.featureCard, { marginTop: 12 }]}>
        <Text style={styles.featureTitle}>Hypertension</Text>
        <Text style={styles.featureDescription}>{formData.hypertension || '—'}</Text>
      </View>

      <View style={[styles.featureCard, { marginTop: 12 }]}>
        <Text style={styles.featureTitle}>Heart Disease History</Text>
        <Text style={styles.featureDescription}>{formData.heartDiseaseHistory || '—'}</Text>
      </View>
    </View>
  );

  const renderStepContent = () => {
    switch (currentStep) {
      case 'features':
        return renderFeatureOverview();
      case 'personal':
        return renderPersonalInfo();
      case 'lifestyle':
        return renderLifestyle();
      case 'medical':
        return renderMedical();
      case 'review':
        return renderReview();
      default:
        return null;
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            {currentStepIndex > 0 ? (
              <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                <Text style={styles.backText}>Back</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.backButton} />
            )}
            <Text style={styles.stepIndicator}>
              Step {currentStepIndex + 1} of {steps.length}
            </Text>
          </View>

          <View style={styles.progressBarContainer}>
            <View style={[styles.progressBar, { width: `${progress}%` }]} />
          </View>

          <Text style={styles.stepTitle}>{steps[currentStepIndex].title}</Text>
          <Text style={styles.stepDescription}>{steps[currentStepIndex].description}</Text>
        </View>

        {/* Content */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Math.max(insets.bottom, 20) },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {renderStepContent()}
        </ScrollView>

        {/* Footer */}
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
          <View style={styles.buttonRow}>
            {currentStepIndex > 0 && (
              <TouchableOpacity
                style={[styles.button, styles.buttonSecondary, { width: Math.min(width * 0.4, 180) }]}
                onPress={handleBack}
              >
                <Text style={styles.buttonSecondaryText}>Previous</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[
                styles.button,
                styles.buttonPrimary,
                {
                  flex: currentStepIndex === 0 ? 1 : undefined,
                  width:
                    currentStepIndex > 0 && currentStepIndex < steps.length - 1
                      ? Math.min(width * 0.5, 200)
                      : currentStepIndex === steps.length - 1
                      ? Math.min(width * 0.5, 200)
                      : Math.min(width * 0.9, 400),
                },
                !validateStep(currentStep) && styles.buttonDisabled,
              ]}
              onPress={handleNext}
              disabled={!validateStep(currentStep) || isLoading}
            >
              <LinearGradient
                colors={
                  !validateStep(currentStep)
                    ? [Colors.borderLight, Colors.borderLight]
                    : (Colors.gradient.primary as unknown as readonly [ColorValue, ColorValue, ...ColorValue[]])
                }
                style={styles.buttonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.buttonPrimaryText}>
                  {isLoading
                    ? 'Saving...'
                    : currentStepIndex === steps.length - 1
                    ? 'Save & Continue'
                    : 'Next'}
                </Text>
                {currentStepIndex < steps.length - 1 && (
                  <ChevronRight size={20} color={Colors.textWhite} style={{ marginLeft: 8 }} />
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

/* --------------------------- Styles (kept visually identical) --------------------------- */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  backText: {
    fontSize: 16,
    color: Colors.primary,
    fontWeight: '600' as const,
  },
  stepIndicator: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '600' as const,
  },
  progressBarContainer: {
    height: 4,
    backgroundColor: Colors.borderLight,
    borderRadius: 2,
    marginBottom: 16,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 4,
  },
  stepDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  stepContent: {
    width: '100%',
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
    marginLeft: 12,
    lineHeight: 20,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 8,
  },
  sublabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  required: {
    color: Colors.error,
  },
  optional: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '400' as const,
  },
  input: {
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
    paddingTop: 14,
  },
  helperText: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 6,
    lineHeight: 16,
  },
  featuresGrid: {
    gap: 12,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderRadius: 12,
    backgroundColor: Colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 12,
  },
  featureBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureBadgeText: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.primary,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  featureDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
    lineHeight: 20,
  },
  infoFooter: {
    marginTop: 24,
    padding: 16,
    borderRadius: 12,
    backgroundColor: Colors.primaryLight + '20',
  },
  infoFooterText: {
    fontSize: 14,
    color: Colors.primary,
    lineHeight: 20,
    textAlign: 'center',
    fontWeight: '600' as const,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  radioGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  radioButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.border,
    backgroundColor: Colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  radioButtonActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight + '20',
  },
  radioText: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: '500' as const,
    textAlign: 'center',
  },
  radioTextActive: {
    color: Colors.primary,
    fontWeight: '600' as const,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  button: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonPrimary: {
    minHeight: 52,
  },
  buttonSecondary: {
    backgroundColor: Colors.backgroundSecondary,
    borderWidth: 2,
    borderColor: Colors.border,
    minHeight: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonGradient: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPrimaryText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.textWhite,
  },
  buttonSecondaryText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
  },
});
