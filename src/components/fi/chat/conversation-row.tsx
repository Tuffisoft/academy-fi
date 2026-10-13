"use client";

import { Hash, Trash2 } from "lucide-react";

import { ActionMenu } from "@/components/fi/action-menu";
import { cn } from "@/lib/utils";
import type { Conversation } from "@/lib/types/chat.types";
import { dayLabel, messageTime } from "./chat-format";

type ConversationRowProps = {
  conversation: Conversation;
  isActive: boolean;
  onOpen: () => void;
  onDelete: () => void;
  pending: boolean;
};

export function ConversationRow({
  conversation,
  isActive,
  onOpen,
  onDelete,
  pending,
}: ConversationRowProps) {
  return (
    <div
      className={cn(
        "flex items-center rounded-xl hover:bg-muted",
        isActive && "bg-accent text-accent-foreground",
      )}
    >
      <button
        type="button"
        onClick={onOpen}
        aria-current={isActive ? "true" : undefined}
        className="flex min-w-0 flex-1 items-center gap-3 rounded-lg px-3 py-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="fi-avatar flex size-12 shrink-0 items-center justify-center rounded-full text-sm font-semibold">
          {conversation.group ? (
            <Hash className="size-4" aria-hidden="true" />
          ) : (
            conversation.initials
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center justify-between gap-2">
            <span className="block truncate text-[15px] font-semibold">
              {conversation.name}
            </span>
            <time
              dateTime={conversation.updatedAt}
              className="shrink-0 text-[10px] text-muted-foreground"
            >
              {dayLabel(conversation.updatedAt) === "Heute"
                ? messageTime(conversation.updatedAt)
                : dayLabel(conversation.updatedAt)}
            </time>
          </span>
          <span className="mt-1 block truncate text-xs text-muted-foreground">
            {conversation.lastMessage ?? "Noch keine Nachrichten"}
          </span>
        </span>
        {conversation.unreadCount > 0 && (
          <span
            className="rounded-full bg-primary px-1.5 text-xs text-primary-foreground"
            aria-label={`${conversation.unreadCount} ungelesene Nachrichten`}
          >
            {conversation.unreadCount > 99 ? "99+" : conversation.unreadCount}
          </span>
        )}
      </button>

      {!pending && (
        <div className="shrink-0 pr-1">
          <ActionMenu
            label={`Weitere Aktionen für ${conversation.name}`}
            actions={[
              {
                label: "Für mich entfernen",
                icon: Trash2,
                destructive: true,
                onClick: onDelete,
              },
            ]}
          />
        </div>
      )}
    </div>
  );
}
