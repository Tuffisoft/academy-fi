"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getFriendsAction } from "@/lib/actions/friend.actions";
import type { FriendsSnapshot } from "@/lib/types/friends.types";
import { useRealtime } from "@/lib/providers/realtime-provider";

export function useFriends(initialSnapshot: FriendsSnapshot) {
  const { subscribe } = useRealtime();
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const revision = useRef(0);

  const updateSnapshot = useCallback((next: FriendsSnapshot) => {
    revision.current += 1;
    setSnapshot(next);
    setRefreshError(null);
  }, []);

  const refresh = useCallback(async () => {
    const requestRevision = ++revision.current;
    try {
      const result = await getFriendsAction();
      if (requestRevision !== revision.current) return;

      if (result.ok) {
        setSnapshot(result.data);
        setRefreshError(null);
      } else setRefreshError(result.error);
    } catch {
      if (requestRevision === revision.current) {
        setRefreshError("Die Freundesliste konnte nicht aktualisiert werden.");
      }
    }
  }, []);

  useEffect(() => {
    const unsubscribe = subscribe((event) => {
      if (event !== "chat.changed") void refresh();
    });
    return () => {
      unsubscribe();
      revision.current += 1;
    };
  }, [refresh, subscribe]);

  return { snapshot, refreshError, refresh, updateSnapshot };
}
