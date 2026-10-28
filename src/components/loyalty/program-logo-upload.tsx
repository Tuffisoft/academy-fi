"use client";
/* eslint-disable @next/next/no-img-element -- Private authorized logo proxy must bypass the shared Next image cache. */
import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { LoaderCircle, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { createOperationId } from "@/lib/loyalty/operation-id";
import { logoFileError } from "@/lib/loyalty/logo-input";
import { sendLogo, logoProgress, LogoUploadError, type LogoProgress, type UploadFailure } from "@/lib/loyalty/logo-upload";

export function ProgramLogoUpload({ organizationId, logoAssetId, hasSavedLogo, disabled, onChange, onState }: {
  organizationId: string; logoAssetId: string | null; hasSavedLogo: boolean; disabled: boolean;
  onChange: (id: string | null) => void; onState: (uploading: boolean, unresolved: boolean) => void;
}) {
  const t = useTranslations("stempelfi.programEditor"), locale = useLocale();
  const [confirmation, setConfirmation] = useState<File | "remove" | null>(null);
  const [dialogKind, setDialogKind] = useState<"replace" | "remove">("replace");
  const [progress, setProgress] = useState<LogoProgress | null>(null);
  const [elapsed, setElapsed] = useState(0), [dragging, setDragging] = useState(false);
  const [failure, setFailure] = useState<UploadFailure | "MULTIPLE" | null>(null);
  const [unresolved, setUnresolved] = useState(false);
  const input = useRef<HTMLInputElement>(null), controller = useRef<AbortController | null>(null);
  const attempt = useRef<{ file: File; operationId: string } | null>(null);
  const mounted = useRef(true), started = useRef(0);
  const active = progress !== null;
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; controller.current?.abort(); }; }, []);
  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => setElapsed(Math.floor((Date.now() - started.current) / 1000)), 1000);
    return () => clearInterval(timer);
  }, [active]);
  const number = (value: number) => new Intl.NumberFormat(locale, { maximumSignificantDigits: 3 }).format(value);
  async function upload(file?: File) {
    if (disabled || controller.current) return;
    if (file) attempt.current = { file, operationId: createOperationId() };
    const current = attempt.current;
    if (!current) return;
    const abortController = new AbortController(); controller.current = abortController;
    started.current = Date.now(); setElapsed(0); setFailure(null); setUnresolved(false);
    setProgress(logoProgress(0, current.file.size, 0)); onState(true, false);
    try {
      const id = await sendLogo({ ...current, organizationId, locale, signal: abortController.signal, onProgress: value => { if (mounted.current) setProgress(value); } });
      if (!mounted.current) return;
      onChange(id); attempt.current = null; onState(false, false);
    } catch (error) {
      if (!mounted.current) return;
      const known = error instanceof LogoUploadError ? error : new LogoUploadError("UNAVAILABLE", true);
      setFailure(known.code); setUnresolved(known.uncertain);
      if (!known.uncertain) attempt.current = null;
      onState(false, known.uncertain);
    } finally {
      controller.current = null;
      if (mounted.current) setProgress(null);
    }
  }
  function choose(files: FileList | null) {
    if (disabled || active || unresolved || !files?.length) return;
    setDragging(false);
    if (files.length !== 1) { setFailure("MULTIPLE"); return; }
    const file = files[0], invalid = logoFileError(file);
    if (invalid) { setFailure(invalid); return; }
    setFailure(null);
    if (hasSavedLogo) { setDialogKind("replace"); setConfirmation(file); } else void upload(file);
  }
  function discard() {
    attempt.current = null; setUnresolved(false); setFailure(null); onState(false, false);
  }
  return <section className="grid min-w-0 gap-3" aria-labelledby="program-logo-heading">
    <h2 id="program-logo-heading" className="text-sm font-medium">{t("logo")}</h2>
    <AlertDialog open={confirmation !== null} onOpenChange={open => { if (!open) setConfirmation(null); }}>
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogTitle>{t(dialogKind === "remove" ? "logoRemoveTitle" : "logoReplaceTitle")}</AlertDialogTitle>
          <AlertDialogDescription className="text-red-700 dark:text-red-400">{t(hasSavedLogo ? "logoReplacementWarning" : "logoRemoveLocal")}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setConfirmation(null)}>{t("logoCancel")}</AlertDialogCancel>
          <AlertDialogAction onClick={() => {
            const selected = confirmation; setConfirmation(null);
            if (selected === "remove") { onChange(null); setFailure(null); }
            else if (selected) void upload(selected);
          }}>{t(dialogKind === "remove" ? "removeLogo" : "logoReplace")}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    <div className={`grid min-w-0 gap-3 rounded-xl border-2 border-dashed p-4 ${dragging ? "border-primary bg-accent" : "border-border"}`}
      onDragOver={event => { event.preventDefault(); if (!disabled && !active && !unresolved) setDragging(true); }}
      onDragLeave={event => { if (!(event.relatedTarget instanceof Node) || !event.currentTarget.contains(event.relatedTarget)) setDragging(false); }}
      onDrop={event => { event.preventDefault(); setDragging(false); choose(event.dataTransfer.files); }}>
      {logoAssetId && <img src={`/api/loyalty/organizations/${organizationId}/assets/${logoAssetId}`} alt={t("logoCurrent")} className="mx-auto size-16 object-contain" />}
      <input ref={input} id="program-logo" type="file" className="sr-only" tabIndex={-1} aria-label={t("logoChoose")} disabled={disabled || active || unresolved} accept="image/png,image/jpeg,image/webp"
        onChange={event => { choose(event.target.files); event.target.value = ""; }} />
      <Button type="button" variant="outline" disabled={disabled || active || unresolved} className="h-auto min-h-11 whitespace-normal" onClick={() => input.current?.click()}>
        <UploadCloud aria-hidden="true" className="size-5 shrink-0" />{t("logoChoose")}
      </Button>
      <p className="text-center text-sm text-muted-foreground">{t("logoDrop")}</p>
      {active && progress && <div className="grid gap-2" aria-busy="true">
        <p role="status" className="flex items-center gap-2 text-sm"><LoaderCircle aria-hidden="true" className="size-4 animate-spin motion-reduce:animate-none" />{t(progress.processing ? "logoProcessing" : "uploading")}</p>
        <progress aria-label={t("logoTransfer")} className="h-2 w-full accent-primary" max={100} value={progress.percent} />
        <p className="text-sm tabular-nums">{t("logoTransferAmount", { percent: progress.percent, loaded: number(progress.loaded / 1_000_000), total: number(progress.total / 1_000_000) })}</p>
        <p className="text-sm tabular-nums">{t("logoElapsed", { seconds: elapsed })}</p>
        {!progress.processing && <p className="text-sm tabular-nums">{progress.bytesPerSecond === null ? t("logoEstimating") : t("logoRate", { rate: number(progress.bytesPerSecond / 1_000_000), seconds: progress.secondsRemaining ?? 0 })}</p>}
        <Button type="button" variant="outline" className="min-h-11" onClick={() => controller.current?.abort()}>{t("logoAbort")}</Button>
      </div>}
    </div>
    {failure && <p role="alert" className="wrap-anywhere text-sm text-red-700 dark:text-red-400">{t(`logoErrors.${failure}`)}</p>}
    {unresolved && !active && <div className="grid gap-2">
      <p className="text-sm">{t("logoUncertain")}</p>
      <Button type="button" variant="outline" disabled={disabled} className="h-auto min-h-11 whitespace-normal" onClick={() => void upload()}>{t("retryUpload")}</Button>
      <Button type="button" variant="outline" disabled={disabled} className="h-auto min-h-11 whitespace-normal" onClick={discard}>{t("discardUpload")}</Button>
    </div>}
    {logoAssetId && <Button type="button" variant="outline" className="min-h-11 justify-self-start" disabled={disabled || active || unresolved} onClick={() => { setDialogKind("remove"); setConfirmation("remove"); }}>{t("removeLogo")}</Button>}
  </section>;
}
