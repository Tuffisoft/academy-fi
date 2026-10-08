"use client";

import { useState, type ReactNode } from "react";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

type SortableListProps<T extends { id: string }> = {
  items: T[];
  // Called with the full list of ids in their new order
  onReorder: (orderedIds: string[]) => void;
  handleLabel: string;
  renderItem: (item: T) => ReactNode;
  className?: string;
};

// Dependency-free drag-and-drop list using native HTML5 drag events.
// Only the grip handle is draggable so inputs inside rows keep normal text selection.
export function SortableList<T extends { id: string }>({
  items,
  onReorder,
  handleLabel,
  renderItem,
  className,
}: SortableListProps<T>) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  const dragIndex = items.findIndex((i) => i.id === dragId);
  const overIndex = items.findIndex((i) => i.id === overId);

  function reset() {
    setDragId(null);
    setOverId(null);
  }

  function handleDrop(targetId: string) {
    if (dragId && dragId !== targetId) {
      const ids = items.map((i) => i.id).filter((id) => id !== dragId);
      // Insert at the target's slot (same semantics as the drop indicator)
      ids.splice(items.findIndex((i) => i.id === targetId), 0, dragId);
      onReorder(ids);
    }
    reset();
  }

  return (
    <ul className={cn("flex flex-col gap-2", className)}>
      {items.map((item) => {
        const isOver = overId === item.id && dragId !== item.id;
        // Dragging down lands after the target, dragging up lands before it
        const showAfter = isOver && dragIndex < overIndex;
        const showBefore = isOver && dragIndex > overIndex;

        return (
          <li
            key={item.id}
            className={cn(
              "relative flex flex-col gap-2 rounded-md",
              dragId === item.id && "opacity-40",
              showBefore && "before:absolute before:-top-1.5 before:inset-x-0 before:h-0.5 before:rounded before:bg-primary",
              showAfter && "after:absolute after:-bottom-1.5 after:inset-x-0 after:h-0.5 after:rounded after:bg-primary",
            )}
            onDragOver={(e) => {
              // Ignore drags that started in a different list (e.g. a nested one)
              if (!dragId) return;
              e.preventDefault();
              e.stopPropagation();
              if (overId !== item.id) setOverId(item.id);
            }}
            onDrop={(e) => {
              if (!dragId) return;
              e.preventDefault();
              e.stopPropagation();
              handleDrop(item.id);
            }}
          >
            <div className="flex items-start gap-2">
              {/* Drag handle */}
              <button
                type="button"
                draggable
                aria-label={handleLabel}
                title={handleLabel}
                className="text-muted-foreground hover:text-foreground mt-2 shrink-0 cursor-grab touch-none active:cursor-grabbing"
                onDragStart={(e) => {
                  e.stopPropagation();
                  const row = e.currentTarget.closest("li");
                  if (row) e.dataTransfer.setDragImage(row, 0, 0);
                  e.dataTransfer.effectAllowed = "move";
                  // Firefox requires data to be set for a drag to start
                  e.dataTransfer.setData("text/plain", item.id);
                  setDragId(item.id);
                }}
                onDragEnd={reset}
              >
                <GripVertical className="h-4 w-4" />
              </button>
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                {renderItem(item)}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
