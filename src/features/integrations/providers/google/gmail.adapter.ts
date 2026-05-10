import { gmailMockItems } from "@/features/integrations/mock/gmail.mock";

export async function getGmailItems() {
  // TODO: Replace mock data with Gmail API metadata/snippet reads.
  // Avoid storing full raw email bodies in Postgres; keep normalized metadata only.
  return gmailMockItems;
}
