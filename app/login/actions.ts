"use server";

import { LOGIN_LINK_TTL_MINUTES, requestMagicLinks } from "@/lib/auth/magicLink";
import { EMAIL_PATTERN, failed, field, succeeded, type ActionResult } from "@/lib/forms";

export async function requestLoginLinkAction(_previous: ActionResult, formData: FormData): Promise<ActionResult> {
  const email = field(formData, "email").toLowerCase();
  if (!EMAIL_PATTERN.test(email)) {
    return failed("Enter a valid email address.");
  }

  await requestMagicLinks(email);

  // Same message whether or not the email is registered, so this form can't be used to probe for customers.
  return succeeded(
    `If that email belongs to a business on our system, a login link is on its way. It expires in ${LOGIN_LINK_TTL_MINUTES} minutes — check your spam folder if you don't see it.`
  );
}
