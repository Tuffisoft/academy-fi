// tsx doesn't auto-load .env the way Next.js does
import "dotenv/config";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// One-off provisioning: Better Auth's sign-up is disabled, so accounts are created here, not via a form.
const accounts = [
  {
    email: "fi@studio-fi.com",
    name: "Fi",
    role: "OWNER",
    password: process.env.SEED_FI_PASSWORD,
  },
] as const;

const departments = [
  {
    nameEN: "Customer Acquisition",
    nameDE: "Kundenakquisition",
    name: "Customer Acquisition",
    resource: { title: "HubSpot Academy", url: "https://academy.hubspot.com" },
  },
  {
    nameEN: "Marketing",
    nameDE: "Marketing",
    name: "Marketing",
    resource: {
      title: "Google Analytics Academy",
      url: "https://analytics.google.com/analytics/academy/",
    },
  },
  {
    nameEN: "Design",
    nameDE: "Design",
    name: "Design",
    resource: {
      title: "Figma Design System",
      url: "https://www.figma.com/design-systems/",
    },
  },
  {
    nameEN: "Programming",
    nameDE: "Programmierung",
    name: "Programming",
    resource: {
      title: "MDN Web Docs",
      url: "https://developer.mozilla.org/en-US/",
    },
  },
  {
    nameEN: "Client Relations",
    nameDE: "Kundenbeziehungen",
    name: "Client Relations",
    resource: {
      title: "MindTools: Communication Skills",
      url: "https://www.mindtools.com/pages/article/newCS_99.htm",
    },
  },
] as const;

async function main() {
  for (const account of accounts) {
    if (!account.password) {
      throw new Error(`Missing seed password env var for ${account.email}`);
    }

    try {
      await auth.api.createUser({
        body: {
          email: account.email,
          name: account.name,
          password: account.password,
          role: account.role,
        },
      });

      console.log(`Created ${account.role} account: ${account.email}`);
    } catch (error: unknown) {
      // Check if error is USER_ALREADY_EXISTS from Better Auth
      if (
        error &&
        typeof error === "object" &&
        "body" in error &&
        error.body &&
        typeof error.body === "object" &&
        "code" in error.body &&
        error.body.code === "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL"
      ) {
        console.log(
          `Skipped ${account.role} account (already exists): ${account.email}`,
        );
      } else {
        throw error;
      }
    }
  }

  // Seed the starter departments once; re-running the seed shouldn't duplicate them.
  const departmentCount = await prisma.department.count();
  if (departmentCount === 0) {
    for (const dept of departments) {
      await prisma.department.create({
        data: {
          name: dept.name,
          nameEN: dept.nameEN,
          nameDE: dept.nameDE,
          resources: {
            create: [
              {
                title: dept.resource.title,
                url: dept.resource.url,
                order: 0,
              },
            ],
          },
        },
      });
    }
    console.log(`Seeded ${departments.length} departments with resources`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
