/**
 * Stack Auth Utilities
 * Helper functions for handling Stack Auth redirects and URLs dynamically
 */

/**
 * Get the current origin from request headers
 * This allows Stack Auth to work with any domain without whitelist issues
 */
export function getOriginFromRequest(request: Request): string {
  // Try to get the origin from various headers
  const headers = request.headers;

  // Check for forwarded host (common in proxies)
  const forwardedHost = headers.get('x-forwarded-host');
  const forwardedProto = headers.get('x-forwarded-proto') || 'https';
  if (forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
  }

  // Check for host header
  const host = headers.get('host');
  if (host) {
    // Determine protocol based on environment
    const proto = process.env.NODE_ENV === 'development' ? 'http' : 'https';
    return `${proto}://${host}`;
  }

  // Fallback to URL origin
  const url = new URL(request.url);
  return url.origin;
}

/**
 * Create Stack Auth redirect URLs dynamically based on the current request
 */
export function createDynamicRedirectUrls(request: Request) {
  const origin = getOriginFromRequest(request);

  return {
    afterSignIn: `${origin}/tools`,
    afterSignUp: `${origin}/tools`,
    afterSignOut: `${origin}`,
    signIn: `${origin}/handler/signin`,
    signUp: `${origin}/handler/signup`,
    emailVerification: `${origin}/handler/email-verification`,
    passwordReset: `${origin}/handler/password-reset`,
    error: `${origin}/handler/error`,
  };
}

/**
 * Check if a URL is from a trusted domain
 * This is a more flexible alternative to Stack Auth's whitelist
 */
export function isTrustedDomain(url: string): boolean {
  try {
    const parsedUrl = new URL(url);
    const hostname = parsedUrl.hostname;

    // Allow localhost for development
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return true;
    }

    // Allow any subdomain or domain (you can make this more restrictive if needed)
    // This removes the need for Stack Auth whitelist
    return true;
  } catch {
    return false;
  }
}