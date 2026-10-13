"use client";

import { Check, Clock3, Pencil, RotateCcw, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { messageTime } from "./chat-format";

import { ActionMenu } from "@/components/fi/action-menu";
import { Button } from "@/components/ui/button";
import type { Message } from "@/lib/types/chat.types";

type MessageItemProps = {
  message: Message;
  pending: boolean;
  isEditing: boolean;
  editText: string;
  onEditTextChange: (text: string) => void;
  onStartEditing: () => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onDelete: () => void;
  onRetry: () => void;
};

export function MessageItem({
  message,
  pending,
  isEditing,
  editText,
  onEditTextChange,
  onStartEditing,
  onSaveEdit,
  onCancelEdit,
  onDelete,
  onRetry,
}: MessageItemProps) {
  const authorName = message.senderName;
  const showActions =
    message.own && !message.delivery && !isEditing && !pending;
  const editorId = `edit-message-${message.id}`;

  return (
    <article
      aria-label={`Nachricht von ${authorName}`}
      className={cn(
        "group flex min-w-0 items-end gap-1.5",
        message.own ? "justify-end" : "justify-start",
      )}
    >
      <div
        className={cn(
          "min-w-0 max-w-[88%] rounded-xl border px-3 py-2 shadow-sm sm:max-w-[75%] lg:max-w-[65%]",
          message.own
            ? "rounded-tr-sm border-primary bg-primary text-primary-foreground"
            : "rounded-tl-sm bg-card text-card-foreground",
          isEditing && "w-full",
        )}
      >
        <div className="sr-only">{authorName}</div>

        {isEditing ? (
          <div className="space-y-2">
            <label className="sr-only" htmlFor={editorId}>
              Nachricht bearbeiten
            </label>
            <textarea
              id={editorId}
              value={editText}
              disabled={pending}
              maxLength={4000}
              onChange={(event) => onEditTextChange(event.target.value)}
              className="w-full rounded-lg border bg-background p-2 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring md:text-sm"
            />
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                disabled={pending || !editText.trim()}
                onClick={onSaveEdit}
              >
                Speichern
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={pending}
                onClick={onCancelEdit}
              >
                Abbrechen
              </Button>
            </div>
          </div>
        ) : (
          <p className="whitespace-pre-wrap wrap-anywhere text-[15px] leading-[1.45]">
            {message.text}
          </p>
        )}
        <div
          className={cn(
            "mt-1 flex items-center justify-end gap-1.5 text-[10px]",
            message.own
              ? "text-primary-foreground/80"
              : "text-muted-foreground",
          )}
        >
          {message.edited && <span>bearbeitet</span>}
          <time dateTime={message.createdAt}>
            {messageTime(message.createdAt)}
          </time>
          {message.own &&
            message.delivery !== "failed" &&
            (message.delivery === "sending" ? (
              <Clock3 className="size-3" aria-label="Wird gesendet" />
            ) : (
              <Check className="size-3.5" aria-label="Gespeichert" />
            ))}
        </div>
        {message.delivery === "sending" && (
          <p role="status" className="sr-only">
            Wird gesendet …
          </p>
        )}
        {message.delivery === "failed" && (
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span role="alert" className="text-xs text-destructive">
              Senden nicht bestätigt
            </span>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={pending}
              onClick={onRetry}
            >
              <RotateCcw aria-hidden="true" /> Erneut senden
            </Button>
          </div>
        )}
      </div>

      {showActions && (
        <div className="order-first shrink-0 opacity-70 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
          <ActionMenu
            label="Weitere Aktionen für deine Nachricht"
            actions={[
              { label: "Bearbeiten", icon: Pencil, onClick: onStartEditing },
              {
                label: "Löschen",
                icon: Trash2,
                destructive: true,
                onClick: onDelete,
              },
            ]}
          />
        </div>
      )}
    </article>
  );
}
