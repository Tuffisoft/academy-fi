export function qualityTone(score: number | null | undefined) {
  if (score == null || !Number.isFinite(score) || score < 0 || score > 100) return "unknown";
  return score >= 70 ? "good" : score >= 40 ? "medium" : "poor";
}

export const qualityStyles = {
  good: {
    text: "text-emerald-700 dark:text-emerald-400",
    surface: "border-emerald-600/25 bg-emerald-500/10",
    badge: "border-emerald-600/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  },
  medium: {
    text: "text-yellow-800 dark:text-yellow-300",
    surface: "border-yellow-600/30 bg-yellow-500/10",
    badge: "border-yellow-600/30 bg-yellow-500/10 text-yellow-800 dark:text-yellow-300",
  },
  poor: {
    text: "text-red-700 dark:text-red-400",
    surface: "border-red-600/25 bg-red-500/10",
    badge: "border-red-600/25 bg-red-500/10 text-red-700 dark:text-red-400",
  },
  unknown: {
    text: "text-muted-foreground",
    surface: "border-border bg-muted/30",
    badge: "border-border bg-muted text-muted-foreground",
  },
} as const;
