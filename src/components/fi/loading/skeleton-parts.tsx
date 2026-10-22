import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Card, CardAction, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function LoadingRegion({ children, className = "" }: { children: ReactNode; className?: string }) {
  const t = useTranslations("common");
  return (
    <div role="status" aria-busy="true" className={`flex min-w-0 flex-1 flex-col ${className}`}>
      <span className="sr-only">{t("loading")}</span>
      <div aria-hidden="true" className="flex min-h-0 min-w-0 flex-1 flex-col">{children}</div>
    </div>
  );
}

export function HeaderSkeleton() {
  return (
    <div className="flex items-center justify-between border-b px-6 py-4">
      <div className="flex items-center gap-2"><Skeleton className="h-6 w-24" /><Skeleton className="h-5 w-14 rounded-full" /></div>
      <div className="flex items-center gap-2"><Skeleton className="size-8" /><Skeleton className="size-8 rounded-full" /></div>
    </div>
  );
}

export function PageSkeleton({ children, header = true, title = true, action = false, responsivePadding = false }: {
  children: ReactNode; header?: boolean; title?: boolean; action?: boolean; responsivePadding?: boolean;
}) {
  return (
    <LoadingRegion>
      {header && <HeaderSkeleton />}
      <div className={`flex min-w-0 flex-1 flex-col gap-6 ${responsivePadding ? "p-4 sm:p-6" : "p-6"}`}>
        <Skeleton className="mb-6 h-5 w-44" />
        {title && <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1 space-y-2"><Skeleton className="h-8 w-52 max-w-full" /><Skeleton className="h-5 w-full max-w-lg" /></div>
          {action && <Skeleton className="h-8 w-28 shrink-0" />}
        </div>}
        {children}
      </div>
    </LoadingRegion>
  );
}

export function CardHeadingSkeleton({ action = false }: { action?: boolean }) {
  return <CardHeader>
    <Skeleton className="h-6 w-40 max-w-full" />
    <Skeleton className="h-5 w-full max-w-80" />
    {action && <CardAction><Skeleton className="h-8 w-28" /></CardAction>}
  </CardHeader>;
}

export function LinkCardSkeleton() {
  return <Card><CardHeadingSkeleton action /></Card>;
}

export function TaskCardSkeleton() {
  return <Card>
    <CardHeadingSkeleton />
    <CardContent className="space-y-4">
      <Skeleton className="h-2 w-full rounded-full" />
      {[0, 1, 2].map((row) => <div key={row} className="flex items-center gap-3"><Skeleton className="size-4 shrink-0" /><Skeleton className="h-4 w-full max-w-64" /></div>)}
    </CardContent>
  </Card>;
}
