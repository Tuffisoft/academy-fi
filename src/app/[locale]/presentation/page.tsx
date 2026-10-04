import { getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/session";
import { BreadcrumbNav } from "@/components/fi/breadcrumb-nav";
import { PresentationViewer } from "@/components/fi/presentation/presentation-viewer";
import { slides } from "@/components/fi/presentation/slides";

export default async function PresentationPage() {
  await requireUser();
  const t = await getTranslations("presentation");

  return (
    <div className="flex flex-1 flex-col p-6">
      <BreadcrumbNav items={[{ label: t("title") }]} />
      <div className="flex flex-1 items-center justify-center">
        <div className="flex flex-1 items-center justify-center">
          <PresentationViewer title={t("title")} slides={slides} />
        </div>
      </div>
    </div>
  );
}
