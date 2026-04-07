import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Next.js Proxy for Dynamic URL Routing
 *
 * Intercepts requests and rewrites custom terminology routes to actual file paths.
 * Example: /talent -> /staff (internal rewrite)
 * Example: /tasks -> /events (internal rewrite)
 *
 * The proxy uses cookies to access terminology settings since it runs on Edge Runtime
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
  const staffPlural = process.env.NEXT_PUBLIC_TERM_STAFF_PLURAL || "Staff";
  const eventPlural = process.env.NEXT_PUBLIC_TERM_EVENT_PLURAL || "Events";

  return {
    staffRoute: staffPlural.toLowerCase().replace(/\s+/g, "-"),
    eventRoute: eventPlural.toLowerCase().replace(/\s+/g, "-"),
  };
}

export async function proxy(request: NextRequest) {
  const { staffRoute, eventRoute } = getTerminologyRoutes(request);
  const pathname = request.nextUrl.pathname;

  // Skip API routes, static files, and Next.js internals
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon")
  ) {
    return NextResponse.next();
  }

  // Rewrite custom staff routes to /staff
  // Example: /talent -> /staff, /talent/123 -> /staff/123
  if (staffRoute !== "staff" && pathname.startsWith(`/${staffRoute}`)) {
    const rewritePath = pathname.replace(new RegExp(`^/${staffRoute}`), "/staff");
    const url = request.nextUrl.clone();
    url.pathname = rewritePath;
    return NextResponse.rewrite(url);
  }

  // Rewrite custom event routes to /events
  // Example: /tasks -> /events, /tasks/123 -> /events/123
  // Exclude /tasks/timesheet and /tasks/shift as they have dedicated pages
  const excludedTaskRoutes = ["/tasks/timesheet", "/tasks/shift"];
  const isExcluded = excludedTaskRoutes.some((route) => pathname.startsWith(route));

  if (!isExcluded && eventRoute !== "events" && pathname.startsWith(`/${eventRoute}`)) {
    const rewritePath = pathname.replace(new RegExp(`^/${eventRoute}`), "/events");
    const url = request.nextUrl.clone();
    url.pathname = rewritePath;
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

/**
 * Proxy Configuration
 *
 * Matcher excludes:
 * - API routes
 * - Static files (_next/static)
 * - Image optimization (_next/image)
 * - Favicon
 */
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
