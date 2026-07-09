export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-background-elevated ${className}`} />;
}

export function SkeletonReportCard() {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-border-subtle bg-background-card px-5 py-4">
      <div className="w-2/3 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
      <Skeleton className="h-6 w-10 rounded-full" />
    </div>
  );
}
