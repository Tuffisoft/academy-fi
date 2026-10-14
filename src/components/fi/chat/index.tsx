"use client";

import { Link } from "@/i18n/navigation";
import { useLayoutEffect, useRef, useState } from "react";
import { ArrowLeft, LogOut } from "lucide-react";
import { ChatNavigation } from "./layout/chat-navigation";
import { ChatPanel } from "./layout/chat-panel";
import { ConversationList } from "./conversations/conversation-list";
import { useChat } from "./hooks/use-chat";
import type {
  ChatSection,
  ChatUser,
  Conversation,
  GroupInvitation,
} from "@/lib/chat/types/chat.types";
import { useGroups } from "./hooks/use-groups";
import { CreateGroupDialog } from "./groups/create-group-dialog";
import { GroupInvitations } from "./groups/group-invitations";
import { GroupManager } from "./groups/group-manager";
import {
  createGroupAction,
  leaveGroupAction,
  respondToGroupInvitationAction,
} from "@/lib/chat/actions/group.actions";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { FriendsPanel } from "@/components/fi/friends/friends-panel";
import { useFriends } from "@/components/fi/friends/use-friends";
import type { FriendsSnapshot } from "@/lib/chat/types/friends.types";

export default function Chat({
  initialFriends,
  initialGroupInvitations,
  currentUser,
}: {
  initialFriends: FriendsSnapshot;
  initialGroupInvitations: GroupInvitation[];
  currentUser: ChatUser;
}) {
  const friends = useFriends(initialFriends);
  const chat = useChat();
  const groups = useGroups(initialGroupInvitations, chat.refresh);
  const [section, setSection] = useState<ChatSection>("chats");
  const [search, setSearch] = useState("");
  const [manageGroup, setManageGroup] = useState(false);
  const [leaveTarget, setLeaveTarget] = useState<Conversation | null>(null);
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
        root.style.setProperty("--fi-visible-height", `${height}px`);
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
  const visible = chat.conversations.filter(
    (item) =>
      item.group === (section === "groups") &&
      item.name.toLowerCase().includes(search.toLowerCase()),
  );

  function selectSection(next: ChatSection) {
    if (next !== section) {
      chat.close();
      setManageGroup(false);
    }
    setSection(next);
  }

  async function startChat(contactId: string) {
    if (await chat.startWithContact(contactId)) {
      setSection("chats");
      setSearch("");
    }
  }

  async function createGroup(name: string, contactIds: string[]) {
    const result = await groups.run(() => createGroupAction(name, contactIds));
    if (!result) return false;
    setSection("groups");
    setSearch("");
    setManageGroup(false);
    await chat.open(result.data);
    return true;
  }

  async function respondToInvitation(id: string, accept: boolean) {
    const result = await groups.run(() =>
      respondToGroupInvitationAction(id, accept),
    );
    if (result && accept) {
      setSection("groups");
      setSearch("");
      await chat.open(id);
    }
  }

  async function leaveGroup() {
    if (!leaveTarget) return;
    const result = await groups.run(
      () => leaveGroupAction(leaveTarget.id),
      async () => {
        if (chat.activeId === leaveTarget.id) {
          chat.close();
          setManageGroup(false);
        }
      },
    );
    if (result) setLeaveTarget(null);
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
      className="messenger mx-auto flex min-h-0 w-full min-w-0 max-w-[1440px] flex-1 flex-col overflow-hidden bg-background px-0 py-2 md:px-5 md:py-4"
    >
      <div className="mb-2 flex shrink-0 flex-wrap items-center justify-between gap-2 px-3 md:px-1">
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
        <p role="alert" className="mb-3 shrink-0 text-sm text-destructive">
          {chat.error}
        </p>
      )}
      {chat.notice && (
        <p
          role="status"
          className="mb-3 shrink-0 text-sm text-muted-foreground"
        >
          {chat.notice}
        </p>
      )}
      {groups.error && (
        <p role="alert" className="mb-3 shrink-0 text-sm text-destructive">
          {groups.error}
        </p>
      )}

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden border-y bg-card md:flex-row md:rounded-2xl md:border md:shadow-lg">
        <ChatNavigation
          active={active}
          incomingRequests={friends.snapshot.incoming.length}
          incomingGroupInvitations={groups.invitations.length}
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
              onDelete={(id) => {
                const conversation = chat.conversations.find(
                  (item) => item.id === id,
                );
                if (conversation?.group) setLeaveTarget(conversation);
                else void chat.hide(id);
              }}
              pending={chat.pending || groups.pending}
              headerActions={
                section === "groups" ? (
                  <CreateGroupDialog
                    contacts={friends.snapshot.friends}
                    pending={groups.pending}
                    error={groups.error}
                    onCreate={createGroup}
                  />
                ) : undefined
              }
            >
              {section === "groups" && (
                <GroupInvitations
                  invitations={groups.invitations}
                  loading={groups.loading}
                  pending={groups.pending}
                  onRespond={respondToInvitation}
                  onRefresh={groups.refresh}
                />
              )}
            </ConversationList>
            <ChatPanel
              currentUser={currentUser}
              key={chat.activeId ?? "empty"}
              active={active}
              page={chat.page}
              loading={chat.loading}
              pending={chat.pending || groups.pending}
              loadingOlder={chat.loadingOlder}
              onBack={chat.close}
              onSend={chat.send}
              onEdit={chat.edit}
              onDelete={chat.remove}
              onLoadOlder={chat.loadOlder}
              onRefresh={chat.refresh}
              onManageGroup={
                chat.page?.group ? () => setManageGroup(true) : undefined
              }
            />
          </>
        )}
      </div>
      {active?.group && chat.page?.group && (
        <GroupManager
          key={`${active.id}:${chat.page.group.name}`}
          conversationId={active.id}
          group={chat.page.group}
          userId={currentUser.id}
          contacts={friends.snapshot.friends}
          pending={groups.pending}
          error={groups.error}
          open={manageGroup}
          onOpenChange={setManageGroup}
          onRun={groups.run}
          onLeave={() => setLeaveTarget(active)}
        />
      )}
      <AlertDialog
        open={Boolean(leaveTarget)}
        onOpenChange={(open) => {
          if (!open && !groups.pending) setLeaveTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Gruppe verlassen?</AlertDialogTitle>
            <AlertDialogDescription className="wrap-anywhere">
              Du verlierst den Zugriff auf „{leaveTarget?.name}“. Beim Austritt
              des letzten Admins übernimmt ein verbleibendes Mitglied die
              Verwaltung.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {groups.error && (
            <p role="alert" className="text-sm text-destructive">
              {groups.error}
            </p>
          )}
          <AlertDialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={groups.pending}
              onClick={() => setLeaveTarget(null)}
            >
              Abbrechen
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={groups.pending}
              onClick={() => void leaveGroup()}
            >
              <LogOut aria-hidden="true" />{" "}
              {groups.pending ? "Wird verlassen …" : "Verlassen"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
