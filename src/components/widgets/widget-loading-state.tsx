import { Skeleton } from "@/components/ui/skeleton";

export function WidgetLoadingState() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          className="space-y-2 rounded-[22px] border border-[#ECECEF] bg-[#FCFCFC] p-4"
        >
          <Skeleton className="h-4 w-2/3 rounded-full" />
          <Skeleton className="h-3 w-1/2 rounded-full" />
        </div>
      ))}
    </div>
  );
}
