import {
  SiGmail,
  SiGooglecalendar,
  SiGoogletasks,
  SiLinear,
} from "@icons-pack/react-simple-icons";
import { LayoutGrid } from "lucide-react";

import type { Provider } from "@/features/integrations/types";

const brandClassName = "size-5";

export function ProviderIcon({ provider }: { provider: Provider | "today" }) {
  switch (provider) {
    case "linear":
      return <SiLinear className={brandClassName} color="#5E6AD2" />;
    case "gmail":
      return <SiGmail className={brandClassName} />;
    case "google_tasks":
      return <SiGoogletasks className={brandClassName} color="#188038" />;
    case "google_calendar":
      return <SiGooglecalendar className={brandClassName} color="#4285F4" />;
    default:
      return <LayoutGrid className={brandClassName} />;
  }
}
