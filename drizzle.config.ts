import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';
export default defineConfig({
  out: './drizzle',
  schema: ['./db/schema.ts', './db/okr-schema.ts', './db/ai-schema.ts', './db/import-schema.ts'],
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  schemaFilter: ['public', 'neon_auth'],
});
