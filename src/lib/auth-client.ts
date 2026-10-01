import { createAuthClient } from "better-auth/react";
import { adminClient } from "better-auth/client/plugins";
import { ac, owner, intern } from "@/lib/permissions";

export const authClient = createAuthClient({
  plugins: [adminClient({ ac, roles: { OWNER: owner, INTERN: intern } })],
});
