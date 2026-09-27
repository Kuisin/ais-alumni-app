/**
 * Feature switches.
 *
 * MESSAGES_ENABLED: "お知らせを送る" (Broadcast messages from admins, teacher
 * managers and class representatives, with an inbox and read receipts). Off
 * for now: announcements go out as ニュース only. The code and data are kept
 * so it can be switched back on.
 */
export const MESSAGES_ENABLED = false;

/**
 * ADULTS_CHAT_ENABLED: the 「18歳以上」 group chat. Off until the release that
 * knows the ADULTS group kind is on main (dev and main share the database,
 * and main's Prisma client can't read an enum value it doesn't know).
 */
export const ADULTS_CHAT_ENABLED = false;
