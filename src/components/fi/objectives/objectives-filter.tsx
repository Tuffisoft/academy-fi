"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type ObjectiveItem = {
  id: string;
  internId: string;
  internName: string;
  status: "open" | "finished";
  // Lowercased text from the assignment, tasks and stages, built on the server
  searchText: string;
  // Card rendered on the server so role-based variants stay server-side
  card: ReactNode;
};

type StatusFilter = "all" | "open" | "finished";

const STATUS_FILTERS: StatusFilter[] = ["all", "open", "finished"];
const ALL_INTERNS = "all";

export function ObjectivesFilter({ items }: { items: ObjectiveItem[] }) {
  const t = useTranslations("objectives");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [internId, setInternId] = useState(ALL_INTERNS);

  const interns = useMemo(() => {
    const byId = new Map<string, string>();
    for (const item of items) byId.set(item.internId, item.internName);
    return [...byId].map(([id, name]) => ({ id, name }));
  }, [items]);

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matching = items.filter(
      (item) =>
        (status === "all" || item.status === status) &&
        (internId === ALL_INTERNS || item.internId === internId) &&
        (!q || item.searchText.includes(q)),
    );

    // Group by intern, keeping the incoming order
    const grouped = new Map<string, { name: string; items: ObjectiveItem[] }>();
    for (const item of matching) {
      const group = grouped.get(item.internId) ?? {
        name: item.internName,
        items: [],
      };
      group.items.push(item);
      grouped.set(item.internId, group);
    }
    return [...grouped].map(([id, group]) => ({ id, ...group }));
  }, [items, query, status, internId]);

  const selectedInternName =
    interns.find((i) => i.id === internId)?.name ?? t("filters.allInterns");

  return (
    <div className="flex flex-col gap-6">
      {/* Search and filter controls */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2" />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("filters.searchPlaceholder")}
            aria-label={t("filters.searchPlaceholder")}
            className="pl-8"
          />
        </div>
        <Select value={internId} onValueChange={(v) => v && setInternId(v)}>
          <SelectTrigger
            className="w-full lg:w-52"
            aria-label={t("filters.internLabel")}
          >
            <SelectValue>{selectedInternName}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_INTERNS}>
              {t("filters.allInterns")}
            </SelectItem>
            {interns.map((intern) => (
              <SelectItem key={intern.id} value={intern.id}>
                {intern.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex gap-1">
          {STATUS_FILTERS.map((key) => (
            <Button
              key={key}
              size="sm"
              variant={status === key ? "default" : "outline"}
              onClick={() => setStatus(key)}
            >
              {t(`filters.status.${key}`)}
            </Button>
          ))}
        </div>
      </div>

      {/* No matches state */}
      {groups.length === 0 && (
        <p className="text-muted-foreground text-sm">
          {t("filters.noResults")}
        </p>
      )}

      {groups.map((group) => (
        <div key={group.id} className="flex flex-col gap-3">
          <h2 className="text-xl font-semibold">{group.name}</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {group.items.map((item) => (
              <div key={item.id} className="contents">
                {item.card}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
