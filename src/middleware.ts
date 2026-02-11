import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Password for early access (set in environment variable for production)
const EARLY_ACCESS_PASSWORD = process.env.EARLY_ACCESS_PASSWORD || "stageside2026";
const COOKIE_NAME = "stageside_access";

// Paths that don't require authentication
const PUBLIC_PATHS = [
  "/api/", // API routes
  "/_next/", // Next.js internals
  "/favicon.ico",
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip password check for public paths
  if (PUBLIC_PATHS.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Skip if password protection is disabled
  if (process.env.DISABLE_PASSWORD_PROTECTION === "true") {
    return NextResponse.next();
  }

  // Check for access cookie
  const accessCookie = request.cookies.get(COOKIE_NAME);
  if (accessCookie?.value === "granted") {
    return NextResponse.next();
  }

  // Check if this is the password submission
  if (pathname === "/access" && request.method === "POST") {
    return NextResponse.next();
  }

  // Check for password in URL (for easy sharing: ?access=stageside2026)
  const urlPassword = request.nextUrl.searchParams.get("access");
  if (urlPassword === EARLY_ACCESS_PASSWORD) {
    const response = NextResponse.redirect(new URL(pathname, request.url));
    response.cookies.set(COOKIE_NAME, "granted", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });
    return response;
  }

  // Redirect to access page
  if (pathname !== "/access") {
    const url = new URL("/access", request.url);
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
