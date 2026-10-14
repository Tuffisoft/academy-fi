"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { readGroupInvitations } from "@/lib/chat/client";
import { useRealtime } from "@/lib/chat/realtime/provider";
import type { ChatResult, GroupInvitation } from "@/lib/chat/types/chat.types";

export function useGroups(
  initialInvitations: GroupInvitation[],
  refreshChat: () => Promise<void>,
) {
  const { subscribe, refreshConversations } = useRealtime();
  const [invitations, setInvitations] = useState(initialInvitations);
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const revision = useRef(0);
  const mutationLock = useRef(false);

  const refresh = useCallback(async () => {
    const request = ++revision.current;
    setLoading(true);
    try {
      const result = await readGroupInvitations();
      if (request !== revision.current) return;
      if (result.ok) {
        setInvitations(result.data);
        setError(null);
      } else setError(result.error);
    } catch {
      if (request === revision.current)
        setError("Die Gruppeneinladungen konnten nicht geladen werden.");
    } finally {
      if (request === revision.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = subscribe((event) => {
      if (event !== "contacts.changed") void refresh();
    });
    return () => {
      revision.current += 1;
      unsubscribe();
    };
  }, [refresh, subscribe]);

  async function run<T>(
    action: () => Promise<ChatResult<T>>,
    after?: (data: T) => Promise<void>,
  ) {
    if (mutationLock.current) return null;
    mutationLock.current = true;
    setPending(true);
    setError(null);
    try {
      const result = await action();
      if (!result.ok) {
        setError(result.error);
        return null;
      }
      if (after) await after(result.data);
      await Promise.all([refresh(), refreshConversations(), refreshChat()]);
      return result;
    } catch {
      setError(
        "Die Gruppe konnte nicht aktualisiert werden. Bitte versuche es erneut.",
      );
      return null;
    } finally {
      mutationLock.current = false;
      setPending(false);
    }
  }

  return { invitations, loading, pending, error, refresh, run };
}
