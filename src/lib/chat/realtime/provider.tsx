"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Realtime } from "ably";
import { readConversations } from "@/lib/chat/client";
import { userChannel } from "@/lib/chat/realtime/channel";
import type { Conversation } from "@/lib/chat/types/chat.types";

type Listener = (
  event: "chat.changed" | "contacts.changed" | "reconnected",
) => void;
type ConnectionStatus =
  "connecting" | "connected" | "disconnected" | "unconfigured";
type RealtimeContextValue = {
  conversations: Conversation[];
  unreadCount: number;
  status: ConnectionStatus;
  error: string | null;
  refreshConversations: () => Promise<void>;
  subscribe: (listener: Listener) => () => void;
};

const RealtimeContext = createContext<RealtimeContextValue | null>(null);

export function RealtimeProvider({
  userId,
  enabled,
  initialConversations,
  children,
}: {
  userId: string;
  enabled: boolean;
  initialConversations: Conversation[];
  children: ReactNode;
}) {
  const [conversations, setConversations] = useState(initialConversations);
  const [status, setStatus] = useState<ConnectionStatus>(
    enabled ? "connecting" : "unconfigured",
  );
  const [error, setError] = useState<string | null>(null);
  const listeners = useRef(new Set<Listener>());
  const revision = useRef(0);
  const inFlight = useRef<Promise<void> | null>(null);
  const refreshAgain = useRef(false);

  const refreshConversations = useCallback((): Promise<void> => {
    if (inFlight.current) {
      refreshAgain.current = true;
      return inFlight.current;
    }
    const run = async () => {
      do {
        refreshAgain.current = false;
        const request = ++revision.current;
        try {
          const result = await readConversations();
          if (request !== revision.current) return;
          if (result.ok) {
            setConversations(result.data);
            setError(null);
          } else setError(result.error);
        } catch {
          if (request === revision.current)
            setError("Die Unterhaltungen konnten nicht aktualisiert werden.");
        }
      } while (refreshAgain.current);
    };
    const promise = run().finally(() => {
      inFlight.current = null;
    });
    inFlight.current = promise;
    return promise;
  }, []);

  const subscribe = useCallback((listener: Listener) => {
    listeners.current.add(listener);
    return () => {
      listeners.current.delete(listener);
    };
  }, []);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    function resync() {
      if (document.visibilityState !== "visible") return;
      clearTimeout(timer);
      timer = setTimeout(() => {
        void refreshConversations();
        listeners.current.forEach((listener) => listener("reconnected"));
      }, 80);
    }
    window.addEventListener("focus", resync);
    document.addEventListener("visibilitychange", resync);
    if (!enabled)
      return () => {
        clearTimeout(timer);
        window.removeEventListener("focus", resync);
        document.removeEventListener("visibilitychange", resync);
      };

    const client = new Realtime({
      authUrl: "/api/realtime/token",
      authMethod: "POST",
      transports: ["web_socket"],
      autoConnect: false,
    });
    const channel = client.channels.get(userChannel(userId));
    client.connection.on((change) => {
      setStatus(
        change.current === "connected"
          ? "connected"
          : change.current === "connecting"
            ? "connecting"
            : "disconnected",
      );
    });
    channel.on("attached", resync);
    void channel
      .subscribe((message) => {
        if (
          message.name !== "chat.changed" &&
          message.name !== "contacts.changed"
        )
          return;
        if (message.name === "chat.changed") void refreshConversations();
        listeners.current.forEach((listener) =>
          listener(message.name as "chat.changed" | "contacts.changed"),
        );
      })
      .catch(() => setStatus("disconnected"));
    client.connect();

    return () => {
      clearTimeout(timer);
      revision.current += 1;
      channel.unsubscribe();
      client.close();
      window.removeEventListener("focus", resync);
      document.removeEventListener("visibilitychange", resync);
    };
  }, [userId, enabled, refreshConversations]);

  const value = useMemo(
    () => ({
      conversations,
      unreadCount: conversations.reduce(
        (sum, item) => sum + item.unreadCount,
        0,
      ),
      status,
      error,
      refreshConversations,
      subscribe,
    }),
    [conversations, status, error, refreshConversations, subscribe],
  );

  return (
    <RealtimeContext.Provider value={value}>
      {children}
    </RealtimeContext.Provider>
  );
}

export function useRealtime() {
  const context = useContext(RealtimeContext);
  if (!context) throw new Error("RealtimeProvider fehlt.");
  return context;
}

// The shared header is also rendered on pages without a realtime provider.
export function useUnreadCount() {
  return useContext(RealtimeContext)?.unreadCount ?? 0;
}
