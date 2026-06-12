interface SkeletonGridProps {
  count?: number;
  cols?: number;
}

export default function SkeletonGrid({ count = 4, cols = 4 }: SkeletonGridProps) {
  const gridCols = cols > count ? count : cols;
  return (
    <div
      className="grid gap-6"
      style={{ gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))` }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="animate-pulse">
          <div className="aspect-[3/4] rounded-2xl bg-gray-200 mb-3" />
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
          <div className="h-3 bg-gray-200 rounded w-1/2" />
        </div>
      ))}
    </div>
  );
}
