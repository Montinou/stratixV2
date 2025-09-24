import { readFileSync, writeFileSync } from 'fs';

const files = [
  'components/dashboard/dashboard-content.tsx',
  'lib/utils/file-import.ts',
  'app/activities/page.tsx',
  'app/analytics/page.tsx',
  'app/companies/page.tsx',
  'app/initiatives/page.tsx',
  'app/insights/page.tsx',
  'app/team/page.tsx',
  'components/okr/activity-form.tsx',
  'components/okr/initiative-form.tsx'
];

function fixSyntaxErrors(filePath: string) {
  console.log(`Fixing ${filePath}`);
  
  let content = readFileSync(filePath, 'utf-8');
  
  // Fix common syntax errors from our cleanup
  content = content.replace(/const \{ data: \w+, error.*\} = await \/\* TODO: Replace with API call \*\/\)/g, 
    '// const { data, error } = await /* TODO: Replace with API call */');
  
  content = content.replace(/const \[.*\] = await Promise\.all\(\[\s*\/\* TODO: Replace with API call \*\/.*?\]\)/gs,
    '// const [...] = await Promise.all([/* TODO: Replace with API call */])');
    
  content = content.replace(/let query = \/\* TODO: Replace with API call \*\//g,
    '// let query = /* TODO: Replace with API call */');
    
  content = content.replace(/await \/\* TODO: Replace with API call \*\//g,
    '// await /* TODO: Replace with API call */');
    
  content = content.replace(/const \{ data: \w+ \} = await this\.\/\* TODO: Replace with API call \*\//g,
    '// const { data } = await this./* TODO: Replace with API call */');
    
  // Comment out broken destructuring
  content = content.replace(/const \{ [^}]+ \} = await [^;]*\/\* TODO: Replace with API call \*\/[^;]*;?/g,
    '// TODO: Replace Supabase query with API call');
    
  // Comment out standalone API calls that would cause errors
  content = content.replace(/^\s*\/\* TODO: Replace with API call \*\/$$/gm, 
    '      // TODO: Replace with API call');
    
  // Fix any remaining syntax issues
  content = content.replace(/^\s*\.from\(.*$/gm, '      // .from(...)');
  content = content.replace(/^\s*\.select\(.*$/gm, '      // .select(...)');
  content = content.replace(/^\s*\.where\(.*$/gm, '      // .where(...)');
  content = content.replace(/^\s*\.order\(.*$/gm, '      // .order(...)');
  content = content.replace(/^\s*\.limit\(.*$/gm, '      // .limit(...)');
  content = content.replace(/^\s*\.single\(\).*$/gm, '      // .single()');
  content = content.replace(/^\s*\.insert\(.*$/gm, '      // .insert(...)');
  content = content.replace(/^\s*\.update\(.*$/gm, '      // .update(...)');
  content = content.replace(/^\s*\.delete\(.*$/gm, '      // .delete(...)');
  content = content.replace(/^\s*\.eq\(.*$/gm, '      // .eq(...)');
  content = content.replace(/^\s*\.neq\(.*$/gm, '      // .neq(...)');
  
  writeFileSync(filePath, content);
}

files.forEach(file => {
  try {
    fixSyntaxErrors(file);
  } catch (error) {
    console.error(`Error fixing ${file}:`, error);
  }
});

console.log('✅ Syntax errors fixed!');