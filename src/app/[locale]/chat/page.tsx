import Chat from "@/components/fi/chat";
import { Suspense } from "react";
import { PageLoading } from "@/components/fi/page-loading";
import { requireUser } from "@/lib/session";
import { getFriendsForUser } from "@/lib/chat/services/friends";
import { getGroupInvitations } from "@/lib/chat/services/groups";

export default function ChatPage() {
  return (
    <Suspense fallback={<PageLoading showHeader={false} />}>
      <ChatContent />
    </Suspense>
  );
}

async function ChatContent() {
  const user = await requireUser();
  const [friends, groupInvitations] = await Promise.all([
    getFriendsForUser(user.id),
    getGroupInvitations(user.id),
  ]);

  return (
    <Chat
      key={user.id}
      currentUser={{ id: user.id, name: user.name }}
      initialFriends={friends}
      initialGroupInvitations={groupInvitations}
    />
  );
}
