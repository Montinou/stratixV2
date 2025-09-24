import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

// TODO: Replace Supabase queries with API calls
// This file needs manual migration to use API endpoints


function findFilesWithSupabase(dir: string): string[] {
  const files: string[] = [];
  
  function walk(currentDir: string) {
    const items = readdirSync(currentDir);
    
    for (const item of items) {
      const itemPath = join(currentDir, item);
      const stat = statSync(itemPath);
      
      if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
        walk(itemPath);
      } else if (stat.isFile() && (item.endsWith('.ts') || item.endsWith('.tsx'))) {
        const content = readFileSync(itemPath, 'utf-8');
        if (content.includes('@supabase') || content.includes('supabase')) {
          files.push(itemPath);
        }
      }
    }
  }
  
  walk(dir);
  return files;
}

function removeSupabaseImports(filePath: string) {
  console.log(`Processing: ${filePath}`);
  
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  
  const filteredLines = lines.filter(line => {
    // Remove Supabase imports
      console.log(`  Removing import: ${line.trim()}`);
      return false;
    }
    
    // Remove createClient calls
      console.log(`  Removing createClient: ${line.trim()}`);
      return false;
    }
    
    return true;
  });
  
  // Replace Supabase queries with API calls (basic replacements)
  let newContent = filteredLines.join('\n');
  
  // Add comment for files that need manual fixes
  if (content.includes('supabase.from(') || content.includes('.from("')) {
    const warningComment = `// TODO: Replace Supabase queries with API calls\n// This file needs manual migration to use API endpoints\n\n`;
    
    // Find first non-import line to add comment
    const firstNonImportIndex = filteredLines.findIndex(line => 
      !line.startsWith('import') && !line.startsWith('//') && line.trim() !== ''
    );
    
    if (firstNonImportIndex !== -1) {
      filteredLines.splice(firstNonImportIndex, 0, warningComment);
      newContent = filteredLines.join('\n');
    }
  }
  
  writeFileSync(filePath, newContent);
}

async function main() {
  console.log('🔍 Finding files with Supabase imports...');
  
  const projectDir = process.cwd();
  const files = findFilesWithSupabase(projectDir);
  
  console.log(`\n📁 Found ${files.length} files with Supabase references:`);
  files.forEach(file => console.log(`  - ${file}`));
  
  console.log('\n🧹 Removing Supabase imports...');
  
  for (const file of files) {
    try {
      removeSupabaseImports(file);
    } catch (error) {
      console.error(`❌ Error processing ${file}:`, error);
    }
  }
  
  console.log('\n✅ Supabase imports removed!');
  console.log('⚠️  Note: Files with Supabase queries have TODO comments for manual migration.');
}

if (require.main === module) {
  main();
}

export { removeSupabaseImports };