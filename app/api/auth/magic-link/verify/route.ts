import { NextResponse } from "next/server";
import { consumeMagicLink } from "@/lib/auth/magicLink";
import { TENANT_COOKIE, sessionCookieOptions, signSession } from "@/lib/auth/session";

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token");

  let result: { tenantId: string } | null;
  try {
    result = token ? await consumeMagicLink(token) : null;
  } catch (error) {
    // The token is only marked used inside the database call, so a failure here leaves the link valid to retry.
    console.error("Magic link verification failed:", error);
    return NextResponse.redirect(new URL("/login?error=unavailable", request.url), 303);
  }

  if (!result) {
    return NextResponse.redirect(new URL("/login?error=expired", request.url), 303);
  }

  const response = NextResponse.redirect(new URL("/dashboard", request.url), 303);
  response.cookies.set(TENANT_COOKIE, await signSession({ role: "tenant", tenantId: result.tenantId }), sessionCookieOptions);
  return response;
}
