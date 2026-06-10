import {
  SiLinear,
  SiGmail,
  SiGooglecalendar,
  SiGoogletasks,
} from "@icons-pack/react-simple-icons";
import { LayoutGrid } from "lucide-react";

import { cn } from "@/lib/utils";
import type { Provider } from "@/features/integrations/types";

export function ProviderIcon({
  provider,
  className,
}: {
  provider: Provider | "today";
  className?: string;
}) {
  const iconClassName = cn("size-[18px]", className);

  switch (provider) {
    case "linear":
      return <SiLinear className={iconClassName} color="#5E6AD2" />;
    case "gmail":
      return <SiGmail className={iconClassName} color="#EA4335" />;
    case "google_tasks":
      return <SiGoogletasks className={iconClassName} color="#2684FC" />;
    case "google_calendar":
      return <SiGooglecalendar className={iconClassName} color="#4285F4" />;
    default:
      return <LayoutGrid className={iconClassName} />;
  }
}
