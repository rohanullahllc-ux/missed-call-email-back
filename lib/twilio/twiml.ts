// TwiML is the XML that tells Twilio what to do next with a live call.

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function twiml(body: string): Response {
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<Response>${body}</Response>`, {
    headers: { "Content-Type": "text/xml" },
  });
}

export function dialTwiml(forwardingNumber: string, actionUrl: string, timeoutSeconds = 20): Response {
  return twiml(
    `<Dial timeout="${timeoutSeconds}" answerOnBridge="true" action="${escapeXml(actionUrl)}"><Number>${escapeXml(forwardingNumber)}</Number></Dial>`
  );
}

export function missedCallTwiml(businessName: string): Response {
  return twiml(
    `<Say>Sorry, ${escapeXml(businessName)} can't take your call right now. We've been notified and will call you back as soon as we can. Goodbye.</Say><Hangup/>`
  );
}

export function hangupTwiml(): Response {
  return twiml("<Hangup/>");
}
