import { signedFileUrl } from "@/lib/storage";

/**
 * avatarUrl holds a private storage key (avatars/<userId>/…) or, for Google
 * sign-ups, an absolute https URL which is used as-is. Call only after the
 * viewer is authorized to see the member (public tier).
 */
export function avatarSrc(avatarUrl: string | null | undefined): string | null {
  if (!avatarUrl) return null;
  if (/^https?:\/\//i.test(avatarUrl)) return avatarUrl;
  return signedFileUrl(avatarUrl);
}
