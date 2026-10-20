import Chat from "@/components/fi/chat";
import { Suspense } from "react";
import { ChatSkeleton } from "@/components/fi/loading/chat-skeleton";
import { requireUser } from "@/lib/session";
import { getFriendsForUser } from "@/lib/chat/services/friends";
import { getGroupInvitations } from "@/lib/chat/services/groups";

export default function ChatPage() {
  return (
    <Suspense fallback={<ChatSkeleton />}>
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
