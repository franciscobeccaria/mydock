import { Inbox } from "lucide-react";

export function WidgetEmptyState({ message }: { message: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center rounded-[18px] border border-dashed border-[#E5E7EB] bg-[#FCFCFC] px-5 py-8 text-center">
      <Inbox className="mb-2 size-6 text-[#A1A1AA]" />
      <p className="max-w-sm text-xs text-[#71717A]">{message}</p>
    </div>
  );
}
