import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY;

if (!apiKey) {
  throw new Error("RESEND_API_KEY must be set in the environment");
}

export const resend = new Resend(apiKey);
