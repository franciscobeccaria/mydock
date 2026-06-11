"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Lock } from "lucide-react";
import useEmblaCarousel from "embla-carousel-react";
import { useQuery } from "@tanstack/react-query";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectIcon,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProviderIcon } from "@/components/widgets/provider-icon";
import { CONNECT_PATH } from "@/features/integrations/connect-paths";
import {
  APP_GROUPS,
  CATALOG_BY_ID,
  type AppGroup,
  type SlotId,
  type WidgetCatalogEntry,
} from "@/components/widgets/widget-catalog";
import {
  CONFIG_KEY,
  fetchWidget,
  getWidgetPayload,
  renderWidget,
  WIDGET_TITLE,
  widgetQueryKey,
  widgetStaleTime,
} from "@/components/widgets/widget-render";
import { cn } from "@/lib/utils";

/** A connectable account shown in the catalog's account dropdown. */
export type WidgetAccount = {
  id: string | null;
  label: string;
  /** Display name for the avatar fallback initials; falls back to the label. */
  name?: string | null;
  /** Profile image (e.g. Google avatar); omitted → letter-fallback avatar. */
  avatarUrl?: string | null;
};

// Sentinel select value for the default (login) account, whose id is `null`.
const DEFAULT_ACCOUNT = "__default__";

// Up to this many widget cards fit per app section before the rest spill into a
// carousel page. Each card is a fixed square, so the section height stays fixed.
const VISIBLE_PER_PAGE = 3;

// Card sizing, shared by the grid and the carousel so every card is identical and
// sits on the same axis. Width fills 1/3 of the row (3 across, gap-3 = 0.75rem
// gaps); height is fixed so cards are consistent rectangles.
const CARD_WIDTH = "w-[calc((100%-1.5rem)/3)]";
const CARD_HEIGHT = "h-[150px]";

// When the catalog is small we show disconnected providers' widgets disabled with
// a connect CTA. Flip to true to hide them once there are many widgets.
const LOCKED_WIDGETS_HIDDEN = false;

