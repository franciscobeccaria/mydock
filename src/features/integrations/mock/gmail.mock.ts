import type { WidgetItem } from "@/features/integrations/types";

export const gmailMockItems: WidgetItem[] = [
  {
    id: "gmail-1",
    provider: "gmail",
    title: "Project update – next steps",
    subtitle: "Claire Smith",
    occurredAt: "2026-05-10T09:41:00.000Z",
    summary:
      "Claire shared the updated timeline and wants design sign-off before Friday.",
    metadata: { unread: true, label: "Inbox" },
  },
  {
    id: "gmail-2",
    provider: "gmail",
    title: "Design feedback",
    subtitle: "David Lee",
    occurredAt: "2026-05-10T08:15:00.000Z",
    summary:
      "A few layout tweaks are needed in the dashboard hero and widget spacing.",
    metadata: { unread: true, label: "Important" },
  },
  {
    id: "gmail-3",
    provider: "gmail",
    title: "Q2 Planning Sync",
    subtitle: "Acme Team",
    occurredAt: "2026-05-09T17:20:00.000Z",
    summary:
      "Agenda includes roadmap alignment and customer interview highlights.",
    metadata: { unread: false, label: "Team" },
  },
  {
    id: "gmail-4",
    provider: "gmail",
    title: "Your daily summary",
    subtitle: "Linear Team",
    occurredAt: "2026-05-09T14:40:00.000Z",
    summary:
      "2 issues completed, 1 blocker flagged, and 3 items awaiting triage.",
    metadata: { unread: false, label: "Updates" },
  },
];
