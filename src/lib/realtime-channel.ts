export function userChannel(userId: string) {
  const safeId = encodeURIComponent(userId).replace(
    /[!*'()]/g,
    (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  );
  return `chat:user:${safeId}`;
}
