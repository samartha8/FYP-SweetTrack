import { StyleSheet, Text, type TextProps } from 'react-native';

import { useThemeColor } from '@/hooks/use-theme-color';
import { useTheme } from '@/contexts/SettingsContext';

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?: 'default' | 'title' | 'defaultSemiBold' | 'subtitle' | 'link';
};

export function ThemedText({
  style,
  lightColor,
  darkColor,
  type = 'default',
  ...rest
}: ThemedTextProps) {
  const color = useThemeColor({ light: lightColor, dark: darkColor }, 'text');
  const { scale } = useTheme();

  const getVariantStyles = () => {
    switch (type) {
      case 'title':
        return {
          fontSize: scale(32),
          fontWeight: 'bold' as const,
          lineHeight: scale(32),
        };
      case 'subtitle':
        return {
          fontSize: scale(20),
          fontWeight: 'bold' as const,
        };
      case 'defaultSemiBold':
        return {
          fontSize: scale(16),
          lineHeight: scale(24),
          fontWeight: '600' as const,
        };
      case 'link':
        return {
          fontSize: scale(16),
          lineHeight: scale(30),
          color: '#0a7ea4',
        };
      default:
        return {
          fontSize: scale(16),
          lineHeight: scale(24),
        };
    }
  };

  return (
    <Text
      style={[
        { color },
        getVariantStyles(),
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  default: {
    fontSize: 16,
    lineHeight: 24,
  },
  defaultSemiBold: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '600',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    lineHeight: 32,
  },
  subtitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  link: {
    lineHeight: 30,
    fontSize: 16,
    color: '#0a7ea4',
  },
});
