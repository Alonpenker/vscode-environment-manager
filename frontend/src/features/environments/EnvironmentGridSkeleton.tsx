import { Skeleton } from "@/components/ui/skeleton";

function CardSkeleton(): React.ReactElement {
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-surface/80 p-5">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-5 w-24 rounded-full" />
        </div>
        <Skeleton className="h-8 w-8 rounded-md" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-3/4" />
        <Skeleton className="h-3 w-2/3" />
      </div>
      <Skeleton className="mt-2 h-9 w-full rounded-md" />
    </div>
  );
}

function EnvironmentGridSkeleton(): React.ReactElement {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

export default EnvironmentGridSkeleton;
