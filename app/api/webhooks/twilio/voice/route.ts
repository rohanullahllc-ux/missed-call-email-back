import { prisma } from "@/lib/db/client";
import { appBaseUrl } from "@/lib/config";
import { resolveTenantByPhoneNumber } from "@/lib/tenants/resolveByPhoneNumber";
import { isValidTwilioRequest, parseTwilioFormBody } from "@/lib/twilio/verifySignature";
import { dialTwiml } from "@/lib/twilio/twiml";

// Step 1: Twilio calls this the moment someone dials a business's Twilio number.
export async function POST(request: Request) {
  const params = await parseTwilioFormBody(request);
  const signature = request.headers.get("X-Twilio-Signature");
  if (!isValidTwilioRequest(signature, `${appBaseUrl()}/api/webhooks/twilio/voice`, params)) {
    return new Response("Invalid signature", { status: 403 });
  }

  const resolved = await resolveTenantByPhoneNumber(params.To);
  if (!resolved) {
    return new Response("Unknown number", { status: 404 });
  }

  // Twilio retries webhooks that time out, so recording the call must be safe to repeat.
  await prisma.interaction.upsert({
    where: { twilioCallSid: params.CallSid },
    update: {},
    create: {
      tenantId: resolved.tenant.id,
      phoneNumberId: resolved.phoneNumber.id,
      twilioCallSid: params.CallSid,
      fromNumber: params.From,
      status: "ringing",
      startedAt: new Date(),
    },
  });

  return dialTwiml(resolved.phoneNumber.forwardingNumber, `${appBaseUrl()}/api/webhooks/twilio/dial-status`);
}
