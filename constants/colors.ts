const Colors = {
  primary: '#10B981',
  primaryDark: '#059669',
  primaryLight: '#D1FAE5',

  secondary: '#2196F3',
  secondaryDark: '#1976D2',
  secondaryLight: '#64B5F6',

  success: '#4CAF50',
  warning: '#FF9800',
  error: '#F44336',
  info: '#2196F3',

  background: '#FFFFFF',
  backgroundSecondary: '#F5F7FA',
  backgroundTertiary: '#E8EEF3',

  text: '#2C3E50',
  textSecondary: '#6B7280',
  textLight: '#95A5A6',
  textWhite: '#FFFFFF',

  border: '#E5E7EB',
  borderLight: '#F0F0F0',

  card: '#FFFFFF',
  cardShadow: 'rgba(0, 0, 0, 0.08)',

  overlay: 'rgba(0, 0, 0, 0.5)',

  gradient: {
    primary: ['#10B981', '#059669'], // Emerald Gradient
    secondary: ['#2196F3', '#64B5F6'],
    success: ['#4CAF50', '#66BB6A'],
    warning: ['#FF9800', '#FFB74D'],
    error: ['#F44336', '#E57373'],
  },

  risk: {
    low: '#4CAF50',


    moderate: '#FF9800',
    high: '#F44336',
  },

  chart: {
    glucose: '#9C27B0',
    bp: '#F44336',
    cholesterol: '#FF9800',
    bmi: '#2196F3',
    heart: '#E91E63',
  },
} as const;

export default Colors;
