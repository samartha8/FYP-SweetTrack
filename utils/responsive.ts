import { Dimensions, Platform, PixelRatio } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Base dimensions (Standard Android design: 360x760)
const BASE_WIDTH = 360;
const BASE_HEIGHT = 760;

// Scale factor based on screen width
const scale = SCREEN_WIDTH / BASE_WIDTH;
const verticalScale = SCREEN_HEIGHT / BASE_HEIGHT;

// Moderate scale for better control
export const moderateScale = (size: number, factor: number = 0.5) => {
  return size + (scale - 1) * size * factor;
};

// Responsive width (percentage based)
export const wp = (percentage: number) => {
  return (SCREEN_WIDTH * percentage) / 100;
};

// Responsive height (percentage based)
export const hp = (percentage: number) => {
  return (SCREEN_HEIGHT * percentage) / 100;
};

// Scale font size
export const fontSize = (size: number) => {
  const newSize = moderateScale(size);
  return Math.round(PixelRatio.roundToNearestPixel(newSize));
};

// Scale size (for icons, padding, margins)
export const scaleSize = (size: number) => {
  return moderateScale(size);
};

// Check if device is tablet
export const isTablet = () => {
  return SCREEN_WIDTH >= 768;
};

// Check if device is small screen
export const isSmallScreen = () => {
  return SCREEN_WIDTH < 375;
};

// Get responsive padding
export const getResponsivePadding = (basePadding: number) => {
  if (isTablet()) {
    return basePadding * 1.5;
  }
  if (isSmallScreen()) {
    return basePadding * 0.85;
  }
  return basePadding;
};

// Get responsive margin
export const getResponsiveMargin = (baseMargin: number) => {
  if (isTablet()) {
    return baseMargin * 1.5;
  }
  if (isSmallScreen()) {
    return baseMargin * 0.85;
  }
  return baseMargin;
};

// Get card width for grid layouts
export const getCardWidth = (columns: number = 2, gap: number = 12, padding: number = 20) => {
  const totalGap = gap * (columns - 1);
  const totalPadding = padding * 2;
  return (SCREEN_WIDTH - totalPadding - totalGap) / columns;
};

// Get responsive icon size
export const getIconSize = (baseSize: number) => {
  if (isTablet()) {
    return baseSize * 1.3;
  }
  if (isSmallScreen()) {
    return baseSize * 0.9;
  }
  return baseSize;
};

export { SCREEN_WIDTH, SCREEN_HEIGHT, scale, verticalScale };




