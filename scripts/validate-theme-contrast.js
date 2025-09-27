#!/usr/bin/env node

// This script validates color contrast compliance for both light and dark themes
const fs = require('fs');
const path = require('path');

// Color contrast calculation functions
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) {
    throw new Error(`Invalid hex color: ${hex}`);
  }
  return [
    parseInt(result[1], 16),
    parseInt(result[2], 16),
    parseInt(result[3], 16)
  ];
}

function getLuminance([r, g, b]) {
  const [rL, gL, bL] = [r, g, b].map(value => {
    const sRGB = value / 255;
    return sRGB <= 0.03928
      ? sRGB / 12.92
      : Math.pow((sRGB + 0.055) / 1.055, 2.4);
  });

  return 0.2126 * rL + 0.7152 * gL + 0.0722 * bL;
}

function getContrastRatio(color1, color2) {
  const lum1 = getLuminance(color1);
  const lum2 = getLuminance(color2);

  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);

  return (brightest + 0.05) / (darkest + 0.05);
}

function validateContrast(foreground, background, isLargeText = false) {
  const fg = hexToRgb(foreground);
  const bg = hexToRgb(background);
  const ratio = getContrastRatio(fg, bg);

  const aaThreshold = isLargeText ? 3 : 4.5;
  const aaaThreshold = isLargeText ? 4.5 : 7;

  return {
    ratio: Math.round(ratio * 100) / 100,
    passesAA: ratio >= aaThreshold,
    passesAAA: ratio >= aaaThreshold,
    level: ratio >= aaaThreshold ? 'AAA' : ratio >= aaThreshold ? 'AA' : 'FAIL'
  };
}

// Convert oklch to approximate hex (simplified conversion)
function oklchToHex(oklchString) {
  // This is a simplified conversion - in practice you'd want a proper oklch to hex conversion
  // For the purpose of this validation, we'll map the known oklch values to their hex equivalents
  const oklchMap = {
    'oklch(1 0 0)': '#ffffff',           // white
    'oklch(0.145 0 0)': '#222222',       // very dark gray
    'oklch(0.985 0 0)': '#fafafa',       // very light gray
    'oklch(0.205 0 0)': '#333333',       // dark gray
    'oklch(0.97 0 0)': '#f5f5f5',        // light gray
    'oklch(0.45 0 0)': '#737373',        // darker medium gray
    'oklch(0.922 0 0)': '#e5e5e5',       // light border
    'oklch(0.708 0 0)': '#b0b0b0',       // medium border
    'oklch(0.269 0 0)': '#444444',       // dark mode surface
    'oklch(0.439 0 0)': '#707070',       // dark mode border
    'oklch(0.577 0.245 27.325)': '#dc2626', // destructive red
    'oklch(0.396 0.141 25.723)': '#b91c1c', // dark destructive red
    'oklch(0.637 0.237 25.331)': '#ef4444', // destructive foreground
  };

  return oklchMap[oklchString] || '#888888'; // fallback to gray
}

// Theme color definitions
const themes = {
  light: {
    background: 'oklch(1 0 0)',
    foreground: 'oklch(0.145 0 0)',
    card: 'oklch(1 0 0)',
    cardForeground: 'oklch(0.145 0 0)',
    popover: 'oklch(1 0 0)',
    popoverForeground: 'oklch(0.145 0 0)',
    primary: 'oklch(0.205 0 0)',
    primaryForeground: 'oklch(0.985 0 0)',
    secondary: 'oklch(0.97 0 0)',
    secondaryForeground: 'oklch(0.205 0 0)',
    muted: 'oklch(0.97 0 0)',
    mutedForeground: 'oklch(0.45 0 0)',
    accent: 'oklch(0.97 0 0)',
    accentForeground: 'oklch(0.205 0 0)',
    destructive: 'oklch(0.577 0.245 27.325)',
    destructiveForeground: 'oklch(0.985 0 0)',
    border: 'oklch(0.922 0 0)',
    input: 'oklch(0.922 0 0)',
    ring: 'oklch(0.708 0 0)'
  },
  dark: {
    background: 'oklch(0.145 0 0)',
    foreground: 'oklch(0.985 0 0)',
    card: 'oklch(0.145 0 0)',
    cardForeground: 'oklch(0.985 0 0)',
    popover: 'oklch(0.145 0 0)',
    popoverForeground: 'oklch(0.985 0 0)',
    primary: 'oklch(0.985 0 0)',
    primaryForeground: 'oklch(0.205 0 0)',
    secondary: 'oklch(0.269 0 0)',
    secondaryForeground: 'oklch(0.985 0 0)',
    muted: 'oklch(0.269 0 0)',
    mutedForeground: 'oklch(0.708 0 0)',
    accent: 'oklch(0.269 0 0)',
    accentForeground: 'oklch(0.985 0 0)',
    destructive: 'oklch(0.396 0.141 25.723)',
    destructiveForeground: 'oklch(0.985 0 0)',
    border: 'oklch(0.269 0 0)',
    input: 'oklch(0.269 0 0)',
    ring: 'oklch(0.439 0 0)'
  }
};

