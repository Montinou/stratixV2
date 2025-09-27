#!/usr/bin/env node

// Comprehensive accessibility validation for the onboarding system
const fs = require('fs');
const path = require('path');

console.log('🔍 Onboarding Accessibility Validation');
console.log('=====================================\n');

// 1. Color Contrast Validation
console.log('1️⃣ Color Contrast Validation');
console.log('----------------------------');

let contrastPassed = false;
try {
  const contrastValidation = require('./validate-theme-contrast.js');
  contrastPassed = contrastValidation.generateReport();
  console.log(`✅ Color contrast: ${contrastPassed ? 'PASS' : 'FAIL'}\n`);
} catch (error) {
  console.log('❌ Color contrast validation failed:', error.message);
}

// 2. Component Structure Validation
console.log('2️⃣ Component Structure Validation');
console.log('----------------------------------');

const componentChecks = [
  {
    name: 'Theme Provider Integration',
    file: 'components/theme-provider.tsx',
    checks: [
      'useAccessibilityTheme',
      'prefers-reduced-motion',
      'prefers-contrast',
      'forced-colors'
    ]
  },
  {
    name: 'Accessibility Provider',
    file: 'components/onboarding/AccessibilityProvider.tsx',
    checks: [
      'aria-live',
      'focus management',
      'announceStep',
      'useFocusTrap'
    ]
  },
  {
    name: 'Wizard Navigation',
    file: 'components/onboarding/WizardNavigation.tsx',
    checks: [
      'role="navigation"',
      'aria-label',
      'keyboard navigation',
      'aria-describedby'
    ]
  },
  {
    name: 'Wizard Container',
    file: 'components/onboarding/WizardContainer.tsx',
    checks: [
      'SkipLink',
      'role="main"',
      'aria-label',
      'AccessibilityProvider'
    ]
  }
];

let componentsPassed = 0;

componentChecks.forEach(component => {
  const filePath = path.join(__dirname, '..', component.file);

  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    let checksPassed = 0;

    component.checks.forEach(check => {
      if (content.includes(check)) {
        checksPassed++;
      }
    });

    const passed = checksPassed === component.checks.length;
    console.log(`${passed ? '✅' : '❌'} ${component.name}: ${checksPassed}/${component.checks.length} checks passed`);

    if (passed) componentsPassed++;
  } else {
    console.log(`❌ ${component.name}: File not found`);
  }
});

console.log(`\nComponents: ${componentsPassed}/${componentChecks.length} passed\n`);

// 3. CSS Accessibility Features
console.log('3️⃣ CSS Accessibility Features');
console.log('------------------------------');

const cssFile = path.join(__dirname, '..', 'app/globals.css');
const cssFeatures = [
  { name: 'Screen reader only classes', pattern: /\.sr-only/ },
  { name: 'Reduced motion support', pattern: /@media \(prefers-reduced-motion: reduce\)/ },
  { name: 'High contrast support', pattern: /@media \(prefers-contrast: high\)/ },
  { name: 'Forced colors support', pattern: /@media \(forced-colors: active\)/ },
  { name: 'Focus visible styles', pattern: /:focus-visible/ },
  { name: 'Focus indicators', pattern: /focus:ring|focus-visible:ring/ },
  { name: 'Skip link styles', pattern: /\.skip-link/ }
];

let cssPassed = 0;

if (fs.existsSync(cssFile)) {
  const cssContent = fs.readFileSync(cssFile, 'utf8');

  cssFeatures.forEach(feature => {
    const found = feature.pattern.test(cssContent);
    console.log(`${found ? '✅' : '❌'} ${feature.name}`);
    if (found) cssPassed++;
  });
} else {
  console.log('❌ globals.css not found');
}

console.log(`\nCSS Features: ${cssPassed}/${cssFeatures.length} implemented\n`);

// 4. Dependencies Check
console.log('4️⃣ Accessibility Dependencies');
console.log('------------------------------');

const packageJsonPath = path.join(__dirname, '..', 'package.json');
const requiredDeps = [
  'axe-core',
  'jest-axe',
  '@axe-core/react',
  '@testing-library/jest-dom',
  'next-themes'
];

