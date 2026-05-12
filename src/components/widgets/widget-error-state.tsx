import { AlertTriangle } from "lucide-react";

export function WidgetErrorState({ message }: { message: string }) {
  return (
    <div className="rounded-[24px] border border-[#F1D5D8] bg-[#FFF8F8] px-5 py-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 size-4 text-[#B42318]" />
        <div>
          <p className="text-sm font-medium text-[#18181B]">Unable to load widget</p>
          <p className="mt-1 text-sm text-[#71717A]">{message}</p>
        </div>
      </div>
    </div>
  );
}
