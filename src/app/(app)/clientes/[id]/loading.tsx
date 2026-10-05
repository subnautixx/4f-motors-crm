import { Skeleton, SkeletonPageHeader } from "@/components/ui/skeleton";

/** Mesmo esqueleto da ficha: carro e etapa em cima, linha do tempo e situação embaixo. */
export default function ClienteLoading() {
  return (
    <>
      <SkeletonPageHeader />
      <div className="min-h-0 flex-1 overflow-hidden">
        <div className="mx-auto max-w-5xl space-y-4 p-4 sm:space-y-6 sm:p-6">
          <Skeleton className="h-[370px] rounded-lg sm:h-[264px]" />
          <div className="grid gap-4 sm:gap-6 lg:grid-cols-3">
            <Skeleton className="h-72 rounded-lg lg:col-span-2" />
            <Skeleton className="h-72 rounded-lg" />
          </div>
        </div>
      </div>
    </>
  );
}
