export const COLORS = {
  primary: '#5438f5',
  primaryDark: '#4328d6',
  primarySoft: '#eef2ff',
  navy: '#0f172a',
  navySoft: '#1e293b',
  teal: '#14b8a6',
  tealDark: '#0f766e',
  tealSoft: '#f0fdfa',
  canvas: '#f8fafc',
  surface: '#ffffff',
  line: '#e2e8f0',
  slate100: '#f1f5f9',
  slate300: '#cbd5e1',
  slate400: '#94a3b8',
  slate500: '#64748b',
  slate600: '#475569',
  success: '#16a34a',
  successSoft: '#f0fdf4',
  warning: '#f59e0b',
  warningSoft: '#fffbeb',
  warningText: '#b45309',
  danger: '#dc2626',
  dangerSoft: '#fef2f2',
} as const;

export const CARD_SHADOW = {
  shadowColor: '#0f172a',
  shadowOpacity: 0.06,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: 2 },
  elevation: 2,
} as const;

export const FLOAT_SHADOW = {
  shadowColor: '#0f172a',
  shadowOpacity: 0.12,
  shadowRadius: 16,
  shadowOffset: { width: 0, height: 6 },
  elevation: 6,
} as const;

export const PRIMARY_SHADOW = {
  shadowColor: '#5438f5',
  shadowOpacity: 0.28,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 6 },
  elevation: 5,
} as const;
