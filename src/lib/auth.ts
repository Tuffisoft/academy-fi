import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { admin } from "better-auth/plugins/admin";
import { prisma } from "@/lib/prisma";
import { ac, owner, intern } from "@/lib/permissions";
import { sendResetPasswordEmail } from "@/lib/email";

export const auth = betterAuth({
  // Vercel assigns a new address to every deployment. Trust only this project's
  // exact platform-provided hosts, in addition to the configured website URL.
  trustedOrigins: [
    process.env.BETTER_AUTH_URL,
    ...[process.env.VERCEL_URL, process.env.VERCEL_BRANCH_URL, process.env.VERCEL_PROJECT_PRODUCTION_URL]
      .filter(Boolean).map(host => `https://${host}`),
  ].filter((origin): origin is string => Boolean(origin)),
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  user: {
    additionalFields: {
      locale: {
        type: "string",
        required: false,
        defaultValue: "en",
        input: true,
      },
    },
  },
  // Fi provisions accounts; there is no public self-registration
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
    sendResetPassword: async ({ user, url }) => {
      await sendResetPasswordEmail({
        to: user.email,
        name: user.name,
        url,
        locale: (user as { locale?: string }).locale ?? "en",
      });
    },
  },
  plugins: [
    // Supplies User.role and auth.api.createUser, the provisioning path since sign-up is disabled
    admin({
      defaultRole: "INTERN",
      adminRoles: ["OWNER"],
      ac,
      roles: { OWNER: owner, INTERN: intern },
    }),
    // Must be listed last so it can set cookies from server actions
    nextCookies(),
  ],
});
