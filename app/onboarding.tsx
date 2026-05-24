import { useState, useRef, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ScrollView,
  Image,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Activity, Heart, MessageCircle, Camera, TrendingUp, ArrowRight, Sparkles } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInUp, ZoomIn, useAnimatedStyle, useSharedValue, withRepeat, withTiming, Easing, interpolate } from 'react-native-reanimated';
import { useAuth } from '@/contexts/AuthContext';;
import { useTheme } from '@/contexts/SettingsContext';

const { width, height } = Dimensions.get('window');

type OnboardingSlide = {
  id: number;
  title: string;
  description: string;
  icon: typeof Activity;
  accent: string;
  secondaryAccent: string;
};

const slides: OnboardingSlide[] = [
  {
    id: 1,
    title: 'Metabolic Intelligence',
    description: 'Advanced AI analysis of your glucose, BMI, and vital signs to detect early metabolic trends.',
    icon: Sparkles,
    accent: '#00B4D8',
    secondaryAccent: '#90E0EF',
  },
  {
    id: 2,
    title: 'Predictive Wellness',
    description: 'Proactive detection for diabetes and cardiovascular risks with personalized mitigation strategies.',
    icon: Heart,
    accent: '#EF4444',
    secondaryAccent: '#FCA5A5',
  },
  {
    id: 3,
    title: 'AI Health Assistant',
    description: 'Expert nutritional guidance and real-time support available 24/7 in your pocket.',
    icon: MessageCircle,
    accent: '#8B5CF6',
    secondaryAccent: '#C4B5FD',
  },
  {
    id: 4,
    title: 'Visual Meal Audit',
    description: 'Snap photos of your food to get instant nutritional breakdowns and metabolic impact scores.',
    icon: Camera,
    accent: '#F59E0B',
    secondaryAccent: '#FCD34D',
  },
  {
    id: 5,
    title: 'Precision Tracking',
    description: 'Real-time monitoring of your wellness streaks, rewards, and long-term health trajectory.',
    icon: TrendingUp,
    accent: '#10B981',
    secondaryAccent: '#6EE7B7',
  }
];

