"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Pause, Play, Square } from "lucide-react";
import type { AuditSummary } from "@/lib/lead-research/audit-types";
import { auditIsPending } from "@/lib/lead-research/audit-progress";
import { controlWebsiteAuditsAction } from "@/lib/actions/audit-controls.actions";
import type { AuditControl } from "@/lib/lead-research/audit-controls";
import { Button } from "@/components/ui/button";

export function AuditBatchControls({ audits }: { audits: AuditSummary[] }) {
  const t = useTranslations("leadResearch");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState(false);
  const batches = new Map<string, AuditSummary[]>();
  for (const audit of audits.filter(auditIsPending)) {
    const key = JSON.stringify([audit.userId, audit.batchId]);
    batches.set(key, [...batches.get(key) ?? [], audit]);
  }
  function control(batch: AuditSummary[], command: AuditControl) {
    setError(false);
    startTransition(async () => {
      try {
        const result = await controlWebsiteAuditsAction(batch[0].userId, batch[0].batchId, command);
        setError(!result.success);
        router.refresh();
      } catch { setError(true); }
    });
  }
  if (!batches.size) return null;
  return <div className="space-y-3 border-t pt-3">
    {[...batches.entries()].map(([key, batch], index) => <div key={key} className="flex flex-wrap items-center gap-2">
      <span className="mr-auto text-xs text-muted-foreground">{t("auditControlBatch", { count: batch.length, index: index + 1 })}</span>
      {batch.some(audit => audit.status === "QUEUED") && <Button size="sm" variant="outline" disabled={pending} onClick={() => control(batch, "pause")}><Pause aria-hidden="true" />{t("jobPause")}</Button>}
      {batch.some(audit => audit.status === "PAUSED") && <Button size="sm" variant="outline" disabled={pending} onClick={() => control(batch, "resume")}><Play aria-hidden="true" />{t("jobResume")}</Button>}
      <Button size="sm" variant="outline" disabled={pending} onClick={() => control(batch, "cancel")}><Square aria-hidden="true" />{t("jobCancel")}</Button>
    </div>)}
    <p className="text-xs text-muted-foreground">{t("auditControlHint")}</p>
    {error && <p role="alert" className="text-sm text-destructive">{t("jobControlError")}</p>}
  </div>;
}
