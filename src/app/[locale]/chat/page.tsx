import Chat from "@/components/fi/chat";
import { Suspense } from "react";
import { PageLoading } from "@/components/fi/page-loading";
import { requireUser } from "@/lib/session";
import { getFriendsForUser } from "@/lib/friends";

export default function ChatPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <ChatContent />
    </Suspense>
  );
}

async function ChatContent() {
  const user = await requireUser();
  const friends = await getFriendsForUser(user.id);

  return (
    <Chat
      key={user.id}
      currentUser={{ id: user.id, name: user.name }}
      initialFriends={friends}
    />
  );
}
