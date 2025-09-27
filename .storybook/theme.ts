import { create } from '@storybook/theming/create'

export default create({
  base: 'light',
  brandTitle: 'StratixV2 Design System',
  brandUrl: 'https://github.com/Montinou/stratixV2',
  brandTarget: '_self',

  // Colors
  colorPrimary: '#3b82f6', // Blue-500
  colorSecondary: '#64748b', // Slate-500

  // UI
  appBg: '#ffffff',
  appContentBg: '#f8fafc',
  appBorderColor: '#e2e8f0',
  appBorderRadius: 8,

  // Typography
  fontBase: '"Inter", sans-serif',
  fontCode: '"JetBrains Mono", monospace',

  // Text colors
  textColor: '#1e293b',
  textInverseColor: '#ffffff',

  // Toolbar default and active colors
  barTextColor: '#64748b',
  barSelectedColor: '#3b82f6',
  barBg: '#ffffff',

  // Form colors
  inputBg: '#ffffff',
  inputBorder: '#d1d5db',
  inputTextColor: '#1f2937',
  inputBorderRadius: 6,
})