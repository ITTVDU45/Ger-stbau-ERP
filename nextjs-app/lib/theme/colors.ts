// Theme tokens adopted from legacy frontend and adapted for the new app
const colors = {
  primary: {
    main: '#a3e635',
    light: '#c7e70c',
    dark: '#89cb28'
  },

  secondary: {
    main: '#1b3a4b',
    light: '#2c5364',
    dark: '#142c3a'
  },

  accent: {
    blue: '#2c5282',
    white: '#ffffff'
  },

  background: {
    gradientGreen: 'linear-gradient(135deg, #a3e635, #c7e70c)',
    gradientBlue: 'linear-gradient(135deg, #1b3a4b, #2c5364)',
    paper: '#ffffff',
    dark: '#1b3a4b'
  },

  text: {
    // keep `onPrimary` name used across the app
    onPrimary: '#1b3a4b',
    onDark: '#ffffff'
  },

  shadows: {
    sm: '0 1px 3px 0 rgb(0 0 0 / 0.1)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1)'
  },

  hover: {
    green: 'rgba(163, 230, 53, 0.08)',
    blue: 'rgba(43, 83, 100, 0.08)',
    dark: 'rgba(27, 58, 75, 0.08)'
  }
}

export type Colors = typeof colors
export default colors


