import { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Mail, Lock, User, ArrowRight, ArrowLeft, Sparkles, ShieldCheck } from 'lucide-react-native';
import Animated, { FadeInDown, FadeInUp, ZoomIn } from 'react-native-reanimated';
import { useUser } from '@/contexts/UserContext';
import { useTheme } from '@/contexts/SettingsContext';
import { useTranslation } from '@/hooks/use-translation';

const { width } = Dimensions.get('window');

export default function SignupScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signup } = useUser();
  const { colors, scale } = useTheme();
  const { t } = useTranslation();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSignup = async () => {
    if (!name || !email || !password) {
      setErrorMsg(t.auth.errorMissing);
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg(t.auth.errorMismatch);
      return;
    }
    setErrorMsg('');
    setIsLoading(true);
    try {
      const result = await signup(name, email, password);
      if (result.success) {
        router.replace('/health-setup' as any);
      } else {
        setErrorMsg(result.message || t.auth.errorSignupFailed);
      }
    } catch (err) {
      setErrorMsg(t.auth.errorSignupFailed);
    } finally {
      setIsLoading(false);
    }
  };

  const themed = useMemo(() => ({
    title: { color: colors.text, fontSize: scale(42), fontWeight: '900' as const, letterSpacing: -2 },
    subtitle: { color: colors.textSecondary, fontSize: scale(16), fontWeight: '600' as const, lineHeight: 22 },
    inputLabel: { color: colors.text, fontSize: 13, fontWeight: '800' as const, textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 8 },
    inputContainer: { backgroundColor: '#FFF', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)', elevation: 2, shadowOpacity: 0.05, shadowRadius: 10, shadowColor: '#000' },
    buttonText: { color: '#FFF', fontSize: scale(16), fontWeight: '900' as const, letterSpacing: 1 },
  }), [colors, scale]);

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#F0FDF4', '#F0F9FF']} style={StyleSheet.absoluteFill} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 40 }]} showsVerticalScrollIndicator={false}>
          
          <Animated.View entering={FadeInUp.delay(200)} style={styles.header}>
            <View style={styles.iconCircle}>
              <Sparkles size={32} color={colors.primary} strokeWidth={2.5} />
            </View>
            <Text style={themed.title}>SweetTrack</Text>
            <Text style={[themed.subtitle, { marginTop: 8 }]}>Start your metabolic journey today.</Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(400)} style={styles.form}>
            {errorMsg ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{errorMsg}</Text>
              </View>
            ) : null}

            <View style={styles.field}>
              <Text style={themed.inputLabel}>{t.auth.fullName}</Text>
              <View style={[styles.inputWrapper, themed.inputContainer]}>
                <User size={20} color={colors.textSecondary} style={styles.inputIcon} />
                <TextInput style={styles.input} placeholder="John Doe" placeholderTextColor={colors.textLight} value={name} onChangeText={setName} />
              </View>
            </View>

            <View style={styles.field}>
              <Text style={themed.inputLabel}>{t.auth.email}</Text>
              <View style={[styles.inputWrapper, themed.inputContainer]}>
                <Mail size={20} color={colors.textSecondary} style={styles.inputIcon} />
                <TextInput style={styles.input} placeholder="john@example.com" placeholderTextColor={colors.textLight} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
              </View>
            </View>

            <View style={styles.field}>
              <Text style={themed.inputLabel}>{t.auth.password}</Text>
              <View style={[styles.inputWrapper, themed.inputContainer]}>
                <Lock size={20} color={colors.textSecondary} style={styles.inputIcon} />
                <TextInput style={styles.input} placeholder="••••••••" placeholderTextColor={colors.textLight} value={password} onChangeText={setPassword} secureTextEntry />
              </View>
            </View>

            <View style={styles.field}>
              <Text style={themed.inputLabel}>{t.auth.confirmPassword}</Text>
              <View style={[styles.inputWrapper, themed.inputContainer]}>
                <Lock size={20} color={colors.textSecondary} style={styles.inputIcon} />
                <TextInput style={styles.input} placeholder="••••••••" placeholderTextColor={colors.textLight} value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry />
              </View>
            </View>

            <TouchableOpacity activeOpacity={0.8} style={styles.signupButton} onPress={handleSignup} disabled={isLoading}>
              <LinearGradient colors={['#00B4D8', '#0077B6']} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />
              {isLoading ? <ActivityIndicator color="#FFF" /> : (
                <View style={styles.buttonContent}>
                  <Text style={themed.buttonText}>{t.auth.signup.toUpperCase()}</Text>
                  <ArrowRight size={20} color="#FFF" strokeWidth={3} />
                </View>
              )}
            </TouchableOpacity>

            <View style={styles.footer}>
              <Text style={[styles.footerText, { color: colors.textSecondary }]}>{t.auth.alreadyHaveAccount} </Text>
              <TouchableOpacity onPress={() => router.push('/login' as any)}>
                <Text style={[styles.loginText, { color: colors.primary }]}>{t.auth.login}</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>

          <View style={styles.securityBadge}>
            <ShieldCheck size={16} color={colors.textLight} />
            <Text style={[styles.securityText, { color: colors.textLight }]}>End-to-End Encrypted Metabolic Data</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 32 },
  header: { alignItems: 'center', marginBottom: 40 },
  iconCircle: { width: 72, height: 72, borderRadius: 24, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center', marginBottom: 20, elevation: 10, shadowOpacity: 0.1, shadowRadius: 20, shadowColor: '#000' },
  form: { width: '100%' },
  field: { marginBottom: 24 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, height: 60 },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, fontSize: 16, fontWeight: '600', color: '#1E293B' },
  signupButton: { height: 64, borderRadius: 20, marginTop: 12, overflow: 'hidden', justifyContent: 'center', alignItems: 'center', elevation: 8, shadowOpacity: 0.3, shadowRadius: 15, shadowColor: '#00B4D8' },
  buttonContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  errorContainer: { backgroundColor: '#FEE2E2', padding: 16, borderRadius: 12, marginBottom: 24, borderWidth: 1, borderColor: '#EF444433' },
  errorText: { color: '#EF4444', fontWeight: '700', textAlign: 'center', fontSize: 14 },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 32 },
  footerText: { fontSize: 15, fontWeight: '600' },
  loginText: { fontSize: 15, fontWeight: '800' },
  securityBadge: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 40, opacity: 0.6 },
  securityText: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
});
