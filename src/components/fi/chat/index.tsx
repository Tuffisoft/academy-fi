"use client";

import { Link } from "@/i18n/navigation";
import { useLayoutEffect, useRef, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { ChatNavigation } from "./chat-navigation";
import { ChatPanel } from "./chat-panel";
import { ConversationList } from "./conversation-list";
import { useChat } from "./use-chat";
import type { ChatSection, ChatUser } from "@/lib/types/chat.types";
import { FriendsPanel } from "@/components/fi/friends/friends-panel";
import { useFriends } from "@/components/fi/friends/use-friends";
import type { FriendsSnapshot } from "@/lib/types/friends.types";

export default function Chat({
  initialFriends,
  currentUser,
}: {
  initialFriends: FriendsSnapshot;
  currentUser: ChatUser;
}) {
  const friends = useFriends(initialFriends);
  const chat = useChat();
  const [section, setSection] = useState<ChatSection>("chats");
  const [search, setSearch] = useState("");
  const mainRef = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const shell = mainRef.current?.closest<HTMLElement>(".academy-dashboard");
    const viewport = window.visualViewport;
    if (!shell) return;
    // Next's Activity retains hidden pages in the DOM. A presence selector
    // would keep locking the dashboard after navigation, so mark visibility.
    const root = document.documentElement;
    shell.dataset.messengerActive = "true";
    root.dataset.messengerActive = "true";
    let frame = 0;

    // Keyboard opening can resize AND pan the visual viewport (especially on iOS).
    function updateViewport() {
      frame = 0;
      if (!shell) return;
      // Keep pinch zoom available; do not shrink the layout to its zoomed viewport.
      if (!viewport || Math.abs(viewport.scale - 1) < 0.01) {
        const height = viewport?.height ?? window.innerHeight;
        const top = Math.max(0, viewport?.offsetTop ?? 0);
        shell.style.setProperty("--messenger-height", `${height}px`);
        shell.style.setProperty("--messenger-top", `${top}px`);
        shell.dataset.keyboardOpen = String(window.innerHeight - height > 120);
        root.style.setProperty(
          "--fi-visible-height",
          `${height}px`,
        );
      }
    }

    function scheduleUpdate() {
      if (!frame) frame = requestAnimationFrame(updateViewport);
    }

    updateViewport();
    viewport?.addEventListener("resize", scheduleUpdate);
    viewport?.addEventListener("scroll", scheduleUpdate);
    window.addEventListener("resize", scheduleUpdate);
    window.addEventListener("orientationchange", scheduleUpdate);
    document.addEventListener("focusin", scheduleUpdate);
    document.addEventListener("focusout", scheduleUpdate);
    return () => {
      cancelAnimationFrame(frame);
      viewport?.removeEventListener("resize", scheduleUpdate);
      viewport?.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
      window.removeEventListener("orientationchange", scheduleUpdate);
      document.removeEventListener("focusin", scheduleUpdate);
      document.removeEventListener("focusout", scheduleUpdate);
      shell.style.removeProperty("--messenger-height");
      shell.style.removeProperty("--messenger-top");
      delete shell.dataset.keyboardOpen;
      delete shell.dataset.messengerActive;
      delete root.dataset.messengerActive;
      root.style.removeProperty("--fi-visible-height");
    };
  }, []);
  const active = chat.conversations.find((item) => item.id === chat.activeId);
  const visible = chat.conversations.filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase()),
  );

  function selectSection(next: ChatSection) {
    if (next !== "chats") chat.close();
    setSection(next);
  }

  async function startChat(contactId: string) {
    if (await chat.startWithContact(contactId)) {
      setSection("chats");
      setSearch("");
    }
  }

  const connectionLabels = {
    connected: "Verbunden",
    connecting: "Verbindung wird aufgebaut …",
    disconnected: "Verbindung unterbrochen – wird wiederhergestellt",
    unconfigured: "Verbindung noch nicht eingerichtet",
  };

  return (
    <main
      ref={mainRef}
      className="messenger mx-auto flex min-h-0 w-full min-w-0 max-w-[1440px] flex-1 flex-col bg-background px-0 py-2 md:px-5 md:py-4"
    >
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 px-3 md:px-1">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden="true" /> Dashboard
        </Link>
        <p
          role="status"
          className="flex items-center gap-2 text-xs text-muted-foreground"
        >
          <span
            aria-hidden="true"
            className={`size-2 rounded-full ${chat.status === "connected" ? "bg-primary" : "bg-muted-foreground"}`}
          />
          {connectionLabels[chat.status]}
        </p>
      </div>
      {chat.error && (
        <p role="alert" className="mb-3 text-sm text-destructive">
          {chat.error}
        </p>
      )}
      {chat.notice && (
        <p role="status" className="mb-3 text-sm text-muted-foreground">
          {chat.notice}
        </p>
      )}

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden border-y bg-card md:flex-row md:rounded-2xl md:border md:shadow-lg">
        <ChatNavigation
          active={active}
          incomingRequests={friends.snapshot.incoming.length}
          section={section}
          setSection={selectSection}
          setSearch={setSearch}
        />
        {section === "contacts" ? (
          <FriendsPanel
            snapshot={friends.snapshot}
            refreshError={friends.refreshError}
            onSnapshotChange={friends.updateSnapshot}
            onRefresh={friends.refresh}
            onStartChat={startChat}
            chatPending={chat.pending}
          />
        ) : section === "groups" ? (
          <section className="flex flex-1 flex-col items-center justify-center p-6 text-center">
            <h1 className="font-semibold">Gruppen</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Gruppenchats folgen im nächsten Schritt.
            </p>
          </section>
        ) : (
          <>
            <ConversationList
              active={active}
              activeId={chat.activeId}
              section={section}
              search={search}
              visible={visible}
              onSearchChange={setSearch}
              onOpen={(id) => void chat.open(id)}
              onDelete={(id) => void chat.hide(id)}
              pending={chat.pending}
            />
            <ChatPanel
              currentUser={currentUser}
              key={chat.activeId ?? "empty"}
              active={active}
              page={chat.page}
              loading={chat.loading}
              pending={chat.pending}
              loadingOlder={chat.loadingOlder}
              onBack={chat.close}
              onSend={chat.send}
              onEdit={chat.edit}
              onDelete={chat.remove}
              onLoadOlder={chat.loadOlder}
              onRefresh={chat.refresh}
            />
          </>
        )}
      </div>
    </main>
  );
}
