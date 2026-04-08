import Colors from '@/constants/colors';
import { useUser } from '@/contexts/UserContext';
import { fontSize, getIconSize, getResponsivePadding, hp, isTablet, scaleSize } from '@/utils/responsive';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Eye, EyeOff, Heart, Lock, Mail, User } from 'lucide-react-native';
import { useState } from 'react';
import { ColorValue, Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useTranslation } from '@/hooks/use-translation';
import LanguageSelector from '@/components/LanguageSelector';

export default function SignupScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const router = useRouter();
  const { signup } = useUser();
  const { t } = useTranslation();

  const validateEmail = (email: string) => /\S+@\S+\.\S+/.test(email);
  const validatePassword = (password: string) => password.length >= 6;

  const handleSignup = async () => {
    setErrorMsg('');

    if (!name || !email || !password || !confirmPassword) {
      setErrorMsg(t.auth.errorMissing);
      return;
    }

    if (!validateEmail(email)) {
      setErrorMsg(t.auth.errorInvalidEmail);
      return;
    }

    if (!validatePassword(password)) {
      setErrorMsg(t.auth.errorPasswordLength);
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg(t.auth.errorMismatch);
      return;
    }

    setIsLoading(true);

    try {
      const result = await signup(name, email, password);
      setIsLoading(false);

      if (!result.success) {
        setErrorMsg(result.message || t.auth.errorSignupFailed);
        return;
      }

      router.replace('/health-setup' as any);
    } catch (err) {
      setIsLoading(false);
      setErrorMsg(t.auth.errorSignupFailed);
      console.error('Signup error:', err);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <LanguageSelector />
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Image
              source={require('@/assets/branding/logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.title}>{t.auth.signup}</Text>
          <Text style={styles.subtitle}>{t.auth.subtitle}</Text>
        </View>

        <View style={styles.form}>
          {errorMsg ? <Text style={{ color: 'red', marginBottom: 8 }}>{errorMsg}</Text> : null}

          <View style={styles.inputContainer}>
            <User size={getIconSize(20)} color={Colors.textSecondary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder={t.auth.fullName}
              placeholderTextColor={Colors.textLight}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.inputContainer}>
            <Mail size={getIconSize(20)} color={Colors.textSecondary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder={t.auth.email}
              placeholderTextColor={Colors.textLight}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputContainer}>
            <Lock size={getIconSize(20)} color={Colors.textSecondary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder={t.auth.password}
              placeholderTextColor={Colors.textLight}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={styles.eyeIcon}
            >
              {showPassword ? (
                <EyeOff size={getIconSize(20)} color={Colors.textSecondary} />
              ) : (
                <Eye size={getIconSize(20)} color={Colors.textSecondary} />
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.inputContainer}>
            <Lock size={getIconSize(20)} color={Colors.textSecondary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder={t.auth.confirmPassword}
              placeholderTextColor={Colors.textLight}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirmPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              style={styles.eyeIcon}
            >
              {showConfirmPassword ? (
                <EyeOff size={getIconSize(20)} color={Colors.textSecondary} />
              ) : (
                <Eye size={getIconSize(20)} color={Colors.textSecondary} />
              )}
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.signupButton} onPress={handleSignup} disabled={isLoading}>
            <LinearGradient
              colors={Colors.gradient.primary as any}
              style={styles.signupButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.signupButtonText}>
                {isLoading ? t.auth.creatingAccount : t.auth.signup}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={styles.loginButton} onPress={() => router.replace('/login' as any)}>
            <Text style={styles.loginButtonText}>{t.auth.alreadyHaveAccount}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// Keep your existing styles unchanged
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 30,
    paddingVertical: 60,
    maxWidth: isTablet() ? 600 : '100%',
    alignSelf: 'center',
    width: '100%',
  },
  header: { alignItems: 'center', marginBottom: 40 },
  logoContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  },
  logo: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  title: { fontSize: 34, fontWeight: '800' as const, color: Colors.text, marginBottom: 8, letterSpacing: -0.5, textAlign: 'center' },
  subtitle: { fontSize: 16, color: Colors.textSecondary, textAlign: 'center', opacity: 0.8 },
  form: { width: '100%', marginTop: 10 },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    paddingHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: '#F1F5F9',
    minHeight: 56,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 2,
  },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, paddingVertical: 18, fontSize: 16, color: Colors.text },
  eyeIcon: { padding: 8 },
  signupButton: { borderRadius: 16, overflow: 'hidden', marginTop: 12, shadowColor: Colors.gradient.primary[0], shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8 },
  signupButtonGradient: { paddingVertical: 18, alignItems: 'center', justifyContent: 'center', minHeight: 56 },
  signupButtonText: { fontSize: 17, fontWeight: '700' as const, color: Colors.textWhite, letterSpacing: 0.5 },
  loginButton: { paddingVertical: 18, alignItems: 'center', marginTop: 20 },
  loginButtonText: { fontSize: 15, color: Colors.gradient.primary[0], fontWeight: '600' as const },
});
