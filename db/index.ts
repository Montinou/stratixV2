import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema';
import * as okrSchema from './okr-schema';
import * as aiSchema from './ai-schema';
import { usersSyncInNeonAuth } from './neon_auth_schema';

const connectionString = process.env.DATABASE_URL!;
const db = drizzle(connectionString, {
  schema: {
    ...schema,
    ...okrSchema,
    ...aiSchema,
    usersSyncInNeonAuth
  }
});

export default db;
