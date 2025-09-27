import { neon } from '@neondatabase/serverless';
import { stackServerApp } from '@/stack';

// Create the sql function once and reuse it - following current Neon docs
export const sql = neon(process.env.DATABASE_URL!);

// Authenticated sql function for Stack Auth RLS
export async function getAuthenticatedSql() {
  const user = await stackServerApp.getUser();
  const authToken = (await user?.getAuthJson())?.accessToken;

  if (!authToken) {
    throw new Error('Not authenticated');
  }

  if (!process.env.DATABASE_AUTHENTICATED_URL) {
    throw new Error('DATABASE_AUTHENTICATED_URL not configured');
  }

  return neon(process.env.DATABASE_AUTHENTICATED_URL, {
    authToken: authToken
  });
}

// Simple query helpers
export async function query<T = any>(text: string, params?: any[]): Promise<T[]> {
  return await sql(text, params);
}

export async function authenticatedQuery<T = any>(text: string, params?: any[]): Promise<T[]> {
  const authSql = await getAuthenticatedSql();
  return await authSql(text, params);
}