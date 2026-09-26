import { describe, expect, it } from "vitest";
import { AccountState as S } from "@/generated/prisma/enums";
import {
  assertTransition,
  canTransition,
  homePathFor,
  InvalidTransitionError,
} from "./state-machine";

describe("account state machine", () => {
  it("allows the happy path", () => {
    expect(canTransition(S.UNVERIFIED_EMAIL, S.EMAIL_VERIFIED)).toBe(true);
    expect(canTransition(S.EMAIL_VERIFIED, S.PENDING_REVIEW)).toBe(true);
    expect(canTransition(S.PENDING_REVIEW, S.ACTIVE)).toBe(true);
    expect(canTransition(S.ACTIVE, S.DEACTIVATED)).toBe(true);
  });
  it("supports the needs-info loop and rejection", () => {
    expect(canTransition(S.PENDING_REVIEW, S.NEEDS_INFO)).toBe(true);
    expect(canTransition(S.NEEDS_INFO, S.PENDING_REVIEW)).toBe(true);
    expect(canTransition(S.PENDING_REVIEW, S.REJECTED)).toBe(true);
  });
  it("forbids skipping review or email verification", () => {
    expect(canTransition(S.EMAIL_VERIFIED, S.ACTIVE)).toBe(false);
    expect(canTransition(S.UNVERIFIED_EMAIL, S.PENDING_REVIEW)).toBe(false);
    expect(canTransition(S.NEEDS_INFO, S.ACTIVE)).toBe(false);
    expect(canTransition(S.REJECTED, S.ACTIVE)).toBe(false);
    expect(() => assertTransition(S.EMAIL_VERIFIED, S.ACTIVE)).toThrow(
      InvalidTransitionError,
    );
  });
  it("routes each state to its screen", () => {
    expect(
      homePathFor({ state: S.UNVERIFIED_EMAIL, lineOnboardingSeenAt: null }),
    ).toBe("/onboarding/email");
    expect(
      homePathFor({ state: S.EMAIL_VERIFIED, lineOnboardingSeenAt: null }),
    ).toBe("/onboarding/line");
    expect(
      homePathFor({
        state: S.EMAIL_VERIFIED,
        lineOnboardingSeenAt: new Date(),
      }),
    ).toBe("/onboarding/verify");
    expect(
      homePathFor({ state: S.NEEDS_INFO, lineOnboardingSeenAt: null }),
    ).toBe("/onboarding/verify");
    expect(
      homePathFor({ state: S.PENDING_REVIEW, lineOnboardingSeenAt: null }),
    ).toBe("/onboarding/status");
    expect(homePathFor({ state: S.ACTIVE, lineOnboardingSeenAt: null })).toBe(
      "/dashboard",
    );
  });
});
