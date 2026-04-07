import { NextResponse } from 'next/server';

export async function GET() {
  // Only allow in development or with a secret key for security
  const isDevelopment = process.env.NODE_ENV === 'development';
  const hasDebugKey = process.env.DEBUG_API_KEY && process.env.DEBUG_API_KEY === 'debug-enabled';

  if (!isDevelopment && !hasDebugKey) {
    return NextResponse.json(
      { error: 'Debug endpoint not available in production' },
      { status: 403 }
    );
  }

  // Return environment variables (be careful not to expose sensitive data)
  const envInfo = {
    NODE_ENV: process.env.NODE_ENV,
    DATABASE_URL: process.env.DATABASE_URL ? '[REDACTED]' : 'NOT_SET',
    DIRECT_URL: process.env.DIRECT_URL ? '[REDACTED]' : 'NOT_SET',
    DATABASE_URL_EXISTS: !!process.env.DATABASE_URL,
    DIRECT_URL_EXISTS: !!process.env.DIRECT_URL,
    PORT: process.env.PORT,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    // Add any other non-sensitive env vars you want to check
    timestamp: new Date().toISOString(),
  };

  return NextResponse.json(envInfo);
}