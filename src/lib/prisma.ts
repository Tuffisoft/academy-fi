import { PrismaClient } from "@/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function supportsCurrentSchema(client: PrismaClient | undefined): client is PrismaClient {
  return Boolean(
    typeof client?.organization?.findUnique === "function" &&
    typeof client?.organizationMembership?.findUnique === "function" &&
    typeof client?.organizationEntitlement?.findUnique === "function" &&
    typeof client?.organizationAuditLog?.create === "function" &&
    typeof client?.organizationInvitation?.findUnique === "function" &&
    typeof client?.organizationOperation?.findUnique === "function" &&
    typeof client?.leadSearch?.findMany === "function" &&
    client?.leadSearch?.fields?.googlePlaceIds &&
    client?.leadSearch?.fields?.runId &&
    client?.leadSearch?.fields?.checkpoint &&
    typeof client?.savedLead?.findMany === "function" &&
    typeof client?.websiteAudit?.findMany === "function" &&
    client?.websiteAudit?.fields?.batchId &&
    typeof client?.pdfReportDesign?.findUnique === "function" &&
    client?.pdfReportDesign?.fields?.name &&
    client?.pdfReportDesign?.fields?.templateId &&
    typeof client?.pdfReportTemplate?.findMany === "function" &&
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
