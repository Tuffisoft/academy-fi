import { PrismaClient } from "@/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function supportsCurrentSchema(client: PrismaClient | undefined): client is PrismaClient {
  return Boolean(
    typeof client?.leadSearch?.findMany === "function" &&
    typeof client?.chatMembership?.findMany === "function" &&
    typeof client?.directConversation?.findMany === "function" &&
    typeof client?.friendship?.findMany === "function" &&
    typeof client?.chatMessage?.findMany === "function" &&
    typeof client?.groupConversation?.findMany === "function" &&
    typeof client?.groupMembership?.findMany === "function" &&
    typeof client?.groupMessage?.findMany === "function" &&
    client?.chatMessage?.fields?.encrypted,
  );
}

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL });
const cachedClient = globalForPrisma.prisma;

// Hot reload can retain a client generated before new models were added.
export const prisma = supportsCurrentSchema(cachedClient)
  ? cachedClient
  : new PrismaClient({ adapter });

if (!supportsCurrentSchema(prisma)) {
  throw new Error(
    "Der Prisma-Client enthält noch nicht alle Modelle. Bitte npm run db:generate ausführen und den Entwicklungsserver neu starten.",
  );
}

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
