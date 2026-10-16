"use client";

import { ArrowLeft, Hash, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { Conversation } from "@/lib/chat/types/chat.types";

type ChatHeaderProps = {
  conversation?: Conversation;
  onBack: () => void;
  onManageGroup?: () => void;
};

export function ChatHeader({
  conversation,
  onBack,
  onManageGroup,
}: ChatHeaderProps) {
  return (
    <div className="fi-chat-header flex min-h-[72px] shrink-0 items-center justify-between gap-2 border-b px-2 sm:gap-3 sm:px-5">
      <div className="flex min-w-0 items-center gap-3">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="md:hidden"
          aria-label="Zurück zu den Unterhaltungen"
          onClick={onBack}
        >
          <ArrowLeft aria-hidden="true" />
        </Button>

        {conversation && (
          <span className="fi-avatar flex size-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold">
            {conversation.group ? (
              <Hash className="size-5" aria-hidden="true" />
            ) : (
              conversation.initials
            )}
          </span>
        )}

        <div className="min-w-0">
          <h2 className="truncate text-base font-semibold">
            {conversation?.name ?? "Dein Messenger"}
          </h2>
        </div>
      </div>
      {conversation?.group && onManageGroup && (
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={onManageGroup}
          title="Gruppenmitglieder"
          aria-label="Gruppenmitglieder"
        >
          <Users aria-hidden="true" />
        </Button>
      )}
    </div>
  );
}
