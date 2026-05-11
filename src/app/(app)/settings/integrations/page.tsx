import { AppHeader } from "@/components/layout/app-header";
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

  const fullName = user?.user_metadata?.full_name as string | undefined;
  const displayName = fullName ?? user?.email?.split("@")[0] ?? "there";
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
        : messageKey === "linear-unavailable"
          ? "Linear isn't available right now."
          : undefined;

  return (
    <div className="min-h-screen">
      <AppHeader name={displayName} email={user?.email} />
      <PageContainer className="space-y-8 py-8">
        <div>
          <p className="text-muted-foreground text-sm tracking-[0.18em] uppercase">
            Settings
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Integrations
          </h1>
          <p className="text-muted-foreground mt-2 max-w-3xl">
            Choose what MyDock can bring into your workspace. You can update access whenever your routine changes.
          </p>
        </div>

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
    </div>
  );
}
