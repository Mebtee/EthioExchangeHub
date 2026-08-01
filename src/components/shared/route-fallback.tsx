import { PageContainer } from "@/components/layout/site-shell";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Shown by <Suspense> while a lazy-loaded route chunk is being fetched.
 * Keeps the layout stable so there is no layout shift on navigation.
 */
export function RouteFallback() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="border-b border-border/60 bg-card">
        <div className="mx-auto flex max-w-[1280px] items-center justify-between px-4 py-4 md:px-12">
          <Skeleton className="h-6 w-32" />
          <div className="hidden gap-7 md:flex">
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-4 w-12" />
          </div>
        </div>
      </div>
      <PageContainer>
        <Skeleton className="h-10 w-2/3 max-w-lg" />
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-36 rounded-2xl" />
          ))}
        </div>
      </PageContainer>
    </div>
  );
}