let depsPassed = 0;

if (fs.existsSync(packageJsonPath)) {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies };

  requiredDeps.forEach(dep => {
    const installed = allDeps[dep];
    console.log(`${installed ? '✅' : '❌'} ${dep}${installed ? ` (${installed})` : ''}`);
    if (installed) depsPassed++;
  });
} else {
  console.log('❌ package.json not found');
}

console.log(`\nDependencies: ${depsPassed}/${requiredDeps.length} installed\n`);

// 5. Testing Infrastructure
console.log('5️⃣ Testing Infrastructure');
console.log('--------------------------');

const testingFiles = [
  { name: 'Accessibility Testing Utils', path: 'lib/utils/accessibility-testing.ts' },
  { name: 'Color Contrast Utils', path: 'lib/utils/color-contrast.ts' },
  { name: 'Accessibility Test Panel', path: 'components/onboarding/AccessibilityTestPanel.tsx' },
  { name: 'Theme Contrast Validation', path: 'scripts/validate-theme-contrast.js' },
  { name: 'Testing Documentation', path: 'docs/accessibility-testing-guide.md' }
];

let testingPassed = 0;

testingFiles.forEach(file => {
  const filePath = path.join(__dirname, '..', file.path);
  const exists = fs.existsSync(filePath);
  console.log(`${exists ? '✅' : '❌'} ${file.name}`);
  if (exists) testingPassed++;
});

console.log(`\nTesting Infrastructure: ${testingPassed}/${testingFiles.length} files present\n`);

// Final Summary
console.log('📊 FINAL ACCESSIBILITY AUDIT SUMMARY');
console.log('====================================');

const categories = [
  { name: 'Color Contrast', passed: contrastPassed ? 1 : 0, total: 1 },
  { name: 'Component Structure', passed: componentsPassed, total: componentChecks.length },
  { name: 'CSS Features', passed: cssPassed, total: cssFeatures.length },
  { name: 'Dependencies', passed: depsPassed, total: requiredDeps.length },
  { name: 'Testing Infrastructure', passed: testingPassed, total: testingFiles.length }
];

let totalPassed = 0;
let totalChecks = 0;

categories.forEach(category => {
  const percentage = Math.round((category.passed / category.total) * 100);
  console.log(`${category.name.padEnd(25)} ${category.passed}/${category.total} (${percentage}%)`);
  totalPassed += category.passed;
  totalChecks += category.total;
});

const overallPercentage = Math.round((totalPassed / totalChecks) * 100);
const overallPass = overallPercentage >= 90; // 90% threshold for pass

console.log('\n' + '='.repeat(50));
console.log(`Overall Accessibility Score: ${totalPassed}/${totalChecks} (${overallPercentage}%)`);
console.log(`Status: ${overallPass ? '✅ PASS' : '❌ NEEDS IMPROVEMENT'}`);

if (overallPass) {
  console.log('\n🎉 Excellent! The onboarding system meets high accessibility standards.');
  console.log('\n📋 Next Steps:');
  console.log('  ✓ Manual testing with screen readers');
  console.log('  ✓ User testing with people who use assistive technology');
  console.log('  ✓ Regular accessibility audits');
  console.log('  ✓ Monitor user feedback and support requests');
} else {
  console.log('\n⚠️  Areas needing attention:');

  categories.forEach(category => {
    const percentage = Math.round((category.passed / category.total) * 100);
    if (percentage < 90) {
      console.log(`  • ${category.name}: ${percentage}% complete`);
    }
  });
}

console.log('\n📚 Resources:');
console.log('  • Testing Guide: docs/accessibility-testing-guide.md');
console.log('  • WCAG 2.1 Guidelines: https://www.w3.org/WAI/WCAG21/quickref/');
console.log('  • axe DevTools: https://www.deque.com/axe/devtools/');

// Generate timestamp for report
const timestamp = new Date().toISOString();
console.log(`\n🕒 Report generated: ${timestamp}`);

// Exit with appropriate code
process.exit(overallPass ? 0 : 1);