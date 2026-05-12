import { Badge } from "@/components/ui/badge";
import type { IntegrationStatusRecord } from "@/features/integrations/types";

export function IntegrationStatusBadge({
  status,
}: {
  status: IntegrationStatusRecord["status"];
}) {
  if (status === "connected") {
    return (
      <Badge
        variant="secondary"
        className="rounded-full bg-[#F4F4F5] px-2.5 text-[#52525B]"
      >
        Connected
      </Badge>
    );
  }

  if (status === "pending") {
    return (
      <Badge variant="outline" className="rounded-full px-2.5 text-[#52525B]">
        Needs access
      </Badge>
    );
  }

  if (status === "error") {
    return (
      <Badge variant="destructive" className="rounded-full px-2.5">
        Issue
      </Badge>
    );
  }

  return (
    <Badge
      variant="secondary"
      className="rounded-full bg-[#F4F4F5] px-2.5 text-[#52525B]"
    >
      Not connected
    </Badge>
  );
}
