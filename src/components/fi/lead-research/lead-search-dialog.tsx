"use client";

import { useRef, useState, useTransition, type FormEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import {
  createLeadSearchAction,
  updateLeadSearchAction,
} from "@/lib/actions/lead-searches.actions";
import type { LeadSearchSummary } from "@/lib/lead-research/types";
import { INDUSTRY_CATEGORIES } from "@/lib/lead-research/industry-catalog";
import {
  AREA_SEARCH_TERM,
  isAreaSearch,
  isLeadSearchMutable,
  MAX_AREA_SEARCH_RESULTS,
  MAX_LOCATION_LENGTH,
  leadSearchInputSchema,
  MAX_SEARCH_RESULTS,
} from "@/lib/lead-research/search-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function LeadSearchDialog({
  search,
  open: controlledOpen,
  onOpenChange,
  hideTrigger = false,
}: {
  search?: LeadSearchSummary;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideTrigger?: boolean;
}) {
  const t = useTranslations("leadResearch");
  const locale = useLocale() === "de" ? "de" : "en";
  const [searchMode, setSearchMode] = useState<"industry" | "area">(
    search && isAreaSearch(search.industry) ? "area" : "industry",
  );
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();
  const submitting = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const industryListId = `lead-industry-options-${search?.id ?? "new"}`;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const parsed = leadSearchInputSchema.safeParse({
      location: String(data.get("location") ?? ""),
      radiusKm: Number(data.get("radiusKm")),
      industry: searchMode === "area" ? AREA_SEARCH_TERM : String(data.get("industry") ?? ""),
      maxResults: Number(data.get("maxResults")),
      analyzeWebsites: true,
    });
    setError(null);
    setFieldErrors({});
    if (!parsed.success) {
      const errors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const field = String(issue.path[0]);
        const key = field === "location" ? "locationInvalid" : field === "industry" ? "industryInvalid" : field === "radiusKm" ? "radiusInvalid" : searchMode === "area" ? "areaResultsInvalid" : "resultsInvalid";
        errors[field] ??= t(key);
      }
      setFieldErrors(errors);
      const field = form.elements.namedItem(Object.keys(errors)[0]);
      if (field instanceof HTMLElement) field.focus();
      return;
    }
    submitting.current = true;
    setError(null);
    startTransition(async () => {
      try {
        const result = search
          ? await updateLeadSearchAction(search.id, parsed.data)
          : await createLeadSearchAction(parsed.data);
        if (!result.success) {
          setError(t(result.error));
          return;
        }
        toast.success(t(search ? "updateSuccess" : "saveSuccess"));
        setOpen(false);
        setFieldErrors({});
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
        setFieldErrors({});
        setError(null);
      }}
    >
      {!hideTrigger && (
        <DialogTrigger
          render={
            <Button
              variant={search ? "outline" : "default"}
              size={search ? "sm" : "default"}
              disabled={search ? !isLeadSearchMutable(search.status) : false}
              aria-label={
                search
                  ? t("editFor", {
                      location: search.location,
                      industry: isAreaSearch(search.industry)
                        ? t("areaSearch")
                        : search.industry,
                    })
                  : undefined
              }
            >
              {search ? (
                <Pencil aria-hidden="true" />
              ) : (
                <Plus aria-hidden="true" />
              )}
              {t(search ? "edit" : "newSearch")}
            </Button>
          }
        />
      )}
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{t(search ? "editSearch" : "newSearch")}</DialogTitle>
          <DialogDescription className="sr-only">
            {t("formDescription")}
          </DialogDescription>
        </DialogHeader>
        <form
          noValidate
          onSubmit={handleSubmit}
          onChange={() => {
            setFieldErrors({});
            setError(null);
          }}
          className="flex flex-col gap-5"
        >
          <fieldset
            disabled={isPending}
            className="flex min-w-0 flex-col gap-5"
          >
            <div className="flex flex-col gap-2">
              <Label>{t("searchMode")}</Label>
              <div
                role="group"
                aria-label={t("searchMode")}
                className="flex w-fit rounded-md border p-1"
              >
                <Button
                  type="button"
                  size="sm"
                  variant={searchMode === "industry" ? "secondary" : "ghost"}
                  aria-pressed={searchMode === "industry"}
                  onClick={() => {
                    setSearchMode("industry");
                    setFieldErrors({});
                    setError(null);
                  }}
                >
                  {t("industrySearch")}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={searchMode === "area" ? "secondary" : "ghost"}
                  aria-pressed={searchMode === "area"}
                  onClick={() => {
                    setSearchMode("area");
                    setFieldErrors({});
                    setError(null);
                  }}
                >
                  {t("areaSearch")}
                </Button>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="lead-location">{t("location")}</Label>
                <Input
                  id="lead-location"
                  name="location"
                  aria-invalid={Boolean(fieldErrors.location)}
                  aria-describedby={fieldErrors.location ? "lead-location-error" : undefined}
                  defaultValue={search?.location}
                  placeholder={t("locationPlaceholder")}
                  required
                  pattern=".*\S.*"
                  maxLength={MAX_LOCATION_LENGTH}
                />
                <p className="text-xs text-muted-foreground">{t("locationHelp")}</p>
                  {fieldErrors.location && <p id="lead-location-error" role="alert" className="text-xs text-destructive">{fieldErrors.location}</p>}
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="lead-radius">{t("radius")}</Label>
                <Input
                  id="lead-radius"
                  name="radiusKm"
                  aria-invalid={Boolean(fieldErrors.radiusKm)}
                  aria-describedby={fieldErrors.radiusKm ? "lead-radius-error" : undefined}
                  defaultValue={search?.radiusKm}
                  type="number"
                  min={0.1}
                  step="any"
                  max={Number.MAX_SAFE_INTEGER}
                  placeholder="20"
                  required
                />
                  {fieldErrors.radiusKm && <p id="lead-radius-error" role="alert" className="text-xs text-destructive">{fieldErrors.radiusKm}</p>}
              </div>
              {searchMode === "industry" ? (
                <div className="flex flex-col gap-2">
                  <Label htmlFor="lead-industry">{t("industry")}</Label>
                  <Input
                    id="lead-industry"
                    name="industry"
                  aria-invalid={Boolean(fieldErrors.industry)}
                  aria-describedby={fieldErrors.industry ? "lead-industry-error" : undefined}
                    defaultValue={
                      search && !isAreaSearch(search.industry)
                        ? search.industry
                        : undefined
                    }
                    placeholder={t("industryPlaceholder")}
                    list={industryListId}
                    required
                    pattern=".*\S.*"
                    maxLength={200}
                  />
                  {fieldErrors.industry && <p id="lead-industry-error" role="alert" className="text-xs text-destructive">{fieldErrors.industry}</p>}
                  <datalist id={industryListId}>
                    {INDUSTRY_CATEGORIES.flatMap((category) =>
                      category.items.map((industry) => (
                        <option
                          key={industry.key}
                          value={industry[locale]}
                          label={`${t(`industryCategories.${category.key}`)} · ${t(`industryOptions.${industry.key}`)}`}
                        />
                      )),
                    )}
                  </datalist>
                  <p className="text-xs text-muted-foreground">
                    {t("industryHelp")}
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <Label>{t("areaSearch")}</Label>
                  <input
                    type="hidden"
                    name="industry"
                    value={AREA_SEARCH_TERM}
                  />
                  <p className="text-xs text-muted-foreground">
                    {t("areaSearchHelp")}
                  </p>
                </div>
              )}
              <div className="flex flex-col gap-2">
                <Label htmlFor="lead-max-results">
                  {t(searchMode === "area" ? "topResults" : "maxResults")}
                </Label>
                <Input
                  id="lead-max-results"
                  name="maxResults"
                  aria-invalid={Boolean(fieldErrors.maxResults)}
                  aria-describedby={fieldErrors.maxResults ? "lead-max-results-error" : undefined}
                  defaultValue={search?.maxResults}
                  type="number"
                  min={1}
                  step={1}
                  max={
                    searchMode === "area"
                      ? MAX_AREA_SEARCH_RESULTS
                      : MAX_SEARCH_RESULTS
                  }
                  placeholder={
                    searchMode === "area"
                      ? String(MAX_AREA_SEARCH_RESULTS)
                      : "100"
                  }
                  required
                />
                  {fieldErrors.maxResults && <p id="lead-max-results-error" role="alert" className="text-xs text-destructive">{fieldErrors.maxResults}</p>}
              </div>
            </div>
            <Button type="submit" disabled={isPending} aria-busy={isPending} className="self-start">
              {isPending ? t("saving") : t(search ? "saveChanges" : "saveSearch")}
            </Button>
          </fieldset>
        </form>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
