import { Pool, PoolClient, QueryResult } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema';

// Database configuration
const dbConfig = {
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20, // maximum number of clients in the pool
  idleTimeoutMillis: 30000, // how long a client is allowed to remain idle before being closed
  connectionTimeoutMillis: 2000, // how long to wait when connecting a new client
  maxUses: 7500, // close (and replace) a connection after it has been used 7500 times
};

// Create a global connection pool
let pool: Pool | null = null;
let drizzleDb: ReturnType<typeof drizzle> | null = null;

export function getPool(): Pool {
  if (!pool) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is not set');
    }
    pool = new Pool(dbConfig);
    
    // Handle pool errors
    pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err);
    });
  }
  return pool;
}

// Get Drizzle database instance
export function getDrizzleDb() {
  if (!drizzleDb) {
    const pool = getPool();
    drizzleDb = drizzle(pool, { schema });
  }
  return drizzleDb;
}

// Database query wrapper with proper error handling
export async function query<T = any>(
  text: string, 
  params?: any[]
): Promise<QueryResult<T>> {
  const pool = getPool();
  let client: PoolClient | null = null;
  
  try {
    client = await pool.connect();
    const result = await client.query<T>(text, params);
    return result;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  } finally {
    if (client) {
      client.release();
    }
  }
}

// Transaction wrapper for multiple queries
export async function transaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const pool = getPool();
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Transaction error:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Helper function to check database connection
export async function testConnection(): Promise<boolean> {
  try {
    const result = await query('SELECT NOW() as current_time');
    console.log('Database connection successful:', result.rows[0]);
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}

// Clean shutdown function
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    drizzleDb = null;
  }
}

// Export the pool for direct access if needed
export { pool };