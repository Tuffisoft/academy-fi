"use client";

import type { Dispatch, SetStateAction } from "react";
import { Hash, MessageCircle, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ChatSection, Conversation } from "@/lib/chat/types/chat.types";

type ChatNavigationProps = {
  active?: Conversation;
  incomingRequests?: number;
  incomingGroupInvitations?: number;
  section: ChatSection;
  setSection: (section: ChatSection) => void;
  setSearch: Dispatch<SetStateAction<string>>;
};

const navigationItems = [
  { id: "chats", label: "Unterhaltungen", icon: MessageCircle },
  { id: "groups", label: "Gruppen", icon: Hash },
  { id: "contacts", label: "Kontakte", icon: Users },
] as const;

export function ChatNavigation({
  active,
  incomingRequests = 0,
  incomingGroupInvitations = 0,
  section,
  setSection,
  setSearch,
}: ChatNavigationProps) {
  function selectSection(nextSection: ChatSection) {
    setSection(nextSection);
    setSearch("");
  }

  return (
    <nav
      aria-label="Messenger"
      className={cn(
        "fi-chat-header flex shrink-0 items-center justify-around gap-2 border-b p-2 md:w-[72px] md:flex-col md:justify-start md:gap-3 md:border-r md:border-b-0 md:py-5",
        active && "hidden md:flex",
      )}
    >
      <span className="mb-3 hidden size-10 items-center justify-center rounded-xl bg-primary text-sm font-semibold text-primary-foreground md:flex">
        Fi
      </span>

      {navigationItems.map(({ id, label, icon: Icon }) => {
        const count =
          id === "groups"
            ? incomingGroupInvitations
            : id === "contacts"
              ? incomingRequests
              : 0;
        return (
          <Button
            key={id}
            type="button"
            size="icon-lg"
            variant={section === id ? "default" : "ghost"}
            className={
              id === "contacts"
                ? "relative rounded-full md:mt-auto"
                : "relative rounded-full"
            }
            aria-label={label}
            aria-pressed={section === id}
            title={label}
            onClick={() => selectSection(id)}
          >
            <Icon aria-hidden="true" />
            {count > 0 && (
              <span
                className="absolute -right-1 -top-1 rounded-full bg-primary px-1.5 text-[10px] text-primary-foreground"
                aria-label={`${count} offene ${id === "groups" ? "Gruppeneinladungen" : "Freundschaftsanfragen"}`}
              >
                {count > 99 ? "99+" : count}
              </span>
            )}
          </Button>
        );
      })}
    </nav>
  );
}
