export type SignInDestination = "stempelfi" | "stempelfi-invitation";
export type InvitationLink = { organizationId: string; token: string };
const invitationPath = "/tools/calem/stempelkarten/invitation";

export function parseSignInDestination(value: unknown): SignInDestination | undefined {
  return value === "stempelfi" || value === "stempelfi-invitation" ? value : undefined;
}

export function readInvitationFragment(hash: string): InvitationLink | null {
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  const organizationId = params.get("organization") ?? "";
  const token = params.get("token") ?? "";
  return params.getAll("organization").length === 1 && params.getAll("token").length === 1 &&
    /^[a-zA-Z0-9_-]{1,160}$/.test(organizationId) && /^[A-Za-z0-9_-]{43}$/.test(token)
    ? { organizationId, token } : null;
}

function fragment(link: InvitationLink) {
  return "#" + new URLSearchParams({ organization: link.organizationId, token: link.token }).toString();
}

export function invitationHref(link: InvitationLink | null): string {
  return invitationPath + (link ? fragment(link) : "");
}

export function invitationSignInHref(link: InvitationLink): string {
  return "/sign-in?destination=stempelfi-invitation" + fragment(link);
}

export function afterSignInHref(destination: SignInDestination | undefined, hash: string): string {
  if (destination === "stempelfi-invitation") return invitationHref(readInvitationFragment(hash));
  return destination === "stempelfi" ? "/auth/continue?destination=stempelfi" : "/auth/continue";
}

/** Full document navigation avoids reusing a cached route's old fragment. */
export function invitationDocumentHref(locale: "de" | "en", hash: string): string {
  return "/" + locale + invitationHref(readInvitationFragment(hash));
}
