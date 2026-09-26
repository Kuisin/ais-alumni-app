import type { Prisma } from "@/generated/prisma/client";
import { RoleKey } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import {
  canViewPrivate as canViewPrivateCore,
  canViewProfile,
  type Relationship,
  type Target,
  type Viewer,
} from "./core";

export * from "./core";

type UserWithRoles = Prisma.UserGetPayload<{ include: { roles: true } }>;

export function toViewer(user: UserWithRoles): Viewer {
  return {
    id: user.id,
    state: user.state,
    isAdmin: user.isAdmin,
    roles: user.roles.map((r) => r.role),
    familyId: user.familyId,
  };
}

export const toTarget: (user: UserWithRoles) => Target = (user) => ({
  id: user.id,
  state: user.state,
  roles: user.roles.map((r) => r.role),
  dateOfBirth: user.dateOfBirth,
  familyId: user.familyId,
});

export async function loadRelationship(
  viewerId: string,
  targetId: string,
): Promise<Relationship> {
  if (viewerId === targetId) return { follow: null, blocked: false };
  const [follow, block] = await Promise.all([
    db.follow.findUnique({
      where: {
        followerId_followeeId: { followerId: viewerId, followeeId: targetId },
      },
      select: { status: true },
    }),
    db.block.findFirst({
      where: {
        OR: [
          { blockerId: viewerId, blockedId: targetId },
          { blockerId: targetId, blockedId: viewerId },
        ],
      },
      select: { id: true },
    }),
  ]);
  return { follow: follow?.status ?? null, blocked: block !== null };
}

/** IDs hidden from the viewer because of a block in either direction. */
export async function blockedUserIds(viewerId: string): Promise<string[]> {
  const blocks = await db.block.findMany({
    where: { OR: [{ blockerId: viewerId }, { blockedId: viewerId }] },
    select: { blockerId: true, blockedId: true },
  });
  return blocks.map((b) =>
    b.blockerId === viewerId ? b.blockedId : b.blockerId,
  );
}

/** DB-backed wrapper for the single private-tier gate (§15). */
export async function canViewPrivate(
  viewer: UserWithRoles,
  target: UserWithRoles,
): Promise<boolean> {
  const rel = await loadRelationship(viewer.id, target.id);
  return canViewPrivateCore(toViewer(viewer), toTarget(target), rel);
}

export type PublicProfile = {
  id: string;
  nameRomaji: string | null;
  nameKanji: string | null;
  nameAtAis: string | null;
  avatarUrl: string | null;
  bio: string | null;
  roles: {
    role: RoleKey;
    yearsFrom: number | null;
    yearsTo: number | null;
    lastDivision: UserWithRoles["roles"][number]["lastDivision"];
    graduationOrLeaveYear: number | null;
    didGraduate: boolean | null;
    currentStage: UserWithRoles["roles"][number]["currentStage"];
    currentGrade: number | null;
    subjects: string | null;
    cohortId: string | null;
  }[];
};

export type PrivateProfile = {
  email: string | null;
  phone: string | null;
  lineDisplayName: string | null;
  currentStageDetail: string | null;
  socialLinks: Prisma.JsonValue | null;
};

export type ProfileView = {
  public: PublicProfile;
  /** null unless canViewPrivate() allowed it */
  private: PrivateProfile | null;
  relationship: Relationship;
  isSelf: boolean;
};

export function projectPublic(user: UserWithRoles): PublicProfile {
  return {
    id: user.id,
    nameRomaji: user.nameRomaji,
    nameKanji: user.nameKanji,
    nameAtAis: user.nameAtAis,
    avatarUrl: user.avatarUrl,
    bio: user.bio,
    roles: user.roles.map((r) => ({
      role: r.role,
      yearsFrom: r.yearsFrom,
      yearsTo: r.yearsTo,
      lastDivision: r.lastDivision,
      graduationOrLeaveYear: r.graduationOrLeaveYear,
      didGraduate: r.didGraduate,
      currentStage: r.currentStage,
      currentGrade: r.currentGrade,
      subjects: r.subjects,
      cohortId: r.cohortId,
    })),
  };
}

function projectPrivate(user: UserWithRoles): PrivateProfile {
  return {
    email: user.primaryEmail,
    phone: user.phone,
    lineDisplayName: user.lineDisplayName,
    currentStageDetail:
      user.roles.find((r) => r.role === RoleKey.FORMER_STUDENT)
        ?.currentStageDetail ?? null,
    socialLinks: user.socialLinks ?? null,
  };
}

/**
 * Load another member's profile as the viewer is allowed to see it. Returns
 * null if the viewer may not see the target at all. All profile reads for
 * display MUST go through here so private fields are never leaked.
 */
export async function getProfileForViewer(
  viewer: UserWithRoles,
  targetId: string,
): Promise<ProfileView | null> {
  const target = await db.user.findUnique({
    where: { id: targetId },
    include: { roles: true },
  });
  if (!target) return null;
  const rel = await loadRelationship(viewer.id, target.id);
  const v = toViewer(viewer);
  const t = toTarget(target);
  if (!canViewProfile(v, t, rel)) return null;
  return {
    public: projectPublic(target),
    private: canViewPrivateCore(v, t, rel) ? projectPrivate(target) : null,
    relationship: rel,
    isSelf: viewer.id === target.id,
  };
}
