export type FriendContact = {
  id: string;
  userId: string;
  name: string;
};

export type FriendsSnapshot = {
  friends: FriendContact[];
  incoming: FriendContact[];
  outgoing: FriendContact[];
};

export type UserSearchResult = {
  id: string;
  name: string;
  relationship: "none" | "friends" | "incoming" | "outgoing";
};

export type FriendsResult<T> =
  { ok: true; data: T } | { ok: false; error: string };
