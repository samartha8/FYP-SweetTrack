import Colors from '@/constants/colors';
import { User, useUser } from '@/contexts/UserContext';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Heart, Lock, Mail } from 'lucide-react-native';
import { useState } from 'react';
import { ColorValue, Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const router = useRouter();
  const { login, signInWithGoogle, hasHealthSetup, user } = useUser();

  const handleLogin = async () => {
    setErrorMsg('');
    if (!email || !password) {
      setErrorMsg('Email and password are required.');
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
        setErrorMsg(result.message || 'Login failed. Please check your credentials.');
      }
    } catch (err) {
      setIsLoading(false);
      setErrorMsg('Something went wrong. Please try again.');
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
        setErrorMsg(result.message || 'Google Sign-In failed. Please try again.');
      }
    } catch (err) {
      setIsLoading(false);
      setErrorMsg('Something went wrong. Please try again.');
      console.error('Google Sign-In error:', err);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <LinearGradient
            colors={Colors.gradient.primary as unknown as readonly [ColorValue, ColorValue, ...ColorValue[]]}
            style={styles.logoContainer}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Heart size={60} color={Colors.textWhite} strokeWidth={2} />
          </LinearGradient>
          <Text style={styles.title}>SweetTrack</Text>
          <Text style={styles.subtitle}>Your Health, Your Way</Text>
        </View>

        <View style={styles.form}>
          {errorMsg ? <Text style={{ color: 'red', marginBottom: 8 }}>{errorMsg}</Text> : null}

          <View style={styles.inputContainer}>
            <Mail size={20} color={Colors.textSecondary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Email"
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
              placeholder="Password"
              placeholderTextColor={Colors.textLight}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoComplete="password"
            />
          </View>

          <TouchableOpacity
            style={styles.loginButton}
            onPress={handleLogin}
            disabled={isLoading}
          >
            <LinearGradient
              colors={Colors.gradient.primary as unknown as readonly [ColorValue, ColorValue, ...ColorValue[]]}
              style={styles.loginButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.loginButtonText}>
                {isLoading ? 'Logging in...' : 'Login'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or continue with</Text>
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
              {isLoading ? 'Signing in...' : 'Continue with Google'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.signupButton}
            onPress={() => router.push('/signup' as any)}
          >
            <Text style={styles.signupButtonText}>Create New Account</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scrollContent: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 30, paddingVertical: 40 },
  header: { alignItems: 'center', marginBottom: 50 },
  logoContainer: {
    width: 120, height: 120, borderRadius: 60,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 20, shadowColor: Colors.cardShadow,
    shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 8,
  },
  title: { fontSize: 32, fontWeight: '700' as const, color: Colors.text, marginBottom: 8 },
  subtitle: { fontSize: 16, color: Colors.textSecondary },
  form: { width: '100%' },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.backgroundSecondary, borderRadius: 12, paddingHorizontal: 16, marginBottom: 16, borderWidth: 1, borderColor: Colors.border },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, paddingVertical: 16, fontSize: 16, color: Colors.text },
  loginButton: { borderRadius: 12, overflow: 'hidden', marginTop: 8, shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  loginButtonGradient: { paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
  loginButtonText: { fontSize: 16, fontWeight: '700' as const, color: Colors.textWhite },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 24 },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.border },
  dividerText: { marginHorizontal: 16, fontSize: 14, color: Colors.textSecondary },
  googleButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.backgroundSecondary, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, paddingVertical: 14, marginBottom: 16 },
  googleIcon: { width: 24, height: 24, marginRight: 12 },
  googleButtonText: { fontSize: 16, fontWeight: '600' as const, color: Colors.text },
  signupButton: { paddingVertical: 16, alignItems: 'center', justifyContent: 'center', borderRadius: 12, borderWidth: 2, borderColor: Colors.primary },
  signupButtonText: { fontSize: 16, fontWeight: '700' as const, color: Colors.primary },
});
