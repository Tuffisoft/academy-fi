import { createAccessControl } from "better-auth/plugins/access";

const statement = {
  user: [
    "create",
    "list",
    "set-role",
    "ban",
    "impersonate",
    "delete",
    "set-password",
    "set-email",
    "get",
    "update",
  ],
  session: ["list", "revoke", "delete"],
} as const;

export const ac = createAccessControl(statement);

// Fi: full account administration (provisioning Calem/Adrian)
export const owner = ac.newRole({
  user: statement.user,
  session: statement.session,
});

// Interns: no account-administration permissions
export const intern = ac.newRole({
  user: [],
  session: [],
});
