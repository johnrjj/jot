const palette = {
  white: '#FFFFFF',
  ghostWhite: '#F9FAFB',
  offblack: '#31323B',
  platinum: 'DDE4EA',
  darkGray: 'A7A7A9',
  dimGray: '73656',
  paleSilver: 'C5B2AC',
  skyBlue: '8AD0DE',
  carminePink: 'F84B4B',
  uclaGold: 'FFB305',
  papayaWhip: 'FFF4D7',
  mediumSlateBlue: '6C79EB',
  aliceBlue: 'F1F2FF',
  emerald: '53C278',
  honeydew: 'E2FFED',
  paynesGrey: '393E53',
};

const colors = {
  white: {
    normal: palette.white,
    lightGrayWhite: palette.ghostWhite,
  },
  black: {
    normal: palette.offblack,
    light: palette.paynesGrey,
  },
  pink: {
    normal: palette.carminePink,
  },
  yellow: {
    normal: palette.uclaGold,
    light: palette.papayaWhip,
  },
  purple: {
    normal: palette.mediumSlateBlue,
    light: palette.aliceBlue,
  },
  green: {
    normal: palette.emerald,
    light: palette.honeydew,
  },
  gray: {
    light: palette.platinum,
    dark: palette.darkGray,
    darker: palette.dimGray,
  },
  lightBlue: {
    normal: palette.skyBlue,
  },
};

const spacing = {
  xsmall: '0.5rem',
  small: '1rem',
  medium: '2rem',
  large: '4rem',
  xlarge: '6rem',
};

const fontSizing = {
  medium: '2rem',
  large: '3rem',
  xlarge: '4rem',
};

const theme = {
  editor: {
    primaryTextColor: colors.black.light,
  },
};

export { spacing, theme, fontSizing, colors };
