import { SignJWT, jwtVerify } from "jose";

export const ADMIN_COOKIE = "admin_session";
export const TENANT_COOKIE = "tenant_session";

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export type Session = { role: "admin" } | { role: "tenant"; tenantId: string };

export const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: SESSION_MAX_AGE_SECONDS,
};

function secretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET must be set in the environment");
  }
  return new TextEncoder().encode(secret);
}

export async function signSession(session: Session): Promise<string> {
  return new SignJWT(session)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(secretKey());
}

export async function readSession(token: string | undefined): Promise<Session | null> {
  if (!token) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ["HS256"] });
    if (payload.role === "admin") {
      return { role: "admin" };
    }
    if (payload.role === "tenant" && typeof payload.tenantId === "string") {
      return { role: "tenant", tenantId: payload.tenantId };
    }
    return null;
  } catch {
    return null;
  }
}
