"use client";

import { useEffect, useRef, useState } from "react";
import { MessageCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChatHeader } from "./chat-header";
import { MessageComposer } from "./message-composer";
import { MessageItem } from "./message-item";
import type {
  ChatUser,
  Conversation,
  Message,
  MessagePage,
} from "@/lib/types/chat.types";
import { unconfirmedMessages, visibleMessages } from "./message-delivery";
import { Fragment } from "react";
import { dayLabel, messageDay } from "./chat-format";

type ChatPanelProps = {
  currentUser: ChatUser;
  active?: Conversation;
  page: MessagePage | null;
  loading: boolean;
  pending: boolean;
  loadingOlder: boolean;
  conversations: Conversation[];
  unreadCount: number;
  onBack: () => void;
  onSend: (text: string, clientId: string) => Promise<Message | null>;
  onEdit: (id: string, text: string) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
  onLoadOlder: () => Promise<void>;
  onOpen: (id: string) => void;
  onRefresh: () => Promise<void>;
};

export function ChatPanel({
  currentUser,
  active,
  page,
  loading,
  pending,
  loadingOlder,
  conversations,
  unreadCount,
  onBack,
  onSend,
  onEdit,
  onDelete,
  onLoadOlder,
  onOpen,
  onRefresh,
}: ChatPanelProps) {
  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [notifications, setNotifications] = useState(false);
  const [outgoing, setOutgoing] = useState<Message[]>([]);
  const inFlight = useRef(new Set<string>());
  const logRef = useRef<HTMLDivElement>(null);
  const nearBottom = useRef(true);
  const unconfirmed = unconfirmedMessages(page?.messages ?? [], outgoing);
  // Drop local copies when the server (including a websocket refresh) confirms them.
  if (unconfirmed.length !== outgoing.length) setOutgoing(unconfirmed);
  const messages = visibleMessages(page?.messages ?? [], outgoing);
  const lastId = messages.at(-1)?.id;
  const lastText = messages.at(-1)?.text;
  const unreadConversations = conversations.filter(
    (item) => item.unreadCount > 0,
  );

  useEffect(() => {
    const log = logRef.current;
    if (!log) return;
    let frame = 0;
    function followBottom() {
      if (!nearBottom.current || !log) return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (nearBottom.current) log.scrollTop = log.scrollHeight;
      });
    }
    followBottom();
    // Follow the latest message when the keyboard or a multiline draft changes
    // the available log height, without moving a reader browsing older messages.
    const observer = new ResizeObserver(followBottom);
    observer.observe(log);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [lastId, lastText]);

  async function send() {
    const text = draft.trim();
    if (pending || !text || !page?.canSend) return;
    const clientId = crypto.randomUUID();
    const message: Message = {
      id: `pending-${clientId}`,
      clientId,
      sequence: 0,
      text,
      own: true,
      senderId: currentUser.id,
      senderName: currentUser.name,
      createdAt: new Date().toISOString(),
      edited: false,
      delivery: "sending",
    };
    nearBottom.current = true;
    setOutgoing((current) => [...current, message]);
    setDraft("");
    await deliver(message);
  }

  async function deliver(message: Message) {
    if (inFlight.current.has(message.clientId) || pending) return;
    inFlight.current.add(message.clientId);
    setOutgoing((current) =>
      current.map((item) =>
        item.clientId === message.clientId
          ? { ...item, delivery: "sending" }
          : item,
      ),
    );
    try {
      const saved = await onSend(message.text, message.clientId);
      setOutgoing((current) =>
        saved
          ? current.filter((item) => item.clientId !== message.clientId)
          : current.map((item) =>
              item.clientId === message.clientId
                ? { ...item, delivery: "failed" }
                : item,
            ),
      );
    } catch {
      setOutgoing((current) =>
        current.map((item) =>
          item.clientId === message.clientId
            ? { ...item, delivery: "failed" }
            : item,
        ),
      );
    } finally {
      inFlight.current.delete(message.clientId);
    }
  }

  async function saveEdit() {
    if (!editingId || !editText.trim() || pending) return;
    if (await onEdit(editingId, editText)) setEditingId(null);
  }

  function startEditing(message: Message) {
    setEditingId(message.id);
    setEditText(message.text);
  }

  async function loadOlder() {
    const log = logRef.current;
    const height = log?.scrollHeight ?? 0;
    const scroll = log?.scrollTop ?? 0;
    await onLoadOlder();
    requestAnimationFrame(() => {
      if (log) log.scrollTop = scroll + log.scrollHeight - height;
    });
  }

  return (
    <section
      aria-label="Chatbereich"
      className={cn(
        "flex min-h-0 min-w-0 flex-1 flex-col",
        !active && "hidden md:flex",
      )}
    >
      <ChatHeader
        conversation={active}
        unreadCount={unreadCount}
        notificationsOpen={notifications}
        onBack={onBack}
        onToggleNotifications={() => setNotifications((open) => !open)}
      />
      {notifications && (
        <div className="space-y-2 border-b bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
          {unreadConversations.length === 0 ? (
            <p>Keine ungelesenen Nachrichten.</p>
          ) : (
            unreadConversations.map((conversation) => (
              <Button
                key={conversation.id}
                type="button"
                variant="ghost"
                className="w-full justify-between"
                onClick={() => {
                  setNotifications(false);
                  onOpen(conversation.id);
                }}
              >
                <span className="truncate">{conversation.name}</span>
                <span>{conversation.unreadCount} ungelesen</span>
              </Button>
            ))
          )}
        </div>
      )}
      <div
        ref={logRef}
        role="log"
        aria-label="Nachrichten"
        aria-busy={loading}
        className="fi-chat-wallpaper min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain px-3 py-4 sm:px-8 sm:py-6"
        onScroll={() => {
          const log = logRef.current;
          if (log)
            nearBottom.current =
              log.scrollHeight - log.scrollTop - log.clientHeight < 80;
        }}
      >
        {!active && <ConversationPlaceholder />}
        {active && loading && (
          <p
            role="status"
            className="py-12 text-center text-sm text-muted-foreground"
          >
            Nachrichten werden geladen …
          </p>
        )}
        {active && !loading && !page && (
          <Button
            type="button"
            variant="outline"
            onClick={() => void onRefresh()}
          >
            <RefreshCw aria-hidden="true" /> Erneut laden
          </Button>
        )}
        {page?.hasOlder && (
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            disabled={loadingOlder}
            onClick={() => void loadOlder()}
          >
            {loadingOlder ? "Wird geladen …" : "Ältere Nachrichten laden"}
          </Button>
        )}
        {active && page && messages.length === 0 && (
          <p className="py-12 text-center text-sm text-muted-foreground">
            Noch keine Nachrichten. Schreib die erste!
          </p>
        )}
        {messages.map((message, index) => (
          <Fragment key={message.id}>
            {(index === 0 ||
              messageDay(messages[index - 1].createdAt) !==
                messageDay(message.createdAt)) && (
              <div className="flex justify-center py-3">
                <span className="rounded-lg bg-card/95 px-3 py-1.5 text-[11px] text-muted-foreground shadow-sm">
                  {dayLabel(message.createdAt)}
                </span>
              </div>
            )}
            <MessageItem
              key={message.id}
              message={message}
              pending={pending}
              isEditing={editingId === message.id}
              editText={editText}
              onEditTextChange={setEditText}
              onStartEditing={() => startEditing(message)}
              onSaveEdit={() => void saveEdit()}
              onCancelEdit={() => setEditingId(null)}
              onDelete={() => void onDelete(message.id)}
              onRetry={() => void deliver(message)}
            />
          </Fragment>
        ))}
      </div>
      {active && page && !page.canSend && (
        <p className="border-t px-4 py-5 text-sm text-muted-foreground">
          Du kannst wieder schreiben, sobald ihr bestätigte Kontakte seid und
          beide Konten verfügbar sind.
        </p>
      )}
      {active && page?.canSend && (
        <MessageComposer
          recipientName={active.name}
          draft={draft}
          disabled={false}
          sending={pending}
          onDraftChange={setDraft}
          onSend={() => void send()}
        />
      )}
    </section>
  );
}

function ConversationPlaceholder() {
  return (
    <div className="flex min-h-72 flex-col items-center justify-center text-center">
      <MessageCircle className="mb-4 size-10 text-primary" aria-hidden="true" />
      <h2 className="font-semibold">Ein Gespräch beginnt mit Hallo.</h2>
      <p className="mt-2 max-w-xs text-sm text-muted-foreground">
        Wähle eine Unterhaltung oder starte ein Gespräch unter Kontakte.
      </p>
    </div>
  );
}
