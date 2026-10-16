"use client";

import { useRef, type FormEvent, type KeyboardEvent } from "react";
import { Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmojiPicker } from "./emoji-picker";

type MessageComposerProps = {
  recipientName: string;
  draft: string;
  disabled: boolean;
  sending: boolean;
  onDraftChange: (text: string) => void;
  onSend: () => void;
};

export function MessageComposer({
  recipientName,
  draft,
  disabled,
  sending,
  onDraftChange,
  onSend,
}: MessageComposerProps) {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const selectionRef = useRef<{ start: number; end: number } | null>(null);

  function insertEmoji(emoji: string) {
    if (disabled) return;
    const start = Math.min(
      selectionRef.current?.start ?? draft.length,
      draft.length,
    );
    const end = Math.min(
      selectionRef.current?.end ?? draft.length,
      draft.length,
    );
    const text = draft.slice(0, start) + emoji + draft.slice(end);
    if (text.length > 4000) return;
    const cursor = start + emoji.length;

    onDraftChange(text);
    selectionRef.current = { start: cursor, end: cursor };

    requestAnimationFrame(() => {
      inputRef.current?.focus({ preventScroll: true });
      inputRef.current?.setSelectionRange(cursor, cursor);
    });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (disabled || sending) return;
    onSend();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (disabled || sending) return;
    const shouldSend =
      event.key === "Enter" &&
      !event.shiftKey &&
      !event.nativeEvent.isComposing;

    if (shouldSend) {
      event.preventDefault();
      onSend();
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="fi-composer mt-auto flex min-w-0 shrink-0 items-center px-3 py-3 sm:px-5"
    >
      <div className="relative flex min-h-12 w-full min-w-0 items-center gap-2 overflow-hidden rounded-[1.75rem] bg-background py-1.5 pl-4 pr-1.5 shadow-sm focus-within:ring-2 focus-within:ring-ring">
        <label htmlFor="chat-message" className="sr-only">
          Nachricht an {recipientName}
        </label>
        <textarea
          ref={inputRef}
          id="chat-message"
          rows={1}
          wrap="soft"
          value={draft}
          disabled={disabled}
          maxLength={4000}
          onChange={(event) => onDraftChange(event.target.value)}
          onKeyDown={handleKeyDown}
          onSelect={(event) => {
            selectionRef.current = {
              start: event.currentTarget.selectionStart,
              end: event.currentTarget.selectionEnd,
            };
          }}
          placeholder={`Nachricht an ${recipientName} …`}
          className="field-sizing-content max-h-28 w-0 min-w-0 flex-1 resize-none overflow-x-hidden overflow-y-auto overscroll-contain wrap-anywhere bg-transparent px-2 py-2 text-base leading-6 outline-none placeholder:text-muted-foreground md:max-h-40 md:text-sm"
        />
        <EmojiPicker
          disabled={disabled}
          onSelect={insertEmoji}
          inputRef={inputRef}
        />
        <Button
          type="submit"
          size="icon"
          disabled={disabled || sending || !draft.trim()}
          aria-label="Nachricht senden"
          className="size-11 shrink-0 rounded-full"
        >
          <Send aria-hidden="true" />
        </Button>
      </div>
    </form>
  );
}
