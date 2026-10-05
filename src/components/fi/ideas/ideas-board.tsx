import { getTranslations } from "next-intl/server";
import { getIdeas } from "@/lib/data/ideas";
import { IdeasBrowser } from "@/components/fi/ideas/ideas-browser";

export async function IdeasBoard({
  userId,
  isOwner,
}: {
  userId: string;
  isOwner: boolean;
}) {
  const [t, ideas] = await Promise.all([getTranslations("ideas"), getIdeas()]);

  // Empty state
  if (ideas.length === 0) {
    return <p className="text-muted-foreground text-sm">{t("empty")}</p>;
  }

  return <IdeasBrowser ideas={ideas} userId={userId} isOwner={isOwner} />;
}
