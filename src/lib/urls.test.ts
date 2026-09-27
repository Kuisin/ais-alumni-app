import { afterEach, describe, expect, it } from "vitest";
import { appUrl, publicUrl } from "./urls";

describe("notification links", () => {
  const saved = process.env.APP_URL;
  afterEach(() => {
    process.env.APP_URL = saved;
  });
  it("always use the production site, even from the dev deployment", () => {
    process.env.APP_URL = "https://ais-dev.kai-lab.net";
    expect(publicUrl("/ja/app/news/1")).toBe(
      "https://ais.kai-lab.net/ja/app/news/1",
    );
    // Technical URLs (OAuth callbacks) still follow the deployment.
    expect(appUrl("/api/line/link/callback")).toBe(
      "https://ais-dev.kai-lab.net/api/line/link/callback",
    );
  });
});
