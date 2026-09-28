// Web Analytics / Speed Insights only ever see a page's shape, never who or
// what: query strings (search words, ?q=<name or email>, ?target=<user id>)
// and hashes are dropped, and ID-like path segments — member / chat / news
// IDs and the secret token in /app/handover/<token> — become "[id]".

/** A path segment that is an ID or token rather than a page name. */
function isIdSegment(segment: string): boolean {
  // Page names are lowercase words in kebab-case ("check-in",
  // "record-requests"). cuids, UUIDs and random tokens mix letters and
  // digits; anything long that isn't plain words is treated as one too.
  if (segment.length >= 8 && /\d/.test(segment) && /[a-z]/i.test(segment))
    return true;
  return segment.length >= 20 && !/^[a-z]+(-[a-z]+)*$/.test(segment);
}

/** The URL with query, hash and ID-like path segments removed. */
export function redactAnalyticsUrl(url: string): string {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return url.split(/[?#]/)[0];
  }
  const path = parsed.pathname
    .split("/")
    .map((s) => (s && isIdSegment(decodeURIComponent(s)) ? "[id]" : s))
    .join("/");
  return `${parsed.origin}${path}`;
}
