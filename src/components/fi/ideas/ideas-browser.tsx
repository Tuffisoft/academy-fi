"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Search } from "lucide-react";
import { IdeaCard } from "@/components/fi/ideas/idea-card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Idea = React.ComponentProps<typeof IdeaCard>["idea"];

type SortKey = "newest" | "oldest" | "activity" | "mostNotes";

const SORT_KEYS: SortKey[] = ["newest", "oldest", "activity", "mostNotes"];

// Latest of the idea itself or its newest note
function lastActivity(idea: Idea) {
  const lastNote = idea.notes[idea.notes.length - 1];
  return Math.max(
    new Date(idea.createdAt).getTime(),
    lastNote ? new Date(lastNote.createdAt).getTime() : 0,
  );
}

export function IdeasBrowser({
  ideas,
  userId,
  isOwner,
}: {
  ideas: Idea[];
  userId: string;
  isOwner: boolean;
}) {
  const t = useTranslations("ideas");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("newest");

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();

    // Match against the idea text, authors, and every note
    const filtered = q
      ? ideas.filter((idea) =>
          [
            idea.title,
            idea.description ?? "",
            idea.author?.name ?? "",
            ...idea.notes.flatMap((n) => [n.content, n.author?.name ?? ""]),
          ].some((text) => text.toLowerCase().includes(q)),
        )
      : ideas;

    return [...filtered].sort((a, b) => {
      switch (sort) {
        case "oldest":
          return (
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
        case "activity":
          return lastActivity(b) - lastActivity(a);
        case "mostNotes":
          return b.notes.length - a.notes.length;
        default:
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
      }
    });
  }, [ideas, query, sort]);

  return (
    <div className="flex flex-col gap-4">
      {/* Search and sort controls */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2" />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("searchPlaceholder")}
            aria-label={t("searchPlaceholder")}
            className="pl-8"
          />
        </div>
        <Select value={sort} onValueChange={(v) => v && setSort(v as SortKey)}>
          <SelectTrigger className="w-full sm:w-52" aria-label={t("sortLabel")}>
            <SelectValue>{t(`sort.${sort}`)}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {SORT_KEYS.map((key) => (
              <SelectItem key={key} value={key}>
                {t(`sort.${key}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* No matches state */}
      {visible.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t("noResults")}</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {visible.map((idea) => (
            <IdeaCard
              key={idea.id}
              idea={idea}
              userId={userId}
              isOwner={isOwner}
            />
          ))}
        </div>
      )}
    </div>
  );
}
