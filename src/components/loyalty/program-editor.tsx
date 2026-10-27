"use client";
import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { saveProgramAction } from "@/lib/loyalty/program.actions";
import { createOperationId } from "@/lib/loyalty/operation-id";
import { defaultProgram, programConfig, resourceId, symbols, type ProgramConfig, type ProgramView } from "@/lib/loyalty/program-input";
import { ProgramPreview } from "./program-preview";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Pending = { organizationId: string; operationId: string; programId?: string; expectedRevision?: number; config: ProgramConfig };
export function ProgramEditor({ organizationId, slug, initial, preview = false }: { organizationId: string; slug: string; initial?: ProgramView; preview?: boolean }) {
  const t = useTranslations("stempelfi.programEditor"), locale = useLocale(), router = useRouter();
  const [config, setConfig] = useState<ProgramConfig>(initial ? programConfig.parse({ name: initial.name, description: initial.description, reward: initial.reward, target: initial.target, backgroundColor: initial.backgroundColor, textColor: initial.textColor, symbol: initial.symbol, logoAssetId: initial.logoAssetId }) : defaultProgram);
  const [saved, setSaved] = useState(initial ? JSON.stringify(config) : JSON.stringify(defaultProgram));
  const [current, setCurrent] = useState(initial);
  const [busy, setBusy] = useState(false), [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState(""), [error, setError] = useState(false);
  const [uncertain, setUncertain] = useState(false), [conflict, setConflict] = useState(false);
  const [uploadRetry, setUploadRetry] = useState(false);
  const [invalidFields, setInvalidFields] = useState<string[]>([]);
  const pending = useRef<Pending | null>(null);
  const upload = useRef<{ file: File; operationId: string } | null>(null);
  const dirty = saved !== JSON.stringify(config) || uncertain || uploading;
  useEffect(() => {
    if (!dirty) return;
    const before = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    const click = (event: MouseEvent) => {
      const target = event.target;
      if (target instanceof Element && target.closest("a[href]") && !window.confirm(t("unsaved"))) { event.preventDefault(); event.stopPropagation(); }
    };
    let restoring = false;
    const pop = (event: PopStateEvent) => {
      if (restoring) { restoring = false; return; }
      if (!window.confirm(t("unsaved"))) {
        event.stopImmediatePropagation(); restoring = true; window.history.forward();
      }
    };
    window.addEventListener("beforeunload", before); document.addEventListener("click", click, true);
    window.addEventListener("popstate", pop, true);
    return () => { window.removeEventListener("beforeunload", before); document.removeEventListener("click", click, true); window.removeEventListener("popstate", pop, true); };
  }, [dirty, t]);
  const change = <K extends keyof ProgramConfig>(key: K, value: ProgramConfig[K]) => { setConfig(previous => ({ ...previous, [key]: value })); setMessage(""); };
  async function save() {
    if (preview) return;
    if (busy || uploading || conflict) return;
    if (!pending.current) {
      const parsed = programConfig.safeParse(config);
      if (!parsed.success) { setInvalidFields(parsed.error.issues.map(issue => String(issue.path[0]))); setError(true); setMessage(t("invalid")); return; }
      pending.current = { organizationId, operationId: createOperationId(), ...(current ? { programId: current.id, expectedRevision: current.revision } : {}), config: parsed.data };
    }
    setBusy(true); setMessage("");
    try {
      const reply = await saveProgramAction(pending.current, locale === "de" ? "de" : "en");
      if (!reply.ok) {
        setError(true); setMessage(reply.error.message);
        if (reply.error.code === "UNAVAILABLE") setUncertain(true);
        else { pending.current = null; setUncertain(false); setConflict(["REVISION_CONFLICT", "IDEMPOTENCY_CONFLICT"].includes(reply.error.code)); }
        return;
      }
      const row = reply.data.program;
      const next = programConfig.parse({ name: row.name, description: row.description, reward: row.reward, target: row.target, backgroundColor: row.backgroundColor, textColor: row.textColor, symbol: row.symbol, logoAssetId: row.logoAssetId });
      setCurrent(row); setConfig(next); setSaved(JSON.stringify(next)); setInvalidFields([]);
      pending.current = null; setUncertain(false); setConflict(false); setError(false); setMessage(t("saved"));
      window.history.replaceState(null, "", `/${locale}/tools/calem/stempelkarten/app/${slug}/programs/${row.id}`);
    } catch { setUncertain(true); setError(true); setMessage(t("uncertain")); }
    finally { setBusy(false); }
  }
  async function uploadLogo(file?: File) {
    if (preview) return;
    if (uploading || busy || uncertain) return;
    if (file) upload.current = { file, operationId: createOperationId() };
    if (!upload.current) return;
    setUploading(true); setUploadRetry(false); setError(false); setMessage(t("uploading"));
    try {
      const body = new FormData(); body.set("file", upload.current.file); body.set("operationId", upload.current.operationId);
      const response = await fetch(`/api/loyalty/organizations/${organizationId}/assets`, { method: "POST", body, headers: { "Accept-Language": locale } });
      const reply: unknown = await response.json();
      if (!response.ok || !reply || typeof reply !== "object" || !("ok" in reply) || reply.ok !== true || !("data" in reply) || !reply.data || typeof reply.data !== "object" || !("id" in reply.data) || typeof reply.data.id !== "string") throw new Error("UPLOAD_FAILED");
      if (!resourceId.safeParse(reply.data.id).success) throw new Error("INVALID_ASSET_ID");
      change("logoAssetId", reply.data.id); upload.current = null; setMessage("");
    } catch { setUploadRetry(true); setError(true); setMessage(t("uploadFailed")); }
    finally { setUploading(false); }
  }
  return <div className="grid min-w-0 gap-8 lg:grid-cols-2">
    <div className="order-first lg:order-last"><ProgramPreview config={config} organizationId={organizationId} /></div>
    <form className="grid min-w-0 content-start gap-5" onSubmit={event => { event.preventDefault(); void save(); }} noValidate>
      {preview && <p role="note" className="rounded-lg border bg-muted p-4 text-sm">{t("demoNote")}</p>}
      <fieldset disabled={busy || uploading || uncertain} className="grid min-w-0 gap-5 disabled:opacity-70">
        {(["name", "description", "reward"] as const).map(key => <div key={key} className="grid gap-2">
          <label htmlFor={`program-${key}`}>{t(key)}</label>
          {key === "description" ? <Textarea id={`program-${key}`} maxLength={500} value={config[key]} onChange={event => change(key, event.target.value)} aria-invalid={invalidFields.includes(key)} aria-describedby={invalidFields.includes(key) ? "program-status" : undefined} />
            : <Input id={`program-${key}`} required maxLength={key === "name" ? 80 : 160} value={config[key]} onChange={event => change(key, event.target.value)} aria-invalid={invalidFields.includes(key)} aria-describedby={invalidFields.includes(key) ? "program-status" : undefined} />}
        </div>)}
        <div className="grid gap-2"><label htmlFor="program-target">{t("target")}</label><Input id="program-target" type="number" min={1} max={2147483647} step={1} required value={Number.isNaN(config.target) ? "" : config.target} onChange={event => change("target", event.target.value === "" ? NaN : Number(event.target.value))} aria-invalid={invalidFields.includes("target")} aria-describedby={invalidFields.includes("target") ? "program-status" : undefined} /></div>
        {(["backgroundColor", "textColor"] as const).map(key => <div key={key} className="grid gap-2"><label htmlFor={`program-${key}`}>{t(key)}</label><div className="flex min-w-0 gap-2"><Input aria-label={t(key)} type="color" className="w-16 shrink-0" value={/^#[0-9a-f]{6}$/i.test(config[key]) ? config[key] : "#000000"} onChange={event => change(key, event.target.value)} /><Input id={`program-${key}`} maxLength={7} value={config[key]} onChange={event => change(key, event.target.value)} aria-invalid={invalidFields.includes(key)} aria-describedby={invalidFields.includes(key) ? "program-status" : undefined} /></div></div>)}
        <div className="grid gap-2"><label id="program-symbol-label" htmlFor="program-symbol">{t("symbol")}</label><Select value={config.symbol} disabled={busy || uploading || uncertain} onValueChange={value => { const found = symbols.find(symbol => symbol === value); if (found) change("symbol", found); }}><SelectTrigger id="program-symbol" aria-labelledby="program-symbol-label" className="min-h-11 w-full"><SelectValue>{t(`symbols.${config.symbol}`)}</SelectValue></SelectTrigger><SelectContent>{symbols.map(symbol => <SelectItem key={symbol} value={symbol}>{t(`symbols.${symbol}`)}</SelectItem>)}</SelectContent></Select></div>
        <div className="grid gap-2"><label htmlFor="program-logo">{t("logo")}</label><Input id="program-logo" type="file" disabled={preview} accept="image/png,image/jpeg,image/webp" onChange={event => { void uploadLogo(event.target.files?.[0]); event.target.value = ""; }} />
          {config.logoAssetId && <Button type="button" variant="outline" onClick={() => change("logoAssetId", null)}>{t("removeLogo")}</Button>}
          {uploadRetry && !uploading && <Button type="button" variant="outline" onClick={() => void uploadLogo()}>{t("retryUpload")}</Button>}
        </div>
      </fieldset>
      <p id="program-status" role={error ? "alert" : "status"} className="min-h-6 wrap-anywhere text-sm">{message}</p>
      <Button type="submit" disabled={preview || busy || uploading || conflict}>{busy ? t("saving") : uncertain ? t("retry") : t("save")}</Button>
      {conflict && <Button type="button" variant="outline" className="h-auto whitespace-normal" onClick={() => { if (window.confirm(t("unsaved"))) window.location.reload(); }}>{t("reload")}</Button>}
      <Button type="button" variant="outline" onClick={() => { if (!dirty || window.confirm(t("unsaved"))) router.push(preview ? "/tools/calem/stempelkarten/preview" : `/tools/calem/stempelkarten/app/${slug}`); }}>{t("back")}</Button>
    </form>
  </div>;
}
