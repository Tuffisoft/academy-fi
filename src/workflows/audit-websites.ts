import { sleep } from "workflow";
import type { AuditTicket } from "@/lib/lead-research/audit-jobs";
import { runAuditPool } from "@/lib/lead-research/audit-scheduling";

export async function auditWebsites(tickets: AuditTicket[]) {
  "use workflow";
  await runAuditPool(tickets, async (ticket) => {
      try {
        let result = await checkWebsite(ticket);
        while (result === "busy") { await sleep("5s"); result = await checkWebsite(ticket); }
      } catch { await markInterrupted(ticket); }
  });
}

async function checkWebsite(ticket: AuditTicket) {
  "use step";
  const { processWebsiteAudit } = await import("@/lib/lead-research/audit-jobs");
  return processWebsiteAudit(ticket);
}
// A failed process must not repeat potentially billable provider requests.
checkWebsite.maxRetries = 0;

async function markInterrupted(ticket: AuditTicket) {
  "use step";
  const { failWebsiteAudit } = await import("@/lib/lead-research/audit-jobs");
  await failWebsiteAudit(ticket, "auditInterrupted");
}
