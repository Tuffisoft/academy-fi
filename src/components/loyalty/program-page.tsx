import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requirePortalActor } from "@/lib/loyalty/portal-session";
import { getPortalOrganization, OrganizationAccessError } from "@/lib/loyalty/organizations";
import { readPrograms, ProgramError } from "@/lib/loyalty/programs";
import { ProductHeader } from "./stempelfi-design";
import { ProgramEditor } from "./program-editor";
import { Link } from "@/i18n/navigation";

export async function ProgramPage({ slug, programId }: { slug: string; programId?: string }) {
  const actor = await requirePortalActor(), t = await getTranslations("stempelfi.programEditor");
  let organization, data;
  try {
    organization = await getPortalOrganization(actor, slug);
    data = await readPrograms(actor, organization.id, programId);
  } catch (error) {
    if (error instanceof OrganizationAccessError || error instanceof ProgramError) notFound();
    return <main><ProductHeader portal /><p role="alert" className="p-5">{t("unavailable")}</p><Link className="m-5 inline-block rounded border p-3" href={`/tools/calem/stempelkarten/app/${slug}`}>{t("back")}</Link></main>;
  }
  return <main className="min-w-0"><ProductHeader portal /><section className="mx-auto grid max-w-6xl gap-7 px-5 py-10"><h1 className="text-3xl font-semibold">{t(programId ? "edit" : "new")}</h1><ProgramEditor organizationId={organization.id} slug={slug} initial={programId ? data.programs[0] : undefined} /></section></main>;
}
