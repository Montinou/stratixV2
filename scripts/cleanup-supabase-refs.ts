import { readFileSync, writeFileSync } from 'fs';

const filesToFix = [
  'components/okr/initiative-form.tsx',
  'components/okr/activity-form.tsx',
  'components/dashboard/dashboard-content.tsx',
  'app/team/page.tsx',
  'app/insights/page.tsx',
  'app/initiatives/page.tsx',
  'app/companies/page.tsx',
  'app/analytics/page.tsx',
  'app/activities/page.tsx',
  'lib/utils/file-import.ts'
];

function cleanupFile(filePath: string) {
  console.log(`Cleaning up ${filePath}`);
  const content = readFileSync(filePath, 'utf-8');
  
  // Replace supabase.from() calls with placeholder comments
  let cleaned = content.replace(/supabase\.from\([^)]*\)[^}]*}/g, '/* TODO: Replace with API call */');
  cleaned = cleaned.replace(/supabase\.auth\.[^}]*}/g, '/* TODO: Replace with NeonAuth */');
  cleaned = cleaned.replace(/supabase\.[^;]*;/g, '/* TODO: Replace with API call */');
  
  // Remove any remaining supabase references in variable assignments
  cleaned = cleaned.replace(/const.*supabase.*$/gm, '/* TODO: Replace with API call */');
  cleaned = cleaned.replace(/let.*supabase.*$/gm, '/* TODO: Replace with API call */');
  
  writeFileSync(filePath, cleaned);
}

filesToFix.forEach(file => {
  try {
    cleanupFile(file);
  } catch (error) {
    console.error(`Error cleaning ${file}:`, error);
  }
});

console.log('✅ Cleanup completed!');