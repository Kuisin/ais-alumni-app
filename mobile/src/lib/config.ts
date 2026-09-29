/**
 * The website this app belongs to: its /api/mobile/v1 JSON API and the
 * pages shown in the web view. Set per build profile (eas.json); for a local
 * server use e.g. EXPO_PUBLIC_API_URL=http://192.168.1.10:3000 in .env.local.
 */
export const API_URL = (
  process.env.EXPO_PUBLIC_API_URL ?? "https://ais.kai-lab.net"
).replace(/\/+$/, "");

/** Resolve a site-relative URL from the API ("/api/files?…") to absolute. */
export function absoluteUrl(url: string): string;
export function absoluteUrl(url: string | null | undefined): string | null;
export function absoluteUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (/^[a-z][a-z0-9+.-]*:/i.test(url)) return url;
  return `${API_URL}${url.startsWith("/") ? "" : "/"}${url}`;
}
