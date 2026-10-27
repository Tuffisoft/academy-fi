import { getTranslations } from "next-intl/server";
import { readPrograms } from "@/lib/loyalty/programs";
import { Link } from "@/i18n/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export async function ProgramList({ actorId, organizationId, slug, after }: { actorId: string; organizationId: string; slug: string; after?: string }) {
  const t = await getTranslations("stempelfi.programEditor");
  let data;
  try {
    data = await readPrograms(actorId, organizationId, undefined, after);
  } catch { return <p role="alert">{t("unavailable")}</p>; }
    const base = `/tools/calem/stempelkarten/app/${slug}`;
    return <section className="grid min-w-0 gap-4" aria-labelledby="program-list-heading"><h2 id="program-list-heading" className="text-2xl font-semibold">{t("title")}</h2>
      <Link className="min-h-11 justify-self-start rounded-md border px-4 py-3" href={`${base}/programs/new`}>{t("new")}</Link>
      {!data.programs.length && <p>{t("empty")}</p>}
      <div className="grid min-w-0 gap-4 sm:grid-cols-2">{data.programs.map(program => <Card key={program.id}><CardHeader><CardTitle className="wrap-anywhere">{program.name}</CardTitle></CardHeader><CardContent className="grid gap-3"><p>{t("draft")} · {program.target}</p><p className="wrap-anywhere">{program.reward}</p><Link className="min-h-11 justify-self-start rounded-md border px-4 py-3" href={`${base}/programs/${program.id}`}>{t("edit")}</Link></CardContent></Card>)}</div>
      {data.next && <Link className="min-h-11 justify-self-start rounded border p-3" href={`${base}?programAfter=${data.next}`}>{t("next")}</Link>}
    </section>;
}
