"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { readMessages } from "@/lib/chat-client";
import {
  deleteConversationAction,
  markConversationReadAction,
  openConversationAction,
} from "@/lib/actions/conversation.actions";
import {
  deleteMessageAction,
  editMessageAction,
  sendMessageAction,
} from "@/lib/actions/message.actions";
import { useRealtime } from "@/lib/providers/realtime-provider";
import type { ChatResult, MessagePage } from "@/lib/types/chat.types";

function rememberPage(
  cache: Map<string, MessagePage>,
  id: string,
  page: MessagePage,
) {
  cache.delete(id);
  cache.set(id, page);
  if (cache.size > 8) cache.delete(cache.keys().next().value!);
}

export function useChat() {
  const realtime = useRealtime();
  const { subscribe, refreshConversations } = realtime;
  const [activeId, setActiveId] = useState<string | null>(null);
  const [page, setPage] = useState<MessagePage | null>(null);
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const selection = useRef<string | null>(null);
  const pageRef = useRef<MessagePage | null>(null);
  const revision = useRef(0);
  const mutationLock = useRef(false);
  const readSequence = useRef(new Map<string, number>());
  const readLock = useRef(false);
  const renderedPage = useRef<MessagePage | null>(null);
  const pages = useRef(new Map<string, MessagePage>());

  const refresh = useCallback(async () => {
    const conversationId = selection.current;
    if (!conversationId) return;
    const request = ++revision.current;
    const from =
      pageRef.current?.conversationId === conversationId
        ? pageRef.current.messages[0]?.sequence
        : undefined;
    try {
      const result = await readMessages(conversationId, { from });
      if (request !== revision.current || selection.current !== conversationId)
        return;
      if (result.ok) {
        pageRef.current = result.data;
        rememberPage(pages.current, conversationId, result.data);
        setPage(result.data);
        setError(null);
      } else setError(result.error);
    } catch {
      if (request === revision.current)
        setError("Die Nachrichten konnten nicht aktualisiert werden.");
    } finally {
      if (request === revision.current) setLoading(false);
    }
  }, []);

  const open = useCallback(
    async (id: string) => {
      selection.current = id;
      const cached = pages.current.get(id) ?? null;
      pageRef.current = cached;
      setActiveId(id);
      setPage(cached);
      setLoading(!cached);
      setError(null);
      setNotice(null);
      await refresh();
    },
    [refresh],
  );

  const close = useCallback(() => {
    revision.current += 1;
    selection.current = null;
    pageRef.current = null;
    setActiveId(null);
    setPage(null);
    setLoading(false);
    setError(null);
  }, []);

  useEffect(() => {
    const unsubscribe = subscribe((event) => {
      if (event !== "contacts.changed") void refresh();
    });
    return () => {
      unsubscribe();
      revision.current += 1;
    };
  }, [subscribe, refresh]);

  // Only mark messages actually rendered in the focused, visible chat as read.
  useEffect(() => {
    renderedPage.current = page;
    async function markVisible() {
      const visible = renderedPage.current;
      if (
        document.visibilityState !== "visible" ||
        !document.hasFocus() ||
        readLock.current ||
        !visible
      )
        return;
      const currentPage = pageRef.current;
      const last = currentPage?.messages.findLast(
        (message) => !message.own,
      )?.sequence;
      if (
        !currentPage ||
        !last ||
        visible.conversationId !== currentPage.conversationId ||
        visible.messages.findLast((message) => !message.own)?.sequence !==
          last ||
        selection.current !== currentPage.conversationId
      )
        return;
      if ((readSequence.current.get(currentPage.conversationId) ?? 0) >= last)
        return;
      readLock.current = true;
      try {
        const result = await markConversationReadAction(
          currentPage.conversationId,
          last,
        );
        if (result.ok) {
          readSequence.current.set(currentPage.conversationId, last);
          void refreshConversations();
          const latest = pageRef.current?.messages.at(-1)?.sequence ?? 0;
          if (
            selection.current === currentPage.conversationId &&
            latest > last
          ) {
            queueMicrotask(markSafely);
          }
        }
      } finally {
        readLock.current = false;
      }
    }
    const markSafely = () => {
      void markVisible().catch(() => {});
    };
    markSafely();
    window.addEventListener("focus", markSafely);
    document.addEventListener("visibilitychange", markSafely);
    return () => {
      window.removeEventListener("focus", markSafely);
      document.removeEventListener("visibilitychange", markSafely);
    };
  }, [page, refreshConversations]);

  async function mutate<T>(
    action: () => Promise<ChatResult<T>>,
    after?: (data: T) => Promise<void>,
  ) {
    if (mutationLock.current) return null;
    mutationLock.current = true;
    setPending(true);
    setError(null);
    setNotice(null);
    try {
      const result = await action();
      if (!result.ok) {
        setError(result.error);
        return null;
      }
      if (after) await after(result.data);
      return result;
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Die Verbindung wurde unterbrochen. Bitte versuche es erneut.",
      );
      return null;
    } finally {
      mutationLock.current = false;
      setPending(false);
    }
  }

  async function startWithContact(contactId: string) {
    const result = await mutate(
      () => openConversationAction(contactId),
      async (id) => {
        await refreshConversations();
        await open(id);
      },
    );
    if (!result) return false;
    return true;
  }

  async function hide(id: string) {
    await mutate(
      () => deleteConversationAction(id),
      async () => {
        pages.current.delete(id);
        if (selection.current === id) close();
        await refreshConversations();
      },
    );
  }

  async function updateMessage(
    action: () => Promise<ChatResult<{ realtimeDelivered: boolean }>>,
  ) {
    const result = await mutate(action, async () => {
      await Promise.all([refresh(), refreshConversations()]);
    });
    if (!result) return false;
    if (!result.data.realtimeDelivered) {
      setNotice(
        "Gespeichert. Die Live-Aktualisierung ist momentan nicht verfügbar.",
      );
    }
    return true;
  }

  async function send(text: string, clientId: string) {
    const conversationId = selection.current;
    if (!conversationId || !text.trim()) return null;
    setError(null);
    const result = await (async () => {
      try {
        const response = await sendMessageAction(
          conversationId,
          text,
          clientId,
        );
        if (!response.ok) {
          setError(response.error);
          return null;
        }
        return response;
      } catch (cause) {
        setError(
          cause instanceof Error
            ? cause.message
            : "Senden nicht bestätigt. Bitte versuche es erneut.",
        );
        return null;
      }
    })();
    if (!result) {
      const confirmed =
        pageRef.current?.conversationId === conversationId
          ? pageRef.current.messages.find(
              (message) => message.clientId === clientId,
            )
          : undefined;
      if (confirmed) setError(null);
      return confirmed ?? null;
    }
    const current = pageRef.current;
    if (
      selection.current === conversationId &&
      current?.conversationId === conversationId
    ) {
      revision.current += 1;
      const messages = [
        ...current.messages.filter((message) => message.clientId !== clientId),
        result.data,
      ].sort((first, second) => first.sequence - second.sequence);
      const next = { ...current, messages };
      pageRef.current = next;
      rememberPage(pages.current, conversationId, next);
      setPage(next);
    }
    void refreshConversations();
    return result.data;
  }

  async function edit(messageId: string, text: string) {
    const conversationId = selection.current;
    if (!conversationId) return false;
    return updateMessage(() =>
      editMessageAction(conversationId, messageId, text),
    );
  }

  async function remove(messageId: string) {
    const conversationId = selection.current;
    if (!conversationId) return false;
    return updateMessage(() => deleteMessageAction(conversationId, messageId));
  }

  async function loadOlder() {
    const conversationId = selection.current;
    const first = pageRef.current?.messages[0]?.sequence;
    if (!conversationId || !first || loadingOlder) return;
    setLoadingOlder(true);
    try {
      const result = await readMessages(conversationId, { before: first });
      if (selection.current !== conversationId) return;
      if (!result.ok) {
        setError(result.error);
        return;
      }
      const current = pageRef.current;
      if (!current) return;
      revision.current += 1;
      const messages = [
        ...result.data.messages,
        ...current.messages.filter((message) => message.sequence >= first),
      ];
      const next = { ...current, messages, hasOlder: result.data.hasOlder };
      pageRef.current = next;
      rememberPage(pages.current, conversationId, next);
      setPage(next);
    } catch {
      setError("Ältere Nachrichten konnten nicht geladen werden.");
    } finally {
      setLoadingOlder(false);
    }
  }

  return {
    ...realtime,
    activeId,
    page,
    loading,
    pending,
    loadingOlder,
    error: error ?? realtime.error,
    notice,
    open,
    close,
    refresh,
    startWithContact,
    hide,
    send,
    edit,
    remove,
    loadOlder,
  };
}
