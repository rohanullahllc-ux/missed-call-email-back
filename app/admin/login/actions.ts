"use server";

import { createHash, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE, sessionCookieOptions, signSession } from "@/lib/auth/session";
import { failed, field, type ActionResult } from "@/lib/forms";

// Compares fixed-length hashes in constant time, so response timing can't reveal the secret.
function matchesAdminSecret(candidate: string): boolean {
  const expected = process.env.ADMIN_SECRET;
  if (!expected) {
    return false;
  }
  const digest = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(digest(candidate), digest(expected));
}

export async function adminLoginAction(_previous: ActionResult, formData: FormData): Promise<ActionResult> {
  if (!matchesAdminSecret(field(formData, "secret"))) {
    return failed("That admin secret isn't right.");
  }

  (await cookies()).set(ADMIN_COOKIE, await signSession({ role: "admin" }), sessionCookieOptions);
  redirect("/admin/tenants");
}

export async function adminLogoutAction() {
  (await cookies()).delete(ADMIN_COOKIE);
  redirect("/admin/login");
}
