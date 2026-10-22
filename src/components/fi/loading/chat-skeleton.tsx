import { Skeleton } from "@/components/ui/skeleton";
import { HeaderSkeleton, LoadingRegion } from "./skeleton-parts";

export function ChatSkeleton({ withHeader = false }: { withHeader?: boolean }) {
  return <LoadingRegion className={withHeader ? "h-dvh flex-none overflow-hidden" : "min-h-0 overflow-hidden"}>
    {withHeader && <HeaderSkeleton />}
    <div className="mx-auto flex min-h-0 w-full max-w-[1440px] flex-1 flex-col overflow-hidden px-0 py-2 md:px-5 md:py-4">
      <div className="mb-2 flex justify-between gap-2 px-3 md:px-1"><Skeleton className="h-5 w-28" /><Skeleton className="h-4 w-24" /></div>
      <div className="flex min-h-96 flex-1 flex-col overflow-hidden border-y bg-card md:flex-row md:rounded-2xl md:border md:shadow-lg">
        <div className="flex shrink-0 justify-around gap-3 border-b p-2 md:w-[72px] md:flex-col md:justify-start md:border-r md:border-b-0 md:py-5">
          {[0, 1, 2].map((index) => <Skeleton key={index} className="size-9 rounded-full" />)}
        </div>
        <div className="flex w-full shrink-0 flex-col gap-4 p-4 md:w-80 md:border-r">
          <div className="flex justify-between"><Skeleton className="h-6 w-32" /><Skeleton className="size-8" /></div>
          <Skeleton className="h-8 w-full" />
          {[0, 1, 2, 3].map((index) => <div key={index} className="flex items-center gap-3 py-2"><Skeleton className="size-10 shrink-0 rounded-full" /><div className="flex-1 space-y-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-4 w-full" /></div></div>)}
        </div>
        <div className="hidden flex-1 flex-col items-center justify-center gap-3 p-6 md:flex"><Skeleton className="size-14 rounded-full" /><Skeleton className="h-6 w-44" /><Skeleton className="h-4 w-60 max-w-full" /></div>
      </div>
    </div>
  </LoadingRegion>;
}
