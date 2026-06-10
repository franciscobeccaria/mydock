import type { WidgetItem } from "@/features/integrations/types";

export const googleCalendarMockItems: WidgetItem[] = [
  {
    id: "event-1",
    provider: "google_calendar",
    title: "Team standup",
    subtitle: "Primary calendar",
    occurredAt: "2026-05-10T09:00:00.000Z",
    summary: "30 min • Daily team check-in",
    metadata: {
      endAt: "2026-05-10T09:30:00.000Z",
      location: "Zoom",
      hangoutLink: "https://meet.google.com/abc-defg-hij",
      colorId: "1",
      attendees: [
        { name: "Ana Gómez", email: "ana@example.com" },
        { name: "Luis Pérez", email: "luis@example.com" },
      ],
    },
  },
  {
    id: "event-2",
    provider: "google_calendar",
    title: "Product sync",
    subtitle: "Primary calendar",
    occurredAt: "2026-05-10T09:15:00.000Z",
    summary: "1 hr • Scope and roadmap alignment",
    metadata: {
      endAt: "2026-05-10T10:15:00.000Z",
      location: "Conference Room A",
      colorId: "5",
      attendees: [
        { name: "María Torres", email: "maria@example.com" },
        { name: "Carlos Ruiz", email: "carlos@example.com" },
        { name: "Sofia Chen", email: "sofia@example.com" },
      ],
    },
  },
  {
    id: "event-3",
    provider: "google_calendar",
    title: "Design review",
    subtitle: "Primary calendar",
    occurredAt: "2026-05-10T14:00:00.000Z",
    summary: "1 hr • Final review of dashboard refinements",
    metadata: {
      endAt: "2026-05-10T15:00:00.000Z",
      location: "Figma + Meet",
      hangoutLink: "https://meet.google.com/xyz-1234-abc",
      colorId: "2",
    },
  },
  {
    id: "event-4",
    provider: "google_calendar",
    title: "Customer debrief",
    subtitle: "Customer Research",
    occurredAt: "2026-05-11T10:00:00.000Z",
    summary: "45 min • Review insights from interviews",
    metadata: { endAt: "2026-05-11T10:45:00.000Z", location: "Notion room" },
  },
];
