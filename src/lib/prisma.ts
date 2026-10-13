import { PrismaClient } from "@/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function supportsChat(client: PrismaClient | undefined): client is PrismaClient {
  return Boolean(
    typeof client?.chatMembership?.findMany === "function" &&
    typeof client?.directConversation?.findMany === "function" &&
    typeof client?.friendship?.findMany === "function" &&
    typeof client?.chatMessage?.findMany === "function" &&
    client?.chatMessage?.fields?.encrypted,
  );
}

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL });
const cachedClient = globalForPrisma.prisma;

// Hot reload can retain a client generated before the chat models were added.
export const prisma = supportsChat(cachedClient)
  ? cachedClient
  : new PrismaClient({ adapter });

if (!supportsChat(prisma)) {
  throw new Error(
    "Der Prisma-Client enthält die Chat-Modelle noch nicht. Bitte npm run db:generate ausführen und den Entwicklungsserver neu starten.",
  );
}

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
