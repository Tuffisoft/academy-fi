"use client";
import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { saveProgramAction } from "@/lib/loyalty/program.actions";
import { createOperationId } from "@/lib/loyalty/operation-id";
import { programHistory } from "@/lib/loyalty/program-history";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import {
  defaultProgram,
  programConfig,
  storedProgramConfig,
  programTarget,
  programTargetLimits,
  programTextFields,
  programTextLimits,
  symbols,
  type ProgramConfig,
  type ProgramView,
} from "@/lib/loyalty/program-input";
import { ProgramPreview } from "./program-preview";
import { ProgramLogoUpload } from "./program-logo-upload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Pending = {
  organizationId: string;
  operationId: string;
  programId?: string;
  expectedRevision?: number;
  config: ProgramConfig;
};
export function ProgramEditor({
  organizationId,
  slug,
  initial,
  preview = false,
  previewConditionsLocked = false,
}: {
  organizationId: string;
  slug: string;
  initial?: ProgramView;
  preview?: boolean;
  previewConditionsLocked?: boolean;
}) {
  const t = useTranslations("stempelfi.programEditor"),
    locale = useLocale(),
    router = useRouter();
  const [config, setConfig] = useState<ProgramConfig>(
    initial
      ? storedProgramConfig.parse({
          name: initial.name,
          description: initial.description,
          reward: initial.reward,
          target: initial.target,
          backgroundColor: initial.backgroundColor,
          textColor: initial.textColor,
          symbol: initial.symbol,
          logoAssetId: initial.logoAssetId,
        })
      : defaultProgram,
  );
  const [saved, setSaved] = useState(
    initial ? JSON.stringify(config) : JSON.stringify(defaultProgram),
  );
  const [current, setCurrent] = useState(initial);
  const [busy, setBusy] = useState(false),
    [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState(""),
    [error, setError] = useState(false);
  const [uncertain, setUncertain] = useState(false),
    [conflict, setConflict] = useState(false);
  const [uploadRetry, setUploadRetry] = useState(false);
  const [invalidFields, setInvalidFields] = useState<string[]>([]);
  const pending = useRef<Pending | null>(null);
  const reloadConfirmed = useRef(false);
  const [historyLeave, setHistoryLeave] = useState<(() => void) | null>(null);
  const validation = programConfig.safeParse(config);
  const targetInvalid = !programTarget.safeParse(config.target).success;
  const colorIssues = validation.success
    ? []
    : validation.error.issues.filter(
        (issue) =>
          issue.path[0] === "backgroundColor" || issue.path[0] === "textColor",
      );
  const dirty =
    saved !== JSON.stringify(config) || uncertain || uploading || uploadRetry;
  useEffect(() => {
    if (!dirty) return;
    const before = (event: BeforeUnloadEvent) => {
      if (!reloadConfirmed.current) event.preventDefault();
    };
    const click = (event: MouseEvent) => {
      const target = event.target;
      const link = target instanceof Element ? target.closest("a[href]") : null;
      if (
        !(link instanceof HTMLAnchorElement) ||
        event.defaultPrevented ||
        event.button !== 0 ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        event.altKey ||
        link.target === "_blank" ||
        link.hasAttribute("download")
      )
        return;
      const destination = new URL(link.href);
      if (
        destination.origin === location.origin &&
        destination.pathname === location.pathname &&
        destination.search === location.search
      )
        return;
      if (!window.confirm(t("unsaved"))) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    const unblockHistory = programHistory().block((proceed) =>
      setHistoryLeave(() => proceed),
    );
    window.addEventListener("beforeunload", before);
    document.addEventListener("click", click, true);
    return () => {
      window.removeEventListener("beforeunload", before);
      document.removeEventListener("click", click, true);
      unblockHistory();
    };
  }, [dirty, t]);
  const change = <K extends keyof ProgramConfig>(
    key: K,
    value: ProgramConfig[K],
  ) => {
    setConfig((previous) => ({ ...previous, [key]: value }));
    const textField =
      key === "name"
        ? programTextFields.name
        : key === "description"
          ? programTextFields.description
          : key === "reward"
            ? programTextFields.reward
            : undefined;
    if (textField?.safeParse(value).success) {
      setInvalidFields((fields) => fields.filter((field) => field !== key));
    }
    setMessage("");
  };
  async function save() {
    if (preview) return;
    if (busy || uploading || uploadRetry || conflict) return;
    if (!pending.current) {
      const parsed = programConfig.safeParse(config);
      if (!parsed.success) {
        setInvalidFields(
          parsed.error.issues.map((issue) => String(issue.path[0])),
        );
        setError(true);
        setMessage(t("invalid"));
        return;
      }
      pending.current = {
        organizationId,
        operationId: createOperationId(),
        ...(current
          ? { programId: current.id, expectedRevision: current.revision }
          : {}),
        config: parsed.data,
      };
    }
    setBusy(true);
    setMessage("");
    try {
      const reply = await saveProgramAction(
        pending.current,
        locale === "de" ? "de" : "en",
      );
      if (!reply.ok) {
        setError(true);
        setMessage(reply.error.message);
        if (reply.error.code === "UNAVAILABLE") setUncertain(true);
        else {
          pending.current = null;
          setUncertain(false);
          setConflict(
            ["REVISION_CONFLICT", "IDEMPOTENCY_CONFLICT"].includes(
              reply.error.code,
            ),
          );
        }
        return;
      }
      const row = reply.data.program;
      const next = programConfig.parse({
        name: row.name,
        description: row.description,
        reward: row.reward,
        target: row.target,
        backgroundColor: row.backgroundColor,
        textColor: row.textColor,
        symbol: row.symbol,
        logoAssetId: row.logoAssetId,
      });
      setCurrent(row);
      setConfig(next);
      setSaved(JSON.stringify(next));
      setInvalidFields([]);
      pending.current = null;
      setUncertain(false);
      setConflict(false);
      setError(false);
      setMessage(t("saved"));
      // Only a confirmed commit may bypass the unsaved-changes guard. A fresh
      // document also prevents a cached overview from showing the previous data.
      reloadConfirmed.current = true;
      window.location.replace(`/${locale}/tools/calem/stempelkarten/app/${slug}`);
    } catch {
      reloadConfirmed.current = false;
      setUncertain(true);
      setError(true);
      setMessage(t("uncertain"));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="grid min-w-0 gap-8 lg:grid-cols-2">
      <AlertDialog
        open={historyLeave !== null}
        onOpenChange={(open) => {
          if (!open) setHistoryLeave(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("unsavedChanges")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("historyUnsaved")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              className="h-auto min-h-11 whitespace-normal"
              onClick={() => setHistoryLeave(null)}
            >
              {t("keepEditing")}
            </AlertDialogCancel>
            <AlertDialogAction
              className="h-auto min-h-11 whitespace-normal"
              onClick={() => {
                const proceed = historyLeave;
                setHistoryLeave(null);
                proceed?.();
              }}
            >
              {t("discardAndLeave")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <div
        id="program-preview"
        tabIndex={-1}
        className="order-first scroll-mt-5 focus-visible:outline-2 lg:order-last"
      >
        <ProgramPreview config={config} organizationId={organizationId} />
      </div>
      <form
        className="grid min-w-0 content-start gap-5 [&_button]:h-auto [&_button]:min-h-11 [&_button]:whitespace-normal [&_button]:py-3"
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
        noValidate
      >
        <p role="status" className="rounded-lg border bg-muted p-3 text-sm">
          {current && !preview && !dirty && !busy
            ? t("savedStatus")
            : t("notSavedStatus")}
        </p>
        {preview && (
          <p role="note" className="rounded-lg border bg-muted p-4 text-sm">
            {t("demoNote")}
          </p>
        )}
        {previewConditionsLocked && (
          <p className="text-sm">{t("lockedExample")}</p>
        )}
        <fieldset
          disabled={busy || uploading || uncertain}
          className="grid min-w-0 gap-5 disabled:opacity-70"
        >
          {(["name", "description", "reward"] as const).map((key) => (
            <div key={key} className="grid gap-2">
              <label htmlFor={`program-${key}`}>{t(key)}</label>
              {key === "description" ? (
                <Textarea
                  id={`program-${key}`}
                  placeholder={t(`placeholders.${key}`)}
                  maxLength={programTextLimits[key]}
                  onBlur={() =>
                    setInvalidFields((fields) =>
                      programTextFields[key].safeParse(config[key]).success
                        ? fields.filter((field) => field !== key)
                        : [...new Set([...fields, key])],
                    )
                  }
                  value={config[key]}
                  onChange={(event) => change(key, event.target.value)}
                  aria-invalid={invalidFields.includes(key)}
                  aria-describedby={
                    invalidFields.includes(key)
                      ? `program-${key}-length program-${key}-error`
                      : `program-${key}-length`
                  }
                />
              ) : (
                <Input
                  id={`program-${key}`}
                  placeholder={t(`placeholders.${key}`)}
                  required
                  disabled={key === "reward" && previewConditionsLocked}
                  maxLength={programTextLimits[key]}
                  onBlur={() =>
                    setInvalidFields((fields) =>
                      programTextFields[key].safeParse(config[key]).success
                        ? fields.filter((field) => field !== key)
                        : [...new Set([...fields, key])],
                    )
                  }
                  value={config[key]}
                  onChange={(event) => change(key, event.target.value)}
                  aria-invalid={invalidFields.includes(key)}
                  aria-describedby={
                    invalidFields.includes(key)
                      ? `program-${key}-length program-${key}-error`
                      : `program-${key}-length`
                  }
                />
              )}
              <div
                id={`program-${key}-length`}
                className={`text-sm ${config[key].length > programTextLimits[key] ? "text-red-700 dark:text-red-400" : config[key].length === programTextLimits[key] ? "text-yellow-700 dark:text-yellow-400" : "text-muted-foreground"}`}
              >
                <span>
                  {t("characterCount", {
                    count: config[key].length,
                    max: programTextLimits[key],
                  })}
                </span>
                <span
                  role="status"
                  aria-live="polite"
                  className="block font-medium"
                >
                  {config[key].length > programTextLimits[key]
                    ? t("textTooLong", { max: programTextLimits[key] })
                    : config[key].length === programTextLimits[key]
                      ? t("characterLimitReached", {
                          max: programTextLimits[key],
                        })
                      : ""}
                </span>
              </div>
              {invalidFields.includes(key) && (
                <p
                  id={`program-${key}-error`}
                  role="alert"
                  className="text-sm text-red-700 dark:text-red-400"
                >
                  {config[key].trim().length === 0 && key !== "description"
                    ? t("textRequired")
                    : config[key].length > programTextLimits[key]
                      ? t("textTooLong", { max: programTextLimits[key] })
                      : t("textPlainOnly")}
                </p>
              )}
            </div>
          ))}
          <div className="grid gap-2">
            <label htmlFor="program-target">{t("target")}</label>
            <Input
              id="program-target"
              disabled={previewConditionsLocked}
              type="number"
              min={programTargetLimits.min}
              max={programTargetLimits.max}
              step={1}
              required
              value={Number.isNaN(config.target) ? "" : config.target}
              onChange={(event) =>
                change(
                  "target",
                  event.target.value === "" ? NaN : Number(event.target.value),
                )
              }
              aria-invalid={targetInvalid}
              aria-describedby="program-target-hint"
            />
            <p
              id="program-target-hint"
              className={`text-sm ${targetInvalid ? "text-red-700 dark:text-red-400" : "text-muted-foreground"}`}
            >
              {t("targetHint")}
            </p>
          </div>
          {(["backgroundColor", "textColor"] as const).map((key) => (
            <div key={key} className="grid gap-2">
              <label htmlFor={`program-${key}`}>{t(key)}</label>
              <div className="flex min-w-0 gap-2">
                <Input
                  aria-label={t(key)}
                  type="color"
                  className="w-16 shrink-0"
                  value={
                    /^#[0-9a-f]{6}$/i.test(config[key])
                      ? config[key]
                      : "#000000"
                  }
                  onChange={(event) => change(key, event.target.value)}
                />
                <Input
                  id={`program-${key}`}
                  maxLength={7}
                  value={config[key]}
                  onChange={(event) => change(key, event.target.value)}
                  aria-invalid={colorIssues.some(
                    (issue) => issue.path[0] === key,
                  )}
                  aria-describedby="program-color-hint"
                />
              </div>
            </div>
          ))}
          <p
            id="program-color-hint"
            role={colorIssues.length ? "alert" : undefined}
            className={`text-sm ${colorIssues.length ? "text-red-700 dark:text-red-400" : "text-muted-foreground"}`}
          >
            {t(
              colorIssues.length === 0
                ? "colorNote"
                : colorIssues.some((issue) => issue.message === "CONTRAST")
                  ? "contrastHint"
                  : "colorHint",
            )}
          </p>
          <div className="grid gap-2">
            <label id="program-symbol-label" htmlFor="program-symbol">
              {t("symbol")}
            </label>
            <Select
              value={config.symbol}
              disabled={busy || uploading || uncertain}
              onValueChange={(value) => {
                const found = symbols.find((symbol) => symbol === value);
                if (found) change("symbol", found);
              }}
            >
              <SelectTrigger
                id="program-symbol"
                aria-labelledby="program-symbol-label"
                className="min-h-11 w-full"
              >
                <SelectValue>{t(`symbols.${config.symbol}`)}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {symbols.map((symbol) => (
                  <SelectItem key={symbol} value={symbol}>
                    {t(`symbols.${symbol}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </fieldset>
        <ProgramLogoUpload organizationId={organizationId} logoAssetId={config.logoAssetId} hasSavedLogo={!!current?.logoAssetId}
          disabled={preview || busy || uncertain || conflict}
          onChange={id => change("logoAssetId", id)}
          onState={(active, unresolved) => { setUploading(active); setUploadRetry(unresolved); }} />
        <p
          id="program-status"
          role={error ? "alert" : "status"}
          className="min-h-6 wrap-anywhere text-sm"
        >
          {message}
        </p>
        <Button
          type="submit"
          disabled={
            preview ||
            busy ||
            uploading ||
            uploadRetry ||
            conflict ||
            (!uncertain && !validation.success)
          }
        >
          {busy ? t("saving") : uncertain ? t("retry") : t("save")}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="lg:hidden"
          onClick={() => {
            const element = document.getElementById("program-preview");
            element?.focus();
            element?.scrollIntoView({ behavior: "smooth", block: "start" });
          }}
        >
          {t("showPreview")}
        </Button>
        {conflict && (
          <Button
            type="button"
            variant="outline"
            className="h-auto whitespace-normal"
            onClick={() => {
              if (window.confirm(t("unsaved"))) {
                reloadConfirmed.current = true;
                window.location.reload();
              }
            }}
          >
            {t("reload")}
          </Button>
        )}
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            if (!dirty || window.confirm(t("unsaved")))
              router.push(
                preview
                  ? "/tools/calem/stempelkarten/preview"
                  : `/tools/calem/stempelkarten/app/${slug}`,
              );
          }}
        >
          {t("back")}
        </Button>
      </form>
    </div>
  );
}
