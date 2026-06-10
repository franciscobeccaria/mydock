import { PageContainer } from "@/components/layout/page-container";
import { GoogleWorkspaceCard } from "@/components/integrations/google-workspace-card";
import { IntegrationCard } from "@/components/integrations/integration-card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { getIntegrationStatusRecords } from "@/features/integrations/registry";
import { createClient } from "@/lib/supabase/server";

export default async function IntegrationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = supabase ? await supabase.auth.getUser() : { data: { user: null } };

  const records = user ? await getIntegrationStatusRecords(user.id) : [];
  const googleRecords = records.filter((record) => record.provider !== "linear");
  const linearRecord = records.find((record) => record.provider === "linear");
  const params = await searchParams;
  const messageKey = typeof params.notice === "string" ? params.notice : undefined;
  const message =
    messageKey === "google-updated"
      ? "Your Google access has been updated."
      : messageKey === "google-unavailable"
        ? "Google access isn't available right now."
        : messageKey === "linear-connected"
          ? "Linear is now connected."
          : messageKey === "linear-unavailable"
            ? "Linear isn't available right now."
            : messageKey === "linear-error"
              ? "Linear couldn't be connected right now."
              : undefined;

  return (
    <PageContainer className="space-y-6">
      {message ? (
        <Alert>
          <AlertTitle>Heads up</AlertTitle>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      ) : null}
      <div className="grid gap-6">
        <GoogleWorkspaceCard records={googleRecords} />
        {linearRecord ? <IntegrationCard record={linearRecord} /> : null}
      </div>
    </PageContainer>
  );
}
