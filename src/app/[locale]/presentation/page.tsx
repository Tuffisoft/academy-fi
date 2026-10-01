import { getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/session";
import { PresentationViewer } from "@/components/fi/presentation/presentation-viewer";
import { slides } from "@/components/fi/presentation/slides";

export default async function PresentationPage() {
  await requireUser();
  const t = await getTranslations("presentation");

  return (
    <div className="flex flex-1 flex-col items-center justify-center p-6">
      <PresentationViewer title={t("title")} slides={slides} />
    </div>
  );
}
