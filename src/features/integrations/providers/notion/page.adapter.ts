import { notionFetch } from "@/features/integrations/providers/notion/client";
import {
  RENDERABLE_BLOCK_TYPES,
  type NotionRichText,
  type RenderableBlockType,
} from "@/features/integrations/providers/notion/types";
import type { WidgetItem } from "@/features/integrations/types";

type NotionIcon =
  | { type: "emoji"; emoji?: string | null }
  | { type?: string }
  | null;

type NotionPageResponse = {
  object: "page";
  id: string;
  url?: string | null;
  last_edited_time?: string | null;
  icon?: NotionIcon;
  properties?: Record<string, { type?: string; title?: NotionRichText[] }>;
};

type RichTextHolder = { rich_text?: NotionRichText[] };

type NotionBlock = {
  object: "block";
  id: string;
  type: string;
} & Partial<Record<RenderableBlockType, RichTextHolder & { checked?: boolean; icon?: NotionIcon }>>;

type NotionBlocksResponse = {
  object: "list";
  results: NotionBlock[];
};

const RENDERABLE = new Set<string>(RENDERABLE_BLOCK_TYPES);

function plainText(spans: NotionRichText[] | undefined): string {
  return (spans ?? [])
    .map((s) => s.plain_text ?? "")
    .join("")
    .trim();
}

function getPageTitle(page: NotionPageResponse): string {
  const titleProp = Object.values(page.properties ?? {}).find((p) => p?.type === "title");
  return plainText(titleProp?.title) || "Untitled";
}

function getEmoji(icon: NotionIcon): string | undefined {
  if (icon && icon.type === "emoji" && "emoji" in icon) return icon.emoji ?? undefined;
  return undefined;
}

/**
 * A pinned Notion page rendered inline: GET /v1/pages/{id} for title/icon/url,
 * GET /v1/blocks/{id}/children for content. Returns the page header as the first
 * item (metadata.kind="page") followed by one item per renderable top-level
 * block (metadata.kind="block", metadata.blockType drives styling). Unsupported
 * block types are skipped, not rendered. Nested children are not fetched.
 */
export async function getNotionPage(
  userId: string,
  pageId: string,
  accountId?: string | null,
): Promise<WidgetItem[]> {
  const [page, blocks] = await Promise.all([
    notionFetch<NotionPageResponse>(userId, `/pages/${pageId}`, { accountId }),
    notionFetch<NotionBlocksResponse>(userId, `/blocks/${pageId}/children?page_size=50`, {
      accountId,
    }),
  ]);

  const header: WidgetItem = {
    id: page.id,
    provider: "notion",
    title: getPageTitle(page),
    subtitle: "Notion",
    occurredAt: page.last_edited_time ?? undefined,
    url: page.url ?? undefined,
    metadata: { kind: "page", emoji: getEmoji(page.icon ?? null) },
  };

  const blockItems: WidgetItem[] = (blocks.results ?? [])
    .filter((b) => b.object === "block" && RENDERABLE.has(b.type))
    .map((b) => {
      const content = b[b.type as RenderableBlockType];
      const text = plainText(content?.rich_text);
      return {
        id: b.id,
        provider: "notion" as const,
        title: text,
        metadata: {
          kind: "block",
          blockType: b.type,
          checked: content?.checked ?? undefined,
          emoji: b.type === "callout" ? getEmoji(content?.icon ?? null) : undefined,
        },
      } satisfies WidgetItem;
    })
    // Drop blocks that render to nothing (e.g. an empty paragraph divider).
    .filter((item) => item.title.length > 0);

  return [header, ...blockItems];
}
