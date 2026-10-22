"use client";

import { useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteLeadSearchAction } from "@/lib/actions/lead-searches.actions";
import type { LeadSearchSummary } from "@/lib/lead-research/types";
import { isLeadSearchMutable } from "@/lib/lead-research/search-input";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

export function DeleteSearchDialog({ search, open: controlledOpen, onOpenChange, hideTrigger = false }: {
  search: LeadSearchSummary;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideTrigger?: boolean;
}) {
  const t = useTranslations("leadResearch");
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const submitting = useRef(false);

  function remove() {
    if (submitting.current) return;
    submitting.current = true;
    setError(null);
    startTransition(async () => {
      try {
        const result = await deleteLeadSearchAction(search.id);
        if (!result.success) { setError(t(result.error)); return; }
        setOpen(false);
        toast.success(t("deleteSuccess"));
      } catch {
        setError(t("deleteError"));
      } finally { submitting.current = false; }
    });
  }

  return <AlertDialog open={open} onOpenChange={(value) => { if (!submitting.current) { setOpen(value); setError(null); } }}>
    {!hideTrigger && <AlertDialogTrigger render={<Button variant="destructive" size="sm" disabled={!isLeadSearchMutable(search.status)} aria-label={t("deleteFor", { location: search.location, industry: search.industry })}><Trash2 aria-hidden="true" />{t("delete")}</Button>} />}
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>{t("deleteTitle")}</AlertDialogTitle>
        <AlertDialogDescription className="wrap-anywhere">{t("deleteDescription", { location: search.location, industry: search.industry })}</AlertDialogDescription>
      </AlertDialogHeader>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <AlertDialogFooter>
        <AlertDialogCancel disabled={isPending}>{t("cancel")}</AlertDialogCancel>
        <AlertDialogAction variant="destructive" disabled={isPending} onClick={remove}>{isPending ? t("deleting") : t("delete")}</AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>;
}