export default function OnboardingScreen() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const router = useRouter();
  const { completeOnboarding } = useAuth();
  const insets = useSafeAreaInsets();
  const { colors, scale } = useTheme();

  // Floating Animation
  const floatValue = useSharedValue(0);
  useEffect(() => {
    floatValue.value = withRepeat(
      withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, []);

  const floatingStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(floatValue.value, [0, 1], [-15, 15]) }]
  }));

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      scrollViewRef.current?.scrollTo({ x: width * nextIndex, animated: true });
    } else {
      handleGetStarted();
    }
  };

  const handleGetStarted = async () => {
    await completeOnboarding();
    router.replace('/login' as any);
  };

  const themed = useMemo(() => ({
    title: { color: colors.text, fontSize: scale(32), fontWeight: '900' as const, letterSpacing: -1, textAlign: 'center' as const, lineHeight: scale(38) },
    description: { color: colors.textSecondary, fontSize: scale(15), fontWeight: '600' as const, textAlign: 'center' as const, lineHeight: 24 },
    buttonText: { color: '#FFF', fontSize: scale(17), fontWeight: '900' as const, letterSpacing: 1.5 },
  }), [colors, scale]);

  const currentSlide = slides[currentIndex];

  return (
    <View style={styles.container}>
      {/* Dynamic Animated Background Mesh */}
      <View style={StyleSheet.absoluteFill}>
        <LinearGradient colors={[colors.background, colors.backgroundSecondary]} style={StyleSheet.absoluteFill} />
        
        {/* Top Glow Blob */}
        <Animated.View 
          style={[styles.glowBlob, { 
            backgroundColor: currentSlide.accent, 
            top: -height * 0.1, 
            right: -width * 0.3,
            opacity: 0.15 
          }]} 
        />
        
        {/* Bottom Glow Blob */}
        <Animated.View 
          style={[styles.glowBlob, { 
            backgroundColor: currentSlide.secondaryAccent, 
            bottom: -height * 0.1, 
            left: -width * 0.3,
            opacity: 0.15 
          }]} 
        />
        
        {/* Blur Overlay for Glassmorphism Background Effect */}
        <View style={[StyleSheet.absoluteFill, styles.backdropBlur]} />
      </View>
      
      <View style={styles.contentContainer}>
        <ScrollView
          ref={scrollViewRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          scrollEnabled={false}
          style={styles.scrollView}
        >
          {slides.map((slide, index) => (
            <View key={slide.id} style={styles.slide}>
              
              {/* Top Section: Visual Graphic */}
              <View style={styles.visualWrapper}>
                 <Animated.View style={[styles.glassCard, floatingStyle, { 
                   borderColor: slide.accent + '30',
                   shadowColor: slide.accent,
                 }]}>
                    <LinearGradient 
                      colors={['rgba(255,255,255,0.8)', 'rgba(255,255,255,0.4)']} 
                      style={StyleSheet.absoluteFill} 
                      start={{ x: 0, y: 0 }} 
                      end={{ x: 1, y: 1 }} 
                    />
                    <View style={[styles.iconInnerCircle, { backgroundColor: slide.accent + '15' }]}>
                      {slide.id === 1 ? (
                        <Image source={require('@/assets/branding/logo.png')} style={styles.logo} resizeMode="contain" />
                      ) : (
                        <slide.icon size={70} color={slide.accent} strokeWidth={2.5} />
                      )}
                    </View>
                 </Animated.View>
              </View>

              {/* Bottom Section: Text Content */}
              <Animated.View entering={FadeInUp.delay(150).springify()} style={styles.textWrapper}>
                <Text style={themed.title}>{slide.title}</Text>
                <Text style={[themed.description, { marginTop: 16 }]}>{slide.description}</Text>
              </Animated.View>

            </View>
          ))}
        </ScrollView>
      </View>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 24) }]}>
        <View style={styles.pagination}>
          {slides.map((_, index) => (
            <Animated.View
              key={index}
              style={[
                styles.dot,
                { backgroundColor: currentIndex === index ? currentSlide.accent : 'rgba(0,0,0,0.1)' },
                currentIndex === index && styles.dotActive
              ]}
            />
          ))}
        </View>

        <TouchableOpacity activeOpacity={0.9} style={[styles.nextButton, { shadowColor: currentSlide.accent }]} onPress={handleNext}>
          <LinearGradient 
            colors={[currentSlide.accent, currentSlide.secondaryAccent]} 
            style={StyleSheet.absoluteFill} 
            start={{ x: 0, y: 0 }} 
            end={{ x: 1, y: 0 }} 
          />
          <View style={styles.buttonContent}>
            <Text style={themed.buttonText}>{currentIndex === slides.length - 1 ? 'GET STARTED' : 'CONTINUE'}</Text>
            <ArrowRight size={22} color="#FFF" strokeWidth={3} />
          </View>
        </TouchableOpacity>

        <View style={{ height: 36, justifyContent: 'center', marginTop: 12 }}>
          {currentIndex < slides.length - 1 && (
            <TouchableOpacity onPress={handleGetStarted} style={styles.skipButton}>
              <Text style={[styles.skipText, { color: colors.textSecondary }]}>SKIP INTRO</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  contentContainer: { flex: 1 },
  scrollView: { flex: 1 },
  slide: { width, flex: 1, paddingHorizontal: 32 },
  
  // Flex layout for slide content
  visualWrapper: { flex: 55, alignItems: 'center', justifyContent: 'center', paddingTop: 20 },
  textWrapper: { flex: 45, alignItems: 'center', paddingTop: 10 },
  
  // Background Mesh
  glowBlob: {
    position: 'absolute',
    width: width * 1.2,
    height: width * 1.2,
    borderRadius: width * 0.6,
    // @ts-ignore
    filter: Platform.OS === 'web' ? 'blur(80px)' : undefined,
  },
  backdropBlur: {
    ...Platform.select({
      // @ts-ignore
      web: { backdropFilter: 'blur(100px)' },
      native: { backgroundColor: 'rgba(255,255,255,0.4)' }
    })
  },
  
  // Visual Graphic
  glassCard: { 
    width: 220, 
    height: 220, 
    borderRadius: 110, 
    alignItems: 'center', 
    justifyContent: 'center', 
    borderWidth: 1.5,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.7)',
    ...Platform.select({
      // @ts-ignore
      web: { boxShadow: '0px 20px 40px rgba(0,0,0,0.08)', backdropFilter: 'blur(20px)' },
      native: { elevation: 20, shadowOpacity: 0.15, shadowRadius: 30, shadowOffset: { width: 0, height: 15 } }
    })
  },
  iconInnerCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: { width: 100, height: 100, borderRadius: 28 },
  
  footer: { paddingHorizontal: 36, paddingTop: 10 },
  pagination: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  dot: { width: 8, height: 8, borderRadius: 4, marginHorizontal: 5 },
  dotActive: { width: 28 },
  
  nextButton: { 
    height: 64, 
    borderRadius: 32, 
    overflow: 'hidden', 
    justifyContent: 'center', 
    alignItems: 'center', 
    ...Platform.select({
      // @ts-ignore
      web: { boxShadow: '0px 15px 30px rgba(0,0,0,0.2)' },
      native: { elevation: 12, shadowOpacity: 0.25, shadowRadius: 20, shadowOffset: { width: 0, height: 10 } }
    })
  },
  buttonContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  
  skipButton: { alignSelf: 'center', paddingVertical: 8, paddingHorizontal: 20 },
  skipText: { fontSize: 13, fontWeight: '800', letterSpacing: 1.5 },
});