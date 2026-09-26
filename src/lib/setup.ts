/**
 * Setup checklist (pure): which first-time tasks a member has done. Shown
 * while their application is reviewed and on the dashboard until complete.
 */
export type SetupInput = {
  active: boolean;
  submitted: boolean;
  lineLinked: boolean;
  lineFollowing: boolean;
  hasAvatar: boolean;
  hasBio: boolean;
  hasHistory: boolean;
  followsSomeone: boolean;
  isParent: boolean;
  hasFamilyLink: boolean;
};

export type SetupKey =
  | "email"
  | "apply"
  | "approval"
  | "line"
  | "photo"
  | "bio"
  | "history"
  | "follow"
  | "family";

export type SetupItem = { key: SetupKey; done: boolean; href: string | null };

export function setupChecklist(i: SetupInput): SetupItem[] {
  const items: SetupItem[] = [
    { key: "email", done: true, href: null },
    { key: "apply", done: i.submitted, href: "/app/onboarding/verify" },
    { key: "approval", done: i.active, href: null },
    {
      key: "line",
      done: i.lineLinked && i.lineFollowing,
      href: i.active ? "/app/settings#line" : "/app/onboarding/status#line",
    },
  ];
  // Profile tasks need an approved account.
  if (i.active) {
    items.push(
      { key: "photo", done: i.hasAvatar, href: "/app/profile/edit" },
      { key: "bio", done: i.hasBio, href: "/app/profile/edit" },
      { key: "history", done: i.hasHistory, href: "/app/profile/history" },
      { key: "follow", done: i.followsSomeone, href: "/app/directory" },
    );
    if (i.isParent)
      items.push({ key: "family", done: i.hasFamilyLink, href: "/app/family" });
  }
  return items;
}

export function setupProgress(items: readonly SetupItem[]): {
  done: number;
  total: number;
  complete: boolean;
} {
  const done = items.filter((x) => x.done).length;
  return { done, total: items.length, complete: done === items.length };
}
