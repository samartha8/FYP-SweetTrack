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
import { Eye, EyeOff, Lock, Mail, ArrowRight, Sparkles } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from '@/hooks/use-translation';
import { useTheme } from '@/contexts/SettingsContext';
import Animated, { FadeInDown, FadeInUp, ZoomIn } from 'react-native-reanimated';

const { width } = Dimensions.get('window');

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  const router = useRouter();
  const { login, signInWithGoogle } = useAuth();
  const { t } = useTranslation();
  const { colors, scale } = useTheme();

  const handleLogin = async () => {
    if (!email || !password) {
      setErrorMsg(t.auth.errorMissing || 'Please fill all fields');
      return;
    }
    setIsLoading(true);
    setErrorMsg('');
    try {
      // @ts-ignore
      const result = await login(email, password);
      
      if (!result.success) {
        setErrorMsg(result.message || t.auth.errorFailed || 'Invalid credentials');
      } else {
        router.replace('/(tabs)/home' as any);
      }
    } catch (error) {
      console.error('Login Error:', error);
      setErrorMsg(t.auth.errorFailed || 'Login error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const themed = useMemo(() => ({
    title: { color: '#FFFFFF', fontSize: scale(46), fontWeight: '900' as const, letterSpacing: -2.5 }, 
    subtitle: { color: 'rgba(255,255,255,0.7)', fontSize: scale(15), fontWeight: '500' as const, marginTop: 4, textTransform: 'uppercase' as const, letterSpacing: 1.5 },
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
      <LinearGradient 
        colors={['#0F172A', '#064E3B', '#0D9488']} // Deep Midnight to Emerald
        style={StyleSheet.absoluteFill} 
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.topSection}>
           <Animated.View entering={ZoomIn.delay(200)} style={styles.logoContainer}>
              <LinearGradient colors={['#F0FDF4', '#DCFCE7']} style={styles.logoGradient}>
                <Sparkles size={44} color="#059669" strokeWidth={2.2} />
              </LinearGradient>
           </Animated.View>
           
           <Animated.View entering={FadeInUp.delay(400)} style={styles.headerText}>
              <Text style={themed.title}>SweetTrack</Text>
              <Text style={themed.subtitle}>Precision Metabolic Audit</Text>
           </Animated.View>
        </View>

        <Animated.View entering={FadeInDown.delay(600)} style={styles.formSection}>
          {errorMsg ? (
            <Animated.View entering={FadeInUp} style={styles.errorContainer}>
              <Text style={styles.errorText}>{errorMsg}</Text>
            </Animated.View>
          ) : null}

          <View
            style={themed.inputContainer}
          >
            <Mail size={20} color={colors.textSecondary} strokeWidth={2} />
            <TextInput
              style={[styles.input, styles.emailInput]}
              placeholder={t.auth.email}
              placeholderTextColor={colors.textSecondary + '80'}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              textContentType="emailAddress"
              autoCorrect={false}
              spellCheck={false}
              importantForAutofill="yes"
              disableFullscreenUI
            />
          </View>

          <View
            style={themed.inputContainer}
          >
            <Lock size={20} color={colors.textSecondary} strokeWidth={2} />
            <TextInput
              style={styles.input}
              placeholder={t.auth.password}
              placeholderTextColor={colors.textSecondary + '80'}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoComplete="password"
              textContentType="password"
              autoCorrect={false}
              spellCheck={false}
              importantForAutofill="yes"
              disableFullscreenUI
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
            <LinearGradient colors={['#10B981', '#059669']} style={StyleSheet.absoluteFill} start={{x:0, y:0}} end={{x:1, y:0}} />
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
              disabled={isGoogleLoading}
              onPress={async () => {
                if (isGoogleLoading) return;
                setIsGoogleLoading(true);
                setErrorMsg('');
                try {
                  const res = await signInWithGoogle();
                  if (res?.success) {
                    router.replace(res.needsHealthSetup ? '/health-setup' as any : '/(tabs)/home' as any);
                  } else if (res?.message) {
                    setErrorMsg(res.message);
                  }
                } finally {
                  setIsGoogleLoading(false);
                }
              }}
            >
              {isGoogleLoading ? (
                <ActivityIndicator color="#1E293B" />
              ) : (
                <>
                  <Image source={{ uri: 'https://cdn-icons-png.flaticon.com/512/2991/2991148.png' }} style={styles.socialIcon} />
                  <Text style={styles.socialBtnText}>Google</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: 'rgba(255,255,255,0.8)' }]}>{t.auth.alreadyHaveAccount.split('?')[0]}? </Text>
            <TouchableOpacity onPress={() => router.push('/signup')}>
              <Text style={[styles.signupText, { color: '#FFFFFF' }]}>{t.auth.signup}</Text>
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  headerText: {
    alignItems: 'center',
  },
  formSection: {
    flex: 1,
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
  emailInput: {
    paddingRight: 72,
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
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  dividerText: {
    marginHorizontal: 16,
    color: 'rgba(255,255,255,0.8)',
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
    fontSize: 15,
    fontWeight: '600',
  },
  signupText: {
    fontSize: 15,
    fontWeight: '800',
  },
});
