import type { Viewport } from "next";
import { Suspense } from "react";
import { DashboardHeader } from "@/components/fi/header/dashboard-header";
import { Footer } from "@/components/fi/footer";
import { ChatSkeleton } from "@/components/fi/loading/chat-skeleton";
import { requireUser } from "@/lib/session";
import { getConversationsForUser } from "@/lib/chat/services/chat";
import { isRealtimeConfigured } from "@/lib/chat/realtime/server";
import { RealtimeProvider } from "@/lib/chat/realtime/provider";
import { isMasterKeyConfigured } from "@/lib/chat/server-encryption";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  interactiveWidget: "resizes-content",
};

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<ChatSkeleton withHeader />}>
      <ChatLayoutContent>{children}</ChatLayoutContent>
    </Suspense>
  );
}

async function ChatLayoutContent({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const conversations = await getConversationsForUser(user.id);

  return (
    <RealtimeProvider
      key={user.id}
      userId={user.id}
      enabled={isRealtimeConfigured()}
      initialConversations={conversations}
    >
      <div className="academy-dashboard flex h-dvh min-h-0 w-full flex-none flex-col overflow-hidden bg-background text-foreground">
        <DashboardHeader
          name={user.name}
          role={user.role ?? "INTERN"}
          image={user.image ?? null}
        />
        {!isMasterKeyConfigured() && (
          <p role="alert" className="shrink-0 border-b bg-destructive/10 px-6 py-3 text-sm text-destructive">
            Der Nachrichtenversand ist derzeit nicht verfügbar.
          </p>
        )}
        {children}
        <Footer />
      </div>
    </RealtimeProvider>
  );
}
