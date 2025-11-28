import { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, ColorValue, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Heart, User, Mail, Lock } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '@/constants/colors';
import { useUser } from '@/contexts/UserContext';
import { wp, hp, fontSize, scaleSize, isTablet, getResponsivePadding, getIconSize } from '@/utils/responsive';

export default function SignupScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { signup } = useUser();
  const { width, height } = useWindowDimensions();
  const tablet = isTablet();

  const handleSignup = async () => {
    if (!name || !email || !password || !confirmPassword) {
      return;
    }

    if (password !== confirmPassword) {
      return;
    }

    setIsLoading(true);
    const success = await signup(name, email, password);
    setIsLoading(false);

    if (success) {
      router.replace('/health-setup' as any);
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
            {(() => {
              const Icon = Heart as React.ComponentType<any>;
              return <Icon size={getIconSize(60)} color={Colors.textWhite} strokeWidth={2} />;
            })()}
          </LinearGradient>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join SweetTrack Today</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            {(() => {
              const Icon = User as React.ComponentType<any>;
              return <Icon size={getIconSize(20)} color={Colors.textSecondary} style={styles.inputIcon} />;
            })()}
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
            {(() => {
              const Icon = Mail as React.ComponentType<any>;
              return <Icon size={getIconSize(20)} color={Colors.textSecondary} style={styles.inputIcon} />;
            })()}
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
            {(() => {
              const Icon = Lock as React.ComponentType<any>;
              return <Icon size={getIconSize(20)} color={Colors.textSecondary} style={styles.inputIcon} />;
            })()}
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
            {(() => {
              const Icon = Lock as React.ComponentType<any>;
              return <Icon size={getIconSize(20)} color={Colors.textSecondary} style={styles.inputIcon} />;
            })()}
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

          <TouchableOpacity
            style={styles.signupButton}
            onPress={handleSignup}
            disabled={isLoading}
          >
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

          <TouchableOpacity
            style={styles.loginButton}
            onPress={() => router.back()}
          >
            <Text style={styles.loginButtonText}>Already have an account? Login</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: getResponsivePadding(30),
    paddingVertical: hp(5),
    maxWidth: isTablet() ? 600 : '100%',
    alignSelf: 'center',
    width: '100%',
  },
  header: {
    alignItems: 'center',
    marginBottom: hp(5),
  },
  logoContainer: {
    width: scaleSize(100),
    height: scaleSize(100),
    borderRadius: scaleSize(50),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: scaleSize(20),
  },
  title: {
    fontSize: fontSize(28),
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: scaleSize(8),
    textAlign: 'center',
  },
  subtitle: {
    fontSize: fontSize(16),
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  form: {
    width: '100%',
  },
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
  inputIcon: {
    marginRight: scaleSize(12),
  },
  input: {
    flex: 1,
    paddingVertical: scaleSize(16),
    fontSize: fontSize(16),
    color: Colors.text,
  },
  signupButton: {
    borderRadius: scaleSize(12),
    overflow: 'hidden',
    marginTop: scaleSize(8),
  },
  signupButtonGradient: {
    paddingVertical: scaleSize(16),
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: scaleSize(56),
  },
  signupButtonText: {
    fontSize: fontSize(16),
    fontWeight: '700' as const,
    color: Colors.textWhite,
  },
  loginButton: {
    paddingVertical: scaleSize(16),
    alignItems: 'center',
    marginTop: scaleSize(20),
  },
  loginButtonText: {
    fontSize: fontSize(14),
    color: Colors.primary,
    fontWeight: '600' as const,
  },
});