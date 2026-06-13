import { notionFetch } from "@/features/integrations/providers/notion/client";
import type { NotionRichText } from "@/features/integrations/providers/notion/types";
import type { WidgetItem } from "@/features/integrations/types";

type NotionIcon =
  | { type: "emoji"; emoji?: string | null }
  | { type: "external"; external?: { url?: string | null } | null }
  | { type: "file"; file?: { url?: string | null } | null }
  | null;

type NotionPage = {
  object: "page";
  id: string;
  url?: string | null;
  last_edited_time?: string | null;
  icon?: NotionIcon;
  properties?: Record<string, { type?: string; title?: NotionRichText[] }>;
};

type NotionSearchResponse = {
  object: "list";
  results: Array<NotionPage | { object: string }>;
};

/** Pulls the page title out of its title-type property (Notion has no top-level title). */
function getPageTitle(page: NotionPage): string {
  const titleProp = Object.values(page.properties ?? {}).find((p) => p?.type === "title");
  const text = (titleProp?.title ?? [])
    .map((span) => span.plain_text ?? "")
    .join("")
    .trim();
  return text || "Untitled";
}

/** Normalizes the icon to an emoji string when present (file/external icons are dropped for now). */
function getPageEmoji(icon: NotionIcon): string | undefined {
  if (icon?.type === "emoji") return icon.emoji ?? undefined;
  return undefined;
}

/**
 * Recently-edited Notion pages. POST /v1/search with no query returns everything
 * the token can access; default sort is last_edited_time desc, which is exactly
 * "recent pages". We pin the sort explicitly so it doesn't drift. An optional
 * `query` filters by page title (used by the Page widget's picker); empty query
 * falls back to the recent list.
 */
export async function getNotionRecentPages(
  userId: string,
  accountId?: string | null,
  query?: string,
): Promise<WidgetItem[]> {
  const data = await notionFetch<NotionSearchResponse>(userId, "/search", {
    method: "POST",
    accountId,
    body: {
      ...(query ? { query } : {}),
      filter: { value: "page", property: "object" },
      sort: { direction: "descending", timestamp: "last_edited_time" },
      page_size: 25,
    },
  });

  return (data.results ?? [])
    .filter((r): r is NotionPage => r.object === "page")
    .map((page) => {
      const emoji = getPageEmoji(page.icon ?? null);
      return {
        id: page.id,
        provider: "notion" as const,
        title: getPageTitle(page),
        subtitle: "Notion",
        occurredAt: page.last_edited_time ?? undefined,
        url: page.url ?? undefined,
        metadata: {
          emoji,
        },
      } satisfies WidgetItem;
    });
}
