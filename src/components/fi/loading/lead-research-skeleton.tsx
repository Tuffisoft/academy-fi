import { Card, CardAction, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CardHeadingSkeleton, PageSkeleton } from "./skeleton-parts";

function TableSkeleton({ columns, rows }: { columns: number; rows: number }) {
  return <Table>
    <TableHeader><TableRow>{Array.from({ length: columns }, (_, col) => <TableHead key={col}><Skeleton className="h-4 w-20" /></TableHead>)}</TableRow></TableHeader>
    <TableBody>{Array.from({ length: rows }, (_, row) => <TableRow key={row}>
      {Array.from({ length: columns }, (_, col) => <TableCell key={col} className="py-4"><Skeleton className="h-4 w-20" /></TableCell>)}
    </TableRow>)}</TableBody>
  </Table>;
}

export function LeadResearchSkeleton() {
  return <PageSkeleton responsivePadding>
    <div className="flex min-w-0 flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
        <div className="flex flex-wrap gap-1">{[0, 1, 2, 3, 4].map((index) => <Skeleton key={index} className="h-8 w-24" />)}</div>
        <Skeleton className="h-8 w-36" />
      </div>
      <div className="flex flex-wrap items-center gap-2"><Skeleton className="h-5 w-20 rounded-full" /><Skeleton className="h-4 w-full max-w-lg" /></div>
      <div className="grid gap-4 sm:grid-cols-3">{[0, 1, 2].map((index) => <Card key={index}>
        <CardHeader><Skeleton className="h-5 w-28" /><CardAction><Skeleton className="size-4" /></CardAction><Skeleton className="h-9 w-16" /></CardHeader>
        <CardFooter><Skeleton className="h-4 w-full max-w-48" /></CardFooter>
      </Card>)}</div>
      <Card><CardHeadingSkeleton action /><CardContent><TableSkeleton columns={5} rows={3} /></CardContent></Card>
      <div className="grid min-w-0 gap-4 lg:grid-cols-3">
        <Card className="min-w-0 lg:col-span-2"><CardHeadingSkeleton action /><CardContent><TableSkeleton columns={6} rows={4} /></CardContent><CardFooter><Skeleton className="h-7 w-36" /></CardFooter></Card>
        <Card><CardHeadingSkeleton /><CardContent className="flex flex-1 flex-col gap-6">
          <Skeleton className="min-h-36 flex-1 rounded-lg" />
          <div className="space-y-3">{[0, 1, 2, 3].map((index) => <div key={index} className="flex justify-between gap-3"><Skeleton className="h-5 w-28" /><Skeleton className="h-5 w-6 rounded-full" /></div>)}</div>
        </CardContent></Card>
      </div>
    </div>
  </PageSkeleton>;
}
