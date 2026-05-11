import { googleCalendarMockItems } from "@/features/integrations/mock/google-calendar.mock";
import { googleApiFetch } from "@/features/integrations/providers/google/client";
import type { WidgetItem } from "@/features/integrations/types";

type GoogleCalendarEventsResponse = {
  items?: {
    id: string;
    summary?: string;
    location?: string;
    htmlLink?: string;
    start?: { dateTime?: string; date?: string };
    end?: { dateTime?: string; date?: string };
    organizer?: { displayName?: string; email?: string };
  }[];
};

export async function getGoogleCalendarItems(userId?: string): Promise<WidgetItem[]> {
  if (!userId) {
    return googleCalendarMockItems;
  }

  const url = new URL(
    "https://www.googleapis.com/calendar/v3/calendars/primary/events",
  );
  url.searchParams.set("maxResults", "5");
  url.searchParams.set("singleEvents", "true");
  url.searchParams.set("orderBy", "startTime");
  url.searchParams.set("timeMin", new Date().toISOString());

  const events = await googleApiFetch<GoogleCalendarEventsResponse>(userId, url);

  return (events.items ?? []).map((event) => ({
    id: event.id,
    provider: "google_calendar",
    title: event.summary ?? "Untitled event",
    subtitle: event.organizer?.displayName ?? event.organizer?.email ?? "Primary calendar",
    occurredAt: event.start?.dateTime ?? event.start?.date,
    summary: event.location ? `Location: ${event.location}` : "No location",
    url: event.htmlLink,
    metadata: {
      endAt: event.end?.dateTime ?? event.end?.date,
      location: event.location,
    },
  }));
}
