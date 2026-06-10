"use client";

import { useDashboardMode } from "@/components/dashboard/dashboard-mode-context";
import { ProviderIcon } from "@/components/widgets/provider-icon";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Provider } from "@/features/integrations/types";

/**
 * The icon + title (+ optional badge) cluster shared by both header modes.
 * When `titleHref` is set the icon and title become an external link; otherwise
 * it renders as plain, non-interactive header content.
 */
function TitleBrand({
  provider,
  title,
  titleHref,
  headerBadge,
  iconWrapperClassName,
  iconClassName,
  titleClassName,
}: {
  provider: Provider;
  title: string;
  titleHref?: string;
  headerBadge?: React.ReactNode;
  iconWrapperClassName: string;
  iconClassName?: string;
  titleClassName: string;
}) {
  const brand = (
    <>
      <div
        className={cn(
          "flex shrink-0 items-center justify-center bg-[#F4F4F5]",
          iconWrapperClassName,
        )}
      >
        <ProviderIcon provider={provider} className={iconClassName} />
      </div>
      <div className="flex min-w-0 items-baseline gap-1.5">
        <CardTitle className={titleClassName}>{title}</CardTitle>
        {headerBadge ? <div className="shrink-0">{headerBadge}</div> : null}
      </div>
    </>
  );

  if (titleHref) {
    return (
      <a
        href={titleHref}
        target="_blank"
        rel="noreferrer"
        data-no-drag
        data-interactive="true"
        className="flex min-w-0 items-center gap-1.5 rounded-md outline-none transition-opacity hover:opacity-70 focus-visible:opacity-70"
      >
        {brand}
      </a>
    );
  }

  return <div className="flex min-w-0 items-center gap-1.5">{brand}</div>;
}

export function WidgetCard({
  provider,
  title,
  titleHref,
  headerControl,
  headerLabel,
  headerBadge,
  children,
  className,
}: {
  provider: Provider;
  title: string;
  /** When set, the title becomes an external link to this URL (e.g. the app's home view). */
  titleHref?: string;
  headerControl?: React.ReactNode;
  /** Selected filter label shown as text in view mode, in place of the select. */
  headerLabel?: string;
  /** Small status shown next to the title in BOTH view and edit modes (e.g. unread count). */
  headerBadge?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  const { isEditing } = useDashboardMode();

  return (
    <Card
      className={cn(
        "flex h-[350px] flex-col rounded-[20px] border border-[#E7E7EA] bg-white py-0 shadow-[0_6px_20px_rgba(17,24,39,0.035)]",
        className,
      )}
    >
      {/* Edit mode: full header — larger app icon, title, and the per-widget select control. */}
      {isEditing ? (
        <CardHeader className="px-3.5 pt-3.5 pb-0 sm:px-4 sm:pt-4">
          <div className="flex items-center justify-between gap-3">
            <TitleBrand
              provider={provider}
              title={title}
              titleHref={titleHref}
              headerBadge={headerBadge}
              iconWrapperClassName="size-8 rounded-[10px]"
              titleClassName="text-sm font-semibold tracking-tight text-[#18181B]"
            />
            {headerControl ? (
              <div className="shrink-0" data-no-drag>
                {headerControl}
              </div>
            ) : null}
          </div>
        </CardHeader>
      ) : (
        /* View mode: subtle, compact header — smaller icon and muted title, less vertical height. */
        <CardHeader className="px-3.5 pt-3 pb-0 sm:px-4">
          <div className="flex items-center justify-between gap-3">
            <TitleBrand
              provider={provider}
              title={title}
              titleHref={titleHref}
              headerBadge={headerBadge}
              iconWrapperClassName="size-5 rounded-md"
              iconClassName="size-3"
              titleClassName="truncate text-xs font-medium tracking-tight text-[#71717A]"
            />
            {headerLabel ? (
              <span className="shrink-0 text-[11px] leading-none whitespace-nowrap text-[#71717A]">
                {headerLabel}
              </span>
            ) : null}
          </div>
        </CardHeader>
      )}

      <CardContent
        className={cn(
          // Horizontal padding lives on the inner wrapper, not here, so the
          // scrollbar sits in the card's edge gap instead of eating the right
          // padding — keeping the content's left/right padding visually equal.
          "scrollbar-subtle min-h-0 flex-1 overflow-y-auto px-0 pb-3.5 sm:pb-4",
          // The header sits closer to the content; both modes use a tight top gap.
          isEditing ? "pt-2.5" : "pt-2",
        )}
      >
        <div className="px-3.5 sm:px-4">{children}</div>
      </CardContent>
    </Card>
  );
}
