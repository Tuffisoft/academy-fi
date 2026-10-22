import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CardHeadingSkeleton, LinkCardSkeleton, LoadingRegion, PageSkeleton, TaskCardSkeleton } from "./skeleton-parts";

export function DashboardSkeleton() {
  return <PageSkeleton title={false}>
    <Card><CardHeadingSkeleton /><CardContent><div className="flex flex-wrap gap-2"><Skeleton className="h-8 w-52" /><Skeleton className="h-8 w-28" /></div></CardContent></Card>
    <LinkCardSkeleton />
    <TaskCardSkeleton />
    {[0, 1, 2, 3].map((index) => <LinkCardSkeleton key={index} />)}
  </PageSkeleton>;
}

export function IdeasSkeleton() {
  return <PageSkeleton action>
    <div className="flex flex-col gap-2 sm:flex-row"><Skeleton className="h-8 flex-1" /><Skeleton className="h-8 w-full sm:w-52" /></div>
    <div className="grid gap-4 md:grid-cols-2">
      {[0, 1, 2, 3].map((index) => <Card key={index}>
        <CardHeadingSkeleton />
        <CardContent className="space-y-3"><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-2/3" /><div className="flex items-center gap-2 pt-3"><Skeleton className="size-6 rounded-full" /><Skeleton className="h-4 w-24" /></div></CardContent>
      </Card>)}
    </div>
  </PageSkeleton>;
}

export function ObjectivesSkeleton() {
  return <PageSkeleton>
    <LinkCardSkeleton />
    <div className="flex flex-col gap-3 lg:flex-row"><Skeleton className="h-8 flex-1" /><Skeleton className="h-8 w-full lg:w-44" /><Skeleton className="h-8 w-full lg:w-44" /></div>
    <Skeleton className="h-6 w-36" />
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{[0, 1, 2].map((index) => <TaskCardSkeleton key={index} />)}</div>
  </PageSkeleton>;
}

export function LearningSkeleton() {
  return <PageSkeleton>
    <Card><CardHeadingSkeleton action /><CardContent className="flex flex-col gap-4">
      {[0, 1, 2].map((index) => <div key={index} className="space-y-3 rounded-xl border p-4">
        <Skeleton className="h-7 w-44 max-w-full" /><Skeleton className="h-5 w-full max-w-lg" />
        <Skeleton className="h-4 w-52 max-w-full" /><Skeleton className="h-4 w-44 max-w-full" />
        <div className="flex flex-wrap gap-2 pt-1"><Skeleton className="h-8 w-28" /><Skeleton className="h-8 w-32" /></div>
      </div>)}
    </CardContent></Card>
  </PageSkeleton>;
}

export function DailyPlannerSkeleton() {
  return <PageSkeleton>
    <div className="flex flex-wrap items-center gap-2"><Skeleton className="size-8" /><Skeleton className="h-8 w-44" /><Skeleton className="size-8" /><Skeleton className="h-8 w-16" /></div>
    <Card><CardHeader><Skeleton className="h-10 w-full" /><Skeleton className="h-5 w-36" /></CardHeader>
      <CardContent className="space-y-4">
        {[0, 1, 2].map((row) => <div key={row} className="flex items-center gap-3 rounded-lg border p-3"><Skeleton className="size-4 shrink-0" /><Skeleton className="h-5 w-2/3" /></div>)}
        <div className="flex gap-2"><Skeleton className="h-8 flex-1" /><Skeleton className="h-8 w-28" /></div>
      </CardContent>
    </Card>
    <div className="flex flex-col gap-3"><Skeleton className="h-7 w-24" />{[0, 1, 2].map((row) => <div key={row} className="flex items-center justify-between rounded-md border px-4 py-3"><div className="space-y-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-5 w-44" /></div><Skeleton className="h-4 w-12" /></div>)}</div>
  </PageSkeleton>;
}

export function AssignmentsSkeleton() {
  return <PageSkeleton header={false} title={false}>
    <Card><CardHeadingSkeleton /></Card>
    {[0, 1, 2].map((index) => <Card key={index}><CardHeadingSkeleton action /><CardContent><Skeleton className="h-2 w-full rounded-full" /></CardContent></Card>)}
  </PageSkeleton>;
}

export function AuthSkeleton() {
  return <LoadingRegion><div className="flex flex-1 items-center justify-center px-4 py-32">
    <Card className="w-full max-w-sm"><CardHeadingSkeleton /><CardContent className="space-y-6">
      {[0, 1].map((index) => <div key={index} className="space-y-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-8 w-full" /></div>)}
      <Skeleton className="h-8 w-full" />
    </CardContent></Card>
  </div></LoadingRegion>;
}

export function PresentationSkeleton() {
  return <PageSkeleton header={false} title={false}>
    <div className="flex items-center justify-between gap-4"><Skeleton className="h-8 w-44" /><div className="flex gap-2">{[0, 1, 2].map((index) => <Skeleton key={index} className="size-8" />)}</div></div>
    <div className="flex flex-1 items-center justify-center"><Card className="aspect-video w-full"><CardContent className="flex h-full flex-1 flex-col items-center justify-center gap-6 p-8"><Skeleton className="size-20 rounded-xl" /><Skeleton className="h-10 w-2/3" /><Skeleton className="h-5 w-1/2" /></CardContent></Card></div>
  </PageSkeleton>;
}

export function HomeSkeleton() {
  return <LoadingRegion><div className="flex flex-1 items-center justify-center"><Skeleton className="size-50" /></div></LoadingRegion>;
}
