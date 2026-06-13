// Notion connects via a pasted Personal Access Token (PAT), same shape as
// Linear's personal key — no OAuth, so no consent scopes. The empty scope list
// keeps Notion out of the registry's scope/consent machinery (treated like
// Linear in buildScopeStatus / getDerivedWidgetState).
export const notionScopes = [] as const;

// Notion requires an explicit API version header on every request. Pinned here
// so a Notion-side default change can't silently shift our parsing. Bump
// deliberately after checking the changelog.
export const NOTION_VERSION = "2022-06-28";

export const NOTION_API_BASE = "https://api.notion.com/v1";

// Block types the Page widget renders inline as compact text. Anything else is
// skipped (not crashed) — see page.adapter. Kept intentionally small: top-level
// common types only, no nested/exotic blocks (tables, columns, embeds).
export const RENDERABLE_BLOCK_TYPES = [
  "paragraph",
  "heading_1",
  "heading_2",
  "heading_3",
  "to_do",
  "bulleted_list_item",
  "numbered_list_item",
  "quote",
  "callout",
] as const;

export type RenderableBlockType = (typeof RENDERABLE_BLOCK_TYPES)[number];

// A single Notion rich-text span as returned by the API (the subset we read).
export type NotionRichText = {
  plain_text?: string | null;
  href?: string | null;
};
