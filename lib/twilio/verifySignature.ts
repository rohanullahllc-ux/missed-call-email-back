import Twilio from "twilio";

// `url` must exactly match the public URL configured in Twilio, or every signature check fails.
export function isValidTwilioRequest(signature: string | null, url: string, params: Record<string, string>): boolean {
  if (process.env.SKIP_TWILIO_SIGNATURE_CHECK === "true") {
    return true;
  }

  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!authToken || !signature) {
    return false;
  }

  return Twilio.validateRequest(authToken, signature, url, params);
}

export async function parseTwilioFormBody(request: Request): Promise<Record<string, string>> {
  return Object.fromEntries(new URLSearchParams(await request.text()).entries());
}
