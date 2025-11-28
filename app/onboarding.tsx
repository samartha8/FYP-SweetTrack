import { useState, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, ScrollView, Animated, ColorValue, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Activity, Heart, MessageCircle, Camera, TrendingUp } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '@/constants/colors';
import { useUser } from '@/contexts/UserContext';
import { wp, hp, fontSize, scaleSize, isTablet, getResponsivePadding, getIconSize, SCREEN_WIDTH, SCREEN_HEIGHT } from '@/utils/responsive';

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
    title: 'Upload & Track Health Data',
    description: 'Easily upload your health records and track key metrics like glucose, blood pressure, and BMI in one place.',
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
  },
];

export default function OnboardingScreen() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const router = useRouter();
  const { completeOnboarding } = useUser();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const tablet = isTablet();

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
      scrollViewRef.current?.scrollTo({ x: SCREEN_WIDTH * nextIndex, animated: true });
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
    scrollViewRef.current?.scrollTo({ x: SCREEN_WIDTH * index, animated: true });
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
              colors={slide.gradient as unknown as readonly [ColorValue, ColorValue, ...ColorValue[]]}
              style={styles.iconContainer}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <slide.icon size={getIconSize(80)} color={Colors.textWhite} strokeWidth={1.5} />
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
                currentIndex === index && styles.dotActive,
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
              colors={Colors.gradient.primary as unknown as readonly [ColorValue, ColorValue, ...ColorValue[]]}
              style={styles.nextButtonGradient}
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
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.75,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: getResponsivePadding(40),
  },
  iconContainer: {
    width: scaleSize(180),
    height: scaleSize(180),
    borderRadius: scaleSize(90),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: scaleSize(40),
    shadowColor: Colors.cardShadow,
    shadowOffset: { width: 0, height: scaleSize(8) },
    shadowOpacity: 0.3,
    shadowRadius: scaleSize(16),
    elevation: 8,
  },
  title: {
    fontSize: fontSize(28),
    fontWeight: '700' as const,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: scaleSize(16),
    paddingHorizontal: getResponsivePadding(20),
  },
  description: {
    fontSize: fontSize(16),
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: fontSize(24),
    paddingHorizontal: getResponsivePadding(10),
  },
  footer: {
    paddingHorizontal: getResponsivePadding(30),
    paddingBottom: hp(6),
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: scaleSize(30),
  },
  dot: {
    width: scaleSize(8),
    height: scaleSize(8),
    borderRadius: scaleSize(4),
    backgroundColor: Colors.borderLight,
    marginHorizontal: scaleSize(4),
  },
  dotActive: {
    width: scaleSize(24),
    backgroundColor: Colors.primary,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  skipButton: {
    paddingVertical: scaleSize(12),
    paddingHorizontal: scaleSize(24),
  },
  skipText: {
    fontSize: fontSize(16),
    color: Colors.textSecondary,
    fontWeight: '600' as const,
  },
  nextButton: {
    flex: 1,
    marginLeft: scaleSize(16),
    borderRadius: scaleSize(12),
    overflow: 'hidden',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: scaleSize(4) },
    shadowOpacity: 0.3,
    shadowRadius: scaleSize(8),
    elevation: 4,
  },
  nextButtonGradient: {
    paddingVertical: scaleSize(16),
    paddingHorizontal: scaleSize(32),
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: scaleSize(56),
  },
  nextText: {
    fontSize: fontSize(16),
    fontWeight: '700' as const,
    color: Colors.textWhite,
  },
});