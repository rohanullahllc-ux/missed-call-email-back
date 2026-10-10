import { after } from "next/server";
import { prisma } from "@/lib/db/client";
import { appBaseUrl } from "@/lib/config";
import { handleMissedCall } from "@/lib/calls/handleMissedCall";
import { resolveTenantByPhoneNumber } from "@/lib/tenants/resolveByPhoneNumber";
import { isValidTwilioRequest, parseTwilioFormBody } from "@/lib/twilio/verifySignature";
import { hangupTwiml, missedCallTwiml } from "@/lib/twilio/twiml";

const ANSWERED = new Set(["completed", "answered"]);

// Step 2: Twilio calls this when the forwarded call ends — answered, or rang out unanswered.
export async function POST(request: Request) {
  const params = await parseTwilioFormBody(request);
  const signature = request.headers.get("X-Twilio-Signature");
  if (!isValidTwilioRequest(signature, `${appBaseUrl()}/api/webhooks/twilio/dial-status`, params)) {
    return new Response("Invalid signature", { status: 403 });
  }

  const resolved = await resolveTenantByPhoneNumber(params.To);
  if (!resolved) {
    return new Response("Unknown number", { status: 404 });
  }

  const { tenant, phoneNumber } = resolved;
  const answered = ANSWERED.has(params.DialCallStatus);
  const status = answered ? "answered" : "missed";
  const now = new Date();

  const previous = await prisma.interaction.findUnique({ where: { twilioCallSid: params.CallSid } });
  const interaction = await prisma.interaction.upsert({
    where: { twilioCallSid: params.CallSid },
    update: { status, endedAt: now },
    create: {
      tenantId: tenant.id,
      phoneNumberId: phoneNumber.id,
      twilioCallSid: params.CallSid,
      fromNumber: params.From,
      status,
      startedAt: now,
      endedAt: now,
    },
  });

  if (answered) {
    return hangupTwiml();
  }

  // A retried webhook must not email the owner twice for the same call.
  if (previous?.status !== "missed") {
    after(() =>
      handleMissedCall({ tenant, interactionId: interaction.id, callerPhone: params.From, calledAt: interaction.startedAt })
    );
  }

  return missedCallTwiml(tenant.name);
}
