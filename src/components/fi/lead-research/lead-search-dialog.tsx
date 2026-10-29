"use client";

import { useRef, useState, useTransition, type FormEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Pencil, Play, Plus } from "lucide-react";
import { toast } from "sonner";
import {
  createLeadSearchAction,
  updateLeadSearchAction,
  saveAndStartLeadSearchAction,
} from "@/lib/actions/lead-searches.actions";
import { searchFieldErrors } from "@/lib/lead-research/search-field-errors";
import type { LeadSearchSummary } from "@/lib/lead-research/types";
import { CityCombobox } from "./city-combobox";
import { IndustryCombobox } from "./industry-combobox";
import { industryLanguageForLocation, translateCatalogIndustry } from "@/lib/lead-research/location-industry-language";
import {
  AREA_SEARCH_TERM,
  isAreaSearch,
  isLeadSearchMutable,
  MAX_AREA_SEARCH_RESULTS,
  leadSearchInputSchema,
  MAX_SEARCH_RESULTS,
  MAX_SEARCH_RADIUS_KM,
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
  onSaved,
}: {
  search?: LeadSearchSummary;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideTrigger?: boolean;
  onSaved?: (id: string) => void;
}) {
  const t = useTranslations("leadResearch");
  const uiLanguage = useLocale() === "de" ? "de" : "en";
  const [location, setLocation] = useState(search?.location ?? "");
  const industryLanguage = industryLanguageForLocation(location, uiLanguage);
  const [industry, setIndustry] = useState(() => translateCatalogIndustry(search && !isAreaSearch(search.industry) ? search.industry : "", industryLanguage));
  const [searchMode, setSearchMode] = useState<"industry" | "area">(
    search && isAreaSearch(search.industry) ? "area" : "industry",
  );
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();
  const [starting, setStarting] = useState(false);
  const submitting = useRef(false);
  const [error, setError] = useState<string | null>(null);

  function clearFieldError(name: string) {
    setFieldErrors(previous => { const next = { ...previous }; delete next[name]; return next; });
    setError(null);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    const form = event.currentTarget;
    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    const startNow = submitter instanceof HTMLButtonElement && submitter.value === "start";
    const data = new FormData(form);
    const input = {
      location: String(data.get("location") ?? ""),
      radiusKm: String(data.get("radiusKm") ?? "").trim() ? Number(data.get("radiusKm")) : undefined,
      industry: searchMode === "area" ? AREA_SEARCH_TERM : String(data.get("industry") ?? ""),
      maxResults: String(data.get("maxResults") ?? "").trim() ? Number(data.get("maxResults")) : undefined,
      analyzeWebsites: true,
    };
    const parsed = leadSearchInputSchema.safeParse(input);
    setError(null);
    setFieldErrors({});
    if (!parsed.success) {
      const errors: Record<string, string> = {};
      for (const [field, message] of Object.entries(searchFieldErrors(input, parsed.error.issues))) {
        errors[field] = t(message.key, message.values);
      }
      setFieldErrors(errors);
      const field = form.elements.namedItem(Object.keys(errors)[0]);
      if (field instanceof HTMLElement) field.focus();
      return;
    }
    submitting.current = true;
    setStarting(startNow);
    setError(null);
    startTransition(async () => {
      try {
        const result = startNow
          ? await saveAndStartLeadSearchAction(parsed.data, search?.id)
          : search
          ? await updateLeadSearchAction(search.id, parsed.data)
          : await createLeadSearchAction(parsed.data);
        if (!result.success) {
          setError(t(result.error));
          return;
        }
        if ("startError" in result && typeof result.startError === "string") {
          toast.warning(t("savedStartBlocked", { reason: t(result.startError) }), { duration: 10000 });
        } else {
          toast.success(t("started" in result ? "savedAndStarted" : search ? "updateSuccess" : "saveSuccess"));
        }
        setOpen(false);
        setFieldErrors({});
        onSaved?.(result.id);
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
          onChange={(event) => {
            const target = event.target;
            if (target instanceof HTMLInputElement) clearFieldError(target.name);
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
                <CityCombobox
                  defaultValue={search?.location}
                  disabled={isPending}
                  error={fieldErrors.location}
                  onChange={(value) => {
                    setLocation(value);
                    setIndustry(current => translateCatalogIndustry(current, industryLanguageForLocation(value, uiLanguage)));
                    clearFieldError("location");
                  }}
                />
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
                  max={MAX_SEARCH_RADIUS_KM}
                  placeholder="20"
                  required
                />
                  {fieldErrors.radiusKm && <p id="lead-radius-error" role="alert" className="text-xs text-destructive">{fieldErrors.radiusKm}</p>}
              </div>
              {searchMode === "industry" ? (
                <div className="flex flex-col gap-2">
                  <Label htmlFor="lead-industry">{t("industry")}</Label>
                  <IndustryCombobox
                    value={industry}
                    language={industryLanguage}
                    disabled={isPending}
                    error={fieldErrors.industry}
                    onChange={(value) => { setIndustry(value); clearFieldError("industry"); }}
                  />
                  {fieldErrors.industry && <p id="lead-industry-error" role="alert" className="text-xs text-destructive">{fieldErrors.industry}</p>}
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <Label>{t("areaSearch")}</Label>
                  <input
                    type="hidden"
                    name="industry"
                    value={AREA_SEARCH_TERM}
                  />
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
            <div className="flex flex-wrap gap-2">
              <Button type="submit" name="intent" value="save" variant="outline" disabled={isPending} aria-busy={isPending && !starting}>
                {isPending && !starting ? t("saving") : t("saveOnly")}
              </Button>
              <Button type="submit" name="intent" value="start" disabled={isPending} aria-busy={isPending && starting}>
                <Play aria-hidden="true" />{isPending && starting ? t("savingAndStarting") : t("saveAndStart")}
              </Button>
            </div>
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
