import React, { useState, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  TextInput, 
  KeyboardAvoidingView, 
  Platform, 
  ScrollView, 
  ActivityIndicator,
  Dimensions,
  Image
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Eye, EyeOff, Lock, Mail, ArrowRight, Github, Sparkles } from 'lucide-react-native';
import { useUser } from '@/contexts/UserContext';
import { useTranslation } from '@/hooks/use-translation';
import { useTheme } from '@/contexts/SettingsContext';
import LanguageSelector from '@/components/LanguageSelector';
import Animated, { FadeInDown, FadeInUp, ZoomIn } from 'react-native-reanimated';

const { width } = Dimensions.get('window');

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  const router = useRouter();
  const { login, signInWithGoogle } = useUser();
  const { t } = useTranslation();
  const { colors, scale } = useTheme();

  const handleLogin = async () => {
    if (!email || !password) {
      setErrorMsg(t.auth.fillAllFields || 'Please fill all fields');
      return;
    }
    setIsLoading(true);
    setErrorMsg('');
    try {
      const success = await login(email, password);
      if (!success) {
        setErrorMsg(t.auth.invalidCredentials || 'Invalid credentials');
      } else {
        router.replace('/(tabs)/home' as any);
      }
    } catch (error) {
      setErrorMsg(t.auth.errorLogin || 'Login error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const themed = useMemo(() => ({
    title: { color: colors.text, fontSize: scale(42), fontWeight: '900' as const, letterSpacing: -2 },
    subtitle: { color: colors.textSecondary, fontSize: scale(16), fontWeight: '600' as const, marginTop: 8 },
    inputContainer: { 
      backgroundColor: '#FFF', 
      borderRadius: 20, 
      borderWidth: 1, 
      borderColor: 'rgba(0,0,0,0.05)',
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      paddingHorizontal: 16,
      height: 60,
      marginBottom: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.05,
      shadowRadius: 10,
      elevation: 2,
    },
    loginBtn: {
      height: 60,
      borderRadius: 20,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      overflow: 'hidden' as const,
      marginTop: 20,
      shadowColor: '#00B4D8',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      elevation: 8,
    },
    loginBtnText: { color: '#FFF', fontSize: 18, fontWeight: '900' as const, letterSpacing: -0.5 },
    socialBtn: {
      flex: 1,
      height: 56,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: 'rgba(0,0,0,0.05)',
      backgroundColor: '#FFF',
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      gap: 12,
    },
  }), [colors, scale]);

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
      style={styles.container}
    >
      <LinearGradient colors={['#F0FDF4', '#F0F9FF']} style={StyleSheet.absoluteFill} />
      
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.topSection}>
           <Animated.View entering={ZoomIn.delay(200)} style={styles.logoContainer}>
              <LinearGradient colors={['#00B4D8', '#0077B6']} style={styles.logoGradient}>
                <Sparkles size={40} color="#FFF" strokeWidth={2.5} />
              </LinearGradient>
           </Animated.View>
           
           <Animated.View entering={FadeInUp.delay(400)} style={styles.headerText}>
              <Text style={themed.title}>SweetTrack</Text>
              <Text style={themed.subtitle}>Precision Metabolic Audit</Text>
           </Animated.View>
        </View>

        <Animated.View entering={FadeInDown.delay(600)} style={styles.formSection}>
          <View style={styles.languageBox}>
            <LanguageSelector />
          </View>

          {errorMsg ? (
            <Animated.View entering={FadeInUp} style={styles.errorContainer}>
              <Text style={styles.errorText}>{errorMsg}</Text>
            </Animated.View>
          ) : null}

          <View style={themed.inputContainer}>
            <Mail size={20} color={colors.textSecondary} strokeWidth={2} />
            <TextInput
              style={styles.input}
              placeholder={t.auth.email}
              placeholderTextColor={colors.textSecondary + '80'}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          <View style={themed.inputContainer}>
            <Lock size={20} color={colors.textSecondary} strokeWidth={2} />
            <TextInput
              style={styles.input}
              placeholder={t.auth.password}
              placeholderTextColor={colors.textSecondary + '80'}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              {showPassword ? <EyeOff size={20} color={colors.textSecondary} /> : <Eye size={20} color={colors.textSecondary} />}
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            activeOpacity={0.8}
            style={themed.loginBtn}
            onPress={handleLogin}
            disabled={isLoading}
          >
            <LinearGradient colors={['#00B4D8', '#0077B6']} style={StyleSheet.absoluteFill} start={{x:0, y:0}} end={{x:1, y:0}} />
            {isLoading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <View style={styles.loginBtnContent}>
                <Text style={themed.loginBtnText}>Log in</Text>
                <ArrowRight size={20} color="#FFF" strokeWidth={3} />
              </View>
            )}
          </TouchableOpacity>

          <View style={styles.dividerContainer}>
            <View style={styles.divider} />
            <Text style={styles.dividerText}>OR SIGN IN WITH</Text>
            <View style={styles.divider} />
          </View>

          <View style={styles.socialRow}>
            <TouchableOpacity 
              activeOpacity={0.7}
              style={themed.socialBtn} 
              onPress={async () => {
                await signInWithGoogle();
                router.replace('/(tabs)/home' as any);
              }}
            >
              <Image source={{ uri: 'https://cdn-icons-png.flaticon.com/512/2991/2991148.png' }} style={styles.socialIcon} />
              <Text style={styles.socialBtnText}>Google</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>{t.auth.noAccount} </Text>
            <TouchableOpacity onPress={() => router.push('/signup')}>
              <Text style={[styles.signupText, { color: colors.primary }]}>{t.auth.signup}</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 32,
    paddingBottom: 40,
  },
  topSection: {
    alignItems: 'center',
    marginTop: 80,
    marginBottom: 48,
  },
  logoContainer: {
    marginBottom: 24,
  },
  logoGradient: {
    width: 100,
    height: 100,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#00B4D8',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  headerText: {
    alignItems: 'center',
  },
  formSection: {
    flex: 1,
  },
  languageBox: {
    alignItems: 'flex-end',
    marginBottom: 24,
  },
  errorContainer: {
    backgroundColor: '#FEE2E2',
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  errorText: {
    color: '#B91C1C',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  input: {
    flex: 1,
    paddingHorizontal: 12,
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
  },
  loginBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 32,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  dividerText: {
    marginHorizontal: 16,
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },
  socialRow: {
    flexDirection: 'row',
    gap: 12,
  },
  socialIcon: {
    width: 24,
    height: 24,
  },
  socialBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 32,
  },
  footerText: {
    color: '#64748B',
    fontSize: 15,
    fontWeight: '600',
  },
  signupText: {
    fontSize: 15,
    fontWeight: '800',
  },
});