"use client";

import { Search } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { ConversationRow } from "./conversation-row";
import type { ChatSection, Conversation } from "@/lib/chat/types/chat.types";

type ConversationListProps = {
  active?: Conversation;
  activeId: string | null;
  section: ChatSection;
  search: string;
  visible: Conversation[];
  onSearchChange: (text: string) => void;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
  pending: boolean;
  headerActions?: ReactNode;
  children?: ReactNode;
};

const sectionTitles: Record<ChatSection, string> = {
  chats: "Chats",
  contacts: "Kontakte",
  groups: "Gruppen",
};

export function ConversationList({
  active,
  activeId,
  section,
  search,
  visible,
  onSearchChange,
  onOpen,
  onDelete,
  pending,
  headerActions,
  children,
}: ConversationListProps) {
  return (
    <aside
      aria-label="Unterhaltungsliste"
      className={cn(
        "flex min-h-0 min-w-0 w-full flex-1 flex-col bg-card md:w-80 lg:w-[360px] md:shrink-0 md:flex-none md:border-r",
        active && "hidden md:flex",
      )}
    >
      <div className="border-b p-4">
        <div className="mb-4 flex items-center justify-between gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            {sectionTitles[section]}
          </h1>
          {headerActions}
        </div>
        <label className="flex items-center gap-3 rounded-xl bg-muted px-4 py-3 focus-within:ring-2 focus-within:ring-ring">
          <Search
            className="size-4 shrink-0 text-muted-foreground"
            aria-hidden="true"
          />
          <span className="sr-only">Unterhaltungen durchsuchen</span>
          <input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Suchen …"
            className="w-full min-w-0 bg-transparent text-base outline-none md:text-sm"
          />
        </label>
      </div>

      <div className="min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain p-2">
        {children}
        {visible.map((conversation) => (
          <ConversationRow
            key={conversation.id}
            conversation={conversation}
            isActive={activeId === conversation.id}
            onOpen={() => onOpen(conversation.id)}
            onDelete={() => onDelete(conversation.id)}
            pending={pending}
          />
        ))}
        {visible.length === 0 && (
          <p className="px-3 py-8 text-sm text-muted-foreground">
            {search
              ? "Keine Treffer."
              : section === "groups"
                ? "Noch keine Gruppen."
                : "Noch keine Unterhaltungen. Öffne einen Chat unter Kontakte."}
          </p>
        )}
      </div>
    </aside>
  );
}
