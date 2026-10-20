"use client";

import { useRef, useState, useTransition, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { createLeadSearchAction, updateLeadSearchAction } from "@/lib/actions/lead-searches.actions";
import type { LeadSearchSummary } from "@/lib/lead-research/types";
import { MAX_SEARCH_RESULTS } from "@/lib/lead-research/search-input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type SearchPreview = {
  location: string;
  radiusKm: number;
  industry: string;
  maxResults: number;
  analyzeWebsites: boolean;
};

export function LeadSearchDialog({ search, open: controlledOpen, onOpenChange, hideTrigger = false }: {
  search?: LeadSearchSummary;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideTrigger?: boolean;
}) {
  const t = useTranslations("leadResearch");
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const [preview, setPreview] = useState<SearchPreview | null>(null);
  const [analyzeWebsites, setAnalyzeWebsites] = useState(search?.analyzeWebsites ?? true);
  const [isPending, startTransition] = useTransition();
  const submitting = useRef(false);
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setPreview({
      location: String(data.get("location") ?? "").trim(),
      radiusKm: Number(data.get("radiusKm")),
      industry: String(data.get("industry") ?? "").trim(),
      maxResults: Number(data.get("maxResults")),
      analyzeWebsites,
    });
  }

  function saveSearch() {
    if (!preview || submitting.current) return;
    submitting.current = true;
    setError(null);
    startTransition(async () => {
      try {
        const result = search
          ? await updateLeadSearchAction(search.id, preview)
          : await createLeadSearchAction(preview);
        if (!result.success) {
          setError(t(result.error));
          return;
        }
        toast.success(t(search ? "updateSuccess" : "saveSuccess"));
        setOpen(false);
        setPreview(null);
        setAnalyzeWebsites(search?.analyzeWebsites ?? true);
      } catch {
        setError(t("saveError"));
      } finally {
        submitting.current = false;
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (submitting.current) return;
        setOpen(value);
        setPreview(null);
        setError(null);
        setAnalyzeWebsites(search?.analyzeWebsites ?? true);
      }}
    >
      {!hideTrigger && <DialogTrigger
        render={
          <Button variant={search ? "outline" : "default"} size={search ? "sm" : "default"} disabled={search ? search.status !== "DRAFT" : false} aria-label={search ? t("editFor", { location: search.location, industry: search.industry }) : undefined}>
            {search ? <Pencil aria-hidden="true" /> : <Plus aria-hidden="true" />}
            {t(search ? "edit" : "newSearch")}
          </Button>
        }
      />}
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{t(search ? "editSearch" : "newSearch")}</DialogTitle>
          <DialogDescription>{t("formDescription")}</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={handleSubmit}
          onChange={() => { setPreview(null); setError(null); }}
          className="flex flex-col gap-5"
        >
          <fieldset disabled={isPending} className="flex min-w-0 flex-col gap-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="lead-location">{t("location")}</Label>
              <Input
                id="lead-location"
                name="location"
                defaultValue={search?.location}
                placeholder={t("locationPlaceholder")}
                required
                pattern=".*\S.*"
                maxLength={200}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="lead-radius">{t("radius")}</Label>
              <Input
                id="lead-radius"
                name="radiusKm"
                defaultValue={search?.radiusKm}
                type="number"
                min={0.1}
                step="any"
                max={Number.MAX_SAFE_INTEGER}
                placeholder="20"
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="lead-industry">{t("industry")}</Label>
              <Input
                id="lead-industry"
                name="industry"
                defaultValue={search?.industry}
                placeholder={t("industryPlaceholder")}
                required
                pattern=".*\S.*"
                maxLength={200}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="lead-max-results">{t("maxResults")}</Label>
              <Input
                id="lead-max-results"
                name="maxResults"
                defaultValue={search?.maxResults}
                type="number"
                min={1}
                step={1}
                max={MAX_SEARCH_RESULTS}
                placeholder="100"
                aria-describedby="lead-result-help"
                required
              />
            </div>
          </div>
          <p id="lead-result-help" className="text-xs text-muted-foreground">
            {t("resultHelp")}
          </p>
          <div className="flex items-center gap-2">
            <Checkbox
              id="lead-analyze"
              checked={analyzeWebsites}
              onCheckedChange={(value) => {
                setAnalyzeWebsites(value);
                setPreview(null);
              }}
            />
            <Label htmlFor="lead-analyze">{t("analyzeWebsites")}</Label>
          </div>
          <p className="text-sm text-muted-foreground">{t("previewNotice")}</p>
          <Button type="submit" className="self-start">
            {t("previewButton")}
          </Button>
          </fieldset>
        </form>
        <div role="status" aria-live="polite" aria-atomic="true">
          {preview && (
            <Card size="sm">
              <CardHeader>
                <CardTitle>{t("previewTitle")}</CardTitle>
                <Badge variant="secondary">{t("unsaved")}</Badge>
              </CardHeader>
              <CardContent>
                <dl className="grid gap-3 sm:grid-cols-2">
                  {[
                    [t("location"), preview.location],
                    [
                      t("radius"),
                      t("radiusValue", { value: preview.radiusKm }),
                    ],
                    [t("industry"), preview.industry],
                    [t("maxResults"), String(preview.maxResults)],
                    [
                      t("analyzeWebsites"),
                      preview.analyzeWebsites ? t("yes") : t("no"),
                    ],
                  ].map(([label, value]) => (
                    <div key={label} className="min-w-0">
                      <dt className="text-xs text-muted-foreground">{label}</dt>
                      <dd className="wrap-break-words font-medium">{value}</dd>
                    </div>
                  ))}
                </dl>
                <Button type="button" onClick={saveSearch} disabled={isPending} className="mt-4">
                  {isPending ? t("saving") : t(search ? "saveChanges" : "saveSearch")}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      </DialogContent>
    </Dialog>
  );
}
