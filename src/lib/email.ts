import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { Resend } from "resend";

export type EmailMessage = {
  to: string;
  subject: string;
  text: string;
  /** Optional call-to-action link appended to the body. */
  url?: string;
};

const FROM = process.env.EMAIL_FROM ?? "AIS Alumni <noreply@ais.kai-lab.net>";

let client: Resend | null = null;
function resend(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  client ??= new Resend(process.env.RESEND_API_KEY);
  return client;
}

function escapeHtml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function toHtml(msg: EmailMessage): string {
  const body = escapeHtml(msg.text).replaceAll("\n", "<br>");
  const cta = msg.url
    ? `<p><a href="${escapeHtml(msg.url)}" style="display:inline-block;padding:10px 16px;background:#1e3a8a;color:#fff;border-radius:6px;text-decoration:none">${escapeHtml(msg.url)}</a></p>`
    : "";
  return `<div style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.6;color:#111">${body}${cta}<hr style="margin-top:24px;border:none;border-top:1px solid #ddd"><p style="color:#666;font-size:12px">AIS Alumni Committee</p></div>`;
}

/** Send a transactional email. Without RESEND_API_KEY it logs instead (dev). */
export async function sendEmail(msg: EmailMessage): Promise<void> {
  const r = resend();
  const text = msg.url ? `${msg.text}\n\n${msg.url}` : msg.text;
  if (!r) {
    // EMAIL_DEV_MAILBOX=1 allows the file mailbox under `next start` (e2e tests).
    if (
      process.env.NODE_ENV === "production" &&
      process.env.EMAIL_DEV_MAILBOX !== "1"
    ) {
      throw new Error("RESEND_API_KEY is not set");
    }
    console.info(`[email:dev] to=${msg.to} subject=${msg.subject}\n${text}`);
    // Dev/test mailbox: the Playwright smoke tests read OTP codes from here.
    const dir = path.join(process.cwd(), ".data", "dev-mail");
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, `${msg.to}.txt`), `${msg.subject}\n${text}`);
    return;
  }
  const { error } = await r.emails.send({
    from: FROM,
    to: msg.to,
    subject: msg.subject,
    text,
    html: toHtml(msg),
  });
  if (error) throw new Error(`Resend error: ${error.message}`);
}
