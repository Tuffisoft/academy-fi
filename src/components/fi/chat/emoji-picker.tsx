"use client";

import { useState, type RefObject } from "react";
import { Popover } from "@base-ui/react/popover";
import { Smile, X } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";

const emojis = [
  { value: "😀", label: "Grinsen" },
  { value: "😊", label: "Lächeln" },
  { value: "😂", label: "Freudentränen" },
  { value: "🤣", label: "Lachen" },
  { value: "😉", label: "Zwinkern" },
  { value: "😍", label: "Herzaugen" },
  { value: "🥰", label: "Verliebt" },
  { value: "😎", label: "Cool" },
  { value: "🤔", label: "Nachdenken" },
  { value: "😅", label: "Erleichterung" },
  { value: "🥳", label: "Feiern" },
  { value: "😭", label: "Weinen" },
  { value: "😮", label: "Überrascht" },
  { value: "😴", label: "Schlafen" },
  { value: "🙃", label: "Umgedrehtes Gesicht" },
  { value: "🤗", label: "Umarmung" },
  { value: "👍", label: "Daumen hoch" },
  { value: "👎", label: "Daumen runter" },
  { value: "👋", label: "Winken" },
  { value: "👏", label: "Applaus" },
  { value: "🙌", label: "Jubel" },
  { value: "🙏", label: "Danke" },
  { value: "💪", label: "Stärke" },
  { value: "❤️", label: "Herz" },
  { value: "💜", label: "Lila Herz" },
  { value: "🔥", label: "Feuer" },
  { value: "✨", label: "Funkeln" },
  { value: "🎉", label: "Konfetti" },
  { value: "✅", label: "Haken" },
  { value: "🚀", label: "Rakete" },
] as const;

type EmojiPickerProps = {
  onSelect: (emoji: string) => void;
  inputRef: RefObject<HTMLTextAreaElement | null>;
  disabled?: boolean;
};

export function EmojiPicker({
  onSelect,
  inputRef,
  disabled = false,
}: EmojiPickerProps) {
  const [open, setOpen] = useState(false);

  function selectEmoji(emoji: string) {
    onSelect(emoji);
    setOpen(false);
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger
        type="button"
        disabled={disabled}
        aria-label="Emoji auswählen"
        title="Emoji auswählen"
        className={buttonVariants({ variant: "ghost", size: "icon" })}
      >
        <Smile aria-hidden="true" />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner
          side="top"
          align="start"
          sideOffset={8}
          className="z-50"
        >
          <Popover.Popup
            finalFocus={inputRef}
            className="w-64 max-w-[calc(100vw-2rem)] rounded-xl border bg-popover p-3 text-popover-foreground shadow-lg outline-none"
          >
            <div className="mb-2 flex items-center justify-between">
              <Popover.Title className="text-sm font-semibold">
                Emoji auswählen
              </Popover.Title>
              <Popover.Close
                aria-label="Emoji-Auswahl schließen"
                className={buttonVariants({
                  variant: "ghost",
                  size: "icon-xs",
                })}
              >
                <X aria-hidden="true" />
              </Popover.Close>
            </div>
            <div className="grid grid-cols-6 gap-1">
              {emojis.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  disabled={disabled}
                  aria-label={label}
                  title={label}
                  onClick={() => selectEmoji(value)}
                  className="flex aspect-square w-full items-center justify-center rounded-md text-xl hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {value}
                </button>
              ))}
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
