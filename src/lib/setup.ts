/**
 * Setup checklist (pure): which first-time tasks a member has done. Shown
 * while their application is reviewed and on the dashboard until complete.
 */
export type SetupInput = {
  active: boolean;
  submitted: boolean;
  /** LINE Login configured on this server */
  lineAvailable: boolean;
  lineLinked: boolean;
  lineFollowing: boolean;
  hasAvatar: boolean;
  hasBio: boolean;
  hasHistory: boolean;
  followsSomeone: boolean;
  isParent: boolean;
  hasFamilyLink: boolean;
  /** 漢字 and フリガナ names recorded */
  hasKanjiName: boolean;
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
  | "family"
  | "names";

export type SetupItem = {
  key: SetupKey;
  done: boolean;
  href: string | null;
  /** nice to have: shown, but not needed to finish setup */
  optional?: boolean;
  /** optional, but we suggest it (「おすすめ」 instead of 「任意」) */
  recommended?: boolean;
};

export function setupChecklist(i: SetupInput): SetupItem[] {
  const items: SetupItem[] = [
    { key: "email", done: true, href: null },
    { key: "apply", done: i.submitted, href: "/app/onboarding/verify" },
    { key: "approval", done: i.active, href: null },
  ];
  // Not offered until LINE Login is set up (it couldn't be completed).
  if (i.lineAvailable || i.lineLinked)
    items.push({
      key: "line",
      done: i.lineLinked && i.lineFollowing,
      href: i.active ? "/app/settings#line" : "/app/onboarding/status#line",
    });
  // Recommended: 漢字・フリガナ make members findable by their Japanese
  // name. In the application before sending; after approval by a name
  // request (names are fixed); while the application is reviewed, later.
  items.push({
    key: "names",
    done: i.hasKanjiName,
    href: i.active
      ? "/app/profile/edit#name"
      : i.submitted
        ? null
        : "/app/onboarding/verify",
    optional: true,
    recommended: true,
  });
  // Profile tasks need an approved account.
  if (i.active)
    items.push(
      { key: "photo", done: i.hasAvatar, href: "/app/profile/edit" },
      { key: "bio", done: i.hasBio, href: "/app/profile/edit" },
      { key: "history", done: i.hasHistory, href: "/app/profile/history" },
      { key: "follow", done: i.followsSomeone, href: "/app/directory" },
    );
  // Optional for everyone: link parents, children or other family. Shown
  // from the start; the family page opens once approved.
  items.push({
    key: "family",
    done: i.hasFamilyLink,
    href: i.active ? "/app/family" : null,
    optional: true,
  });
  return items;
}

export function setupProgress(items: readonly SetupItem[]): {
  done: number;
  total: number;
  complete: boolean;
} {
  // Optional tasks don't count towards finishing setup.
  const required = items.filter((x) => !x.optional);
  const done = required.filter((x) => x.done).length;
  return { done, total: required.length, complete: done === required.length };
}
