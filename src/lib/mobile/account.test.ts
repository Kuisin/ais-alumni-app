import { describe, expect, it, vi } from "vitest";
import { getTranslatorFor } from "@/i18n/translator";
import { NOTIFY_CATEGORIES } from "@/lib/notify/catalog";
import {
  adminModeAreas,
  notifyCategories,
  notifyOffFor,
  orderDevices,
  roleFacts,
} from "./account";
import type { SignedInDevice } from "./contract/account";

// Only the pure helpers are tested here: keep the database, Auth.js and
// the website's server actions out of the import graph.
vi.mock("@/app/actions/settings", () => ({ updateLanguageAction: vi.fn() }));
vi.mock("@/components/profile/role-details", () => ({ sortRoles: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: {} }));
vi.mock("@/lib/avatar", () => ({
  defaultAvatar: vi.fn(),
  storedAvatarUrl: vi.fn(),
}));
vi.mock("@/lib/broadcasts", () => ({ getStaffAccess: vi.fn() }));
vi.mock("@/lib/cohorts-db", () => ({ cohortShortLabels: vi.fn() }));
vi.mock("@/lib/directory", () => ({ PARENT_ROLES: [] }));
vi.mock("@/lib/follows", () => ({ loadFollowCounts: vi.fn() }));
vi.mock("@/lib/line-link", () => ({ lineAddFriendUrl: vi.fn() }));
vi.mock("@/lib/mobile/http", () => ({
  ApiError: class extends Error {},
  notFound: vi.fn(),
}));
vi.mock("@/lib/mobile/tokens", () => ({
  bearerToken: vi.fn(),
  hashMobileToken: vi.fn(),
}));
vi.mock("@/lib/notify", () => ({ chooseChannel: vi.fn() }));

const NONE = {
  admin: false,
  broadcast: false,
  teachers: false,
  news: false,
};

const role = {
  cohortId: null,
  teacherStatus: null,
  yearsFrom: null,
  yearsTo: null,
  currentGrade: null,
  graduationOrLeaveYear: null,
  didGraduate: null,
  lastDivision: null,
} as const;

async function facts(
  r: Parameters<typeof roleFacts>[0],
  locale: "ja" | "en" = "ja",
  labels: Record<string, string> = { c4: "第4期" },
) {
  const [tr, tp] = await Promise.all([
    getTranslatorFor(locale, "roles"),
    getTranslatorFor(locale, "profile"),
  ]);
  return roleFacts(r, locale, labels, tr, tp);
}

describe("roleFacts (as the website's AIS在籍記録)", () => {
  it("former student: 学年, graduation, division", async () => {
    expect(
      await facts({
        ...role,
        role: "FORMER_STUDENT",
        cohortId: "c4",
        didGraduate: true,
        graduationOrLeaveYear: 2014,
        lastDivision: "HIGH_SCHOOL",
      }),
    ).toEqual(["第4期", "2014年卒業", "高校（10〜12年）"]);
  });

  it("former student who left, without a known 学年 label", async () => {
    expect(
      await facts({
        ...role,
        role: "FORMER_STUDENT",
        cohortId: "unknown",
        didGraduate: false,
        graduationOrLeaveYear: 2010,
      }),
    ).toEqual(["2010年に退学・転校"]);
  });

  it("teachers: status and years, in English too", async () => {
    expect(
      await facts(
        {
          ...role,
          role: "TEACHER",
          teacherStatus: "CURRENT",
          yearsFrom: 2015,
        },
        "en",
      ),
    ).toEqual(["Current", "At AIS 2015–present"]);
    expect(
      await facts({
        ...role,
        role: "TEACHER",
        teacherStatus: "FORMER",
        yearsFrom: 2001,
        yearsTo: 2009,
      }),
    ).toEqual(["元教職員", "在職 2001〜2009年"]);
  });

  it("current students: 学年 and grade; parents: nothing", async () => {
    expect(
      await facts({
        ...role,
        role: "CURRENT_STUDENT",
        cohortId: "c4",
        currentGrade: 3,
      }),
    ).toEqual(["第4期", "小学3年生"]);
    expect(await facts({ ...role, role: "CURRENT_PARENT" })).toEqual([]);
  });
});

describe("adminModeAreas", () => {
  it("lists what the member can do; admins' access covers news", () => {
    expect(adminModeAreas(NONE)).toEqual([]);
    expect(adminModeAreas({ ...NONE, admin: true, news: true })).toEqual([
      "admin",
    ]);
    expect(
      adminModeAreas({ ...NONE, broadcast: true, teachers: true, news: true }),
    ).toEqual(["broadcast", "teachers", "news"]);
  });
});

describe("notification categories", () => {
  it("shows every category in order; account can't be turned off", () => {
    const view = notifyCategories(["events", "account", "bogus"]);
    expect(view.map((c) => c.key)).toEqual([...NOTIFY_CATEGORIES]);
    expect(view.find((c) => c.key === "account")).toEqual({
      key: "account",
      on: true,
      locked: true,
    });
    expect(view.find((c) => c.key === "events")?.on).toBe(false);
    expect(view.filter((c) => !c.on).map((c) => c.key)).toEqual(["events"]);
  });

  it("saves the optional categories not chosen (unknown ones ignored)", () => {
    expect(notifyOffFor(["news", "chat", "account", "bogus"])).toEqual([
      "events",
      "social",
      "family",
      "profile",
      "admin",
    ]);
    expect(notifyOffFor(NOTIFY_CATEGORIES)).toEqual([]);
    expect(notifyOffFor([])).toHaveLength(NOTIFY_CATEGORIES.length - 1);
  });
});

describe("orderDevices", () => {
  const d = (id: string, lastUsedAt: string, current = false) =>
    ({
      id,
      platform: "ios",
      deviceName: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      lastUsedAt,
      current,
    }) satisfies SignedInDevice;

  it("puts this device first, then the most recently used", () => {
    expect(
      orderDevices([
        d("old", "2026-09-01T00:00:00.000Z"),
        d("me", "2026-08-01T00:00:00.000Z", true),
        d("new", "2026-09-28T00:00:00.000Z"),
      ]).map((x) => x.id),
    ).toEqual(["me", "new", "old"]);
  });
});
