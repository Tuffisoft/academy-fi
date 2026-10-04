"use client";

import { useState } from "react";
import { ExternalLink, Maximize2, Minimize2, X } from "lucide-react";
import { cn } from "cn";
import { buttonVariants } from "@/components/ui/button";

/** Docked bottom-right preview: click to open an inline iframe instead of leaving the slide. */
export function LinkPreview({
  href,
  label,
  children,
  triggerClassName,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
  triggerClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "text-primary underline underline-offset-4",
          triggerClassName,
        )}
      >
        {children}
      </button>
      {open && (
        // Clicks inside the panel shouldn't advance the slide's reveal steps.
        <div
          onClick={(event) => event.stopPropagation()}
          className={cn(
            "border-border bg-background absolute z-30 flex flex-col overflow-hidden rounded-lg border shadow-xl",
            expanded ? "inset-8" : "right-4 bottom-4 h-56 w-80",
          )}
        >
          <div className="bg-muted flex items-center justify-between gap-2 border-b px-2 py-1">
            <span className="truncate text-xs font-medium">{label}</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setExpanded((value) => !value)}
                className={cn(
                  buttonVariants({ variant: "ghost", size: "icon-xs" }),
                )}
              >
                {expanded ? <Minimize2 /> : <Maximize2 />}
              </button>
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  buttonVariants({ variant: "ghost", size: "icon-xs" }),
                )}
              >
                <ExternalLink />
              </a>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className={cn(
                  buttonVariants({ variant: "ghost", size: "icon-xs" }),
                )}
              >
                <X />
              </button>
            </div>
          </div>
          <iframe
            src={href}
            title={label}
            className="size-full flex-1"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            referrerPolicy="no-referrer"
          />
        </div>
      )}
    </>
  );
}
