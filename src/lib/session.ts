import { getLocale } from "next-intl/server";
import { cache } from "react";
import { auth } from "@/auth";
import type { Prisma } from "@/generated/prisma/client";
import { AccountState } from "@/generated/prisma/enums";
import { redirect } from "@/i18n/navigation";
import { db } from "@/lib/db";
import { homePathFor } from "@/lib/state-machine";

export type CurrentUser = Prisma.UserGetPayload<{ include: { roles: true } }>;

/** The signed-in user, loaded fresh from the database once per request. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return null;
  return db.user.findUnique({ where: { id }, include: { roles: true } });
});

async function go(href: string): Promise<never> {
  const locale = await getLocale();
  return redirect({ href, locale });
}

/** Any signed-in user, or redirect to the landing page. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) return go("/");
  return user;
}

/**
 * Signed-in user in one of the given states; others are sent to the screen
 * for their state. Use in onboarding pages.
 */
export async function requireState(
  ...states: AccountState[]
): Promise<CurrentUser> {
  const user = await requireUser();
  if (!states.includes(user.state)) return go(homePathFor(user));
  return user;
}

/** ACTIVE members only (§3.3). */
export async function requireActive(): Promise<CurrentUser> {
  return requireState(AccountState.ACTIVE);
}

/** ACTIVE admins only (§3.2). */
export async function requireAdmin(): Promise<CurrentUser> {
  const user = await requireActive();
  if (!user.isAdmin) return go("/dashboard");
  return user;
}

/**
 * Server-action guards: same checks, but throw instead of redirecting so
 * actions return an error to the caller.
 */
export class AuthError extends Error {}

export async function actionUser(
  ...states: AccountState[]
): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) throw new AuthError("unauthenticated");
  if (states.length && !states.includes(user.state))
    throw new AuthError("forbidden");
  return user;
}

export async function actionActive(): Promise<CurrentUser> {
  return actionUser(AccountState.ACTIVE);
}

export async function actionAdmin(): Promise<CurrentUser> {
  const user = await actionActive();
  if (!user.isAdmin) throw new AuthError("forbidden");
  return user;
}
