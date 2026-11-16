// Shared CafeSync colors.

export const LIGHT_COLORS = {

  primary: '#0869CB',
  primaryLight: '#2783E3',
  primaryDark: '#074B93',
  primaryGlow: 'rgba(31, 46, 65, 0.08)',


  secondary: '#263950',
  secondaryLight: '#465D78',


  background: '#F1F2F4',
  surface: '#FFFFFF',
  surfaceAlt: '#EDF1F5',
  surfaceMuted: '#DFE4EA',
  cream: '#F1F2F4',
  oat: '#EDF1F5',
  latte: '#DFE4EA',


  text: '#171A20',
  textMid: '#424953',
  textLight: '#606873',


  accent: '#076BCD',
  accentLight: 'rgba(8, 105, 203, 0.12)',
  accentSoft: '#E5F1FF',
  copper: '#4277A8',
  sage: '#5E7C69',
  sageLight: 'rgba(94, 124, 105, 0.12)',
  sageSoft: '#EEF4F0',


  success: '#3E7252',
  successLight: 'rgba(62, 114, 82, 0.12)',
  danger: '#B94435',
  dangerLight: 'rgba(185, 68, 53, 0.12)',
  warning: '#A8681B',
  warningLight: 'rgba(168, 104, 27, 0.12)',
  info: '#466782',
  infoLight: 'rgba(70, 103, 130, 0.12)',


  divider: '#DFE2E6',
  dividerLight: '#E9ECF0',
  cardBorder: 'rgba(31, 46, 65, 0.07)',
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',


  grad1Start: '#0869CB',
  grad1End: '#263950',
  grad2Start: '#076BCD',
  grad2End: '#D97A59',
};

export const DARK_COLORS = {

  primary: '#91C6FF',
  primaryLight: '#DFD4C4',
  primaryDark: '#F5F7FA',
  primaryGlow: 'rgba(239, 231, 220, 0.14)',


  secondary: '#D1BFAC',
  secondaryLight: '#A69280',


  background: '#121519',
  surface: '#1B2026',
  surfaceAlt: '#252C35',
  surfaceMuted: '#333C47',
  cream: '#F1F2F4',
  oat: '#252C35',
  latte: '#333C47',


  text: '#F5F7FA',
  textMid: '#CBD2DB',
  textLight: '#A4AFBD',


  accent: '#85BCFF',
  accentLight: 'rgba(88, 163, 240, 0.18)',
  accentSoft: '#203550',
  copper: '#C68A57',
  sage: '#7AA389',
  sageLight: 'rgba(122, 163, 137, 0.18)',
  sageSoft: '#1A261F',


  success: '#529E70',
  successLight: 'rgba(82, 158, 112, 0.18)',
  danger: '#D85848',
  dangerLight: 'rgba(216, 88, 72, 0.18)',
  warning: '#D48D3B',
  warningLight: 'rgba(212, 141, 59, 0.18)',
  info: '#628FAF',
  infoLight: 'rgba(98, 143, 175, 0.18)',


  divider: '#38404B',
  dividerLight: '#292F38',
  cardBorder: 'rgba(250, 245, 238, 0.08)',
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',


  grad1Start: '#1B2026',
  grad1End: '#252C35',
  grad2Start: '#85BCFF',
  grad2End: '#076BCD',
};

export const SHADOWS = {
  subtle: {
    ios: { shadowColor: '#0869CB', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6 },
    android: { elevation: 2 },
    web: { boxShadow: '0 2px 8px rgba(31, 46, 65, 0.04)' },
  },
  card: {
    ios: { shadowColor: '#0869CB', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12 },
    android: { elevation: 3 },
    web: { boxShadow: '0 4px 16px rgba(31, 46, 65, 0.06)' },
  },
  floating: {
    ios: { shadowColor: '#0869CB', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.12, shadowRadius: 20 },
    android: { elevation: 6 },
    web: { boxShadow: '0 8px 24px rgba(31, 46, 65, 0.12)' },
  },
  hover: {
    ios: { shadowColor: '#0869CB', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.09, shadowRadius: 16 },
    android: { elevation: 4 },
    web: { boxShadow: '0 6px 20px rgba(31, 46, 65, 0.09)' },
  },
};


export const COLORS = LIGHT_COLORS;
