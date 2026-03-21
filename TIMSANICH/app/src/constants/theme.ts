export const Colors = {
  primary: '#4A9FE5',
  primaryLight: '#E8F3FC',
  primaryDark: '#3A7FBF',
  white: '#FFFFFF',
  cream: '#FBF9F6',
  warmGray: '#F5F2EF',
  textPrimary: '#2D3142',
  textSecondary: '#6B7280',
  textLight: '#9CA3AF',
  successGreen: '#6BCB77',
  successLight: '#E8F8EA',
  warningAmber: '#F5B461',
  warningLight: '#FFF4E3',
  errorRed: '#EF6461',
  errorLight: '#FDECEC',
  lockedGray: '#D1D5DB',
  lockedGrayLight: '#F3F4F6',
  rewardGold: '#FFD700',
  rewardGoldLight: '#FFF9E0',
  border: '#E5E7EB',
  shadow: 'rgba(0,0,0,0.06)',
  shadowElevated: 'rgba(0,0,0,0.08)',
  overlay: 'rgba(0,0,0,0.3)',
} as const;

export const Typography = {
  headingXL: {
    fontSize: 32,
    fontWeight: '700' as const,
    letterSpacing: -0.5,
    color: Colors.textPrimary,
  },
  headingL: {
    fontSize: 26,
    fontWeight: '700' as const,
    color: Colors.textPrimary,
  },
  headingM: {
    fontSize: 22,
    fontWeight: '600' as const,
    color: Colors.textPrimary,
  },
  headingS: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.textPrimary,
  },
  bodyL: {
    fontSize: 18,
    fontWeight: '400' as const,
    color: Colors.textPrimary,
  },
  bodyM: {
    fontSize: 16,
    fontWeight: '400' as const,
    color: Colors.textSecondary,
  },
  bodyS: {
    fontSize: 14,
    fontWeight: '400' as const,
    color: Colors.textSecondary,
  },
  caption: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: Colors.textLight,
  },
  button: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.white,
  },
  buttonSmall: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
} as const;

export const Spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
  huge: 48,
  massive: 64,
} as const;

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  full: 999,
} as const;

export const Shadows = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  elevated: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  button: {
    shadowColor: '#4A9FE5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
} as const;

export const Layout = {
  screenPaddingH: Spacing.lg,
  cardPadding: Spacing.lg,
  touchTargetMin: 48,
  touchTargetPreferred: 56,
  buttonHeight: 56,
  iconSize: 24,
  iconSizeLarge: 32,
  tabBarHeight: 80,
} as const;
