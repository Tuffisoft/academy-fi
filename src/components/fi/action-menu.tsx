"use client";

import { Menu } from "@base-ui/react/menu";
import { Ellipsis, type LucideIcon } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Action = {
  label: string;
  icon?: LucideIcon;
  destructive?: boolean;
  onClick: () => void;
};

type Props = {
  label: string;
  actions: Action[];
};

export function ActionMenu({ label, actions }: Props) {
  return (
    <Menu.Root>
      <Menu.Trigger
        aria-label={label}
        title={label}
        className={buttonVariants({ variant: "ghost", size: "icon" })}
      >
        <Ellipsis aria-hidden="true" />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner align="end" sideOffset={6} className="z-50">
          <Menu.Popup className="min-w-40 rounded-lg border bg-popover p-1 text-popover-foreground shadow-lg outline-none">
            {actions.map(({ label: actionLabel, icon: Icon, destructive, onClick }) => (
              <Menu.Item
                key={actionLabel}
                onClick={onClick}
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm outline-none data-highlighted:bg-accent data-highlighted:text-accent-foreground",
                  destructive && "text-destructive data-highlighted:bg-destructive/10 data-highlighted:text-destructive"
                )}
              >
                {Icon && <Icon className="size-4" aria-hidden="true" />}
                {actionLabel}
              </Menu.Item>
            ))}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
