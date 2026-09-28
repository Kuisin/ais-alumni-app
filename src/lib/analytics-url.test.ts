import { describe, expect, it } from "vitest";
import { redactAnalyticsUrl } from "./analytics-url";

const O = "https://ais.kai-lab.net";

describe("redactAnalyticsUrl", () => {
  it("keeps page names", () => {
    expect(redactAnalyticsUrl(`${O}/ja/app/dashboard`)).toBe(
      `${O}/ja/app/dashboard`,
    );
    expect(redactAnalyticsUrl(`${O}/en/app/admin/name-requests`)).toBe(
      `${O}/en/app/admin/name-requests`,
    );
    expect(redactAnalyticsUrl(`${O}/ja/app/events/x/check-in`)).toBe(
      `${O}/ja/app/events/x/check-in`,
    );
  });

  it("drops query strings and hashes (search words, user IDs)", () => {
    expect(
      redactAnalyticsUrl(`${O}/ja/app/directory?q=Suzuki&role=GRADUATE`),
    ).toBe(`${O}/ja/app/directory`);
    expect(
      redactAnalyticsUrl(`${O}/en/app/admin/members?q=taro@example.com#top`),
    ).toBe(`${O}/en/app/admin/members`);
  });

  it("replaces IDs and tokens in the path", () => {
    expect(
      redactAnalyticsUrl(`${O}/ja/app/members/cmukc7syf0003ygsdd6s1gxdf`),
    ).toBe(`${O}/ja/app/members/[id]`);
    expect(
      redactAnalyticsUrl(`${O}/ja/app/chat/cmukgehv10001p3sdu144p8zx/info`),
    ).toBe(`${O}/ja/app/chat/[id]/info`);
    expect(
      redactAnalyticsUrl(`${O}/ja/app/handover/Zk3xQ9mV2pLr8TnW4yHs`),
    ).toBe(`${O}/ja/app/handover/[id]`);
    expect(
      redactAnalyticsUrl(
        `${O}/en/app/admin/events/123e4567-e89b-12d3-a456-426614174000`,
      ),
    ).toBe(`${O}/en/app/admin/events/[id]`);
  });

  it("keeps long page names, masks long tokens without digits", () => {
    expect(redactAnalyticsUrl(`${O}/ja/app/notification-preferences`)).toBe(
      `${O}/ja/app/notification-preferences`,
    );
    expect(
      redactAnalyticsUrl(`${O}/ja/app/handover/ZkxQmVpLrTnWyHsAbCdEf_gh`),
    ).toBe(`${O}/ja/app/handover/[id]`);
  });

  it("still strips the query from a relative URL", () => {
    expect(redactAnalyticsUrl("/ja/app/directory?q=Suzuki")).toBe(
      "/ja/app/directory",
    );
  });
});
