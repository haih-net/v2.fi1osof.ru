const breakpoints = {
  xs: 560,
  sm: 800,
  md: 1050,
  lg: 1200,
  xl: 1440,
} as const

const colors = {
  // Primary colors
  primary: '#173f2e',
  secondary: '#68716a',
  foreground: '#20372c',
  background: '#ffffff',
  muted: '#9ca3af',

  // States
  success: '#10b981',
  successBg: '#ecfdf5',
  error: '#ef4444',
  errorBg: '#fef2f2',
  warning: '#f59e0b',
  warningBg: '#fffbeb',
  info: '#3b82f6',
  infoBg: '#eff6ff',

  // Text
  text: {
    primary: '#20372c',
    secondary: '#68716a',
    disabled: '#9ca3af',
    light: '#ffffff',
  },
  textMuted: '#9ca3af',

  // Borders and dividers
  divider: '#e2e4da',
  border: '#e2e4da',
  borderHover: '#d1d5db',

  // Special
  star: '#fbbf24',
  starEmpty: '#e5e7eb',

  // Gray scale (Tailwind)
  gray: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
  },
} as const

const backgrounds = {
  page: '#faf9f5',
  paper: '#ffffff',
  elevated: '#ffffff',
  overlay: 'rgba(0, 0, 0, 0.5)',
} as const

export const theme = {
  font: "'Nunito', Arial, sans-serif",
  colors,
  backgrounds,
  breakpoints,

  fontSizes: {
    xs: '12px',
    sm: '14px',
    md: '16px',
    lg: '18px',
    xl: '20px',
  },

  spacing: {
    xs: '4px',
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '24px',
  },

  radii: {
    sm: '4px',
    md: '6px',
    lg: '8px',
    full: '9999px',
  },

  shadows: {
    sm: '0 1px 2px rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px rgba(0, 0, 0, 0.1)',
    focus: '0 0 0 3px rgba(23, 63, 46, 0.18)',
  },

  transitions: {
    fast: '0.15s ease',
    normal: '0.2s ease',
  },

  zIndex: {
    dropdown: 100,
    sticky: 200,
    header: 300,
    overlay: 400,
    modal: 1000,
    popover: 1100,
    tooltip: 1200,
  },
}

export type Theme = typeof theme

export type ThemeProps = { theme?: Theme }
