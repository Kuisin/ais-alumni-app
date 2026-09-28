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
 * Channels to use (§11). Only LINE-enabled kinds (chat mentions, ニュース)
 * follow the member's LINE / email choice; every other kind goes by email.
 */
export function channelsFor(
  user: RoutableUser,
  opts: { line?: boolean } = {},
): Channel[] {
  const channel = opts.line
    ? chooseChannel(user)
    : user.primaryEmail
      ? "EMAIL"
      : null;
  return channel ? [channel] : [];
}

/**
 * Send on each channel in turn. When LINE fails — for example once the
 * month's LINE message allowance is used up — and email wasn't already
 * routed, fall back to email so the member still gets the notification.
 * Returns the channels that were sent.
 */
export async function deliverWithFallback(
  channels: readonly Channel[],
  canEmail: boolean,
  send: (channel: Channel) => Promise<void>,
  onError: (channel: Channel, error: unknown) => void,
): Promise<Channel[]> {
  const queue = [...channels];
  const sent: Channel[] = [];
  for (let i = 0; i < queue.length; i++) {
    const channel = queue[i];
    try {
      await send(channel);
      sent.push(channel);
    } catch (e) {
      onError(channel, e);
      if (channel === "LINE" && canEmail && !queue.includes("EMAIL"))
        queue.push("EMAIL");
    }
  }
  return sent;
}
