import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import Line from "next-auth/providers/line";
import { z } from "zod";
import { AccountState, OtpPurpose } from "@/generated/prisma/enums";
import { appAdapter, resolveUserId } from "@/lib/auth/adapter";
import { normalizeEmail, verifyOtp } from "@/lib/auth/otp";
import { db } from "@/lib/db";
import { fetchLineFriendship } from "@/lib/line";

const otpCredentials = z.object({
  email: z.email(),
  code: z.string().regex(/^\d{6}$/),
  locale: z.enum(["ja", "en"]).optional(),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: appAdapter(),
  // JWT sessions are required by the Credentials (email OTP) provider. The
  // token only carries the user id; state/roles are always read fresh from the
  // database (src/lib/session.ts).
  session: { strategy: "jwt" },
  trustHost: true,
  pages: { signIn: "/", error: "/auth/error" },
  providers: [
    // 1. Email — passwordless 6-digit code (§4.1). Codes are issued by the
    //    requestSignInCode server action; this provider only verifies them.
    Credentials({
      id: "email-otp",
      name: "Email",
      credentials: { email: {}, code: {}, locale: {} },
      async authorize(raw) {
        const parsed = otpCredentials.safeParse(raw);
        if (!parsed.success) return null;
        const email = normalizeEmail(parsed.data.email);
        const result = await verifyOtp({ email, purpose: OtpPurpose.SIGN_IN, code: parsed.data.code });
        if (!result.ok) return null;
        const existing = await db.user.findUnique({ where: { primaryEmail: email } });
        const user =
          existing ??
          (await db.user.create({
            data: {
              primaryEmail: email,
              emailVerifiedAt: new Date(),
              state: AccountState.EMAIL_VERIFIED,
              locale: parsed.data.locale ?? "ja",
            },
          }));
        return { id: user.id, email: user.primaryEmail };
      },
    }),
    // 2. Google — its verified email is trusted and links by email (§4.3).
    Google({
      allowDangerousEmailAccountLinking: true,
      profile(p) {
        return {
          id: p.sub,
          email: p.email_verified ? p.email : null,
          name: p.name,
          image: p.picture,
          locale: p.locale,
        };
      },
    }),
    // 3. LINE — scopes `profile openid`; bot_prompt shows "Add friend" on the
    //    consent screen (§5.3). Its email is never trusted: LINE users confirm
    //    an email by OTP afterwards (§4.2), so no email is passed to Auth.js.
    Line({
      authorization: { params: { scope: "profile openid", bot_prompt: "aggressive" } },
      profile(p) {
        return { id: p.sub, email: null, name: p.name, image: p.picture };
      },
    }),
  ],
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider === "google" && !profile?.email_verified) return false;
      return true;
    },
    async jwt({ token, user }) {
      if (user?.id) token.sub = user.id;
      else if (token.sub) token.sub = await resolveUserId(token.sub);
      return token;
    },
    async session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      return session;
    },
  },
  events: {
    async signIn({ user, account, profile }) {
      if (account?.provider !== "line" || !user.id) return;
      const following = account.access_token
        ? await fetchLineFriendship(account.access_token)
        : null;
      await db.user.update({
        where: { id: user.id },
        data: {
          lineUserId: account.providerAccountId,
          lineDisplayName: typeof profile?.name === "string" ? profile.name : undefined,
          ...(following === null ? {} : { lineFollowing: following }),
        },
      });
    },
  },
});

