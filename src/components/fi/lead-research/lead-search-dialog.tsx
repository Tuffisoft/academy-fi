"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
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

export function LeadSearchDialog() {
  const t = useTranslations("leadResearch");
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<SearchPreview | null>(null);
  const [analyzeWebsites, setAnalyzeWebsites] = useState(true);

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

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        setOpen(value);
        setPreview(null);
        setAnalyzeWebsites(true);
      }}
    >
      <DialogTrigger
        render={
          <Button>
            <Plus aria-hidden="true" />
            {t("newSearch")}
          </Button>
        }
      />
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{t("newSearch")}</DialogTitle>
          <DialogDescription>{t("formDescription")}</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={handleSubmit}
          onChange={() => setPreview(null)}
          className="flex flex-col gap-5"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="lead-location">{t("location")}</Label>
              <Input
                id="lead-location"
                name="location"
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
                type="number"
                min={1}
                step={1}
                max={Number.MAX_SAFE_INTEGER}
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
        </form>
        <div role="status" aria-live="polite" aria-atomic="true">
          {preview && (
            <Card size="sm">
              <CardHeader>
                <CardTitle>{t("previewTitle")}</CardTitle>
                <Badge variant="secondary">{t("notStarted")}</Badge>
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
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
