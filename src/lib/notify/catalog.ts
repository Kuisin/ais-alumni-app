/**
 * Every notification the app sends, in one place (texts: messages/<locale>/
 * notifications.json → kinds.<KIND>).
 *
 * Message rules (all kinds):
 *  - title: short, what happened (≤ ~20 chars in Japanese). No brand prefix
 *    on LINE (the official account name shows); email subjects get
 *    「【AIS同窓会】」.
 *  - body: one sentence, who / what — never private content (message text,
 *    post bodies, committee notes). LINE shows only title + body + link.
 *  - email: the same, plus `detail` (what to do next) and the committee
 *    note if any, in a branded wrapper with a button and a footer saying
 *    why it was sent and where to change settings.
 *  - link: always a short /n/<member code>/<token> link (see links.ts), never a direct
 *    app URL.
 *
 * Categories let members turn groups of notifications off (Settings);
 * `account` (application result, security, account status, results of
 * their own requests) can't be turned off.
 */

export const NOTIFY_CATEGORIES = [
  "account",
  "news",
  "events",
  "chat",
  "social",
  "family",
  "profile",
  "admin",
] as const;
export type NotifyCategory = (typeof NOTIFY_CATEGORIES)[number];

/** Categories members may turn off. */
export const OPTIONAL_CATEGORIES: readonly NotifyCategory[] =
  NOTIFY_CATEGORIES.filter((c) => c !== "account");

type KindSpec = {
  category: NotifyCategory;
  emoji: string;
  /** Also email when LINE is the routed channel (important / security). */
  alwaysEmail?: boolean;
};

export const NOTIFY_KINDS = {
  // Account — always sent
  VERIFICATION_APPROVED: {
    category: "account",
    emoji: "🎉",
    alwaysEmail: true,
  },
  VERIFICATION_REJECTED: {
    category: "account",
    emoji: "📋",
    alwaysEmail: true,
  },
  VERIFICATION_NEEDS_INFO: {
    category: "account",
    emoji: "📝",
    alwaysEmail: true,
  },
  SECURITY_METHOD_ADDED: {
    category: "account",
    emoji: "🔐",
    alwaysEmail: true,
  },
  SECURITY_METHOD_REMOVED: {
    category: "account",
    emoji: "🔐",
    alwaysEmail: true,
  },
  ACCOUNT_DEACTIVATED_SELF: {
    category: "account",
    emoji: "👋",
    alwaysEmail: true,
  },
  ACCOUNT_DEACTIVATED: { category: "account", emoji: "⏸️", alwaysEmail: true },
  ACCOUNT_REACTIVATED: { category: "account", emoji: "▶️" },
  NAME_REQUEST_APPROVED: { category: "account", emoji: "✅" },
  NAME_REQUEST_REJECTED: { category: "account", emoji: "📋" },
  BIRTH_DATE_REQUEST_APPROVED: { category: "account", emoji: "✅" },
  BIRTH_DATE_REQUEST_REJECTED: { category: "account", emoji: "📋" },
  GENDER_REQUEST_APPROVED: { category: "account", emoji: "✅" },
  GENDER_REQUEST_REJECTED: { category: "account", emoji: "📋" },
  RECORD_REQUEST_APPROVED: { category: "account", emoji: "✅" },
  RECORD_REQUEST_REJECTED: { category: "account", emoji: "📋" },
  // News
  NEWS: { category: "news", emoji: "📰" },
  NEWS_REMINDER: { category: "news", emoji: "⏰" },
  BROADCAST: { category: "news", emoji: "✉️" },
  // Events
  EVENT_REMINDER_7D: { category: "events", emoji: "📅" },
  EVENT_REMINDER_1D: { category: "events", emoji: "📅" },
  // Chat
  CHAT_MENTION: { category: "chat", emoji: "💬" },
  CHAT_DIGEST: { category: "chat", emoji: "💬" },
  // Follows & vouching
  FOLLOW_REQUEST: { category: "social", emoji: "👤" },
  FOLLOW_AUTO_ACCEPTED: { category: "social", emoji: "👤" },
  FOLLOW_ACCEPTED: { category: "social", emoji: "🤝" },
  VOUCH_REQUEST: { category: "social", emoji: "🙋" },
  // Family
  FAMILY_LINK_REQUEST_AS_CHILD: { category: "family", emoji: "👨‍👩‍👧" },
  FAMILY_LINK_REQUEST_AS_PARENT: { category: "family", emoji: "👨‍👩‍👧" },
  FAMILY_HANDOVER_DONE: { category: "family", emoji: "🔑" },
  // Profile
  STAGE_PROMPT: { category: "profile", emoji: "🎓" },
  // Admin work
  NAME_REQUEST_ADMIN: { category: "admin", emoji: "🗂️" },
  BIRTH_DATE_REQUEST_ADMIN: { category: "admin", emoji: "🗂️" },
  GENDER_REQUEST_ADMIN: { category: "admin", emoji: "🗂️" },
  RECORD_REQUEST_ADMIN: { category: "admin", emoji: "🗂️" },
} as const satisfies Record<string, KindSpec>;

export type NotifyKind = keyof typeof NOTIFY_KINDS;

export function kindSpec(kind: NotifyKind): KindSpec {
  return NOTIFY_KINDS[kind];
}

/** Whether a member with these turned-off categories gets this kind. */
export function wantsKind(
  notifyOff: readonly string[] | null | undefined,
  kind: NotifyKind,
): boolean {
  const { category } = NOTIFY_KINDS[kind];
  return category === "account" || !(notifyOff ?? []).includes(category);
}
