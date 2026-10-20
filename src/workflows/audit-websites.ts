import { sleep } from "workflow";
import type { AuditTicket } from "@/lib/lead-research/audit-jobs";

export async function auditWebsites(tickets: AuditTicket[]) {
  "use workflow";
  for (let offset = 0; offset < tickets.length; offset += 3) {
    await Promise.all(tickets.slice(offset, offset + 3).map(async (ticket) => {
      try {
        let result = await checkWebsite(ticket);
        while (result === "busy") { await sleep("5s"); result = await checkWebsite(ticket); }
      } catch { await markInterrupted(ticket); }
    }));
  }
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
