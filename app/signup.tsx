import Colors from '@/constants/colors';
import { useUser } from '@/contexts/UserContext';
import { fontSize, getIconSize, getResponsivePadding, hp, isTablet, scaleSize } from '@/utils/responsive';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Heart, Lock, Mail, User } from 'lucide-react-native';
import { useState } from 'react';
import { ColorValue, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function SignupScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const router = useRouter();
  const { signup } = useUser();

  const validateEmail = (email: string) => /\S+@\S+\.\S+/.test(email);
  const validatePassword = (password: string) => password.length >= 6;

  const handleSignup = async () => {
    setErrorMsg('');

    if (!name || !email || !password || !confirmPassword) {
      setErrorMsg('All fields are required.');
      return;
    }

    if (!validateEmail(email)) {
      setErrorMsg('Please enter a valid email.');
      return;
    }

    if (!validatePassword(password)) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    setIsLoading(true);

    try {
      const result = await signup(name, email, password);
      setIsLoading(false);

      if (!result.success) {
        setErrorMsg(result.message || 'Signup failed. Please try again.');
        return;
      }

      router.replace('/health-setup' as any);
    } catch (err) {
      setIsLoading(false);
      setErrorMsg('Signup failed. Please try again.');
      console.error('Signup error:', err);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <LinearGradient
            colors={Colors.gradient.primary as unknown as readonly [ColorValue, ColorValue, ...ColorValue[]]}
            style={styles.logoContainer}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Heart size={getIconSize(60)} color={Colors.textWhite} strokeWidth={2} />
          </LinearGradient>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join SweetTrack Today</Text>
        </View>

        <View style={styles.form}>
          {errorMsg ? <Text style={{ color: 'red', marginBottom: 8 }}>{errorMsg}</Text> : null}

          <View style={styles.inputContainer}>
            <User size={getIconSize(20)} color={Colors.textSecondary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Full Name"
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
              placeholder="Email"
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
              placeholder="Password"
              placeholderTextColor={Colors.textLight}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputContainer}>
            <Lock size={getIconSize(20)} color={Colors.textSecondary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Confirm Password"
              placeholderTextColor={Colors.textLight}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              autoCapitalize="none"
            />
          </View>

          <TouchableOpacity style={styles.signupButton} onPress={handleSignup} disabled={isLoading}>
            <LinearGradient
              colors={Colors.gradient.primary as unknown as readonly [ColorValue, ColorValue, ...ColorValue[]]}
              style={styles.signupButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.signupButtonText}>
                {isLoading ? 'Creating Account...' : 'Sign Up'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={styles.loginButton} onPress={() => router.back()}>
            <Text style={styles.loginButtonText}>Already have an account? Login</Text>
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
    paddingHorizontal: getResponsivePadding(30),
    paddingVertical: hp(5),
    maxWidth: isTablet() ? 600 : '100%',
    alignSelf: 'center',
    width: '100%',
  },
  header: { alignItems: 'center', marginBottom: hp(5) },
  logoContainer: {
    width: scaleSize(100),
    height: scaleSize(100),
    borderRadius: scaleSize(50),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: scaleSize(20),
  },
  title: { fontSize: fontSize(28), fontWeight: '700' as const, color: Colors.text, marginBottom: scaleSize(8), textAlign: 'center' },
  subtitle: { fontSize: fontSize(16), color: Colors.textSecondary, textAlign: 'center' },
  form: { width: '100%' },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: scaleSize(12),
    paddingHorizontal: getResponsivePadding(16),
    marginBottom: scaleSize(16),
    borderWidth: 1,
    borderColor: Colors.border,
    minHeight: scaleSize(56),
  },
  inputIcon: { marginRight: scaleSize(12) },
  input: { flex: 1, paddingVertical: scaleSize(16), fontSize: fontSize(16), color: Colors.text },
  signupButton: { borderRadius: scaleSize(12), overflow: 'hidden', marginTop: scaleSize(8) },
  signupButtonGradient: { paddingVertical: scaleSize(16), alignItems: 'center', justifyContent: 'center', minHeight: scaleSize(56) },
  signupButtonText: { fontSize: fontSize(16), fontWeight: '700' as const, color: Colors.textWhite },
  loginButton: { paddingVertical: scaleSize(16), alignItems: 'center', marginTop: scaleSize(20) },
  loginButtonText: { fontSize: fontSize(14), color: Colors.primary, fontWeight: '600' as const },
});
