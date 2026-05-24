export function ProductCardSkeleton() {
  return (
    <div className="flex h-full w-full flex-col">
      <div className="aspect-[4/5] w-full animate-pulse overflow-hidden rounded-2xl bg-muted" />
      <div className="mt-4 space-y-2">
        <div className="h-2.5 w-1/3 animate-pulse rounded bg-muted" />
        <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
        <div className="h-3 w-1/4 animate-pulse rounded bg-muted" />
      </div>
    </div>
  );
}

export function ProductCardSkeletonGrid({
  count = 8,
  className = "grid grid-cols-2 gap-x-4 gap-y-12 md:grid-cols-2 md:gap-x-6 lg:grid-cols-3",
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div className={className}>
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}