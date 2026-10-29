"use client";

import { Autocomplete } from "@base-ui/react/autocomplete";
import { ChevronDown } from "lucide-react";
import { useState } from "react";

export type SuggestionOption = { key: string; label: string; category: string };
export type SuggestionGroup = { value: string; items: SuggestionOption[]; google?: boolean };
export type SuggestionFieldProps = { defaultValue?: string; value?: string; disabled?: boolean; error?: string; onChange: (value: string) => void };

export function GroupedSuggestionInput({ groups, name, id, maxLength, placeholder, showOptionsLabel, noMatchesLabel, defaultValue, value, disabled, error, onChange, onInputChange, onOpenChange, status }: SuggestionFieldProps & {
  groups: SuggestionGroup[]; name: string; id: string; maxLength: number; placeholder: string; showOptionsLabel: string; noMatchesLabel: string;
  onInputChange?: (value: string, selected: boolean) => void;
  onOpenChange?: (open: boolean) => void;
  status?: string;
}) {
  const { contains } = Autocomplete.useFilter();
  const [text, setText] = useState(defaultValue ?? "");
  const currentText = value ?? text;
  return <Autocomplete.Root
    items={groups}
    name={name}
    defaultValue={defaultValue ?? ""}
    value={value}
    disabled={disabled}
    openOnInputClick
    onValueChange={(value, details) => { setText(value); onChange(value); onInputChange?.(value, details.reason === "item-press"); }}
    onOpenChange={onOpenChange}
    itemToStringValue={(item: SuggestionOption) => item.label}
    filter={(item, query) => item.key.startsWith("google:") || contains(item.label, query.trim()) || contains(item.category, query.trim())}
  >
    <Autocomplete.InputGroup className="relative">
      <Autocomplete.Input
        id={id}
        placeholder={placeholder}
        maxLength={maxLength}
        required
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-counter ${id}-error` : `${id}-counter`}
        className="h-8 w-full min-w-0 rounded-lg border border-input bg-transparent py-1 pr-9 pl-2.5 text-base outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50 aria-invalid:border-destructive md:text-sm dark:bg-input/30"
      />
      <Autocomplete.Trigger aria-label={showOptionsLabel} className="absolute inset-y-0 right-0 flex w-8 items-center justify-center rounded-r-lg text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50">
        <ChevronDown className="size-4" aria-hidden="true" />
      </Autocomplete.Trigger>
    </Autocomplete.InputGroup>
    <p id={`${id}-counter`} className={`-mt-1 text-right text-xs tabular-nums ${currentText.length >= maxLength ? "font-medium text-amber-700 dark:text-amber-300" : "text-muted-foreground"}`}>{currentText.length}/{maxLength}</p>
    <Autocomplete.Portal>
      <Autocomplete.Positioner side="bottom" collisionAvoidance={name === "industry" ? { side: "none", align: "shift", fallbackAxisSide: "none" } : undefined} sideOffset={2} align="start" className="z-[100] w-[var(--anchor-width)] max-w-[calc(100vw-2rem)]">
        <Autocomplete.Popup className="overflow-hidden rounded-lg border bg-popover text-popover-foreground shadow-md">
          {status && <Autocomplete.Status className="border-b px-2 py-1 text-xs text-muted-foreground">{status}</Autocomplete.Status>}
          <Autocomplete.Empty className="px-2 py-2 text-sm text-muted-foreground">{noMatchesLabel}</Autocomplete.Empty>
          <Autocomplete.List className="max-h-[min(18rem,var(--available-height))] overflow-y-auto overscroll-contain p-1">
            {(group: SuggestionGroup) => <Autocomplete.Group key={group.value} items={group.items}>
              <Autocomplete.GroupLabel className="flex flex-wrap items-center justify-between gap-x-2 bg-popover px-2 py-1 text-xs font-semibold text-muted-foreground">{group.value}{group.google && <span translate="no" className="whitespace-nowrap text-xs font-normal not-italic tracking-normal text-[#1f1f1f] dark:text-white">Google Maps</span>}</Autocomplete.GroupLabel>
              <Autocomplete.Collection>{(item: SuggestionOption) => <Autocomplete.Item key={item.key} value={item} className="cursor-default rounded-md px-2 py-1 text-sm leading-5 outline-none data-highlighted:bg-accent data-highlighted:text-accent-foreground">{item.label}</Autocomplete.Item>}</Autocomplete.Collection>
            </Autocomplete.Group>}
          </Autocomplete.List>
        </Autocomplete.Popup>
      </Autocomplete.Positioner>
    </Autocomplete.Portal>
  </Autocomplete.Root>;
}
