// Temporary stub for SessionManager during build fix
// This provides empty implementations while we migrate to API endpoints

export class SessionManager {
  static getCachedProfile() {
    return null; // No cached profile in stub
  }

  static getDefaultCompanyId() {
    return 'default-company-id'; // Default company ID
  }

  static cacheProfile(profile: any) {
    // No-op in stub
  }

  static clearProfileCache() {
    // No-op in stub
  }

  static clearSession() {
    // No-op in stub
  }

  static createLoadingManager() {
    return {
      setLoading: (loading: boolean) => {},
      getLoading: () => false,
    };
  }

  static storeSessionState(user: any, profile: any, loading: boolean) {
    // No-op in stub
  }

  static handleAuthStateChange(user: any, callback: Function) {
    // No-op in stub - just call callback with default values
    callback(user, null, false);
  }
}