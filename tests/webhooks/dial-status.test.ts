import { describe, it, expect, vi, beforeEach } from "vitest";

process.env.SKIP_TWILIO_SIGNATURE_CHECK = "true";
process.env.APP_BASE_URL = "http://localhost:3000";

const FRIDAY_6PM_NEW_YORK = new Date("2026-10-09T22:00:00Z");
const FRIDAY_10AM_NEW_YORK = new Date("2026-10-09T14:00:00Z");

const fridayNineToFive = {
  id: "hours_fri",
  tenantId: "tenant_1",
  dayOfWeek: 5,
  openTime: "09:00",
  closeTime: "17:00",
  isClosed: false,
};

function makeTenant(overrides: Record<string, unknown> = {}) {
  return {
    id: "tenant_1",
    name: "Test Plumbing Co",
    slug: "test-plumbing-co",
    timezone: "America/New_York",
    ownerNotificationEmail: "owner@example.com",
    status: "active",
    createdAt: new Date(),
    businessHours: [] as (typeof fridayNineToFive)[],
    ...overrides,
  };
}

const prismaMock = {
  phoneNumber: { findUnique: vi.fn() },
  interaction: { findUnique: vi.fn(), upsert: vi.fn(), update: vi.fn() },
  caller: { upsert: vi.fn(), update: vi.fn() },
  template: { findFirst: vi.fn() },
  message: { create: vi.fn() },
};
vi.mock("@/lib/db/client", () => ({ prisma: prismaMock }));

const sendEmailMock = vi.fn();
vi.mock("@/lib/email/sendEmail", () => ({ sendEmail: sendEmailMock }));

// `after()` only works inside a real Next.js request, so collect the callbacks and run them by hand.
const afterCallbacks: (() => unknown)[] = [];
vi.mock("next/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/server")>()),
  after: (callback: () => unknown) => {
    afterCallbacks.push(callback);
  },
}));

async function runAfterCallbacks() {
  while (afterCallbacks.length > 0) {
    await afterCallbacks.shift()!();
  }
}

function useTenant(tenant: ReturnType<typeof makeTenant>) {
  prismaMock.phoneNumber.findUnique.mockResolvedValue({
    id: "phone_1",
    tenantId: tenant.id,
    phoneNumber: "+15550001111",
    forwardingNumber: "+15559998888",
    isActive: true,
    tenant,
  });
}

async function postDialStatus(dialCallStatus: string) {
  const { POST } = await import("@/app/api/webhooks/twilio/dial-status/route");
  const body = new URLSearchParams({
    To: "+15550001111",
    From: "+15551234567",
    CallSid: "CA00000000000000000000000000000001",
    DialCallStatus: dialCallStatus,
  });
  const response = await POST(
    new Request("http://localhost:3000/api/webhooks/twilio/dial-status", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    })
  );
  await runAfterCallbacks();
  return response;
}

describe("POST /api/webhooks/twilio/dial-status", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    afterCallbacks.length = 0;
    useTenant(makeTenant());
    prismaMock.interaction.findUnique.mockResolvedValue({ status: "ringing" });
    prismaMock.interaction.upsert.mockResolvedValue({ id: "interaction_1", startedAt: FRIDAY_10AM_NEW_YORK });
    prismaMock.caller.upsert.mockResolvedValue({ id: "caller_1", status: "new" });
    prismaMock.template.findFirst.mockResolvedValue(null);
    sendEmailMock.mockResolvedValue({ ok: true, providerMessageId: "resend_1" });
  });

  it("emails the owner, logs the message and marks the caller notified when a call is missed", async () => {
    const response = await postDialStatus("no-answer");

    expect(response.status).toBe(200);
    expect(await response.text()).toContain("<Say>Sorry, Test Plumbing Co can't take your call");

    expect(sendEmailMock).toHaveBeenCalledTimes(1);
    const email = sendEmailMock.mock.calls[0][0];
    expect(email.to).toBe("owner@example.com");
    expect(email.subject).toBe("Missed call from +1 (555) 123-4567");
    expect(email.html).toContain('href="tel:+15551234567"');
    expect(email.text).toContain("/dashboard/leads/caller_1");

    expect(prismaMock.message.create.mock.calls[0][0].data).toMatchObject({ channel: "email", status: "sent" });
    expect(prismaMock.caller.update).toHaveBeenCalledWith({ where: { id: "caller_1" }, data: { status: "notified" } });
  });

  it.each(["completed", "answered"])("does nothing more when Twilio reports %s", async (status) => {
    const response = await postDialStatus(status);

    expect(await response.text()).toContain("<Hangup/>");
    expect(sendEmailMock).not.toHaveBeenCalled();
    expect(prismaMock.caller.upsert).not.toHaveBeenCalled();
  });

  it("rejects calls to a number that isn't connected", async () => {
    prismaMock.phoneNumber.findUnique.mockResolvedValue(null);

    const response = await postDialStatus("no-answer");

    expect(response.status).toBe(404);
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it("uses the after-hours template outside business hours", async () => {
    useTenant(makeTenant({ businessHours: [fridayNineToFive] }));
    prismaMock.interaction.upsert.mockResolvedValue({ id: "interaction_1", startedAt: FRIDAY_6PM_NEW_YORK });
    prismaMock.template.findFirst.mockImplementation(async ({ where }) =>
      where.triggerType === "missed_call_after_hours"
        ? { subject: "After hours: {{caller_phone}}", body: "Called at {{call_time}}" }
        : null
    );

    await postDialStatus("no-answer");

    expect(sendEmailMock.mock.calls[0][0].subject).toBe("After hours: +1 (555) 123-4567");
  });

  it("uses the regular template during business hours, even if an after-hours one exists", async () => {
    useTenant(makeTenant({ businessHours: [fridayNineToFive] }));
    prismaMock.template.findFirst.mockImplementation(async ({ where }) => ({
      subject: where.triggerType === "missed_call" ? "Regular: {{caller_phone}}" : "After hours",
      body: "Body",
    }));

    await postDialStatus("no-answer");

    expect(sendEmailMock.mock.calls[0][0].subject).toBe("Regular: +1 (555) 123-4567");
  });

  it("records the lead but sends no email for a paused business", async () => {
    useTenant(makeTenant({ status: "paused" }));

    await postDialStatus("no-answer");

    expect(prismaMock.caller.upsert).toHaveBeenCalledTimes(1);
    expect(sendEmailMock).not.toHaveBeenCalled();
    expect(prismaMock.message.create).not.toHaveBeenCalled();
  });

  it("doesn't email twice when Twilio retries the webhook", async () => {
    prismaMock.interaction.findUnique.mockResolvedValue({ status: "missed" });

    await postDialStatus("no-answer");

    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it("logs a failed email and leaves the caller as new, not notified", async () => {
    sendEmailMock.mockResolvedValue({ ok: false, error: "domain not verified" });
    vi.spyOn(console, "error").mockImplementation(() => {});

    await postDialStatus("no-answer");

    expect(prismaMock.message.create.mock.calls[0][0].data.status).toBe("failed");
    expect(prismaMock.caller.update).not.toHaveBeenCalled();
  });
});
