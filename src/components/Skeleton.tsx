'use client';

export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-gradient-to-r from-[#E5E7EB] via-[#F3F5F8] to-[#E5E7EB] bg-[length:200%_100%] animate-shimmer rounded-xl ${className}`} />
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="w-full aspect-[3/4]" />
      <div className="space-y-2 px-1">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    </div>
  );
}

export function ProductDetailSkeleton() {
  return (
    <div className="min-h-screen pt-24 pb-12 px-6 sm:px-8 lg:px-10 bg-[#F8F9FB]">
      <div className="max-w-7xl mx-auto">
        <div className="lg:grid lg:grid-cols-2 lg:gap-x-16">
          <div className="space-y-4">
            <Skeleton className="w-full aspect-[3/4]" />
          </div>
          <div className="mt-10 lg:mt-0 space-y-6">
            <Skeleton className="h-10 w-3/4" />
            <Skeleton className="h-8 w-1/3" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