// Critical color combinations to test
const combinations = [
  { name: 'Body text', fg: 'foreground', bg: 'background', critical: true },
  { name: 'Primary button', fg: 'primaryForeground', bg: 'primary', critical: true },
  { name: 'Secondary button', fg: 'secondaryForeground', bg: 'secondary', critical: true },
  { name: 'Muted text', fg: 'mutedForeground', bg: 'background', critical: true },
  { name: 'Card content', fg: 'cardForeground', bg: 'card', critical: true },
  { name: 'Destructive button', fg: 'destructiveForeground', bg: 'destructive', critical: true },
  { name: 'Input field', fg: 'foreground', bg: 'background', critical: true },
  { name: 'Border visibility', fg: 'border', bg: 'background', critical: false }
];

function validateTheme(themeName) {
  console.log(`\n🎨 Validating ${themeName} theme colors:`);
  console.log('=' .repeat(50));

  const theme = themes[themeName];
  const results = [];
  let criticalFailures = 0;

  combinations.forEach(combo => {
    const fgColor = oklchToHex(theme[combo.fg]);
    const bgColor = oklchToHex(theme[combo.bg]);

    try {
      const result = validateContrast(fgColor, bgColor);
      results.push({
        ...combo,
        ...result,
        fgColor,
        bgColor
      });

      const status = result.level === 'AAA' ? '✅ AAA' :
                   result.level === 'AA' ? '✅ AA' :
                   '❌ FAIL';

      console.log(`${status} ${combo.name.padEnd(20)} ${result.ratio}:1`);

      if (result.level === 'FAIL' && combo.critical) {
        criticalFailures++;
      }
    } catch (error) {
      console.log(`❌ ERROR ${combo.name.padEnd(20)} ${error.message}`);
      if (combo.critical) criticalFailures++;
    }
  });

  return { results, criticalFailures };
}

function generateReport() {
  console.log('\n🔍 Theme Color Contrast Validation Report');
  console.log('=========================================\n');

  const lightResults = validateTheme('light');
  const darkResults = validateTheme('dark');

  console.log('\n📊 Summary:');
  console.log('----------');

  const totalCritical = combinations.filter(c => c.critical).length;

  console.log(`Light theme: ${totalCritical - lightResults.criticalFailures}/${totalCritical} critical combinations pass`);
  console.log(`Dark theme:  ${totalCritical - darkResults.criticalFailures}/${totalCritical} critical combinations pass`);

  const overallPass = lightResults.criticalFailures === 0 && darkResults.criticalFailures === 0;

  console.log(`\n${overallPass ? '✅' : '❌'} Overall accessibility: ${overallPass ? 'PASS' : 'FAIL'}`);

  if (!overallPass) {
    console.log('\n⚠️  Critical Issues Found:');

    if (lightResults.criticalFailures > 0) {
      console.log(`  - Light theme has ${lightResults.criticalFailures} critical contrast failures`);
    }

    if (darkResults.criticalFailures > 0) {
      console.log(`  - Dark theme has ${darkResults.criticalFailures} critical contrast failures`);
    }

    console.log('\n💡 Recommendations:');
    console.log('  - Review failing color combinations');
    console.log('  - Consider adjusting color values in globals.css');
    console.log('  - Test with actual users who have vision difficulties');
    console.log('  - Use browser accessibility tools for validation');
  }

  console.log('\n📋 WCAG 2.1 Guidelines:');
  console.log('  - AA Level: 4.5:1 for normal text, 3:1 for large text');
  console.log('  - AAA Level: 7:1 for normal text, 4.5:1 for large text');
  console.log('  - Large text: 18pt+ or 14pt+ bold');

  return overallPass;
}

// Run the validation
if (require.main === module) {
  const passed = generateReport();
  process.exit(passed ? 0 : 1);
}

module.exports = { validateTheme, generateReport };