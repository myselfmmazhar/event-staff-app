import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Next.js Middleware for Dynamic URL Routing
 *
 * Intercepts requests and rewrites custom terminology routes to actual file paths.
 * Example: /talent → /staff (internal rewrite)
 * Example: /tasks → /events (internal rewrite)
 *
 * The middleware uses cookies to access terminology settings since it runs on Edge Runtime
 * and cannot directly query the database.
 */

/**
 * Get terminology routes from cookies or environment variables
 */
function getTerminologyRoutes(request: NextRequest) {
  // Try to get from cookie first (set by TerminologyProvider)
  const terminologyCookie = request.cookies.get("terminology");

  if (terminologyCookie?.value) {
    try {
      const terminology = JSON.parse(terminologyCookie.value);
      return {
        staffRoute: terminology.staff?.route || "staff",
        eventRoute: terminology.event?.route || "events",
      };
    } catch (error) {
      console.error("Failed to parse terminology cookie:", error);
    }
  }

  // Fallback to environment variables
  const staffSingular = process.env.NEXT_PUBLIC_TERM_STAFF_SINGULAR || "Staff";
  const staffPlural = process.env.NEXT_PUBLIC_TERM_STAFF_PLURAL || "Staff";
  const eventSingular = process.env.NEXT_PUBLIC_TERM_EVENT_SINGULAR || "Event";
  const eventPlural = process.env.NEXT_PUBLIC_TERM_EVENT_PLURAL || "Events";

  return {
    staffRoute: staffPlural.toLowerCase().replace(/\s+/g, "-"),
    eventRoute: eventPlural.toLowerCase().replace(/\s+/g, "-"),
  };
}

export async function middleware(request: NextRequest) {
  const { staffRoute, eventRoute } = getTerminologyRoutes(request);
  const pathname = request.nextUrl.pathname;

  // Skip API routes, static files, and Next.js internals
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".") ||
    pathname === "/"
  ) {
    return NextResponse.next();
  }

  // Handle staff routes
  if (pathname.startsWith(`/${staffRoute}`)) {
    const newPathname = pathname.replace(`/${staffRoute}`, "/staff");
    return NextResponse.rewrite(new URL(newPathname, request.url));
  }

  // Handle event routes
  if (pathname.startsWith(`/${eventRoute}`)) {
    const newPathname = pathname.replace(`/${eventRoute}`, "/events");
    return NextResponse.rewrite(new URL(newPathname, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};