import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(request: NextRequest) {
  const url = request.nextUrl;

  // 1. Never intercept or redirect API calls in middleware
  if (url.pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  const token = await getToken({ req: request });

  // 2. Unauthenticated user hitting protected routes → send to sign-in
  if (
    !token &&
    (url.pathname.startsWith("/dashboard") ||
      url.pathname.startsWith("/setup-account") ||
      url.pathname.startsWith("/discover") ||
      url.pathname.startsWith("/connections") ||
      url.pathname.startsWith("/chat"))
  ) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  // 3. Redirect authenticated user to /setup-account if setup is not completed
  if (
    token &&
    token.role === "user" &&
    token.isAccountSetupCompleted === false &&
    !url.pathname.startsWith("/setup-account")
  ) {
    return NextResponse.redirect(new URL("/setup-account", request.url));
  }

  // 4. Redirect authenticated user away from /setup-account if setup is completed
  if (
    token &&
    token.role === "user" &&
    token.isAccountSetupCompleted !== false &&
    url.pathname.startsWith("/setup-account")
  ) {
    return NextResponse.redirect(new URL("/chat", request.url));
  }

  const isAuthPage =
    url.pathname.startsWith("/sign-in") ||
    url.pathname.startsWith("/sign-up") ||
    url.pathname.startsWith("/verify") ||
    url.pathname.startsWith("/forgot-password") ||
    url.pathname.startsWith("/reset-password");

  // 5. Authenticated user hitting auth pages → send to dashboard/admin
  if (token && isAuthPage) {
    if (token.role === "super-admin") {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
    return NextResponse.redirect(new URL("/chat", request.url));
  }

  // 6. Authenticated super-admin: restrict page navigation strictly to /admin and /dashboard/settings
  if (token && token.role === "super-admin") {
    if (
      !url.pathname.startsWith("/admin") &&
      !url.pathname.startsWith("/dashboard/settings")
    ) {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
  }

  // 7. Admin routes: must be authenticated AND have role=super-admin
  if (url.pathname.startsWith("/admin")) {
    if (!token) {
      return NextResponse.redirect(new URL("/sign-in", request.url));
    }
    if (token.role !== "super-admin") {
      // Non-admin trying to access admin → send to chat
      return NextResponse.redirect(new URL("/chat", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/sign-in",
    "/sign-up",
    "/verify/:path*",
    "/forgot-password",
    "/reset-password/:path*",
    "/dashboard/:path*",
    "/admin/:path*",
    "/setup-account",
    "/discover",
    "/connections",
    "/chat/:path*",
  ],
};
