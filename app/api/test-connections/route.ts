import { type NextRequest } from "next/server";
import { testConnection, testAuthenticatedConnection } from "@/lib/database/client";
import { validateRuntimeEnvironment, getEnvironmentStatus } from "@/lib/validation/environment";
import { stackServerApp } from "@/stack";

export const dynamic = 'force-dynamic';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(_request: NextRequest) {
  try {
    // Test environment validation first
    console.log("Testing environment validation...");
    validateRuntimeEnvironment();

    // Get environment status
    const envStatus = getEnvironmentStatus();

    // Test basic database connection
    console.log("Testing basic database connection...");
    const basicConnection = await testConnection();

    // Test Stack Auth
    console.log("Testing Stack Auth...");
    let authTest = false;
    let authUser = null;
    try {
      const user = await stackServerApp.getUser();
      authTest = !!user;
      authUser = user ? {
        id: user.id,
        email: user.primaryEmail
      } : null;
    } catch (error) {
      console.warn("Stack Auth test failed (this is expected if not logged in):", error);
    }

    // Test authenticated database connection (only if user is authenticated)
    console.log("Testing authenticated database connection...");
    let authenticatedConnection = false;
    if (authTest) {
      try {
        authenticatedConnection = await testAuthenticatedConnection();
      } catch (error) {
        console.warn("Authenticated database connection failed:", error);
      }
    }

    // Test AI Gateway setup
    console.log("Testing AI Gateway setup...");
    const aiGatewayConfigured = !!process.env.AI_GATEWAY_API_KEY &&
      process.env.AI_GATEWAY_API_KEY.startsWith('vck_');

    const results = {
      timestamp: new Date().toISOString(),
      environment: envStatus,
      connections: {
        database: {
          basic: basicConnection,
          authenticated: authenticatedConnection
        },
        stackAuth: {
          configured: authTest,
          user: authUser
        },
        aiGateway: {
          configured: aiGatewayConfigured,
          apiKeyPrefix: process.env.AI_GATEWAY_API_KEY?.substring(0, 8) + '...'
        }
      },
      status: {
        overall: basicConnection && aiGatewayConfigured && envStatus.validation.isValid ? 'healthy' : 'issues',
        critical_issues: [] as string[],
        warnings: envStatus.validation.warnings
      }
    };

    // Add critical issues
    if (!basicConnection) {
      results.status.critical_issues.push('Database connection failed');
    }
    if (!aiGatewayConfigured) {
      results.status.critical_issues.push('AI Gateway not configured');
    }
    if (!envStatus.validation.isValid) {
      results.status.critical_issues.push('Environment validation failed');
    }

    return new Response(JSON.stringify(results, null, 2), {
      headers: {
        'Content-Type': 'application/json'
      },
      status: results.status.overall === 'healthy' ? 200 : 500
    });

  } catch (error) {
    console.error("Connection test failed:", error);

    return new Response(JSON.stringify({
      error: 'Connection test failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, null, 2), {
      headers: {
        'Content-Type': 'application/json'
      },
      status: 500
    });
  }
}