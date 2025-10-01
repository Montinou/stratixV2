import { TemplateService } from '../lib/services/template-service';
import * as fs from 'fs';
import * as path from 'path';

// Test template generation
async function testTemplates() {
  console.log('🧪 Testing Template Generation...\n');

  const types = ['objectives', 'initiatives', 'activities', 'users'] as const;
  const formats = ['csv', 'xlsx'] as const;

  // Create output directory
  const outputDir = path.join(process.cwd(), 'test-templates');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
  }

  for (const type of types) {
    console.log(`\n📋 Testing ${type} templates:`);

    // Get metadata
    try {
      const metadata = TemplateService.getTemplateMetadata(type);
      console.log(`  ✅ Metadata retrieved:`);
      console.log(`     - Required fields: ${metadata.requiredFields.join(', ')}`);
      console.log(`     - Optional fields: ${metadata.optionalFields.join(', ')}`);
      console.log(`     - Example rows: ${metadata.exampleRowsCount}`);
    } catch (error: any) {
      console.log(`  ❌ Failed to get metadata: ${error.message}`);
    }

    for (const format of formats) {
      try {
        console.log(`  📄 Generating ${format.toUpperCase()} template...`);
        const content = TemplateService.generateTemplate(type, format);

        // Save to file
        const filename = `template_${type}.${format}`;
        const filepath = path.join(outputDir, filename);

        if (format === 'csv') {
          fs.writeFileSync(filepath, content as string, 'utf-8');
        } else {
          fs.writeFileSync(filepath, content as Buffer);
        }

        console.log(`     ✅ Saved to: ${filepath}`);

        // Check file size
        const stats = fs.statSync(filepath);
        console.log(`     📊 File size: ${(stats.size / 1024).toFixed(2)} KB`);

        // For CSV, count rows
        if (format === 'csv') {
          const lines = (content as string).split('\n');
          console.log(`     📊 Rows in CSV: ${lines.length}`);
        }
      } catch (error: any) {
        console.log(`     ❌ Failed: ${error.message}`);
      }
    }
  }

  console.log('\n\n✨ Template generation test completed!');
  console.log(`📁 Templates saved in: ${outputDir}`);
}

// Run tests
testTemplates().catch(console.error);