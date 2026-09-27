import { describe, expect, it } from "vitest";
import { InviteType } from "@/generated/prisma/enums";
import { hashInviteToken, inviteMatches, newInviteToken } from "./invites";

describe("invitations", () => {
  it("makes unguessable tokens and stores only a hash", () => {
    const a = newInviteToken();
    expect(a).toMatch(/^[\w-]{32}$/);
    expect(a).not.toBe(newInviteToken());
    expect(hashInviteToken(a)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashInviteToken(a)).not.toContain(a);
  });

  it("checks the application against the inviter's word", () => {
    const student = { type: InviteType.STUDENT, cohortNumber: 5 };
    expect(
      inviteMatches(student, {
        types: ["STUDENT"],
        student: { cohortNumber: 5 },
      }),
    ).toBe("match");
    expect(
      inviteMatches(student, {
        types: ["STUDENT"],
        student: { cohortNumber: 6 },
      }),
    ).toBe("mismatch");
    expect(inviteMatches(student, { types: ["PARENT"] })).toBe("mismatch");
    const parent = { type: InviteType.PARENT, cohortNumber: 20 };
    expect(
      inviteMatches(parent, {
        types: ["PARENT"],
        parent: { children: [{ cohortNumber: 19 }, { cohortNumber: 20 }] },
      }),
    ).toBe("match");
    expect(
      inviteMatches(parent, {
        types: ["PARENT"],
        parent: { children: [{ mode: "existing" }] },
      }),
    ).toBe("unknown");
    expect(
      inviteMatches(
        { type: InviteType.TEACHER, cohortNumber: null },
        { types: ["TEACHER"] },
      ),
    ).toBe("match");
  });
});
