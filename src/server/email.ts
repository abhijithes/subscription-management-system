import { Resend } from "resend";

export type EmailMessage = { to: string; subject: string; html: string };

const DEFAULT_FROM = "Brightloop <onboarding@resend.dev>";

/**
 * Sends through Resend, or prints to the server console when `RESEND_API_KEY` is not set.
 * Throws if Resend refuses the message. `via` says which path was used.
 */
export async function sendEmail(message: EmailMessage): Promise<{ via: "resend" | "console" }> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.log(`[email: no RESEND_API_KEY, printing instead]\nTo: ${message.to}\nSubject: ${message.subject}\n${message.html}`);
    return { via: "console" };
  }

  const { error } = await new Resend(key).emails.send({
    from: process.env.EMAIL_FROM || DEFAULT_FROM,
    to: message.to,
    subject: message.subject,
    html: message.html,
  });
  if (error) throw new Error(error.message);
  return { via: "resend" };
}
