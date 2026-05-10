import { PageContainer } from "@/components/layout/page-container";
import { AppHeader } from "@/components/layout/app-header";
import { IntegrationCard } from "@/components/integrations/integration-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createClient } from "@/lib/supabase/server";
import { getIntegrationStatusRecords } from "@/features/integrations/registry";

export default async function IntegrationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = supabase ? await supabase.auth.getUser() : { data: { user: null } };

  const fullName = user?.user_metadata?.full_name as string | undefined;
  const displayName = fullName ?? user?.email?.split("@")[0] ?? "there";
  const records = user ? await getIntegrationStatusRecords(user.id) : [];

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
            OAuth routes are scaffolded for Gmail, Google Tasks, Google
            Calendar, and Linear. Google uses one shared flow that will populate
            three provider rows when live credentials are configured.
          </p>
        </div>

        <Tabs defaultValue="providers" className="space-y-6">
          <TabsList>
            <TabsTrigger value="providers">Providers</TabsTrigger>
            <TabsTrigger value="notes">OAuth notes</TabsTrigger>
          </TabsList>
          <TabsContent value="providers" className="grid gap-6">
            {records.map((record) => (
              <IntegrationCard key={record.provider} record={record} />
            ))}
          </TabsContent>
          <TabsContent
            value="notes"
            className="border-border/70 bg-card rounded-3xl border p-6 shadow-sm"
          >
            <div className="text-muted-foreground space-y-4 text-sm">
              <p>
                Gmail readonly access may still require Google verification
                before a public launch, depending on the final scope set and app
                publishing mode.
              </p>
              <p>
                Tokens must remain server-only. The current schema prepares
                `integration_tokens` for encrypted storage using
                `TOKEN_ENCRYPTION_SECRET`.
              </p>
              <p>
                Linear remains mock-first until the GraphQL query and token
                exchange flow are activated behind server routes.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </PageContainer>
    </div>
  );
}
