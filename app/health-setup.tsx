import Colors from '@/constants/colors';
import { useUser } from '@/contexts/UserContext';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { ChevronRight, Info } from 'lucide-react-native';
import { HEALTH_URL, DIABETES_URL } from '../constants/Api';
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
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from '@/hooks/use-translation';


type HealthFormData = {
  // Personal Info
  age: string;              // Age category (1-13)
  sex: string;              // Gender (0=Female, 1=Male)
  height: string;           // cm - for BMI calculation
  weight: string;           // kg - for BMI calculation
  bmi?: string;             // Computed or manual (12-98)
  pregnancies?: string;     // Number of pregnancies (0-20)

  // Medical Measurements
  highBP: string;           // High blood pressure (0/1)
  highChol: string;         // High cholesterol (0/1)
  genHlth: string;          // General health (1-5)

  // Lifestyle
  smoker: string;           // Smoking history (0/1)
  physActivity: string;     // Physical activity (0/1)

  // Medical History
  heartDiseaseOrAttack: string; // Heart disease/MI history (0/1)

  // Engineered Features (auto-calculated or manual)
  hba1cEstimated?: string;      // Estimated HbA1c (3.5-15.0)
  bloodGlucoseEstimated?: string; // Estimated glucose (70-300)
};

type Step = 'features' | 'personal' | 'lifestyle' | 'medical' | 'review';

const getFeatureHighlights = (t: any) => [
  { title: t.healthSetup.fields.bmi, description: 'Automatically calculated from height and weight. Range: 12-98.' },
  { title: t.healthSetup.fields.age, description: 'Age groups from 18-24 to 80+. Used for age-adjusted risk scoring.' },
  { title: t.healthSetup.fields.highBP, description: t.healthSetup.fields.highBPDesc },
  { title: t.healthSetup.fields.highChol, description: t.healthSetup.fields.highCholDesc },
  { title: t.healthSetup.fields.smoker, description: t.healthSetup.fields.smokerDesc },
  { title: t.healthSetup.fields.physActivity, description: t.healthSetup.fields.physActivityDesc },
  { title: t.healthSetup.fields.heartDisease, description: t.healthSetup.fields.heartDiseaseDesc },
  { title: t.healthSetup.fields.genHlth, description: t.healthSetup.fields.genHlthDesc },
  { title: t.healthSetup.fields.sex, description: 'Biological sex for demographic analysis (Male/Female).' },
  { title: t.healthSetup.fields.hba1c, description: 'Estimated 3-month average blood sugar (auto-calculated or manual entry).' },
  { title: t.healthSetup.fields.glucose, description: 'Estimated fasting blood glucose (auto-calculated or manual entry).' },
];

