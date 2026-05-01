import React, { useEffect } from 'react';
import { StyleSheet, View, Dimensions, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Rect, Defs, RadialGradient, Stop } from 'react-native-svg';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withTiming, 
  withSequence,
  Easing 
} from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');

export const MeshGradientBackground = () => {
  // Animation values for floating orbs
  const orb1X = useSharedValue(0);
  const orb1Y = useSharedValue(0);
  const orb2X = useSharedValue(0);
  const orb2Y = useSharedValue(0);

  useEffect(() => {
    // Orb 1 Animation (Teal)
    orb1X.value = withRepeat(
      withSequence(
        withTiming(width * 0.2, { duration: 8000, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 8000, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );
    orb1Y.value = withRepeat(
      withSequence(
        withTiming(height * 0.1, { duration: 10000, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 10000, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );

    // Orb 2 Animation (Coral)
    orb2X.value = withRepeat(
      withSequence(
        withTiming(-width * 0.2, { duration: 9000, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 9000, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );
    orb2Y.value = withRepeat(
      withSequence(
        withTiming(-height * 0.15, { duration: 11000, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 11000, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );
  }, []);

  const animatedOrb1 = useAnimatedStyle(() => ({
    transform: [{ translateX: orb1X.value }, { translateY: orb1Y.value }],
  }));

  const animatedOrb2 = useAnimatedStyle(() => ({
    transform: [{ translateX: orb2X.value }, { translateY: orb2Y.value }],
  }));

  return (
    <View style={StyleSheet.absoluteFill}>
      {/* 1. Base Linear Gradient */}
      <LinearGradient
        colors={['#F8FAFC', '#F1F5F9'] as any}
        style={StyleSheet.absoluteFill}
      />

      {/* 2. Static Mesh Blobs (SVG Radial Gradients) */}
      <Svg height="100%" width="100%" style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id="tealBlob" cx="10%" cy="10%" rx="50%" ry="50%" fx="10%" fy="10%">
            <Stop offset="0%" stopColor="#99F6E4" stopOpacity="0.4" />
            <Stop offset="100%" stopColor="#99F6E4" stopOpacity="0" />
          </RadialGradient>
          
          <RadialGradient id="orangeBlob" cx="90%" cy="15%" rx="45%" ry="45%" fx="90%" fy="15%">
            <Stop offset="0%" stopColor="#FFEDD5" stopOpacity="0.5" />
            <Stop offset="100%" stopColor="#FFEDD5" stopOpacity="0" />
          </RadialGradient>
          
          <RadialGradient id="purpleBlob" cx="50%" cy="85%" rx="55%" ry="55%" fx="50%" fy="85%">
            <Stop offset="0%" stopColor="#F5F3FF" stopOpacity="0.4" />
            <Stop offset="100%" stopColor="#F5F3FF" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#tealBlob)" />
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#orangeBlob)" />
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#purpleBlob)" />
      </Svg>

      {/* 3. Animated Floating Orbs */}
      <Animated.View style={[styles.orb, styles.tealOrb, animatedOrb1]} />
      <Animated.View style={[styles.orb, styles.coralOrb, animatedOrb2]} />
    </View>
  );
};

const styles = StyleSheet.create({
  orb: {
    position: 'absolute',
    width: width * 0.8,
    height: width * 0.8,
    borderRadius: (width * 0.8) / 2,
    opacity: 0.15,
    ...Platform.select({
      ios: {
        shadowColor: 'transparent',
      },
      android: {
        elevation: 0,
      }
    }),
  },
  tealOrb: {
    backgroundColor: '#2DD4BF',
    top: height * 0.1,
    left: -width * 0.1,
    // Note: Blur is handled by large radius and low opacity, or expo-blur if available
  },
  coralOrb: {
    backgroundColor: '#FB7185',
    bottom: height * 0.2,
    right: -width * 0.1,
  },
});
