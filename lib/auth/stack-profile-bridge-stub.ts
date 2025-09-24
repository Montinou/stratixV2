// Temporary stub for StackProfileBridge during build fix
// This provides fallback implementations while we migrate to API endpoints

export class StackProfileBridge {
  static async getOrCreateProfile(stackUser: any, defaultCompanyId: string) {
    // Return a mock profile based on Stack user data
    return {
      id: stackUser.id,
      user_id: stackUser.id,
      full_name: stackUser.displayName || stackUser.primaryEmail?.split('@')[0] || 'User',
      role: 'empleado',
      department: 'General',
      company_id: defaultCompanyId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  static createFallbackProfile(stackUser: any) {
    // Create a basic fallback profile from Stack user data
    return {
      id: stackUser.id,
      user_id: stackUser.id,
      full_name: stackUser.displayName || stackUser.primaryEmail?.split('@')[0] || 'User',
      role: 'empleado',
      department: 'General',
      company_id: 'default-company-id',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  static async handleLogout(userId: string) {
    // No-op in stub
  }
}