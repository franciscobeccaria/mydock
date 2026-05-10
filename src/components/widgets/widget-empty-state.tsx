import { Inbox } from "lucide-react";

export function WidgetEmptyState({ message }: { message: string }) {
  return (
    <div className="border-border/70 flex flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-10 text-center">
      <Inbox className="text-muted-foreground mb-3 size-8" />
      <p className="text-muted-foreground max-w-sm text-sm">{message}</p>
    </div>
  );
}
