import { cookies } from "next/headers";
import type { Adapter, AdapterAccount, AdapterUser } from "next-auth/adapters";
import type { User } from "@/generated/prisma/client";
import { AccountState, Locale } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { normalizeEmail } from "./otp";

/**
 * Minimal Auth.js adapter over our own User table (which uses `primaryEmail`
 * rather than Auth.js's `email`). JWT sessions are used, so session and
 * verification-token methods are not needed.
 */

function toAdapterUser(u: User): AdapterUser {
  return {
    id: u.id,
    // Auth.js types require a string; "" means "no verified email yet".
    email: u.primaryEmail ?? "",
    emailVerified: u.emailVerifiedAt,
    name: u.nameRomaji,
    image: u.avatarUrl,
  };
}

/** Follow UserMerge redirects so sessions of merged accounts keep working. */
export async function resolveUserId(id: string): Promise<string> {
  let current = id;
  for (let i = 0; i < 5; i++) {
    const merge = await db.userMerge.findUnique({
      where: { fromUserId: current },
    });
    if (!merge) return current;
    current = merge.toUserId;
  }
  return current;
}

export function pickLocale(value: unknown): Locale | null {
  if (typeof value !== "string") return null;
  const lang = value.toLowerCase().slice(0, 2);
  return lang === "ja" ? Locale.ja : lang === "en" ? Locale.en : null;
}

async function cookieLocale(): Promise<Locale | null> {
  try {
    return pickLocale((await cookies()).get("NEXT_LOCALE")?.value);
  } catch {
    return null;
  }
}

export function appAdapter(): Adapter {
  return {
    async createUser(data) {
      // Providers only pass `email` when it is verified (see src/auth.ts):
      // Google with email_verified=true. LINE never passes one (§4.2).
      const email = data.email ? normalizeEmail(data.email) : null;
      const locale =
        pickLocale((data as { locale?: unknown }).locale) ??
        (await cookieLocale()) ??
        Locale.ja;
      const user = await db.user.create({
        data: {
          primaryEmail: email,
          emailVerifiedAt: email ? new Date() : null,
          state: email
            ? AccountState.EMAIL_VERIFIED
            : AccountState.UNVERIFIED_EMAIL,
          locale,
          avatarUrl: data.image ?? null,
        },
      });
      return toAdapterUser(user);
    },
    async getUser(id) {
      const user = await db.user.findUnique({
        where: { id: await resolveUserId(id) },
      });
      return user ? toAdapterUser(user) : null;
    },
    async getUserByEmail(email) {
      if (!email) return null;
      const user = await db.user.findUnique({
        where: { primaryEmail: normalizeEmail(email) },
      });
      return user ? toAdapterUser(user) : null;
    },
    async getUserByAccount({ provider, providerAccountId }) {
      const account = await db.account.findUnique({
        where: { provider_providerAccountId: { provider, providerAccountId } },
        include: { user: true },
      });
      return account ? toAdapterUser(account.user) : null;
    },
    async updateUser({ id, ...data }) {
      // Auth.js only calls this for the email provider (not used). Keep names
      // and avatar under the member's control.
      const user = await db.user.update({
        where: { id },
        data: data.emailVerified ? { emailVerifiedAt: data.emailVerified } : {},
      });
      return toAdapterUser(user);
    },
    async deleteUser(id) {
      await db.user.delete({ where: { id } });
    },
    async linkAccount(account: AdapterAccount) {
      await db.account.create({
        data: {
          userId: account.userId,
          type: account.type,
          provider: account.provider,
          providerAccountId: account.providerAccountId,
          refresh_token: account.refresh_token ?? null,
          access_token: account.access_token ?? null,
          expires_at: account.expires_at ?? null,
          token_type: account.token_type ?? null,
          scope: account.scope ?? null,
          id_token: account.id_token ?? null,
          session_state:
            typeof account.session_state === "string"
              ? account.session_state
              : null,
        },
      });
      if (account.provider === "line") {
        await db.user.update({
          where: { id: account.userId },
          data: { lineUserId: account.providerAccountId },
        });
      }
    },
    async unlinkAccount({ provider, providerAccountId }) {
      const account = await db.account.delete({
        where: { provider_providerAccountId: { provider, providerAccountId } },
      });
      if (provider === "line") {
        await db.user.update({
          where: { id: account.userId },
          data: {
            lineUserId: null,
            lineFollowing: false,
            lineDisplayName: null,
          },
        });
      }
    },
  };
}
