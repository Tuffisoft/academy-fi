"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Check, Code2, Copy, Download, Plus, Radio, RotateCcw, Save, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import dynamic from "next/dynamic";
import { Input } from "@/components/ui/input";
import { activatePdfTemplateAction, getPdfDesignAction, savePdfDesignAction, selectPdfTemplateAction } from "@/lib/actions/pdf-design.actions";
import { defaultPdfDesign, type PdfDesign } from "@/lib/lead-research/pdf/design";

const PdfSourceEditor = dynamic(() => import("./pdf-source-editor"), { ssr: false });

export function PdfDesignEditor() {
  const t = useTranslations("leadResearch");
  const locale = useLocale();
  const [design, setDesign] = useState<PdfDesign>(defaultPdfDesign);
  const [saved, setSaved] = useState<PdfDesign>(defaultPdfDesign);
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [savedTemplateId, setSavedTemplateId] = useState<string | null>(null);
  const [templates, setTemplates] = useState<{ id: string; name: string }[]>([]);
  const [switching, setSwitching] = useState(false);
  const [activating, setActivating] = useState(false);
  const [liveDesign, setLiveDesign] = useState<PdfDesign | null>(null);
  const [liveTemplateId, setLiveTemplateId] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState<"idle" | "copying" | "copied" | "error">("idle");
  const copyTimer = useRef<number | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [rendering, setRendering] = useState(false);
  const [preview, setPreview] = useState<{ url: string; source: string; theme: string; locale: string } | null>(null);
  const latestUrl = useRef<string | null>(null);
  const busy = saving || switching || activating;
  const dirty = templateId === null || design.source !== saved.source || design.theme !== saved.theme || design.name !== saved.name;
  const { source, theme } = design;
  const isLive = !dirty && templateId !== null && templateId === liveTemplateId && saved.source === liveDesign?.source && saved.theme === liveDesign?.theme && saved.name === liveDesign?.name;
  const currentPreview = preview?.source === design.source && preview.theme === design.theme && preview.locale === locale;

  useEffect(() => {
    let disposed = false;
    getPdfDesignAction().then(result => {
      if (!disposed) { setDesign(result.design); setSaved(result.design); setTemplateId(result.templateId); setSavedTemplateId(result.templateId); setTemplates(result.templates); setLiveDesign(result.liveDesign); setLiveTemplateId(result.liveTemplateId); setLoaded(true); setLoadFailed(false); }
    }).catch(() => { if (!disposed) setLoadFailed(true); });
    return () => { disposed = true; };
  }, [retry]);

  useEffect(() => {
    if (!loaded) return;
    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setRendering(true); setPreviewError(null);
      try {
        const response = await fetch("/api/pdf-design/preview", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ source, theme, locale }), signal: controller.signal });
        if (!response.ok) {
          const result = await response.json();
          throw new Error(result.error === "preview_failed" || result.error === "invalid_template" ? t("pdfPreviewError") : result.error);
        }
        const blob = await response.blob();
        if (controller.signal.aborted) return;
        const url = URL.createObjectURL(blob);
        const oldUrl = latestUrl.current;
        latestUrl.current = url;
        setPreview({ url, source, theme, locale });
        if (oldUrl) URL.revokeObjectURL(oldUrl);
      } catch (cause) {
        if (!controller.signal.aborted) setPreviewError(cause instanceof Error ? cause.message : t("pdfPreviewError"));
      } finally {
        if (!controller.signal.aborted) setRendering(false);
      }
    }, 800);
    return () => { window.clearTimeout(timeout); controller.abort(); };
  }, [source, theme, loaded, locale, t]);

  useEffect(() => () => { if (latestUrl.current) URL.revokeObjectURL(latestUrl.current); }, []);
  useEffect(() => () => { if (copyTimer.current !== null) window.clearTimeout(copyTimer.current); }, []);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  async function selectTemplate(id: string) {
    if (busy || dirty) return;
    setSwitching(true); setError(null); setMessage(null);
    try {
      const result = await selectPdfTemplateAction(id);
      if (!result.success) { setError(t("pdfLoadError")); return; }
      setDesign(result.design); setSaved(result.design); setTemplateId(result.templateId); setSavedTemplateId(result.templateId);
    } catch { setError(t("pdfLoadError")); }
    finally { setSwitching(false); }
  }

  async function save() {
    setSaving(true); setError(null); setMessage(null);
    const snapshot = { ...design, name: design.name?.trim() };
    try {
      const result = await savePdfDesignAction({ ...snapshot, templateId });
      if (!result.success) { setError(result.error ?? t("pdfSaveError")); return; }
      setSaved(result.design); setDesign(result.design);
      setTemplateId(result.templateId); setSavedTemplateId(result.templateId); setTemplates(result.templates);
      setMessage(t("pdfSaved"));
    } catch { setError(t("pdfSaveError")); }
    finally { setSaving(false); }
  }

  async function activate() {
    if (busy || dirty || !templateId || isLive) return;
    setActivating(true); setError(null); setMessage(null);
    try {
      const result = await activatePdfTemplateAction(templateId);
      if (!result.success) { setError(t("pdfActivateError")); return; }
      setLiveDesign(result.design); setLiveTemplateId(result.templateId); setMessage(t("pdfActivated"));
    } catch { setError(t("pdfActivateError")); }
    finally { setActivating(false); }
  }

  async function copyCode() {
    if (copyTimer.current !== null) window.clearTimeout(copyTimer.current);
    setCopyStatus("copying");
    try {
      await navigator.clipboard.writeText(source);
      setCopyStatus("copied");
      copyTimer.current = window.setTimeout(() => setCopyStatus("idle"), 2500);
    } catch { setCopyStatus("error"); }
  }

  if (!loaded) return <div className="rounded-xl border p-6" role={loadFailed ? "alert" : "status"}>{t(loadFailed ? "pdfLoadError" : "pdfLoading")}{loadFailed && <Button className="ml-3" variant="outline" onClick={() => setRetry(value => value + 1)}>{t("retryDetails")}</Button>}</div>;

  return <section className="min-w-0 space-y-4" aria-label={t("pdfDesign")}>
    <div className="flex flex-wrap items-start justify-between gap-4">
      <h2 className="flex items-center gap-2 text-lg font-semibold"><Code2 className="size-5" />{t("pdfEditorTitle")}</h2>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" disabled={busy} onClick={() => { setTemplateId(null); setDesign({ ...design, name: "" }); setMessage(null); setError(null); }}><Plus />{t("pdfNewTemplate")}</Button>
        {dirty && <Button variant="ghost" disabled={busy} onClick={() => { setDesign(saved); setTemplateId(savedTemplateId); setMessage(null); setError(null); }}><Undo2 />{t("pdfDiscardChanges")}</Button>}
        <Button variant="outline" disabled={busy} onClick={() => { setDesign({ ...defaultPdfDesign, name: design.name }); setMessage(null); setError(null); }}><RotateCcw />{t("pdfReset")}</Button>
        <Button variant="outline" disabled={!currentPreview || rendering || Boolean(previewError)} onClick={() => { if (!preview) return; const link = document.createElement("a"); link.href = preview.url; link.download = "pdfcn-design-preview.pdf"; link.click(); }}><Download />{t("pdfTestDownload")}</Button>
        <Button disabled={busy || !dirty || !design.name?.trim()} onClick={save} aria-busy={saving}><Save />{t(saving ? "pdfSaving" : "pdfSave")}</Button>
      </div>
    </div>
    <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-muted/30 px-4 py-3">
      <div className="grid w-full gap-2 sm:max-w-sm sm:flex-1">
        <label htmlFor="pdf-design-name" className="text-sm font-medium">{t("pdfTemplateName")}</label>
        <Input id="pdf-design-name" disabled={busy} value={design.name ?? ""} maxLength={100} required autoComplete="off" placeholder={t("pdfTemplateNamePlaceholder")} onChange={event => { setDesign({ ...design, name: event.target.value }); setMessage(null); setError(null); }} />
      </div>
      <div className="grid w-full gap-2 sm:w-auto sm:min-w-56">
        <label htmlFor="pdf-template" className="text-sm font-medium">{t("pdfTemplate")}</label>
        <select id="pdf-template" className="h-8 rounded-md border bg-background px-3 text-sm" value={templateId ?? ""} disabled={busy || dirty} onChange={event => void selectTemplate(event.target.value)}>
          {templateId === null && <option value="">{t("pdfNewTemplate")}</option>}
          {templates.map(template => <option key={template.id} value={template.id}>{template.name}</option>)}
        </select>
      </div>
      <span className="text-xs text-muted-foreground" role="status">{dirty ? t("pdfUnsaved") : t("pdfSavedState")}</span>
      <Button variant={isLive ? "secondary" : "default"} disabled={busy || dirty || !templateId || isLive} onClick={activate} aria-busy={activating} title={dirty ? t("pdfSaveBeforeActivate") : undefined}>
        {isLive ? <Check /> : <Radio />}{t(activating ? "pdfActivating" : isLive ? "pdfLiveDesign" : "pdfActivateDesign")}
      </Button>
      <a href="https://www.pdfcn.dev/docs/components/forme" target="_blank" rel="noopener noreferrer" className="ml-auto text-xs underline">{t("pdfDocumentation")}</a>
    </div>
    {message && <p role="status" className="text-sm text-green-700 dark:text-green-400">{message}</p>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <div className="grid min-w-0 gap-4 xl:grid-cols-2">
      <div className="min-w-0 overflow-hidden rounded-xl border">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/40 px-4 py-3"><span className="text-sm font-medium">report.jsx</span><div className="flex items-center gap-2"><span role="status" className={`text-xs ${copyStatus === "error" ? "text-destructive" : "text-muted-foreground"}`}>{copyStatus === "error" ? t("pdfCopyError") : copyStatus === "copied" ? t("pdfCopied") : ""}</span><Button variant="ghost" size="sm" disabled={copyStatus === "copying"} onClick={copyCode}>{copyStatus === "copied" ? <Check /> : <Copy />}{t("pdfCopyCode")}</Button></div></div>
        <PdfSourceEditor key={templateId ?? "new"} value={design.source} disabled={busy} label={t("pdfSourceLabel")} onChange={source => { setDesign(current => ({ ...current, source })); setMessage(null); }} />
      </div>
      <div className="min-w-0 overflow-hidden rounded-xl border bg-muted/20">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3"><h3 className="text-sm font-medium">{t("pdfPreview")}</h3><span role="status" className="text-xs text-muted-foreground">{rendering || !currentPreview && !previewError ? t("pdfRendering") : t("pdfDemoData")}</span></div>
        {previewError && <p role="alert" className="m-4 whitespace-pre-wrap rounded-lg border border-destructive/20 bg-destructive/5 p-3 font-mono text-xs text-destructive">{previewError}</p>}
        {preview && <iframe title={t("pdfPreview")} src={preview.url} className="h-[70vh] min-h-96 w-full bg-white" />}
        {!preview && !previewError && <div className="flex h-[70vh] min-h-96 items-center justify-center text-sm text-muted-foreground">{t("pdfRendering")}</div>}
      </div>
    </div>
    <details className="rounded-lg border p-4"><summary className="cursor-pointer text-sm font-medium">{t("pdfHelpTitle")}</summary><div className="mt-3 space-y-3 text-sm text-muted-foreground"><p className="break-words font-mono text-xs">Document · Page · View · Text · Link · Fixed · PdfHeading · PdfText · PdfCard · PdfSection · PdfBadge</p><p className="break-words font-mono text-xs">report.title · report.url · report.scoreLabel · report.checkedAtLabel · report.partsRows · report.devices · report.labels</p></div></details>
  </section>;
}
