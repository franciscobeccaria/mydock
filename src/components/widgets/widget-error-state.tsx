import { AlertTriangle } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function WidgetErrorState({ message }: { message: string }) {
  return (
    <Alert variant="destructive" className="rounded-2xl">
      <AlertTriangle className="size-4" />
      <AlertTitle>Unable to load widget</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}
