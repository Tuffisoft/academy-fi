"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Bookmark, BookmarkCheck } from "lucide-react";
import { removeSavedLeadAction, saveLeadAction } from "@/lib/actions/saved-leads.actions";
import { Button } from "@/components/ui/button";

export function SaveLeadButton({ searchId, placeId, savedId, name }: { searchId?: string; placeId: string; savedId?: string; name: string }) {
  const t = useTranslations("leadResearch");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return <div className="space-y-1">
    <Button variant={savedId ? "secondary" : "outline"} size="sm" disabled={pending || (!savedId && !searchId)} aria-label={t(savedId ? "unkeepFor" : "keepFor", { name })} onClick={() => {
      setError(null);
      startTransition(async () => {
        try {
          const result = savedId ? await removeSavedLeadAction(savedId) : await saveLeadAction(searchId, placeId);
          if (!result.success) setError(t(result.error));
        } catch { setError(t("savedLeadError")); }
      });
    }}>
      {savedId ? <BookmarkCheck aria-hidden="true" /> : <Bookmark aria-hidden="true" />}
      {t(pending ? "saving" : savedId ? "kept" : "keep")}
    </Button>
    {error && <p role="alert" className="max-w-48 whitespace-normal text-xs text-destructive">{error}</p>}
  </div>;
}
