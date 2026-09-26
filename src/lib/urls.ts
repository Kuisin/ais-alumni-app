/** Absolute base URL for links in emails and LINE messages. */
export function appUrl(path = ""): string {
  const base =
    process.env.APP_URL ??
    (process.env.NODE_ENV === "production"
      ? "https://ais.kai-lab.net"
      : "http://localhost:3000");
  return `${base.replace(/\/$/, "")}${path}`;
}
