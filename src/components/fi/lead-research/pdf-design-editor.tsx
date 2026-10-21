"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Code2, Download, RotateCcw, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { getPdfDesignAction, savePdfDesignAction } from "@/lib/actions/pdf-design.actions";
import { defaultPdfDesign, type PdfDesign } from "@/lib/lead-research/pdf/design";

export function PdfDesignEditor() {
  const t = useTranslations("leadResearch");
  const locale = useLocale();
  const [design, setDesign] = useState<PdfDesign>(defaultPdfDesign);
  const [saved, setSaved] = useState<PdfDesign>(defaultPdfDesign);
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
  const dirty = design.source !== saved.source || design.theme !== saved.theme;
  const currentPreview = preview?.source === design.source && preview.theme === design.theme && preview.locale === locale;

  useEffect(() => {
    let disposed = false;
    getPdfDesignAction().then(result => {
      if (!disposed) { setDesign(result); setSaved(result); setLoaded(true); setLoadFailed(false); }
    }).catch(() => { if (!disposed) setLoadFailed(true); });
    return () => { disposed = true; };
  }, [retry]);

  useEffect(() => {
    if (!loaded) return;
    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setRendering(true); setPreviewError(null);
      try {
        const response = await fetch("/api/pdf-design/preview", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...design, locale }), signal: controller.signal });
        if (!response.ok) {
          const result = await response.json();
          throw new Error(result.error === "preview_failed" || result.error === "invalid_template" ? t("pdfPreviewError") : result.error);
        }
        const blob = await response.blob();
        if (controller.signal.aborted) return;
        const url = URL.createObjectURL(blob);
        const oldUrl = latestUrl.current;
        latestUrl.current = url;
        setPreview({ url, source: design.source, theme: design.theme, locale });
        if (oldUrl) URL.revokeObjectURL(oldUrl);
      } catch (cause) {
        if (!controller.signal.aborted) setPreviewError(cause instanceof Error ? cause.message : t("pdfPreviewError"));
      } finally {
        if (!controller.signal.aborted) setRendering(false);
      }
    }, 800);
    return () => { window.clearTimeout(timeout); controller.abort(); };
  }, [design, loaded, locale, t]);

  useEffect(() => () => { if (latestUrl.current) URL.revokeObjectURL(latestUrl.current); }, []);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  async function save() {
    setSaving(true); setError(null); setMessage(null);
    const snapshot = { ...design };
    try {
      const result = await savePdfDesignAction(snapshot);
      if (!result.success) { setError(result.error ?? t("pdfSaveError")); return; }
      setSaved(snapshot); setMessage(t("pdfSaved"));
    } catch { setError(t("pdfSaveError")); }
    finally { setSaving(false); }
  }

  if (!loaded) return <div className="rounded-xl border p-6" role={loadFailed ? "alert" : "status"}>{t(loadFailed ? "pdfLoadError" : "pdfLoading")}{loadFailed && <Button className="ml-3" variant="outline" onClick={() => setRetry(value => value + 1)}>{t("retryDetails")}</Button>}</div>;

  return <section className="min-w-0 space-y-4" aria-label={t("pdfDesign")}>
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><h2 className="flex items-center gap-2 text-lg font-semibold"><Code2 className="size-5" />{t("pdfEditorTitle")}</h2><p className="mt-1 max-w-2xl text-sm text-muted-foreground">{t("pdfEditorDescription")}</p></div>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" disabled={saving} onClick={() => { setDesign({ ...defaultPdfDesign }); setMessage(null); setError(null); }}><RotateCcw />{t("pdfReset")}</Button>
        <Button variant="outline" disabled={!currentPreview || rendering || Boolean(previewError)} onClick={() => { if (!preview) return; const link = document.createElement("a"); link.href = preview.url; link.download = "pdfcn-design-preview.pdf"; link.click(); }}><Download />{t("pdfTestDownload")}</Button>
        <Button disabled={saving || !dirty} onClick={save} aria-busy={saving}><Save />{t(saving ? "pdfSaving" : "pdfSave")}</Button>
      </div>
    </div>
    <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-muted/30 px-4 py-3">
      <label htmlFor="pdf-theme" className="text-sm font-medium">{t("pdfTheme")}</label>
      <select id="pdf-theme" className="rounded-md border bg-background px-3 py-1.5 text-sm" value={design.theme} onChange={event => { setDesign({ ...design, theme: event.target.value as PdfDesign["theme"] }); setMessage(null); }}>
        <option value="modern">PDFCN Modern</option><option value="corporate">PDFCN Corporate</option><option value="professional">PDFCN Professional</option>
      </select>
      <span className="text-xs text-muted-foreground" role="status">{dirty ? t("pdfUnsaved") : t("pdfSavedState")}</span>
      <a href="https://www.pdfcn.dev/docs/components/forme" target="_blank" rel="noopener noreferrer" className="ml-auto text-xs underline">{t("pdfDocumentation")}</a>
    </div>
    {message && <p role="status" className="text-sm text-green-700 dark:text-green-400">{message}</p>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <div className="grid min-w-0 gap-4 xl:grid-cols-2">
      <div className="min-w-0 overflow-hidden rounded-xl border">
        <div className="flex items-center justify-between border-b bg-muted/40 px-4 py-3"><label htmlFor="pdf-source" className="text-sm font-medium">report.jsx</label><span className="text-xs text-muted-foreground">PDFCN / Forme</span></div>
        <Textarea id="pdf-source" aria-label={t("pdfSourceLabel")} spellCheck={false} autoCapitalize="off" autoCorrect="off" maxLength={60000} className="h-[70vh] min-h-96 resize-y rounded-none border-0 p-4 font-mono text-xs leading-6 tab-size-2 focus-visible:ring-inset" value={design.source} onChange={event => { setDesign({ ...design, source: event.target.value }); setMessage(null); }} onKeyDown={event => {
          if (event.key !== "Tab") return;
          event.preventDefault();
          const input = event.currentTarget;
          const start = input.selectionStart; const end = input.selectionEnd;
          setDesign({ ...design, source: design.source.slice(0, start) + "  " + design.source.slice(end) });
          requestAnimationFrame(() => { input.selectionStart = input.selectionEnd = start + 2; });
        }} />
      </div>
      <div className="min-w-0 overflow-hidden rounded-xl border bg-muted/20">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3"><h3 className="text-sm font-medium">{t("pdfPreview")}</h3><span role="status" className="text-xs text-muted-foreground">{rendering || !currentPreview && !previewError ? t("pdfRendering") : t("pdfDemoData")}</span></div>
        {previewError && <p role="alert" className="m-4 whitespace-pre-wrap rounded-lg border border-destructive/20 bg-destructive/5 p-3 font-mono text-xs text-destructive">{previewError}</p>}
        {preview && <iframe title={t("pdfPreview")} src={preview.url} className="h-[70vh] min-h-96 w-full bg-white" />}
        {!preview && !previewError && <div className="flex h-[70vh] min-h-96 items-center justify-center text-sm text-muted-foreground">{t("pdfRendering")}</div>}
      </div>
    </div>
    <details className="rounded-lg border p-4"><summary className="cursor-pointer text-sm font-medium">{t("pdfHelpTitle")}</summary><div className="mt-3 space-y-3 text-sm text-muted-foreground"><p>{t("pdfHelp")}</p><p className="break-words font-mono text-xs">Document · Page · View · Text · PdfHeading · PdfText · PdfCard · PdfSection · PdfBadge</p><p>{t("pdfDataHelp")}</p><p className="break-words font-mono text-xs">report.title · report.url · report.scoreLabel · report.checkedAtLabel · report.partsRows · report.devices · report.labels</p><p>{t("pdfSyntaxHelp")}</p></div></details>
  </section>;
}
