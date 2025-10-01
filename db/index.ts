import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
import * as okrSchema from './okr-schema';
import * as aiSchema from './ai-schema';
import * as importSchema from './import-schema';
import { usersSyncInNeonAuth } from './neon_auth_schema';

const connectionString = process.env.DATABASE_URL!;

// Create a connection pool for better serverless performance
const pool = new Pool({
  connectionString,
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

const db = drizzle(pool, {
  schema: {
    ...schema,
    ...okrSchema,
    ...aiSchema,
    ...importSchema,
    usersSyncInNeonAuth
  }
});

export default db;
