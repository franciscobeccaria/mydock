import { PageContainer } from "@/components/layout/page-container";
import { AppHeader } from "@/components/layout/app-header";
import { WidgetGrid } from "@/components/widgets/widget-grid";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = supabase ? await supabase.auth.getUser() : { data: { user: null } };

  const fullName = user?.user_metadata?.full_name as string | undefined;
  const displayName = fullName ?? user?.email?.split("@")[0] ?? "there";

  return (
    <div className="min-h-screen">
      <AppHeader name={displayName} email={user?.email} />
      <PageContainer className="space-y-8 py-8">
        <section className="space-y-3">
          <p className="text-muted-foreground text-xl">
            Good morning, {displayName} 👋
          </p>
          <div>
            <h1 className="text-4xl font-semibold tracking-tight">
              Here&apos;s your workspace
            </h1>
            <p className="text-muted-foreground mt-2">
              Scan your priorities, inbox, tasks, and calendar in one
              desktop-first surface.
            </p>
          </div>
        </section>

        <WidgetGrid />
      </PageContainer>
    </div>
  );
}
