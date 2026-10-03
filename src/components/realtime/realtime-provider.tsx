"use client";

import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { realtimeSessionAction } from "@/app/actions/chat";

type Payload = Record<string, unknown>;
type Handler = (payload: Payload) => void;

type Ctx = {
  /** connected to Supabase Realtime (false = callers should poll) */
  live: boolean;
  on: (topic: string, event: string, handler: Handler) => () => void;
};

const RealtimeContext = createContext<Ctx>({
  live: false,
  on: () => () => {},
});

const EVENTS = ["message", "delete", "read", "reaction", "refresh"] as const;

/**
 * One Supabase Realtime connection per tab (signal-only Broadcast channels,
 * see src/lib/realtime.ts). `topics` are joined for the whole session: the
 * member's own channel (refresh signals, e.g. new ニュース) and their chat
 * groups, so nav badges update live. Pages add handlers with useRealtime().
 * Without Realtime configured, `live` stays false.
 */
export function RealtimeProvider({
  topics,
  children,
}: {
  topics: readonly string[];
  children: ReactNode;
}) {
  const router = useRouter();
  const [live, setLive] = useState(false);
  const client = useRef<SupabaseClient | null>(null);
  const channels = useRef(new Map<string, RealtimeChannel>());
  const registry = useRef(new Map<string, Map<string, Set<Handler>>>());
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  const join = useCallback((topic: string) => {
    const c = client.current;
    if (!c || channels.current.has(topic)) return;
    const ch = c.channel(topic);
    for (const event of EVENTS)
      ch.on("broadcast", { event }, (msg) => {
        const handlers = registry.current.get(topic)?.get(event);
        for (const h of handlers ?? []) h((msg.payload ?? {}) as Payload);
      });
    ch.subscribe();
    channels.current.set(topic, ch);
  }, []);

  const on = useCallback(
    (topic: string, event: string, handler: Handler) => {
      const byEvent =
        registry.current.get(topic) ?? new Map<string, Set<Handler>>();
      registry.current.set(topic, byEvent);
      const set = byEvent.get(event) ?? new Set<Handler>();
      byEvent.set(event, set);
      set.add(handler);
      join(topic);
      return () => {
        set.delete(handler);
      };
    },
    [join],
  );

  // Connect once.
  useEffect(() => {
    let stopped = false;
    (async () => {
      const session = await realtimeSessionAction().catch(() => null);
      if (!session || stopped) return;
      const { createClient } = await import("@supabase/supabase-js");
      if (stopped) return;
      const c = createClient(session.url, session.key, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      client.current = c;
      setLive(true);
      for (const topic of registry.current.keys()) join(topic);
    })();
    return () => {
      stopped = true;
      const c = client.current;
      if (c) void c.removeAllChannels();
      channels.current.clear();
      client.current = null;
    };
  }, [join]);

  // Session-wide topics: refresh server-rendered badges when something new
  // arrives (debounced).
  const topicKey = topics.join(",");
  useEffect(() => {
    const refreshSoon = () => {
      clearTimeout(refreshTimer.current);
      refreshTimer.current = setTimeout(() => router.refresh(), 800);
    };
    const offs = topicKey
      .split(",")
      .filter(Boolean)
      .flatMap((topic) =>
        topic.startsWith("ais:user:")
          ? [on(topic, "refresh", refreshSoon)]
          : [on(topic, "message", refreshSoon)],
      );
    return () => {
      for (const off of offs) off();
    };
  }, [topicKey, on, router]);

  return (
    <RealtimeContext.Provider value={{ live, on }}>
      {children}
    </RealtimeContext.Provider>
  );
}

export function useRealtimeLive(): boolean {
  return useContext(RealtimeContext).live;
}

/** Call `handler` for `event` broadcasts on `topic` while mounted. */
export function useRealtime(
  topic: string,
  event: string,
  handler: Handler,
): void {
  const { on } = useContext(RealtimeContext);
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => on(topic, event, (p) => ref.current(p)), [on, topic, event]);
}
