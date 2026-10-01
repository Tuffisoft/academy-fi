// tsx doesn't auto-load .env the way Next.js does
import "dotenv/config";
import { auth } from "@/lib/auth";

// One-off provisioning: Better Auth's sign-up is disabled, so accounts are created here, not via a form.
const accounts = [
  {
    email: "fi@studio-fi.com",
    name: "Fi",
    role: "OWNER",
    password: process.env.SEED_FI_PASSWORD,
  },
] as const;

async function main() {
  for (const account of accounts) {
    if (!account.password) {
      throw new Error(`Missing seed password env var for ${account.email}`);
    }

    await auth.api.createUser({
      body: {
        email: account.email,
        name: account.name,
        password: account.password,
        role: account.role,
      },
    });

    console.log(`Created ${account.role} account: ${account.email}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
