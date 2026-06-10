import { Skeleton } from "@/components/ui/skeleton";

export function WidgetLoadingState() {
  return (
    <div className="space-y-2 px-1 pt-1">
      {Array.from({ length: 5 }).map((_, index) => (
        <div
          key={index}
          className="space-y-1.5 py-1"
        >
          <Skeleton className="h-3 w-2/3 rounded-full" />
          <Skeleton className="h-2.5 w-1/2 rounded-full" />
        </div>
      ))}
    </div>
  );
}