export function WidgetCatalogDialog({
  open,
  onOpenChange,
  accounts,
  addedByApp,
  connectedByProvider,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Connectable accounts; the login account plus any extra connections. */
  accounts: WidgetAccount[];
  /** Instances already on the dashboard, keyed by appId, for the "N added" badge. */
  addedByApp: Record<string, number>;
  /** Whether each app group's backing provider is connected; locks the rest. */
  connectedByProvider: Record<string, boolean>;
  onAdd: (slotId: SlotId, accountId: string | null) => void;
}) {
  // The widget chosen for the preview step; null while browsing the list.
  const [selected, setSelected] = useState<SlotId | null>(null);
  const [accountValue, setAccountValue] = useState(DEFAULT_ACCOUNT);

  // Reset the in-progress selection as the dialog closes (event-driven, not an
  // effect) so it reopens clean on the list step.
  function handleOpenChange(next: boolean) {
    if (!next) {
      setSelected(null);
      setAccountValue(DEFAULT_ACCOUNT);
    }
    onOpenChange(next);
  }

  function commit() {
    if (!selected) return;
    onAdd(selected, accountValue === DEFAULT_ACCOUNT ? null : accountValue);
    handleOpenChange(false);
  }

  const selectedEntry = selected ? CATALOG_BY_ID[selected] : null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-2xl">
        {selectedEntry ? (
          <PreviewStep
            entry={selectedEntry}
            accounts={accounts}
            accountValue={accountValue}
            onAccountChange={setAccountValue}
            onBack={() => setSelected(null)}
            onAdd={commit}
          />
        ) : (
          <ListStep
            addedByApp={addedByApp}
            connectedByProvider={connectedByProvider}
            onSelect={setSelected}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ── Step 1: browse widgets, grouped by app, as square cards ───────────────── */

function ListStep({
  addedByApp,
  connectedByProvider,
  onSelect,
}: {
  addedByApp: Record<string, number>;
  connectedByProvider: Record<string, boolean>;
  onSelect: (slotId: SlotId) => void;
}) {
  return (
    <>
      <DialogHeader className="border-b border-[#F0F0F2] px-6 py-5">
        <DialogTitle className="text-lg">Add a widget</DialogTitle>
        <DialogDescription>
          Choose widgets from your connected apps. Add more than one of the same widget to
          track different projects or accounts side by side.
        </DialogDescription>
      </DialogHeader>

      <ScrollArea className="max-h-[60vh]">
        <div className="flex flex-col gap-8 px-6 py-5">
          {APP_GROUPS.map((group) => {
            const connected = connectedByProvider[group.provider] ?? false;
            // Hide disconnected groups entirely when the flag is on.
            if (!connected && LOCKED_WIDGETS_HIDDEN) return null;
            return (
              <AppSection
                key={group.id}
                group={group}
                added={addedByApp[group.id] ?? 0}
                connected={connected}
                onSelect={onSelect}
              />
            );
          })}
        </div>
      </ScrollArea>
    </>
  );
}

function AppSection({
  group,
  added,
  connected,
  onSelect,
}: {
  group: AppGroup;
  added: number;
  connected: boolean;
  onSelect: (slotId: SlotId) => void;
}) {
  const widgets = group.widgets;
  const usesCarousel = widgets.length > VISIBLE_PER_PAGE;

  return (
    <section className="flex flex-col gap-3">
      {/* App section header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex size-6 items-center justify-center rounded-md bg-[#F4F4F5]">
            <ProviderIcon provider={group.provider} className="size-3.5" />
          </div>
          <h3 className="text-xs font-semibold tracking-wide text-[#71717A] uppercase">
            {group.label}
          </h3>
        </div>
        {added > 0 ? (
          <span className="text-[11px] font-medium text-[#A1A1AA]">{added} added</span>
        ) : null}
      </div>

      {!connected ? (
        // Disconnected provider: every widget is locked behind a connect CTA.
        <div className="-mx-1 flex flex-wrap gap-3 px-1">
          {widgets.map((widget, i) => (
            <LockedWidgetCard key={i} widget={widget} label={group.label} />
          ))}
        </div>
      ) : usesCarousel ? (
        <WidgetCarousel widgets={widgets} onSelect={onSelect} />
      ) : (
        // -mx-1 + px-1 give cards 4px breathing room (so hover borders/shadows
        // aren't clipped) without shifting the row off the section edge.
        <div className="-mx-1 flex flex-wrap gap-3 px-1">
          {widgets.map((widget, i) => (
            <WidgetCardOption key={i} widget={widget} onSelect={onSelect} />
          ))}
        </div>
      )}
    </section>
  );
}

/**
 * A locked widget card: same footprint as WidgetCardOption but greyed and not
 * addable. Its CTA deep-links to the provider's connect flow (/connections for
 * Linear, Google OAuth start for Google apps). Ported from the connections preview.
 */
function LockedWidgetCard({
  widget,
  label,
}: {
  widget: WidgetCatalogEntry;
  label: string;
}) {
  return (
    <div
      className={cn(
        "flex shrink-0 flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed border-[#E7E7EA] bg-[#FAFAFA] p-4 text-center",
        CARD_WIDTH,
        CARD_HEIGHT,
      )}
    >
      <div className="flex size-7 items-center justify-center rounded-lg bg-white">
        <Lock className="size-3.5 text-[#A1A1AA]" />
      </div>
      <p className="text-sm font-semibold text-[#A1A1AA]">{widget.label}</p>
      <a
        href={CONNECT_PATH[widget.provider]}
        className="mt-1 rounded-full bg-[#18181B] px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90"
      >
        Connect {label} →
      </a>
    </div>
  );
}

/** A square, fully-clickable widget option card. */
function WidgetCardOption({
  widget,
  onSelect,
}: {
  widget: WidgetCatalogEntry;
  onSelect: (slotId: SlotId) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(widget.id)}
      className={cn(
        "flex shrink-0 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-2xl border border-[#E7E7EA] p-4 text-center transition-colors hover:border-[#18181B] hover:bg-[#FAFAFA] focus-visible:border-[#18181B] focus-visible:outline-none",
        CARD_WIDTH,
        CARD_HEIGHT,
      )}
    >
      <p className="text-sm font-semibold text-[#18181B]">{widget.label}</p>
      <p className="line-clamp-3 text-xs text-[#71717A]">{widget.description}</p>
    </button>
  );
}

/** Embla carousel of square cards (3 per page) with page dots + arrows. */
function WidgetCarousel({
  widgets,
  onSelect,
}: {
  widgets: WidgetCatalogEntry[];
  onSelect: (slotId: SlotId) => void;
}) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ align: "start", containScroll: "trimSnaps" });
  // Three cards per page; the page list is known from the card count, no effect needed.
  const pages = Array.from(
    { length: Math.ceil(widgets.length / VISIBLE_PER_PAGE) },
    (_, i) => i,
  );
  const [current, setCurrent] = useState(0);

  // Track the active page from embla's own scroll events (no synchronous
  // setState in the effect body — current starts at 0, correct on mount).
  useEffect(() => {
    if (!emblaApi) return;
    const onSelectSnap = () => setCurrent(emblaApi.selectedScrollSnap());
    emblaApi.on("select", onSelectSnap);
    emblaApi.on("reInit", onSelectSnap);
    return () => {
      emblaApi.off("select", onSelectSnap);
      emblaApi.off("reInit", onSelectSnap);
    };
  }, [emblaApi]);

  return (
    <div className="relative">
      {/* -mx-1 + px-1: 4px inset so cards' hover borders aren't clipped by the
          viewport's overflow-hidden, without shifting the carousel off-edge. */}
      <div className="-mx-1 overflow-hidden px-1" ref={emblaRef}>
        <div className="flex gap-3">
          {widgets.map((widget, i) => (
            // Each slide is exactly one fixed-size card, so cards in the carousel
            // match the grid cards 1:1 (same size, same axis).
            <WidgetCardOption key={i} widget={widget} onSelect={onSelect} />
          ))}
        </div>
      </div>

      <CarouselArrow
        direction="prev"
        disabled={current === 0}
        onClick={() => emblaApi?.scrollPrev()}
      />
      <CarouselArrow
        direction="next"
        disabled={current === pages.length - 1}
        onClick={() => emblaApi?.scrollNext()}
      />

      {pages.length > 1 ? (
        <div className="mt-3 flex items-center justify-center gap-1.5">
          {pages.map((page) => (
            <button
              key={page}
              type="button"
              aria-label={`Go to page ${page + 1}`}
              onClick={() => emblaApi?.scrollTo(page)}
              className={cn(
                "size-1.5 cursor-pointer rounded-full transition-colors",
                page === current ? "bg-[#18181B]" : "bg-[#D4D4D8]",
              )}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function CarouselArrow({
  direction,
  disabled,
  onClick,
}: {
  direction: "prev" | "next";
  disabled: boolean;
  onClick: () => void;
}) {
  const Icon = direction === "prev" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      aria-label={direction === "prev" ? "Previous" : "Next"}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "absolute top-1/2 z-10 flex size-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-[#E7E7EA] bg-white text-[#71717A] shadow-sm transition-opacity",
        direction === "prev" ? "-left-3" : "-right-3",
        disabled ? "pointer-events-none opacity-0" : "hover:text-[#18181B]",
      )}
    >
      <Icon className="size-4" />
    </button>
  );
}

/* ── Step 2: preview the selected widget + pick an account ─────────────────── */

function PreviewStep({
  entry,
  accounts,
  accountValue,
  onAccountChange,
  onBack,
  onAdd,
}: {
  entry: WidgetCatalogEntry;
  accounts: WidgetAccount[];
  accountValue: string;
  onAccountChange: (value: string) => void;
  onBack: () => void;
  onAdd: () => void;
}) {
  const group = APP_GROUPS.find((g) => g.id === entry.appId);
  const selectedAccount =
    accounts.find((a) => (a.id ?? DEFAULT_ACCOUNT) === accountValue) ?? accounts[0];

  return (
    <>
      <DialogHeader className="border-b border-[#F0F0F2] px-6 py-5">
        <button
          type="button"
          onClick={onBack}
          className="mb-1 flex items-center gap-1 self-start text-xs font-medium text-[#71717A] transition-colors hover:text-[#18181B]"
        >
          <ChevronLeft className="size-3.5" />
          All widgets
        </button>
        <div className="flex items-center gap-2">
          <div className="flex size-6 items-center justify-center rounded-md bg-[#F4F4F5]">
            <ProviderIcon provider={entry.provider} className="size-3.5" />
          </div>
          <span className="text-xs font-semibold tracking-wide text-[#71717A] uppercase">
            {group?.label}
          </span>
        </div>
        <DialogTitle className="text-lg">{entry.label}</DialogTitle>
        <DialogDescription>{entry.description}</DialogDescription>
      </DialogHeader>

      <div className="flex flex-col gap-4 px-6 py-5">
        {/* Live preview of the real widget, non-interactive. */}
        <div className="pointer-events-none select-none">
          <WidgetPreview slotId={entry.id} />
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-[#71717A]">Account</span>
          <Select value={accountValue} onValueChange={(v) => onAccountChange(String(v))}>
            <SelectTrigger className="h-10 w-full text-sm">
              {/* Render the trigger content directly (not via SelectValue's
                  render function): the function form rebuilds the subtree on
                  every render, remounting the Avatar.Image so it resets to the
                  fallback before the profile image can load. A stable child keeps
                  the image mounted. */}
              <SelectValue>
                {selectedAccount ? <AccountOption account={selectedAccount} /> : null}
              </SelectValue>
              <SelectIcon />
            </SelectTrigger>
            <SelectContent>
              {accounts.map((account) => (
                <SelectItem key={account.id ?? DEFAULT_ACCOUNT} value={account.id ?? DEFAULT_ACCOUNT}>
                  <AccountOption account={account} />
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center justify-end border-t border-[#F0F0F2] px-6 py-4">
        <Button size="sm" onClick={onAdd}>
          Add widget
        </Button>
      </div>
    </>
  );
}

/** Build up to two initials for the letter-fallback avatar. */
function accountInitials(account: WidgetAccount) {
  const source = account.name ?? account.label;
  return (
    source
      .split(/[\s@.]+/)
      .filter(Boolean)
      .map((p) => p[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?"
  );
}

/** An account row — avatar (profile image or letter fallback) + label — shared
 *  by the select trigger and each select item. */
function AccountOption({ account }: { account: WidgetAccount }) {
  return (
    <span className="flex min-w-0 items-center gap-2">
      <Avatar className="size-6 rounded-full">
        {account.avatarUrl ? (
          <AvatarImage
            src={account.avatarUrl}
            alt={account.name ?? account.label}
            // Google avatar hosts can 403 on a cross-origin referrer; suppress it.
            referrerPolicy="no-referrer"
          />
        ) : null}
        {/* Delay the fallback so it doesn't flash before the image resolves. */}
        <AvatarFallback delay={300} className="rounded-full text-[10px]">
          {accountInitials(account)}
        </AvatarFallback>
      </Avatar>
      <span className="truncate">{account.label}</span>
    </span>
  );
}

/**
 * Fetches the slot's payload (same query as the dashboard, so it's cache-shared)
 * and renders the real widget component as a static preview. Header controls are
 * hidden — the parent makes the whole preview non-interactive.
 */
function WidgetPreview({ slotId }: { slotId: SlotId }) {
  const provider = CATALOG_BY_ID[slotId].provider;
  const gmailView = CONFIG_KEY[slotId] === "gmail-view" ? "all" : undefined;

  const query = useQuery({
    queryKey: widgetQueryKey(slotId, gmailView),
    queryFn: () => fetchWidget(provider, gmailView),
    staleTime: widgetStaleTime(provider),
    gcTime: 15 * 60_000,
  });

  return (
    <div className="rounded-[20px]">
      {renderWidget(slotId, getWidgetPayload(provider, WIDGET_TITLE[slotId], query.data, query.error), {})}
    </div>
  );
}
