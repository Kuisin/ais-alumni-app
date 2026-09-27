import { storedAvatarUrl } from "@/lib/avatar";

/**
 * avatarUrl holds a private storage key (avatars/<userId>/…) or, for Google
 * sign-ups, an absolute https URL which is used as-is. Only for the member's
 * own photo; for others use photoFor() (src/lib/avatar.ts).
 */
export function avatarSrc(avatarUrl: string | null | undefined): string | null {
  return storedAvatarUrl(avatarUrl);
}
