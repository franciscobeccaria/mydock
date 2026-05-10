import { Badge } from "@/components/ui/badge";
import type { IntegrationStatusRecord } from "@/features/integrations/types";

export function IntegrationStatusBadge({
  status,
}: {
  status: IntegrationStatusRecord["status"];
}) {
  if (status === "connected") {
    return <Badge className="rounded-full px-2.5">Connected</Badge>;
  }

  if (status === "pending") {
    return (
      <Badge variant="outline" className="rounded-full px-2.5">
        Pending
      </Badge>
    );
  }

  if (status === "error") {
    return (
      <Badge variant="destructive" className="rounded-full px-2.5">
        Error
      </Badge>
    );
  }

  return (
    <Badge variant="secondary" className="rounded-full px-2.5">
      Disconnected
    </Badge>
  );
}
