import { NotifyChannel } from "@/generated/prisma/enums";

export type Channel = "LINE" | "EMAIL";

export type RoutableUser = {
  lineUserId: string | null;
  lineFollowing: boolean;
  notifyVia: NotifyChannel;
  primaryEmail: string | null;
};

/**
 * Delivery rule (§11):
 *   lineLinked && lineFollowing && notifyVia != EMAIL_ONLY → LINE, else email.
 * Returns null if the user is unreachable (no LINE and no email).
 */
export function chooseChannel(user: RoutableUser): Channel | null {
  if (
    user.lineUserId &&
    user.lineFollowing &&
    user.notifyVia !== NotifyChannel.EMAIL_ONLY
  ) {
    return "LINE";
  }
  return user.primaryEmail ? "EMAIL" : null;
}

/**
 * Channels to use. `alwaysEmail` kinds (verification result, security changes,
 * deactivation) go by email in addition to the routed channel (§11).
 */
export function channelsFor(
  user: RoutableUser,
  opts: { alwaysEmail?: boolean } = {},
): Channel[] {
  const primary = chooseChannel(user);
  const out = new Set<Channel>();
  if (primary) out.add(primary);
  if (opts.alwaysEmail && user.primaryEmail) out.add("EMAIL");
  return [...out];
}
