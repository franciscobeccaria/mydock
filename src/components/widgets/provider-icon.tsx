import { CalendarDays, CheckSquare, Mail, Orbit } from "lucide-react";

import type { Provider } from "@/features/integrations/types";

export function ProviderIcon({ provider }: { provider: Provider | "today" }) {
  const className = "size-5";

  switch (provider) {
    case "linear":
      return <Orbit className={className} />;
    case "gmail":
      return <Mail className={className} />;
    case "google_tasks":
      return <CheckSquare className={className} />;
    case "google_calendar":
      return <CalendarDays className={className} />;
    default:
      return <CalendarDays className={className} />;
  }
}
