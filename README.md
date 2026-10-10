# Missed Call Email-Back

When a business misses an inbound phone call, this automatically emails the business owner so they can call the customer back before the lead goes cold. MVP is email-only (no SMS) — see `C:\Users\Rohaan & Co\.claude\plans\with-file-name-you-elegant-shamir.md` for the full architecture and phased build plan this implements.

## Stack

Next.js 16 (App Router) · Prisma · Postgres (Supabase) · Twilio Voice (missed-call detection only) · Resend (email) · `jose` (signed session cookies) · Tailwind CSS

## One-time setup

1. **Database**: create a free [Supabase](https://supabase.com) project. In the project, click **Connect → ORM → Prisma** and copy the `DATABASE_URL` and `DIRECT_URL` it shows, replacing `[YOUR-PASSWORD]` with your database password. Keep `&connect_timeout=20` on the end (see `.env.example`).
2. **Twilio**: create an account, buy a phone number with Voice capability (~$1.15/mo). Copy `Account SID` / `Auth Token` into `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN`. On a **trial** account you can only call verified numbers — verify your own test numbers under Phone Numbers → Verified Caller IDs before testing.
3. **Resend**: verify a sending domain, then create an API key **in the same Resend account** (a key from a different account fails with "domain is not verified"). Put it in `RESEND_API_KEY`, and set `RESEND_FROM_EMAIL` to an address on that domain.
4. Copy `.env.example` to **both** `.env.local` (read by the app) and `.env` (read by Prisma's command-line tools), and fill in the real values above, plus:
   - `ADMIN_SECRET` — a long random string, this is your founder-admin password.
   - `SESSION_SECRET` — a long random string (e.g. `openssl rand -base64 32`), signs login sessions.
   - `APP_BASE_URL` — `http://localhost:3000` for local dev; your public URL (ngrok or deployed) when Twilio needs to reach the app.

## Install & run

```
npm install
npm run db:migrate      # create/update tables
npm run db:seed         # seeds one test business — set SEED_* env vars first, see prisma/seed.ts
npm run dev
```

- `/admin` — your control panel (log in with `ADMIN_SECRET`): businesses, phone numbers, business hours, email templates, and the call log.
- `/login` — the business-owner dashboard (passwordless: they get a one-time login link by email).

To see the alert email without making a phone call, open a business's **Email templates** page and click **Send me a test**.

## Wiring up a Twilio number (local testing)

1. `npx ngrok http 3000`, copy the HTTPS forwarding URL into `APP_BASE_URL`, and restart the app.
2. In `/admin`, open the business, connect the Twilio number, and copy the webhook URL shown in the **Twilio setup** box.
3. In the Twilio Console, open the number → Voice configuration → set **"A call comes in"** to that URL, **Webhook**, **HTTP POST**.
4. Call the Twilio number from another phone and let it ring out without answering. The owner should get an email within seconds, and the call appears under **Calls** in `/admin`.

## Tests

```
npm test
```

Vitest covers the missed-call webhook (Prisma and Resend mocked, Twilio signature checks bypassed via `SKIP_TWILIO_SIGNATURE_CHECK=true` in the test env — never set that flag outside of tests), plus email rendering, business hours and formatting helpers.

## Known limitations

- **Voicemail counts as answered.** If the owner's phone sends the forwarded call to voicemail (including when they decline it), Twilio reports it as answered, so no email is sent. Fixing this needs call screening or Twilio's answering-machine detection — worth deciding once real Twilio testing starts.
- Login-link requests aren't rate limited yet.

## What's intentionally not built yet

SMS auto-reply to callers (needs US A2P 10DLC registration), self-serve signup/billing, automated Twilio number provisioning, emailing the caller directly. See the plan file's Phase 4 for the full deferred list.
