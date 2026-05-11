import { gmailMockItems } from "@/features/integrations/mock/gmail.mock";
import { googleApiFetch } from "@/features/integrations/providers/google/client";
import type { WidgetItem } from "@/features/integrations/types";

type GmailMessageListResponse = {
  messages?: { id: string; threadId: string }[];
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

export async function getGmailItems(userId?: string): Promise<WidgetItem[]> {
  if (!userId) {
    return gmailMockItems;
  }

  const listUrl = new URL("https://gmail.googleapis.com/gmail/v1/users/me/messages");
  listUrl.searchParams.set("maxResults", "5");
  listUrl.searchParams.set("labelIds", "INBOX");
  listUrl.searchParams.set("q", "category:primary newer_than:14d");

  const listResponse = await googleApiFetch<GmailMessageListResponse>(userId, listUrl);
  const messages = listResponse.messages ?? [];

  if (messages.length === 0) {
    return [];
  }

  const details = await Promise.all(
    messages.map((message) => {
      const detailUrl = new URL(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${message.id}`,
      );
      detailUrl.searchParams.set("format", "metadata");
      detailUrl.searchParams.append("metadataHeaders", "From");
      detailUrl.searchParams.append("metadataHeaders", "Subject");
      detailUrl.searchParams.append("metadataHeaders", "Date");

      return googleApiFetch<GmailMessageResponse>(userId, detailUrl);
    }),
  );

  return details.map((message) => {
    const headers = message.payload?.headers;
    const subject = findHeader(headers, "Subject") ?? "Untitled email";
    const sender = parseSender(findHeader(headers, "From"));
    const occurredAt = message.internalDate
      ? new Date(Number(message.internalDate)).toISOString()
      : undefined;

    return {
      id: message.id,
      provider: "gmail",
      title: subject,
      subtitle: sender,
      occurredAt,
      summary: message.snippet ?? "",
      metadata: {
        unread: message.labelIds?.includes("UNREAD") ?? false,
        label: "Inbox",
      },
    } satisfies WidgetItem;
  });
}
