import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE, TENANT_COOKIE, readSession } from "@/lib/auth/session";

// Fast redirect for visitors without a valid session cookie. Pages and actions re-check via lib/auth/dal.ts.
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    const session = await readSession(request.cookies.get(ADMIN_COOKIE)?.value);
    if (session?.role !== "admin") {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
  }

  if (pathname.startsWith("/dashboard")) {
    const session = await readSession(request.cookies.get(TENANT_COOKIE)?.value);
    if (session?.role !== "tenant") {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/dashboard/:path*"],
};
