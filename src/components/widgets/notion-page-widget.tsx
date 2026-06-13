"use client";

import { useEffect, useRef, useState } from "react";
import { FileText, Loader2 } from "lucide-react";

import { usePickerLock } from "@/components/dashboard/picker-lock-context";
import { WidgetCard } from "@/components/widgets/widget-card";
import { WidgetEmptyState } from "@/components/widgets/widget-empty-state";
import { WidgetErrorState } from "@/components/widgets/widget-error-state";
import { WidgetLoadingState } from "@/components/widgets/widget-loading-state";
import { WidgetNotConnectedState } from "@/components/widgets/widget-not-connected-state";
import {
  Combobox,
  ComboboxContent,
  ComboboxIcon,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import type { WidgetItem, WidgetProps } from "@/features/integrations/types";

type NotionPageOption = { id: string; title: string; emoji: string | null };

const NOTION_HOME = "https://www.notion.so/";

/**
 * Extracts a Notion page id from a pasted page URL or a raw id. Notion ids are
 * 32 hex chars (dashed or not); page URLs end with `...-<32hex>`. Returns the
 * dashed UUID form the API expects, or null if nothing id-like is found.
 */
export function extractNotionPageId(input: string): string | null {
  const cleaned = input.trim();
  if (!cleaned) return null;
  // Drop any query string / fragment, then look at the final path segment — a
  // Notion page id is always the LAST 32 hex chars of the path, with no dashes
  // (the human slug like "12-junio-2026-" precedes it). A raw dashed UUID is
  // also accepted. We must NOT strip all dashes first: that would merge slug
  // digits (e.g. "...2026") with the id and a greedy match could start mid-id.
  const path = cleaned.split(/[?#]/)[0];
  const lastSegment = path.split("/").filter(Boolean).pop() ?? path;
  // Trailing 32 hex chars (the id), tolerating the dashed UUID form too.
  const hex = lastSegment.replace(/-/g, "").match(/[0-9a-fA-F]{32}$/)?.[0];
  if (!hex) return null;
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** Renders one top-level block as compact text, styled by its Notion block type. */
function BlockRow({ item }: { item: WidgetItem }) {
  const blockType = item.metadata?.blockType as string | undefined;
  const checked = item.metadata?.checked as boolean | undefined;
  const emoji = item.metadata?.emoji as string | undefined;

  switch (blockType) {
    case "heading_1":
      return <p className="mt-2 text-sm font-semibold text-[#18181B]">{item.title}</p>;
    case "heading_2":
      return <p className="mt-2 text-[13px] font-semibold text-[#18181B]">{item.title}</p>;
    case "heading_3":
      return <p className="mt-1.5 text-[13px] font-medium text-[#27272A]">{item.title}</p>;
    case "to_do":
      return (
        <p className="flex items-start gap-1.5 text-[13px] text-[#3F3F46]">
          <span className="mt-[1px] shrink-0">{checked ? "☑" : "☐"}</span>
          <span className={checked ? "line-through text-[#A1A1AA]" : ""}>{item.title}</span>
        </p>
      );
    case "bulleted_list_item":
      return (
        <p className="flex items-start gap-1.5 text-[13px] text-[#3F3F46]">
          <span className="mt-[1px] shrink-0">•</span>
          <span>{item.title}</span>
        </p>
      );
    case "numbered_list_item":
      return (
        <p className="flex items-start gap-1.5 text-[13px] text-[#3F3F46]">
          <span className="mt-[1px] shrink-0">–</span>
          <span>{item.title}</span>
        </p>
      );
    case "quote":
      return (
        <p className="border-l-2 border-[#E4E4E7] pl-2 text-[13px] italic text-[#52525B]">
          {item.title}
        </p>
      );
    case "callout":
      return (
        <p className="flex items-start gap-1.5 rounded-md bg-[#F4F4F5] px-2 py-1.5 text-[13px] text-[#3F3F46]">
          {emoji ? <span className="shrink-0">{emoji}</span> : null}
          <span>{item.title}</span>
        </p>
      );
    default:
      return <p className="text-[13px] leading-relaxed text-[#3F3F46]">{item.title}</p>;
  }
}

/**
 * Searchable Notion page picker. Lists the user's shared pages (recent first)
 * and filters by title as you type, via /api/integrations/notion/pages. Picking
 * a row stores its id on the widget instance — no URL pasting. A pasted Notion
 * link/id is still accepted (parsed with extractNotionPageId) so power users can
 * paste directly.
 */
function PagePicker({
  current,
  currentLabel,
  onSet,
}: {
  current?: string;
  /** Title of the pinned page, shown in the trigger like the other widgets' Select value. */
  currentLabel?: string;
  onSet?: (value: string) => void;
}) {
  // We let base-ui own the popup's open state (uncontrolled) — passing a
  // controlled `open` back raced with base-ui's internal dismiss/click
  // coordination and made the popup close-then-reopen on the first outside
  // press. We only OBSERVE open via onOpenChange to drive the page fetch.
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [pages, setPages] = useState<NotionPageOption[]>([]);
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  // Track the latest request so a slow earlier response can't overwrite a newer one.
  const reqIdRef = useRef(0);
  // Tell the grid to suspend its drag sensor while the popup is open, so the
  // dismiss click can't start a dnd-kit drag that bounces focus and reopens it.
  const { setPickerOpen } = usePickerLock();

  // If the picker unmounts while still open, release the lock so the grid's
  // sensor isn't left suspended forever.
  useEffect(() => {
    return () => {
      if (open) setPickerOpen(false);
    };
  }, [open, setPickerOpen]);

  // Fetch on open and on debounced query change.
  useEffect(() => {
    if (!open) return;
    const reqId = ++reqIdRef.current;
    const timer = setTimeout(async () => {
      setState("loading");
      try {
        const params = new URLSearchParams();
        if (query.trim()) params.set("q", query.trim());
        const res = await fetch(`/api/integrations/notion/pages?${params.toString()}`, {
          cache: "no-store",
        });
        if (reqId !== reqIdRef.current) return; // a newer request superseded this one
        if (!res.ok) {
          setState("error");
          return;
        }
        const data = (await res.json()) as { pages: NotionPageOption[] };
        setPages(data.pages ?? []);
        setState("idle");
      } catch {
        if (reqId === reqIdRef.current) setState("error");
      }
    }, query ? 250 : 0);
    return () => clearTimeout(timer);
  }, [open, query]);

  // Selecting an item (or a pasted link/id, parsed below) pins the page.
  // base-ui closes the popup itself on selection; we just clear the query.
  function pick(id: string | null) {
    if (!id) return;
    onSet?.(id);
    setQuery("");
  }

  // A pasted Notion link/id resolves to a page id directly. Tried on every
  // input change so pasting a URL into the search box immediately resolves.
  function onInput(value: string) {
    setQuery(value);
    const id = extractNotionPageId(value);
    if (id && id !== value) pick(id);
  }

  // The input IS the control (canonical base-ui Combobox pattern — no separate
  // button trigger, so there's no trigger↔input focus bounce that reopened the
  // popup on outside-press). What the input shows: while open/searching it shows
  // the live query; while closed it shows the pinned page's title (like a Select
  // value). We control `inputValue` to switch between those two.
  const inputValue = open ? query : currentLabel ?? "";

  return (
    // Filtering is server-side: disable the built-in filter and feed the list
    // whatever /pages returns. Open state is uncontrolled (base-ui owns it);
    // onOpenChange only mirrors it locally to gate the fetch and clear the query.
    <Combobox
      items={pages.map((p) => p.id)}
      filter={null}
      value={current ?? null}
      onValueChange={(value) => pick(value as string | null)}
      inputValue={inputValue}
      onInputValueChange={(value, details) => {
        // Ignore base-ui's programmatic input syncs (e.g. on open/close); only
        // react to the user actually typing, which drives the server search.
        if (details.reason === "input-change") onInput(value);
      }}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        setPickerOpen(nextOpen);
        if (!nextOpen) setQuery("");
      }}
    >
      {/* data-no-drag keeps the input interactive in edit mode (the tile sets
          [&_*]:pointer-events-none on everything except [data-no-drag]). The
          input is styled to read like the Linear/Tasks Select trigger: a bordered
          control with a chevron, showing the selected page when closed. */}
      <div
        data-no-drag
        className="relative inline-flex h-8 w-[170px] items-center"
      >
        <ComboboxInput
          placeholder="Pick a page…"
          className="h-8 w-full cursor-pointer truncate rounded-md border-[#E4E4E7] bg-white pr-7 pl-2.5 text-[13px] font-medium text-[#18181B] shadow-none hover:bg-[#F4F4F5] focus-visible:cursor-text"
        />
        <ComboboxIcon className="pointer-events-none absolute right-2" />
      </div>
      <ComboboxContent align="end" className="w-72 p-1">
        {state === "loading" ? (
          <p className="flex items-center gap-2 px-3 py-3 text-xs text-[#71717A]">
            <Loader2 className="size-3.5 animate-spin" /> Loading pages…
          </p>
        ) : state === "error" ? (
          <p className="px-3 py-3 text-xs text-[#DC2626]">Couldn’t load pages. Try again.</p>
        ) : pages.length === 0 ? (
          <p className="px-3 py-3 text-xs text-[#A1A1AA]">
            No pages found. Share pages with your MyDock integration in Notion.
          </p>
        ) : (
          <ComboboxList>
            {pages.map((p) => (
              <ComboboxItem
                key={p.id}
                value={p.id}
                className="text-[13px] data-[selected]:font-medium"
              >
                <span className="flex size-4 shrink-0 items-center justify-center text-[13px]">
                  {p.emoji ?? <FileText className="size-3.5 text-[#A1A1AA]" />}
                </span>
                <span className="min-w-0 flex-1 truncate text-[#18181B]">{p.title}</span>
              </ComboboxItem>
            ))}
          </ComboboxList>
        )}
      </ComboboxContent>
    </Combobox>
  );
}

export function NotionPageWidget({
  payload,
  onRetry,
  isRetrying,
  configValue,
  onConfigChange,
}: WidgetProps) {
  const header = payload.items.find((i) => i.metadata?.kind === "page");
  const blocks = payload.items.filter((i) => i.metadata?.kind === "block");
  const pageTitle = header?.title ?? "Notion";
  const pageEmoji = header?.metadata?.emoji as string | undefined;
  const pageUrl = header?.url;
  // The trigger echoes the pinned page's title (with emoji) like the other
  // widgets' Select value — only once a page is actually pinned and loaded.
  const currentLabel =
    configValue && header
      ? pageEmoji
        ? `${pageEmoji} ${pageTitle}`
        : pageTitle
      : undefined;

  return (
    <WidgetCard
      provider="notion"
      title={pageEmoji ? `${pageEmoji} ${pageTitle}` : pageTitle}
      titleHref={pageUrl ?? NOTION_HOME}
      headerControl={
        <PagePicker
          current={configValue}
          currentLabel={currentLabel}
          onSet={onConfigChange}
        />
      }
    >
      {payload.state === "loading" ? <WidgetLoadingState /> : null}
      {payload.state === "error" ? (
        <WidgetErrorState
          message={payload.error ?? "Notion could not load."}
          onRetry={onRetry}
          isRetrying={isRetrying}
        />
      ) : null}
      {payload.state === "not_connected" ? (
        <WidgetNotConnectedState
          providerLabel="Notion"
          actionHref="/connections"
          actionLabel="Connect Notion"
        />
      ) : null}
      {/* Connected/empty: when no page is pinned yet, prompt to pick one. */}
      {payload.state === "connected" || payload.state === "empty" ? (
        !configValue ? (
          <WidgetEmptyState message="Pick a Notion page to read it here." />
        ) : blocks.length > 0 ? (
          // The whole tile opens the page (handled by the grid), so no explicit
          // "Open in Notion" affordance is needed here.
          <div className="space-y-1.5">
            {blocks.map((item) => (
              <BlockRow key={item.id} item={item} />
            ))}
          </div>
        ) : (
          <WidgetEmptyState message="This page has no readable content yet." />
        )
      ) : null}
    </WidgetCard>
  );
}
