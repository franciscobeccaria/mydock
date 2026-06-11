import { gmailMockItems } from "@/features/integrations/mock/gmail.mock";
import { googleApiFetchWithToken, resolveGoogleToken } from "@/features/integrations/providers/google/client";
import type { WidgetItem } from "@/features/integrations/types";

const GMAIL_PAGE_SIZE = 10;
const DETAIL_CONCURRENCY = 5;

export type GmailWidgetData = {
  items: WidgetItem[];
  unreadCount: number;
};

type GmailThreadListResponse = {
  threads?: { id: string; snippet?: string }[];
  nextPageToken?: string;
};

type GmailMessageResponse = {
  id: string;
  snippet?: string;
  internalDate?: string;
  labelIds?: string[];
  payload?: {
    headers?: { name: string; value: string }[];
  };
};

type GmailThreadResponse = {
  id: string;
  messages?: GmailMessageResponse[];
};

function findHeader(
  headers: { name: string; value: string }[] | undefined,
  name: string,
) {
  return headers?.find((header) => header.name.toLowerCase() === name.toLowerCase())?.value;
}

function parseSender(rawValue: string | undefined) {
  if (!rawValue) {
    return "Unknown sender";
  }

  const match = rawValue.match(/^(.*?)\s*<.*>$/);
  return match?.[1]?.replaceAll('"', "").trim() || rawValue;
}

function countUnread(items: WidgetItem[]) {
  return items.filter((item) => item.metadata?.unread === true).length;
}

async function fetchInBatches<In, Out>(
  items: In[],
  concurrency: number,
  fn: (item: In) => Promise<Out>,
): Promise<Out[]> {
  const results: Out[] = [];
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);
    results.push(...(await Promise.all(batch.map(fn))));
  }
  return results;
}

// Cap how far we page when counting. 20 pages × 500 = 10,000 threads is far more
// than the badge will ever sensibly show; beyond this we report the cap with a "+".
const UNREAD_COUNT_PAGE_SIZE = 500;
const UNREAD_COUNT_MAX_PAGES = 20;

/**
 * The Gmail UI's "Primary" badge counts unread *threads* that are in the inbox AND
 * in the Primary category. Neither the label endpoint (counts archived mail too)
 * nor messages.list `resultSizeEstimate` (capped at ~201) gives this — the only
 * accurate way is to page threads.list with that exact query and count the IDs.
 * `fields` trims the payload to just thread IDs + the page token.
 */
async function fetchPrimaryUnreadCount(
  token: Awaited<ReturnType<typeof resolveGoogleToken>>,
): Promise<{ count: number; capped: boolean } | null> {
  try {
    let count = 0;
    let pageToken: string | undefined;
    let pages = 0;

    do {
      const url = new URL("https://gmail.googleapis.com/gmail/v1/users/me/threads");
      url.searchParams.set("q", "in:inbox category:primary is:unread");
      url.searchParams.set("maxResults", String(UNREAD_COUNT_PAGE_SIZE));
      url.searchParams.set("fields", "threads/id,nextPageToken");
      if (pageToken) {
        url.searchParams.set("pageToken", pageToken);
      }

      const page = await googleApiFetchWithToken<GmailThreadListResponse>(token, url);
      count += page.threads?.length ?? 0;
      pageToken = page.nextPageToken;
      pages += 1;
    } while (pageToken && pages < UNREAD_COUNT_MAX_PAGES);

    return { count, capped: Boolean(pageToken) };
  } catch {
    // Non-fatal: fall back to counting unread among the fetched messages.
    return null;
  }
}

export type GmailView = "all" | "unread";

export async function getGmailItems(
  userId?: string,
  view: GmailView = "all",
  accountId?: string | null,
): Promise<GmailWidgetData> {
  if (!userId) {
    const mockItems =
      view === "unread"
        ? gmailMockItems.filter((item) => item.metadata?.unread === true)
        : gmailMockItems;
    return { items: mockItems, unreadCount: countUnread(gmailMockItems) };
  }

  // List conversations (threads), not individual messages, so the same thread never
  // shows up as multiple rows — this is how the Gmail app collapses a conversation.
  const listUrl = new URL("https://gmail.googleapis.com/gmail/v1/users/me/threads");
  listUrl.searchParams.set("maxResults", String(GMAIL_PAGE_SIZE));
  listUrl.searchParams.set("fields", "threads/id,threads/snippet,nextPageToken");
  if (view === "unread") {
    // Unread is its own result set: most recent unread threads, no time window, so a
    // buried or older unread still surfaces. Mirrors the unread-count query's filters.
    listUrl.searchParams.set("q", "in:inbox category:primary is:unread");
  } else {
    listUrl.searchParams.set("labelIds", "INBOX");
    listUrl.searchParams.set("q", "category:primary newer_than:14d");
  }

  // Resolve token once and reuse it for the list, count, and all detail fetches.
  const token = await resolveGoogleToken(userId, accountId);

  // The list and the Primary unread total are independent — fetch them in parallel.
  const [listResponse, primaryUnread] = await Promise.all([
    googleApiFetchWithToken<GmailThreadListResponse>(token, listUrl),
    fetchPrimaryUnreadCount(token),
  ]);
  const threads = listResponse.threads ?? [];

  if (threads.length === 0) {
    return { items: [], unreadCount: primaryUnread?.count ?? 0 };
  }

  const details = await fetchInBatches(
    threads,
    DETAIL_CONCURRENCY,
    async (thread) => {
      const detailUrl = new URL(
        `https://gmail.googleapis.com/gmail/v1/users/me/threads/${thread.id}`,
      );
      detailUrl.searchParams.set("format", "metadata");
      detailUrl.searchParams.append("metadataHeaders", "From");
      detailUrl.searchParams.append("metadataHeaders", "Subject");
      detailUrl.searchParams.append("metadataHeaders", "Date");

      const detail = await googleApiFetchWithToken<GmailThreadResponse>(token, detailUrl);
      return { thread, detail };
    },
  );

  const items = details.map(({ thread, detail }) => {
    const messages = detail.messages ?? [];
    // The API returns messages chronologically; sort defensively and take the latest.
    const sorted = [...messages].sort(
      (a, b) => Number(a.internalDate ?? 0) - Number(b.internalDate ?? 0),
    );
    const latest = sorted[sorted.length - 1];
    const headers = latest?.payload?.headers;

    const subject = findHeader(headers, "Subject") ?? thread.snippet ?? "Untitled email";
    const sender = parseSender(findHeader(headers, "From"));
    const occurredAt = latest?.internalDate
      ? new Date(Number(latest.internalDate)).toISOString()
      : undefined;

    // A thread is unread/important if *any* of its messages is — matches Gmail's bolding.
    const labels = messages.flatMap((message) => message.labelIds ?? []);

    return {
      id: thread.id,
      provider: "gmail",
      title: subject,
      subtitle: sender,
      occurredAt,
      url: `https://mail.google.com/mail/u/0/#inbox/${thread.id}`,
      summary: latest?.snippet ?? thread.snippet ?? "",
      metadata: {
        unread: labels.includes("UNREAD"),
        important: labels.includes("IMPORTANT"),
        labels,
        label: "Inbox",
        threadId: thread.id,
        messageCount: messages.length,
      },
    } satisfies WidgetItem;
  });

  return { items, unreadCount: primaryUnread?.count ?? countUnread(items) };
}
