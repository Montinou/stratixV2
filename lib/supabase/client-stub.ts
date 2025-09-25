// Client-side API wrapper that replaces Supabase client
// This provides the same interface but uses REST API calls instead

interface ApiResponse<T = any> {
  data: T | null;
  error: any | null;
}

interface QueryBuilder {
  select: (columns?: string) => QueryBuilder;
  eq: (column: string, value: any) => QueryBuilder;
  neq: (column: string, value: any) => QueryBuilder;
  gt: (column: string, value: any) => QueryBuilder;
  gte: (column: string, value: any) => QueryBuilder;
  lt: (column: string, value: any) => QueryBuilder;
  lte: (column: string, value: any) => QueryBuilder;
  like: (column: string, value: string) => QueryBuilder;
  in: (column: string, values: any[]) => QueryBuilder;
  order: (column: string, options?: { ascending?: boolean }) => QueryBuilder;
  limit: (count: number) => QueryBuilder;
  single: () => Promise<ApiResponse>;
}

class SupabaseClientStub {
  from(table: string): QueryBuilder & Promise<ApiResponse> {
    let query = {
      table,
      select: '*',
      filters: [] as Array<{type: string, column: string, value: any}>,
      orderBy: undefined as {column: string, ascending: boolean} | undefined,
      limitCount: undefined as number | undefined,
      singleResult: false,
    };

    const queryBuilder: QueryBuilder = {
      select: (columns = '*') => {
        query.select = columns;
        return queryBuilder;
      },
      
      eq: (column: string, value: any) => {
        query.filters.push({type: 'eq', column, value});
        return queryBuilder;
      },
      
      neq: (column: string, value: any) => {
        query.filters.push({type: 'neq', column, value});
        return queryBuilder;
      },
      
      gt: (column: string, value: any) => {
        query.filters.push({type: 'gt', column, value});
        return queryBuilder;
      },
      
      gte: (column: string, value: any) => {
        query.filters.push({type: 'gte', column, value});
        return queryBuilder;
      },
      
      lt: (column: string, value: any) => {
        query.filters.push({type: 'lt', column, value});
        return queryBuilder;
      },
      
      lte: (column: string, value: any) => {
        query.filters.push({type: 'lte', column, value});
        return queryBuilder;
      },
      
      like: (column: string, value: string) => {
        query.filters.push({type: 'like', column, value});
        return queryBuilder;
      },
      
      in: (column: string, values: any[]) => {
        query.filters.push({type: 'in', column, value: values});
        return queryBuilder;
      },
      
      order: (column: string, options = {ascending: true}) => {
        query.orderBy = {column, ascending: options.ascending ?? true};
        return queryBuilder;
      },
      
      limit: (count: number) => {
        query.limitCount = count;
        return queryBuilder;
      },
      
      single: async (): Promise<ApiResponse> => {
        query.singleResult = true;
        return executeQuery(query);
      }
    };

    // Make the queryBuilder thenable so it can be used as a Promise
    const thenable = Object.assign(queryBuilder, {
      then: (onFulfilled: any, onRejected: any) => {
        return executeQuery(query).then(onFulfilled, onRejected);
      },
      catch: (onRejected: any) => {
        return executeQuery(query).catch(onRejected);
      }
    });

    return thenable as QueryBuilder & Promise<ApiResponse>;
  }
}

async function executeQuery(query: any): Promise<ApiResponse> {
  try {
    // Map table names to API endpoints
    const endpointMap: Record<string, string> = {
      'profiles': '/api/profiles',
      'companies': '/api/companies', 
      'users': '/api/users',
      'objectives': '/api/objectives',
      'initiatives': '/api/initiatives',
      'activities': '/api/activities',
    };

    const endpoint = endpointMap[query.table];
    if (!endpoint) {
      console.warn(`No API endpoint mapped for table: ${query.table}`);
      return { data: null, error: { message: `Table ${query.table} not supported` } };
    }

    // Build query parameters
    const searchParams = new URLSearchParams();
    
    // Add filters as query parameters
    query.filters.forEach((filter: any) => {
      searchParams.append(`filter_${filter.column}_${filter.type}`, 
        Array.isArray(filter.value) ? filter.value.join(',') : filter.value
      );
    });

    // Add ordering
    if (query.orderBy) {
      searchParams.append('orderBy', query.orderBy.column);
      searchParams.append('order', query.orderBy.ascending ? 'asc' : 'desc');
    }

    // Add limit
    if (query.limitCount) {
      searchParams.append('limit', query.limitCount.toString());
    }

    const url = `${endpoint}?${searchParams.toString()}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        return { data: null, error: { message: 'Unauthorized' } };
      }
      if (response.status === 404) {
        return { data: query.singleResult ? null : [], error: null };
      }
      throw new Error(`API error: ${response.status}`);
    }

    const result = await response.json();
    
    if (result.success && result.data) {
      // If single result requested and we got an array, return first item
      if (query.singleResult && Array.isArray(result.data)) {
        return { data: result.data[0] || null, error: null };
      }
      
      return { data: result.data, error: null };
    }
    
    return { data: query.singleResult ? null : [], error: null };

  } catch (error) {
    console.error('Error executing query:', error);
    return { 
      data: null, 
      error: { message: error instanceof Error ? error.message : 'Unknown error' } 
    };
  }
}

export function createClient() {
  return new SupabaseClientStub();
}

// Export default client instance
export const supabase = new SupabaseClientStub();