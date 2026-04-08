import { useState, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, ScrollView, Animated, ColorValue, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Activity, Heart, MessageCircle, Camera, TrendingUp } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '@/constants/colors';
import { useUser } from '@/contexts/UserContext';

const { width, height } = Dimensions.get('window');

type OnboardingSlide = {
  id: number;
  title: string;
  description: string;
  icon: typeof Activity;
  gradient: readonly string[];
};

const slides: OnboardingSlide[] = [
  {
    id: 1,
    title: 'Track Your Health Journey',
    description: 'Monitor your health metrics like glucose, blood pressure, and BMI with easy-to-use logging tools and visual progress tracking.',
    icon: Activity,
    gradient: Colors.gradient.primary,
  },
  {
    id: 2,
    title: 'Predict & Prevent Diseases',
    description: 'Get AI-powered predictions for diabetes, heart disease, and hypertension with personalized health recommendations.',
    icon: Heart,
    gradient: Colors.gradient.error,
  },
  {
    id: 3,
    title: 'Chatbot & Wellness Rewards',
    description: 'Chat with our AI health assistant and earn rewards for completing your daily wellness goals.',
    icon: MessageCircle,
    gradient: Colors.gradient.secondary,
  },
  {
    id: 4,
    title: 'Smart Meals & Achievements',
    description: 'Log meals with photo scanning, track nutrition, and unlock rewards like points, streaks, and coupons.',
    icon: Camera,
    gradient: Colors.gradient.warning,
  },
  {
    id: 5,
    title: 'Auto Tracking & Progress',
    description: 'Monitor your daily and weekly goals with visual progress bars, streaks, and achievement tracking.',
    icon: TrendingUp,
    gradient: Colors.gradient.success,
  }
];

export default function OnboardingScreen() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const router = useRouter();
  const { completeOnboarding } = useUser();
  const insets = useSafeAreaInsets();

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();

      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      scrollViewRef.current?.scrollTo({ x: width * nextIndex, animated: true });
    } else {
      handleGetStarted();
    }
  };

  const handleSkip = () => {
    handleGetStarted();
  };

  const handleGetStarted = async () => {
    await completeOnboarding();
    router.replace('/login' as any);
  };

  const handleDotPress = (index: number) => {
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();

    setCurrentIndex(index);
    scrollViewRef.current?.scrollTo({ x: width * index, animated: true });
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled={false}
        style={styles.scrollView}
      >
        {slides.map((slide, index) => (
          <Animated.View
            key={slide.id}
            style={[
              styles.slide,
              { opacity: currentIndex === index ? fadeAnim : 1 },
            ]}
          >
            <LinearGradient
              colors={slide.gradient as any}
              style={styles.iconContainer as any}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              {slide.id === 1 ? (
                <Image 
                  source={require('@/assets/branding/logo.png')}
                  style={styles.logo}
                  resizeMode="contain"
                />
              ) : (
                <slide.icon size={80} color={Colors.textWhite} strokeWidth={1.5} />
              )}
            </LinearGradient>

            <Text style={styles.title}>{slide.title}</Text>
            <Text style={styles.description}>{slide.description}</Text>
          </Animated.View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.pagination}>
          {slides.map((_, index) => (
            <TouchableOpacity
              key={index}
              onPress={() => handleDotPress(index)}
              style={[
                styles.dot,
                currentIndex === index && styles.dotActive
              ]}
            />
          ))}
        </View>

        <View style={styles.buttonContainer}>
          {currentIndex < slides.length - 1 && (
            <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
              <Text style={styles.skipText}>Skip</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity onPress={handleNext} style={styles.nextButton}>
            <LinearGradient
              colors={Colors.gradient.primary as any}
              style={styles.nextButtonGradient as any}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.nextText}>
                {currentIndex === slides.length - 1 ? 'Get Started' : 'Next'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  slide: {
    width,
    height: height * 0.75,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  iconContainer: {
    width: 180,
    height: 180,
    borderRadius: 90,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
    shadowColor: Colors.cardShadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  logo: {
    width: 140,
    height: 140,
    borderRadius: 70,
  },
  title: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  description: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 10,
  },
  footer: {
    paddingHorizontal: 30,
    paddingBottom: 50,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.borderLight,
    marginHorizontal: 4,
  },
  dotActive: {
    width: 24,
    backgroundColor: Colors.primary,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  skipButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  skipText: {
    fontSize: 16,
    color: Colors.textSecondary,
    fontWeight: '600' as const,
  },
  nextButton: {
    flex: 1,
    marginLeft: 16,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  nextButtonGradient: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.textWhite,
  },
});