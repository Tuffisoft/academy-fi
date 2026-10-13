import type { Viewport } from "next";
import { Suspense } from "react";
import { DashboardHeader } from "@/components/fi/dashboard/dashboard-header";
import { PageLoading } from "@/components/fi/page-loading";
import { requireUser } from "@/lib/session";
import { getConversationsForUser } from "@/lib/chat";
import { isRealtimeConfigured } from "@/lib/realtime";
import { RealtimeProvider } from "@/lib/providers/realtime-provider";
import { isMasterKeyConfigured } from "@/lib/server-encryption";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  interactiveWidget: "resizes-content",
};

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<PageLoading />}>
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
      <div className="academy-dashboard flex min-h-svh w-full flex-1 flex-col bg-background text-foreground">
        <DashboardHeader name={user.name} role={user.role ?? "INTERN"} />
        {!isMasterKeyConfigured() && (
          <p role="alert" className="border-b bg-destructive/10 px-6 py-3 text-sm text-destructive">
            Der Nachrichtenversand ist derzeit nicht verfügbar.
          </p>
        )}
        {children}
      </div>
    </RealtimeProvider>
  );
}
