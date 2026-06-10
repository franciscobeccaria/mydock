import { AlertTriangle, RotateCw } from "lucide-react";

export function WidgetErrorState({
  message,
  onRetry,
  isRetrying,
}: {
  message: string;
  onRetry?: () => void;
  isRetrying?: boolean;
}) {
  return (
    <div className="rounded-[18px] border border-[#F1D5D8] bg-[#FFF8F8] px-4 py-3">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 size-4 text-[#B42318]" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-[#18181B]">Unable to load widget</p>
          <p className="mt-1 text-xs text-[#71717A]">{message}</p>
          {onRetry ? (
            <button
              type="button"
              data-interactive="true"
              onClick={onRetry}
              disabled={isRetrying}
              className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg border border-[#F1D5D8] bg-white px-2.5 py-1 text-xs font-medium text-[#B42318] transition-colors hover:bg-[#FFF0F0] disabled:opacity-60"
            >
              <RotateCw className={isRetrying ? "size-3.5 animate-spin" : "size-3.5"} />
              {isRetrying ? "Retrying…" : "Try again"}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
