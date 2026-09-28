import { describe, expect, it, vi } from "vitest";
import { eachIdBatch, eachOrFailed, type IdCursor, START } from "./context";

const ids = ["a", "b", "c", "d", "e"];

function run(
  from: IdCursor,
  fail: Set<string>,
  opts: { deadlineAfterBatches?: number } = {},
) {
  const saved: IdCursor[] = [];
  const seen: string[] = [];
  let batches = 0;
  const ctx = {
    get deadline() {
      return opts.deadlineAfterBatches !== undefined &&
        batches >= opts.deadlineAfterBatches
        ? 0
        : Number.MAX_SAFE_INTEGER;
    },
    save: async (c: IdCursor) => {
      saved.push(c);
    },
  };
  return eachIdBatch(ids, from, ctx, 2, async (batch) => {
    batches++;
    seen.push(...batch);
    return batch.filter((id) => fail.has(id));
  }).then((step) => ({ step, saved, seen }));
}

describe("eachIdBatch", () => {
  it("goes through everything, keeping failures for the next call", async () => {
    const { step, seen, saved } = await run(START, new Set(["b"]));
    expect(seen).toEqual(ids);
    expect(step).toEqual({
      done: true,
      cursor: { after: "e", failed: ["b"] },
      count: 5,
    });
    // Progress saved after every batch.
    expect(saved.map((c) => c.after)).toEqual(["b", "d", "e"]);
  });

  it("stops at the deadline and resumes where it left off", async () => {
    const first = await run(START, new Set(), { deadlineAfterBatches: 1 });
    expect(first.step.done).toBe(false);
    expect(first.step.cursor).toEqual({ after: "b", failed: [] });
    const next = await run(first.step.cursor, new Set());
    expect(next.seen).toEqual(["c", "d", "e"]);
    expect(next.step.done).toBe(true);
  });

  it("retries earlier failures first, then continues", async () => {
    const { seen, step } = await run(
      { after: "c", failed: ["a", "b"] },
      new Set(["a"]),
    );
    expect(seen).toEqual(["a", "b", "d", "e"]);
    expect(step.cursor).toEqual({ after: "e", failed: ["a"] });
  });

  it("a retry-only pass (no ids) leaves the cursor alone", async () => {
    const saved: IdCursor[] = [];
    const step = await eachIdBatch(
      [],
      { after: null, failed: ["x"] },
      {
        deadline: Number.MAX_SAFE_INTEGER,
        save: async (c) => void saved.push(c),
      },
      10,
      async () => [],
    );
    expect(step).toEqual({
      done: true,
      cursor: { after: null, failed: [] },
      count: 1,
    });
  });
});

describe("eachOrFailed", () => {
  it("returns the ids whose call threw and keeps going", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const done: string[] = [];
    const failed = await eachOrFailed(
      ["a", "b", "c"],
      async (id) => {
        if (id === "b") throw new Error("boom");
        done.push(id);
      },
      "test",
    );
    expect(failed).toEqual(["b"]);
    expect(done).toEqual(["a", "c"]);
  });
});
