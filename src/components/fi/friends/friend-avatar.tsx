type FriendAvatarProps = { name: string };

export function FriendAvatar({ name }: FriendAvatarProps) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <span
      aria-hidden="true"
      className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-semibold"
    >
      {initials || "?"}
    </span>
  );
}
