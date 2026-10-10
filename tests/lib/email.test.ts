import { describe, it, expect } from "vitest";
import { buildLoginEmail, buildMissedCallEmail } from "@/lib/email/messages";
import { findTemplateProblem } from "@/lib/templates/templates";

const calledAt = new Date("2026-10-09T14:05:00Z");

describe("buildMissedCallEmail", () => {
  it("fills in the variables and adds a tap-to-call button", () => {
    const email = buildMissedCallEmail({
      template: { subject: "Missed call from {{caller_phone}}", body: "{{business_name}} missed {{caller_phone}} at {{call_time}}." },
      businessName: "Smith Plumbing",
      callerPhone: "+15551234567",
      calledAt,
      timeZone: "America/New_York",
    });

    expect(email.subject).toBe("Missed call from +1 (555) 123-4567");
    expect(email.text).toContain("Smith Plumbing missed +1 (555) 123-4567 at Fri, Oct 9, 10:05 AM EDT.");
    expect(email.html).toContain('href="tel:+15551234567"');
  });

  it("escapes HTML so template text or business names can't inject markup", () => {
    const email = buildMissedCallEmail({
      template: { subject: "Hi", body: '<script>alert("x")</script>' },
      businessName: "Tom & Jerry's <b>Pipes</b>",
      callerPhone: "+15551234567",
      calledAt,
      timeZone: "America/New_York",
    });

    expect(email.html).not.toContain("<script>");
    expect(email.html).toContain("&lt;script&gt;");
    expect(email.html).toContain("Tom &amp; Jerry&#39;s &lt;b&gt;Pipes&lt;/b&gt;");
  });
});

describe("buildLoginEmail", () => {
  it("offers one button per business when an owner has several", () => {
    const email = buildLoginEmail({
      links: [
        { businessName: "Smith Plumbing", url: "https://app.test/verify?token=a" },
        { businessName: "Smith Electric", url: "https://app.test/verify?token=b" },
      ],
      expiresInMinutes: 15,
    });

    expect(email.html).toContain("Open Smith Plumbing");
    expect(email.html).toContain("Open Smith Electric");
    expect(email.text).toContain("https://app.test/verify?token=b");
  });
});

describe("findTemplateProblem", () => {
  it("accepts the supported variables", () => {
    expect(findTemplateProblem("{{caller_phone}} called {{business_name}} at {{call_time}}")).toBeNull();
  });

  it("flags misspelled variables", () => {
    expect(findTemplateProblem("Call {{caller_phon}} back")).toContain("{{caller_phon}} isn't a variable");
  });

  it("flags unclosed braces", () => {
    expect(findTemplateProblem("Call {{caller_phone back")).toContain("isn't closed properly");
  });
});
