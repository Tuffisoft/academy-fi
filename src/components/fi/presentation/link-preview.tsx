"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, useDragControls } from "motion/react";
import {
  ExternalLink,
  GripHorizontal,
  Maximize2,
  Minimize2,
  X,
} from "lucide-react";
import { cn } from "cn";
import { buttonVariants } from "@/components/ui/button";

/** Click to open an inline iframe over the slide; the minimize button docks it bottom-right. */
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
  const [expanded, setExpanded] = useState(true);
  const dragControls = useDragControls();
  const boundsRef = useRef<HTMLElement | null>(null);
  const panelRef = useRef<HTMLElement | null>(null);
  const [slideElement, setSlideElement] = useState<Element | null>(null);

  // Embla listens natively on an ancestor, so React's stopPropagation is too late; intercept on the slide card instead.
  useEffect(() => {
    if (!open || !slideElement) return;
    const stopCarouselDrag = (event: Event) => {
      if (panelRef.current?.contains(event.target as Node)) {
        event.stopPropagation();
      }
    };
    const events = ["pointerdown", "mousedown", "touchstart"] as const;
    events.forEach((name) =>
      slideElement.addEventListener(name, stopCarouselDrag),
    );
    return () =>
      events.forEach((name) =>
        slideElement.removeEventListener(name, stopCarouselDrag),
      );
  }, [open, slideElement]);

  // Slides nest several `relative` wrappers, so render into the slide card itself to size against the whole slide.
  const inSlide = (node: React.ReactNode) =>
    slideElement ? createPortal(node, slideElement) : node;

  return (
    <>
      <button
        type="button"
        onClick={(event) => {
          setSlideElement(event.currentTarget.closest("[data-slide-card]"));
          setOpen(true);
        }}
        className={cn(
          "text-primary underline underline-offset-4",
          triggerClassName,
        )}
      >
        {children}
      </button>
      {open &&
        inSlide(
          // Clicks inside the panel shouldn't advance the slide's reveal steps.
          // Keyed on `expanded` so the drag offset resets when the size changes.
          <motion.div
            key={String(expanded)}
            ref={(element) => {
              panelRef.current = element;
              boundsRef.current =
                (element?.offsetParent as HTMLElement) ?? null;
            }}
            drag
            dragControls={dragControls}
            dragListener={false}
            dragMomentum={false}
            dragElastic={0}
            dragConstraints={boundsRef}
            onClick={(event) => event.stopPropagation()}
            className={cn(
              "border-border bg-background absolute z-30 flex flex-col overflow-hidden rounded-lg border shadow-xl",
              expanded ? "inset-4" : "right-4 bottom-4 h-[28rem] w-[40rem]",
            )}
          >
            <div
              title="Drag to move"
              onPointerDown={(event) => {
                if ((event.target as HTMLElement).closest("button, a")) return;
                dragControls.start(event);
              }}
              className="bg-muted flex cursor-grab touch-none items-center justify-between gap-2 border-b px-2 py-1 active:cursor-grabbing"
            >
              <span className="flex min-w-0 items-center gap-1.5">
                <GripHorizontal
                  aria-hidden
                  className="text-muted-foreground size-4 shrink-0"
                />
                <span className="truncate text-xs font-medium">{label}</span>
              </span>
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
          </motion.div>,
        )}
    </>
  );
}
