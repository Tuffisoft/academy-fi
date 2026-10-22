"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUnreadCount } from "@/lib/chat/realtime/provider";
import { Badge } from "@/components/ui/badge";
import { AvatarChangeDialog } from "@/components/fi/header/avatar/avatar-change-dialog";

export function DashboardHeader({
  name,
  role,
  image,
}: {
  name: string;
  role: string;
  image: string | null;
}) {
  const tNav = useTranslations("nav");
  const unreadCount = useUnreadCount();
  const chatLabel = unreadCount > 0
    ? tNav("chatUnread", { count: unreadCount })
    : tNav("chat");

  return (
    <header className="flex items-center justify-between border-b border-border px-6 py-4">
      <div className="flex items-center gap-2">
        <Link href="/" className="font-semibold">
          <span className="font-semibold">Academy Fi</span>
        </Link>
        <Badge variant="secondary">{role}</Badge>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          nativeButton={false}
          render={<Link href="/chat" />}
          className="relative"
          aria-label={chatLabel}
          title={chatLabel}
        >
          <MessageSquare aria-hidden="true" />
          {unreadCount > 0 && (
            <span
              aria-hidden="true"
              className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-none text-primary-foreground"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
        <AvatarChangeDialog name={name} image={image} />
      </div>
    </header>
  );
}
