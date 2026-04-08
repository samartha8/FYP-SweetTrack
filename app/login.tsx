import Colors from '@/constants/colors';
import { User, useUser } from '@/contexts/UserContext';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Eye, EyeOff, Heart, Lock, Mail } from 'lucide-react-native';
import { useState } from 'react';
import { ColorValue, Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useTranslation } from '@/hooks/use-translation';
import LanguageSelector from '@/components/LanguageSelector';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const router = useRouter();
  const { login, signInWithGoogle, hasHealthSetup, user } = useUser();
  const { t } = useTranslation();

  const handleLogin = async () => {
    setErrorMsg('');
    if (!email || !password) {
      setErrorMsg(t.auth.errorMissing);
      return;
    }

    setIsLoading(true);
    try {
      const result = await login(email, password); // calls your backend
      setIsLoading(false);

      if (result.success) {
        // Returning users go directly to Dashboard
        router.replace('/(tabs)/home' as any);
      } else {
        setErrorMsg(result.message || t.auth.errorFailed);
      }
    } catch (err) {
      setIsLoading(false);
      setErrorMsg(t.auth.errorGeneral);
      console.error('Login error:', err);
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMsg('');
    setIsLoading(true);
    try {
      const result = await signInWithGoogle() as { success: boolean; user?: User | null; needsHealthSetup?: boolean; message?: string };
      setIsLoading(false);

      if (result.success) {
        // Navigate based on the user data returned from signInWithGoogle
        // This avoids race conditions with state updates
        const needsHealthSetup = result.needsHealthSetup ?? !(result.user?.healthSetupCompleted ?? false);

        if (needsHealthSetup) {
          // New user - go to health setup (same flow as manual signup)
          router.replace('/health-setup' as any);
        } else {
          // Existing user with health setup complete - go to dashboard
          router.replace('/(tabs)/home' as any);
        }
      } else {
        setErrorMsg(result.message || t.auth.errorGoogle);
      }
    } catch (err) {
      setIsLoading(false);
      setErrorMsg(t.auth.errorGeneral);
      console.error('Google Sign-In error:', err);
    }
  };

  console.log('Rendering LoginScreen');
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <LanguageSelector />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Image
              source={require('@/assets/branding/logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.title}>SweetTrack</Text>
          <Text style={styles.subtitle}>{t.auth.subtitle}</Text>
        </View>

        <View style={styles.form}>
          {errorMsg ? <Text style={{ color: 'red', marginBottom: 8 }}>{errorMsg}</Text> : null}

          <View style={styles.inputContainer}>
            <Mail size={20} color={Colors.textSecondary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder={t.auth.email}
              placeholderTextColor={Colors.textLight}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
          </View>

          <View style={styles.inputContainer}>
            <Lock size={20} color={Colors.textSecondary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder={t.auth.password}
              placeholderTextColor={Colors.textLight}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoComplete="password"
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={styles.eyeIcon}
            >
              {showPassword ? (
                <EyeOff size={20} color={Colors.textSecondary} />
              ) : (
                <Eye size={20} color={Colors.textSecondary} />
              )}
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.loginButton}
            onPress={handleLogin}
            disabled={isLoading}
          >
            <LinearGradient
              colors={Colors.gradient.primary as any}
              style={styles.loginButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.loginButtonText}>
                {isLoading ? t.auth.loggingIn : t.auth.login}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>{t.auth.orContinueWith}</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={styles.googleButton}
            onPress={handleGoogleSignIn}
            disabled={isLoading}
          >
            <Image
              source={{ uri: 'https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg' }}
              style={styles.googleIcon}
            />
            <Text style={styles.googleButtonText}>
              {isLoading ? t.auth.signingIn : t.auth.googleSignIn}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.signupButton}
            onPress={() => router.push('/signup' as any)}
          >
            <Text style={styles.signupButtonText}>{t.auth.createAccount}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scrollContent: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 30, paddingVertical: 60 },
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
  title: { fontSize: 34, fontWeight: '800' as const, color: Colors.text, marginBottom: 8, letterSpacing: -0.5 },
  subtitle: { fontSize: 16, color: Colors.textSecondary, opacity: 0.8 },
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 2,
  },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, paddingVertical: 18, fontSize: 16, color: Colors.text },
  eyeIcon: { padding: 8 },
  loginButton: { borderRadius: 16, overflow: 'hidden', marginTop: 12, shadowColor: Colors.gradient.primary[0], shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8 },
  loginButtonGradient: { paddingVertical: 18, alignItems: 'center', justifyContent: 'center' },
  loginButtonText: { fontSize: 17, fontWeight: '700' as const, color: Colors.textWhite, letterSpacing: 0.5 },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 28 },
  dividerLine: { flex: 1, height: 1.5, backgroundColor: '#F1F5F9' },
  dividerText: { marginHorizontal: 16, fontSize: 14, color: Colors.textSecondary, fontWeight: '500' },
  googleButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF', borderRadius: 16, borderWidth: 1.5, borderColor: '#F1F5F9', paddingVertical: 16, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  googleIcon: { width: 22, height: 22, marginRight: 12 },
  googleButtonText: { fontSize: 16, fontWeight: '600' as const, color: Colors.text },
  signupButton: { paddingVertical: 18, alignItems: 'center', justifyContent: 'center', borderRadius: 16, borderWidth: 2, borderColor: Colors.gradient.primary[0] },
  signupButtonText: { fontSize: 16, fontWeight: '700' as const, color: Colors.gradient.primary[0] },
});