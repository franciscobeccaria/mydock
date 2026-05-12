import { AppHeader } from "@/components/layout/app-header";
import { PageContainer } from "@/components/layout/page-container";
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
    <div className="min-h-screen bg-[#FAFAFA]">
      <AppHeader name={displayName} email={user?.email} />
      <PageContainer className="py-8 sm:py-10">
        <WidgetGrid />
      </PageContainer>
    </div>
  );
}
