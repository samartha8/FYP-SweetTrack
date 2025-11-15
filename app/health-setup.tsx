import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ColorValue,
  Dimensions,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Heart, ChevronRight, Info } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '@/constants/colors';
import { useUser } from '@/contexts/UserContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type HealthFormData = {
  age: string;
  gender: string;
  height: string;
  weight: string;
  familyHistory: string;
  previousDiagnosis: string;
  currentMedication: string;
  physicalActivity: string;
  smoking: string;
  alcohol: string;
  fastingGlucose: string;
  bloodPressureSystolic: string;
  bloodPressureDiastolic: string;
};

type Step = 'personal' | 'lifestyle' | 'medical' | 'optional';

export default function HealthSetupScreen() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, updateUser, completeHealthSetup } = useUser();
  
  const [currentStep, setCurrentStep] = useState<Step>('personal');
  const [isLoading, setIsLoading] = useState(false);
  
  const [formData, setFormData] = useState<HealthFormData>({
    age: '',
    gender: '',
    height: '',
    weight: '',
    familyHistory: '',
    previousDiagnosis: '',
    currentMedication: '',
    physicalActivity: '',
    smoking: '',
    alcohol: '',
    fastingGlucose: '',
    bloodPressureSystolic: '',
    bloodPressureDiastolic: '',
  });

  const steps: { key: Step; title: string; description: string }[] = [
    { key: 'personal', title: 'Personal Information', description: 'Basic details for risk assessment' },
    { key: 'lifestyle', title: 'Lifestyle Factors', description: 'Daily habits and activity levels' },
    { key: 'medical', title: 'Medical History', description: 'Family history and previous diagnoses' },
    { key: 'optional', title: 'Optional Metrics', description: 'Recent test results (if available)' },
  ];

  const currentStepIndex = steps.findIndex(s => s.key === currentStep);
  const progress = ((currentStepIndex + 1) / steps.length) * 100;

  const updateField = (field: keyof HealthFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateStep = (step: Step): boolean => {
    switch (step) {
      case 'personal':
        return !!(formData.age && formData.gender && formData.height && formData.weight);
      case 'lifestyle':
        return !!(formData.physicalActivity && formData.smoking && formData.alcohol);
      case 'medical':
        return !!(formData.familyHistory && formData.previousDiagnosis);
      case 'optional':
        return true; // All fields optional
      default:
        return false;
    }
  };

  const calculateBMI = (height: number, weight: number): number => {
    if (height <= 0 || weight <= 0) return 0;
    const heightInMeters = height / 100;
    return Number((weight / (heightInMeters * heightInMeters)).toFixed(1));
  };

  const handleNext = () => {
    if (!validateStep(currentStep)) {
      return;
    }

    if (currentStep === 'personal') {
      setCurrentStep('lifestyle');
    } else if (currentStep === 'lifestyle') {
      setCurrentStep('medical');
    } else if (currentStep === 'medical') {
      setCurrentStep('optional');
    }
  };

  const handleBack = () => {
    if (currentStep === 'lifestyle') {
      setCurrentStep('personal');
    } else if (currentStep === 'medical') {
      setCurrentStep('lifestyle');
    } else if (currentStep === 'optional') {
      setCurrentStep('medical');
    }
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    
    const heightNum = parseFloat(formData.height);
    const weightNum = parseFloat(formData.weight);
    const bmi = calculateBMI(heightNum, weightNum);

    const userUpdates = {
      age: parseInt(formData.age),
      gender: formData.gender,
      height: heightNum,
      weight: weightNum,
      bmi,
      familyHistory: formData.familyHistory,
      previousDiagnosis: formData.previousDiagnosis,
      currentMedication: formData.currentMedication || undefined,
      physicalActivityDays: parseInt(formData.physicalActivity),
      smoking: formData.smoking,
      alcohol: formData.alcohol,
      fastingGlucose: formData.fastingGlucose ? parseFloat(formData.fastingGlucose) : undefined,
      bloodPressure: formData.bloodPressureSystolic && formData.bloodPressureDiastolic
        ? {
            systolic: parseInt(formData.bloodPressureSystolic),
            diastolic: parseInt(formData.bloodPressureDiastolic),
          }
        : undefined,
    };

    await updateUser(userUpdates);
    await completeHealthSetup();
    setIsLoading(false);
    
    router.replace('/(tabs)/home' as any);
  };

  const renderPersonalInfo = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Personal Information</Text>
      <Text style={styles.stepDescription}>Help us understand your basic health profile</Text>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Age *</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter your age"
          placeholderTextColor={Colors.textLight}
          value={formData.age}
          onChangeText={(value) => updateField('age', value)}
          keyboardType="numeric"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Gender *</Text>
        <View style={styles.radioGroup}>
          {['Male', 'Female', 'Other'].map((option) => (
            <TouchableOpacity
              key={option}
              style={[
                styles.radioOption,
                formData.gender === option && styles.radioOptionSelected,
              ]}
              onPress={() => updateField('gender', option)}
            >
              <Text
                style={[
                  styles.radioText,
                  formData.gender === option && styles.radioTextSelected,
                ]}
              >
                {option}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.inputRow}>
        <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
          <Text style={styles.label}>Height (cm) *</Text>
          <TextInput
            style={styles.input}
            placeholder="170"
            placeholderTextColor={Colors.textLight}
            value={formData.height}
            onChangeText={(value) => updateField('height', value)}
            keyboardType="numeric"
          />
        </View>
        <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
          <Text style={styles.label}>Weight (kg) *</Text>
          <TextInput
            style={styles.input}
            placeholder="70"
            placeholderTextColor={Colors.textLight}
            value={formData.weight}
            onChangeText={(value) => updateField('weight', value)}
            keyboardType="numeric"
          />
        </View>
      </View>

      {formData.height && formData.weight && (
        <View style={styles.bmiContainer}>
          <Text style={styles.bmiLabel}>
            BMI: {calculateBMI(parseFloat(formData.height), parseFloat(formData.weight))}
          </Text>
        </View>
      )}
    </View>
  );

  const renderLifestyle = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Lifestyle Factors</Text>
      <Text style={styles.stepDescription}>Tell us about your daily habits</Text>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Physical Activity (days per week) *</Text>
        <View style={styles.radioGroup}>
          {['0', '1-2', '3-4', '5-6', '7'].map((option) => (
            <TouchableOpacity
              key={option}
              style={[
                styles.radioOption,
                formData.physicalActivity === option && styles.radioOptionSelected,
              ]}
              onPress={() => updateField('physicalActivity', option)}
            >
              <Text
                style={[
                  styles.radioText,
                  formData.physicalActivity === option && styles.radioTextSelected,
                ]}
              >
                {option}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Smoking Habit *</Text>
        <View style={styles.radioGroup}>
          {['Never', 'Former', 'Current'].map((option) => (
            <TouchableOpacity
              key={option}
              style={[
                styles.radioOption,
                formData.smoking === option && styles.radioOptionSelected,
              ]}
              onPress={() => updateField('smoking', option)}
            >
              <Text
                style={[
                  styles.radioText,
                  formData.smoking === option && styles.radioTextSelected,
                ]}
              >
                {option}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Alcohol Consumption *</Text>
        <View style={styles.radioGroup}>
          {['Never', 'Occasional', 'Regular'].map((option) => (
            <TouchableOpacity
              key={option}
              style={[
                styles.radioOption,
                formData.alcohol === option && styles.radioOptionSelected,
              ]}
              onPress={() => updateField('alcohol', option)}
            >
              <Text
                style={[
                  styles.radioText,
                  formData.alcohol === option && styles.radioTextSelected,
                ]}
              >
                {option}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );

  const renderMedical = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Medical History</Text>
      <Text style={styles.stepDescription}>Help us understand your medical background</Text>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Family History of Diabetes *</Text>
        <View style={styles.radioGroup}>
          {['No', 'Yes - Parent', 'Yes - Sibling', 'Yes - Both'].map((option) => (
            <TouchableOpacity
              key={option}
              style={[
                styles.radioOption,
                formData.familyHistory === option && styles.radioOptionSelected,
              ]}
              onPress={() => updateField('familyHistory', option)}
            >
              <Text
                style={[
                  styles.radioText,
                  formData.familyHistory === option && styles.radioTextSelected,
                ]}
              >
                {option}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Previous Diagnosis *</Text>
        <View style={styles.radioGroup}>
          {['None', 'Pre-diabetes', 'Type 2 Diabetes', 'Type 1 Diabetes'].map((option) => (
            <TouchableOpacity
              key={option}
              style={[
                styles.radioOption,
                formData.previousDiagnosis === option && styles.radioOptionSelected,
              ]}
              onPress={() => updateField('previousDiagnosis', option)}
            >
              <Text
                style={[
                  styles.radioText,
                  formData.previousDiagnosis === option && styles.radioTextSelected,
                ]}
              >
                {option}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Current Medications (Optional)</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="List any current medications"
          placeholderTextColor={Colors.textLight}
          value={formData.currentMedication}
          onChangeText={(value) => updateField('currentMedication', value)}
          multiline
          numberOfLines={3}
        />
      </View>
    </View>
  );

  const renderOptional = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Optional Metrics</Text>
      <Text style={styles.stepDescription}>Recent test results (if available)</Text>

      <View style={styles.infoBox}>
        <Info size={20} color={Colors.primary} strokeWidth={2} />
        <Text style={styles.infoText}>
          These fields are optional. You can skip them if you don&apos;t have recent test results.
        </Text>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Fasting Glucose (mg/dL)</Text>
        <TextInput
          style={styles.input}
          placeholder="Normal: 70-100 mg/dL"
          placeholderTextColor={Colors.textLight}
          value={formData.fastingGlucose}
          onChangeText={(value) => updateField('fastingGlucose', value)}
          keyboardType="numeric"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Blood Pressure</Text>
        <View style={styles.inputRow}>
          <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
            <Text style={styles.label}>Systolic (top)</Text>
            <TextInput
              style={styles.input}
              placeholder="120"
              placeholderTextColor={Colors.textLight}
              value={formData.bloodPressureSystolic}
              onChangeText={(value) => updateField('bloodPressureSystolic', value)}
              keyboardType="numeric"
            />
          </View>
          <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
            <Text style={styles.label}>Diastolic (bottom)</Text>
            <TextInput
              style={styles.input}
              placeholder="80"
              placeholderTextColor={Colors.textLight}
              value={formData.bloodPressureDiastolic}
              onChangeText={(value) => updateField('bloodPressureDiastolic', value)}
              keyboardType="numeric"
            />
          </View>
        </View>
      </View>
    </View>
  );

  const renderStepContent = () => {
    switch (currentStep) {
      case 'personal':
        return renderPersonalInfo();
      case 'lifestyle':
        return renderLifestyle();
      case 'medical':
        return renderMedical();
      case 'optional':
        return renderOptional();
      default:
        return null;
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Health Setup</Text>
        <View style={{ width: 60 }} />
      </View>

      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
        <Text style={styles.progressText}>
          Step {currentStepIndex + 1} of {steps.length}
        </Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {renderStepContent()}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        {currentStepIndex > 0 && (
          <TouchableOpacity style={styles.backButtonFooter} onPress={handleBack}>
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[
            styles.nextButton,
            !validateStep(currentStep) && styles.nextButtonDisabled,
          ]}
          onPress={currentStep === 'optional' ? handleSubmit : handleNext}
          disabled={!validateStep(currentStep) || isLoading}
        >
          <LinearGradient
            colors={
              Colors.gradient.primary as unknown as readonly [ColorValue, ColorValue, ...ColorValue[]]
            }
            style={styles.nextButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={styles.nextButtonText}>
              {isLoading
                ? 'Saving...'
                : currentStep === 'optional'
                ? 'Complete Setup'
                : 'Next'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    fontSize: 16,
    color: Colors.primary,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
  },
  progressContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  progressBar: {
    height: 8,
    backgroundColor: Colors.borderLight,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  stepContainer: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
  },
  stepDescription: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginBottom: 32,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  input: {
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  inputRow: {
    flexDirection: 'row',
  },
  radioGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  radioOption: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: Colors.backgroundSecondary,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  radioOptionSelected: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
  },
  radioText: {
    fontSize: 16,
    color: Colors.text,
    fontWeight: '500',
  },
  radioTextSelected: {
    color: Colors.primary,
    fontWeight: '700',
  },
  bmiContainer: {
    marginTop: 16,
    padding: 16,
    backgroundColor: Colors.primaryLight,
    borderRadius: 12,
  },
  bmiLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary,
    textAlign: 'center',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    backgroundColor: Colors.primaryLight,
    borderRadius: 12,
    marginBottom: 24,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  backButtonFooter: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  nextButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  nextButtonDisabled: {
    opacity: 0.5,
  },
  nextButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textWhite,
  },
});