import { Inbox } from "lucide-react";

export function WidgetEmptyState({ message }: { message: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center rounded-[24px] border border-dashed border-[#E5E7EB] bg-[#FCFCFC] px-6 py-10 text-center">
      <Inbox className="mb-3 size-8 text-[#A1A1AA]" />
      <p className="max-w-sm text-sm text-[#71717A]">{message}</p>
    </div>
  );
}