export default function HealthSetupScreen() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, updateUser, completeHealthSetup, ensureAccessToken } = useUser();
  const { t } = useTranslation();

  const [currentStep, setCurrentStep] = useState<Step>('features');
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState<HealthFormData>({
    age: '',
    sex: '',
    height: '',
    weight: '',
    bmi: '',
    highBP: '',
    highChol: '',
    genHlth: '',
    smoker: '',
    physActivity: '',
    heartDiseaseOrAttack: '',
    hba1cEstimated: '',
    bloodGlucoseEstimated: '',
    pregnancies: '0',
  });

  const steps: { key: Step; title: string; description: string }[] = [
    { key: 'features', title: t.healthSetup.steps.features, description: t.healthSetup.steps.featuresDesc },
    { key: 'personal', title: t.healthSetup.steps.personal, description: t.healthSetup.steps.personalDesc },
    { key: 'lifestyle', title: t.healthSetup.steps.lifestyle, description: t.healthSetup.steps.lifestyleDesc },
    { key: 'medical', title: t.healthSetup.steps.medical, description: t.healthSetup.steps.medicalDesc },
    { key: 'review', title: t.healthSetup.steps.review, description: t.healthSetup.steps.reviewDesc },
  ];

  const currentStepIndex = steps.findIndex(s => s.key === currentStep);
  const progress = ((currentStepIndex + 1) / steps.length) * 100;

  const updateField = (field: keyof HealthFormData, value: string) => {
    setFormData(prev => {
      const next = { ...prev, [field]: value };

      // Calculate BMI if height or weight change
      if (field === 'height' || field === 'weight') {
        const h = parseFloat(field === 'height' ? value : next.height || '0');
        const w = parseFloat(field === 'weight' ? value : next.weight || '0');

        if (!Number.isNaN(h) && !Number.isNaN(w) && h > 0 && w > 0) {
          const hMeters = h / 100;
          const bmiVal = Number((w / (hMeters * hMeters)).toFixed(1));
          next.bmi = bmiVal.toString();
        } else {
          next.bmi = '';
        }
      }

      // Auto-calculate HbA1c_estimated if all required fields are present
      if (['bmi', 'age', 'genHlth', 'highChol', 'highBP'].includes(field) || field === 'height' || field === 'weight') {
        const bmi = parseFloat(next.bmi || '0');
        const age = parseFloat(next.age || '0');
        const genHlth = parseFloat(next.genHlth || '0');
        const highChol = parseFloat(next.highChol || '0');
        const highBP = parseFloat(next.highBP || '0');

        if (bmi > 0 && age > 0 && genHlth > 0) {
          const hba1c = 4.5 + (bmi - 25) * 0.03 + (age - 7) * 0.15 + genHlth * 0.4 + highChol * 0.8 + highBP * 0.6;
          const clampedHba1c = Math.max(3.5, Math.min(15.0, hba1c));
          next.hba1cEstimated = clampedHba1c.toFixed(2);
        }
      }

      // Auto-calculate BloodGlucose_estimated if all required fields are present
      if (['bmi', 'age', 'genHlth', 'highChol', 'highBP'].includes(field) || field === 'height' || field === 'weight') {
        const bmi = parseFloat(next.bmi || '0');
        const age = parseFloat(next.age || '0');
        const genHlth = parseFloat(next.genHlth || '0');
        const highChol = parseFloat(next.highChol || '0');
        const highBP = parseFloat(next.highBP || '0');

        if (bmi > 0 && age > 0 && genHlth > 0) {
          const glucose = 85 + (bmi - 25) * 1.2 + (age - 7) * 3.0 + genHlth * 8 + highChol * 15 + highBP * 12;
          const clampedGlucose = Math.max(70, Math.min(300, glucose));
          next.bloodGlucoseEstimated = clampedGlucose.toFixed(1);
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
        // Require age (1-13), sex (0/1), and BMI (via height/weight)
        const ageNum = parseInt(formData.age);
        const sexNum = parseInt(formData.sex);
        const bmiNum = parseFloat(formData.bmi || '0');
        return !!(
          formData.age && ageNum >= 1 && ageNum <= 13 &&
          formData.sex && (sexNum === 0 || sexNum === 1) &&
          ((formData.height && formData.weight) || (bmiNum >= 12 && bmiNum <= 98)) &&
          (sexNum === 1 || (formData.pregnancies !== undefined && parseInt(formData.pregnancies) >= 0))
        );
      case 'lifestyle':
        // Require smoker (0/1), physActivity (0/1)
        const smokerNum = parseInt(formData.smoker);
        const physActivityNum = parseInt(formData.physActivity);
        return !!(
          formData.smoker && (smokerNum === 0 || smokerNum === 1) &&
          formData.physActivity && (physActivityNum === 0 || physActivityNum === 1)
        );
      case 'medical':
        // Require highBP, highChol, genHlth, heartDiseaseOrAttack
        const highBPNum = parseInt(formData.highBP);
        const highCholNum = parseInt(formData.highChol);
        const genHlthNum = parseInt(formData.genHlth);
        const heartNum = parseInt(formData.heartDiseaseOrAttack);
        return !!(
          formData.highBP && (highBPNum === 0 || highBPNum === 1) &&
          formData.highChol && (highCholNum === 0 || highCholNum === 1) &&
          formData.genHlth && genHlthNum >= 1 && genHlthNum <= 5 &&
          formData.heartDiseaseOrAttack && (heartNum === 0 || heartNum === 1)
        );
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
      const heightNum = formData.height ? parseFloat(formData.height) : undefined;
      const weightNum = formData.weight ? parseFloat(formData.weight) : undefined;
      const bmiNum = formData.bmi ? parseFloat(formData.bmi) : undefined;

      const healthData = {
        // Personal
        age: formData.age ? parseInt(formData.age, 10) : undefined,
        sex: formData.sex ? parseInt(formData.sex, 10) : undefined,
        height: heightNum,
        weight: weightNum,
        bmi: bmiNum,

        // Medical
        highBP: formData.highBP ? parseInt(formData.highBP, 10) : undefined,
        highChol: formData.highChol ? parseInt(formData.highChol, 10) : undefined,
        genHlth: formData.genHlth ? parseInt(formData.genHlth, 10) : undefined,

        // Lifestyle
        smoker: formData.smoker ? parseInt(formData.smoker, 10) : undefined,
        physActivity: formData.physActivity ? parseInt(formData.physActivity, 10) : undefined,

        // Medical History
        heartDiseaseOrAttack: formData.heartDiseaseOrAttack ? parseInt(formData.heartDiseaseOrAttack, 10) : undefined,

        // Engineered
        hba1cEstimated: formData.hba1cEstimated ? parseFloat(formData.hba1cEstimated) : undefined,
        bloodGlucoseEstimated: formData.bloodGlucoseEstimated ? parseFloat(formData.bloodGlucoseEstimated) : undefined,
        pregnancies: formData.sex === '0' ? parseInt(formData.pregnancies || '0', 10) : 0,
      };

      // 1. Save to Backend (Crucial for persistence)
      console.log("🚀 [HealthSetup] SUBMITTING CLEAN DATA:", JSON.stringify(healthData, null, 2));
      try {
        const token = await ensureAccessToken();
        const saveRes = await fetch(HEALTH_URL, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token || ''}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(healthData)
        });

        const saveJson = await saveRes.json();
        if (!saveRes.ok) {
          console.error("Backend save failed:", saveJson);
          // We continue anyway so user isn't stuck, but log it
        } else {
          console.log("Backend save success:", saveJson);
        }
      } catch (saveError) {
        console.error("Network error saving to backend:", saveError);
      }

      // 2. Update Local Context
      if (user) {
        await updateUser(healthData as any);
      }

      await completeHealthSetup();

      // 3. Trigger initial prediction
      try {
        console.log("Attempting initial prediction with data:", JSON.stringify(healthData, null, 2));
        const token = await ensureAccessToken();
        
        // Only send what we actually collected. 
        // We'll let the backend/python script handle the feature padding/normalization.
        const res = await fetch(`${DIABETES_URL}/predict`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token || ''}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(healthData)
        });

        const resJson = await res.json();
        console.log("Initial Prediction Result:", resJson);

        if (resJson.success) {
          // Optional: Show a toast or small alert that analysis is ready
        }
      } catch (e) {
        console.error("Initial prediction failed:", e);
      }

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
          {t.healthSetup.description}
        </Text>
      </View>

      <View style={styles.featuresGrid}>
        {getFeatureHighlights(t).map((feature, index) => (
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
          {t.healthSetup.description}
        </Text>
      </View>
    </View>
  );

  const renderPersonalInfo = () => (
    <View style={styles.stepContent}>
      <View style={styles.infoCard}>
        <Info size={20} color={Colors.primary} />
        <Text style={styles.infoText}>
          Provide your age group, gender, and body measurements for BMI calculation.
        </Text>
      </View>

      {/* Age Category */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>{t.healthSetup.fields.age} <Text style={styles.required}>*</Text></Text>
        <Text style={styles.sublabel}>{t.healthSetup.fields.ageDesc}</Text>
        <View style={styles.radioGroup}>
          {[
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
          ].map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.radioButton,
                formData.age === option.value && styles.radioButtonActive,
              ]}
              onPress={() => updateField('age', option.value)}
            >
              <Text
                style={[
                  styles.radioText,
                  formData.age === option.value && styles.radioTextActive,
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Gender */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>{t.healthSetup.fields.sex} <Text style={styles.required}>*</Text></Text>
        <View style={styles.radioGroup}>
          {[
            { value: '0', label: t.healthSetup.fields.female },
            { value: '1', label: t.healthSetup.fields.male },
          ].map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.radioButton,
                formData.sex === option.value && styles.radioButtonActive,
                { flex: 1 }
              ]}
              onPress={() => updateField('sex', option.value)}
            >
              <Text
                style={[
                  styles.radioText,
                  formData.sex === option.value && styles.radioTextActive,
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Pregnancies (Conditional for Female) */}
      {formData.sex === '0' && (
        <View style={styles.inputGroup}>
          <Text style={styles.label}>{t.healthSetup.fields.pregnancies} <Text style={styles.required}>*</Text></Text>
          <Text style={styles.sublabel}>{t.healthSetup.fields.pregnanciesDesc}</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., 0, 1, 2"
            placeholderTextColor={Colors.textLight}
            value={formData.pregnancies}
            onChangeText={(text) => updateField('pregnancies', text.replace(/[^0-9]/g, ''))}
            keyboardType="number-pad"
            maxLength={2}
          />
          <Text style={styles.helperText}>{t.healthSetup.fields.pregnanciesDesc}</Text>
        </View>
      )}

      {/* Height and Weight */}
      <View style={styles.row}>
        <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
          <Text style={styles.label}>{t.healthSetup.fields.height} <Text style={styles.required}>*</Text></Text>
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
          <Text style={styles.label}>{t.healthSetup.fields.weight} <Text style={styles.required}>*</Text></Text>
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

      {/* BMI Display */}
      {formData.bmi && (
        <View style={styles.inputGroup}>
          <Text style={styles.label}>{t.healthSetup.fields.bmi}</Text>
          <View style={[styles.input, { backgroundColor: Colors.primaryLight + '20', borderColor: Colors.primary }]}>
            <Text style={{ fontSize: 16, color: Colors.text, fontWeight: '700' }}>
              {formData.bmi}
            </Text>
          </View>
          <Text style={styles.helperText}>
            {parseFloat(formData.bmi) < 18.5 ? 'Underweight' :
              parseFloat(formData.bmi) < 25 ? 'Normal weight' :
                parseFloat(formData.bmi) < 30 ? 'Overweight' : 'Obese'}
          </Text>
        </View>
      )}
    </View>
  );

  const renderLifestyle = () => (
    <View style={styles.stepContent}>
      <View style={styles.infoCard}>
        <Info size={20} color={Colors.primary} />
        <Text style={styles.infoText}>
          Lifestyle factors like smoking and physical activity affect diabetes risk.
        </Text>
      </View>

      {/* Smoking History */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>{t.healthSetup.fields.smoker} <Text style={styles.required}>*</Text></Text>
        <Text style={styles.sublabel}>{t.healthSetup.fields.smokerDesc}</Text>
        <View style={styles.radioGroup}>
          {[
            { value: '0', label: t.healthSetup.no },
            { value: '1', label: t.healthSetup.yes },
          ].map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.radioButton,
                formData.smoker === option.value && styles.radioButtonActive,
                { flex: 1 }
              ]}
              onPress={() => updateField('smoker', option.value)}
            >
              <Text
                style={[
                  styles.radioText,
                  formData.smoker === option.value && styles.radioTextActive,
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.helperText}>
          100 cigarettes = 5 packs
        </Text>
      </View>

      {/* Physical Activity */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>{t.healthSetup.fields.physActivity} <Text style={styles.required}>*</Text></Text>
        <Text style={styles.sublabel}>
          {t.healthSetup.fields.physActivityDesc}
        </Text>
        <View style={styles.radioGroup}>
          {[
            { value: '0', label: t.healthSetup.no },
            { value: '1', label: t.healthSetup.yes },
          ].map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.radioButton,
                formData.physActivity === option.value && styles.radioButtonActive,
                { flex: 1 }
              ]}
              onPress={() => updateField('physActivity', option.value)}
            >
              <Text
                style={[
                  styles.radioText,
                  formData.physActivity === option.value && styles.radioTextActive,
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.helperText}>
          Examples: running, walking, gardening, sports
        </Text>
      </View>
    </View>
  );

  const renderMedical = () => (
    <View style={styles.stepContent}>
      <View style={styles.infoCard}>
        <Info size={20} color={Colors.primary} />
        <Text style={styles.infoText}>
          Medical measurements and history for comprehensive diabetes risk assessment.
        </Text>
      </View>

      {/* High Blood Pressure */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>{t.healthSetup.fields.highBP} <Text style={styles.required}>*</Text></Text>
        <Text style={styles.sublabel}>{t.healthSetup.fields.highBPDesc}</Text>
        <View style={styles.radioGroup}>
          {[
            { value: '0', label: t.healthSetup.no },
            { value: '1', label: t.healthSetup.yes },
          ].map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.radioButton,
                formData.highBP === option.value && styles.radioButtonActive,
                { flex: 1 }
              ]}
              onPress={() => updateField('highBP', option.value)}
            >
              <Text
                style={[
                  styles.radioText,
                  formData.highBP === option.value && styles.radioTextActive,
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* High Cholesterol */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>{t.healthSetup.fields.highChol} <Text style={styles.required}>*</Text></Text>
        <Text style={styles.sublabel}>{t.healthSetup.fields.highCholDesc}</Text>
        <View style={styles.radioGroup}>
          {[
            { value: '0', label: t.healthSetup.no },
            { value: '1', label: t.healthSetup.yes },
          ].map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.radioButton,
                formData.highChol === option.value && styles.radioButtonActive,
                { flex: 1 }
              ]}
              onPress={() => updateField('highChol', option.value)}
            >
              <Text
                style={[
                  styles.radioText,
                  formData.highChol === option.value && styles.radioTextActive,
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* General Health */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>{t.healthSetup.fields.genHlth} <Text style={styles.required}>*</Text></Text>
        <Text style={styles.sublabel}>{t.healthSetup.fields.genHlthDesc}</Text>
        <View style={styles.radioGroup}>
          {[
            { value: '1', label: t.healthSetup.genHlthLevels[1] },
            { value: '2', label: t.healthSetup.genHlthLevels[2] },
            { value: '3', label: t.healthSetup.genHlthLevels[3] },
            { value: '4', label: t.healthSetup.genHlthLevels[4] },
            { value: '5', label: t.healthSetup.genHlthLevels[5] },
          ].map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.radioButton,
                formData.genHlth === option.value && styles.radioButtonActive,
              ]}
              onPress={() => updateField('genHlth', option.value)}
            >
              <Text
                style={[
                  styles.radioText,
                  formData.genHlth === option.value && styles.radioTextActive,
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Heart Disease History */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>{t.healthSetup.fields.heartDisease} <Text style={styles.required}>*</Text></Text>
        <Text style={styles.sublabel}>
          {t.healthSetup.fields.heartDiseaseDesc}
        </Text>
        <View style={styles.radioGroup}>
          {[
            { value: '0', label: t.healthSetup.no },
            { value: '1', label: t.healthSetup.yes },
          ].map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.radioButton,
                formData.heartDiseaseOrAttack === option.value && styles.radioButtonActive,
                { flex: 1 }
              ]}
              onPress={() => updateField('heartDiseaseOrAttack', option.value)}
            >
              <Text
                style={[
                  styles.radioText,
                  formData.heartDiseaseOrAttack === option.value && styles.radioTextActive,
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* HbA1c Estimated (Auto-calculated) */}
      {formData.hba1cEstimated && (
        <View style={styles.inputGroup}>
          <Text style={styles.label}>{t.healthSetup.fields.hba1c} <Text style={styles.optional}>(Auto-calculated)</Text></Text>
          <View style={[styles.input, { backgroundColor: Colors.primaryLight + '20', borderColor: Colors.primary }]}>
            <Text style={{ fontSize: 16, color: Colors.text, fontWeight: '700' }}>
              {parseFloat(formData.hba1cEstimated).toFixed(2)}%
            </Text>
          </View>
          <Text style={styles.helperText}>
            {parseFloat(formData.hba1cEstimated) < 5.7 ? 'Normal (< 5.7%)' :
              parseFloat(formData.hba1cEstimated) < 6.5 ? 'Prediabetes (5.7-6.4%)' :
                'Diabetes risk (≥ 6.5%)'}
          </Text>
        </View>
      )}

      {/* Blood Glucose Estimated (Auto-calculated) */}
      {formData.bloodGlucoseEstimated && (
        <View style={styles.inputGroup}>
          <Text style={styles.label}>{t.healthSetup.fields.glucose} <Text style={styles.optional}>(Auto-calculated)</Text></Text>
          <View style={[styles.input, { backgroundColor: Colors.primaryLight + '20', borderColor: Colors.primary }]}>
            <Text style={{ fontSize: 16, color: Colors.text, fontWeight: '700' }}>
              {parseFloat(formData.bloodGlucoseEstimated).toFixed(1)} mg/dL
            </Text>
          </View>
          <Text style={styles.helperText}>
            {parseFloat(formData.bloodGlucoseEstimated) < 100 ? 'Normal (< 100 mg/dL)' :
              parseFloat(formData.bloodGlucoseEstimated) < 126 ? 'Prediabetes (100-125 mg/dL)' :
                'Diabetes risk (≥ 126 mg/dL)'}
          </Text>
        </View>
      )}
    </View>
  );

  const renderReview = () => {
    const ageLabels: { [key: string]: string } = {
      '1': '18-24', '2': '25-29', '3': '30-34', '4': '35-39',
      '5': '40-44', '6': '45-49', '7': '50-54', '8': '55-59',
      '9': '60-64', '10': '65-69', '11': '70-74', '12': '75-79', '13': '80+'
    };

    const genHlthLabels: { [key: string]: string } = {
      '1': 'Excellent', '2': 'Very Good', '3': 'Good', '4': 'Fair', '5': 'Poor'
    };

    return (
      <View style={styles.stepContent}>
        <View style={styles.infoCard}>
          <Info size={20} color={Colors.primary} />
          <Text style={styles.infoText}>
            {t.healthSetup.steps.reviewDesc}
          </Text>
        </View>

        {/* Personal Info Summary */}
        <View style={[styles.featureCard, { marginBottom: 16 }]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.featureTitle}>{t.healthSetup.steps.personal}</Text>
            <Text style={styles.featureDescription}>
              {t.healthSetup.fields.age}: {formData.age}
            </Text>
            <Text style={styles.featureDescription}>
              {t.healthSetup.fields.sex}: {formData.sex === '0' ? t.healthSetup.fields.female : t.healthSetup.fields.male}
            </Text>
            <Text style={styles.featureDescription}>
              {t.healthSetup.fields.bmi}: {formData.bmi}
            </Text>
            {formData.sex === '0' && (
              <Text style={styles.featureDescription}>
                {t.healthSetup.fields.pregnancies}: {formData.pregnancies || '0'}
              </Text>
            )}
          </View>
        </View>

        {/* Lifestyle Summary */}
        <View style={[styles.featureCard, { marginBottom: 16 }]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.featureTitle}>{t.healthSetup.steps.lifestyle}</Text>
            <Text style={styles.featureDescription}>
              {t.healthSetup.fields.smoker}: {formData.smoker === '1' ? t.healthSetup.yes : t.healthSetup.no}
            </Text>
            <Text style={styles.featureDescription}>
              {t.healthSetup.fields.physActivity}: {formData.physActivity === '1' ? t.healthSetup.yes : t.healthSetup.no}
            </Text>
          </View>
        </View>

        {/* Medical Summary */}
        <View style={[styles.featureCard, { marginBottom: 16 }]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.featureTitle}>{t.healthSetup.steps.medical}</Text>
            <Text style={styles.featureDescription}>
              {t.healthSetup.fields.highBP}: {formData.highBP === '1' ? t.healthSetup.yes : t.healthSetup.no}
            </Text>
            <Text style={styles.featureDescription}>
              {t.healthSetup.fields.highChol}: {formData.highChol === '1' ? t.healthSetup.yes : t.healthSetup.no}
            </Text>
            <Text style={styles.featureDescription}>
              {t.healthSetup.fields.genHlth}: {t.healthSetup.genHlthLevels[formData.genHlth as unknown as 1 | 2 | 3 | 4 | 5] || formData.genHlth}
            </Text>
            <Text style={styles.featureDescription}>
              {t.healthSetup.fields.heartDisease}: {formData.heartDiseaseOrAttack === '1' ? t.healthSetup.yes : t.healthSetup.no}
            </Text>
            {formData.hba1cEstimated && (
              <Text style={styles.featureDescription}>
                {t.healthSetup.fields.hba1c}: {parseFloat(formData.hba1cEstimated).toFixed(2)}%
              </Text>
            )}
            {formData.bloodGlucoseEstimated && (
              <Text style={styles.featureDescription}>
                {t.healthSetup.fields.glucose}: {parseFloat(formData.bloodGlucoseEstimated).toFixed(1)} mg/dL
              </Text>
            )}
          </View>
        </View>
      </View>
    );
  };

  /* --- Main render --- */

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBack}
            disabled={currentStep === 'features'}
          >
            {currentStep !== 'features' && (
              <Text style={styles.backText}>← {t.healthSetup.back}</Text>
            )}
          </TouchableOpacity>
          <Text style={styles.stepIndicator}>
            {t.healthSetup.step} {currentStepIndex + 1} {t.healthSetup.of} {steps.length}
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
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {currentStep === 'features' && renderFeatureOverview()}
        {currentStep === 'personal' && renderPersonalInfo()}
        {currentStep === 'lifestyle' && renderLifestyle()}
        {currentStep === 'medical' && renderMedical()}
        {currentStep === 'review' && renderReview()}
      </ScrollView>

      {/* Footer */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[
              styles.button,
              styles.buttonPrimary,
              { flex: 1 },
              (!validateStep(currentStep) || isLoading) && styles.buttonDisabled,
            ]}
            onPress={handleNext}
            disabled={!validateStep(currentStep) || isLoading}
          >
            <LinearGradient
              colors={[Colors.primary, Colors.primaryDark]}
              style={styles.buttonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {isLoading ? (
                <>
                  <ActivityIndicator size="small" color={Colors.textWhite} style={{ marginRight: 8 }} />
                  <Text style={styles.buttonPrimaryText}>{t.healthSetup.saving}</Text>
                </>
              ) : (
                <>
                  <Text style={styles.buttonPrimaryText}>
                    {currentStep === 'review' ? t.healthSetup.submit : t.healthSetup.continue}
                  </Text>
                  <ChevronRight size={20} color={Colors.textWhite} />
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
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