import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { DashboardModeProvider } from "@/components/dashboard/dashboard-mode-context";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = supabase
    ? await supabase.auth.getUser()
    : { data: { user: null } };

  const name =
    user?.user_metadata?.full_name ??
    user?.user_metadata?.name ??
    user?.email?.split("@")[0] ??
    "User";

  const sidebarUser = {
    name,
    email: user?.email ?? "",
    avatarUrl: user?.user_metadata?.avatar_url ?? null,
  };

  return (
    <DashboardModeProvider>
      <SidebarProvider>
        <AppSidebar user={sidebarUser} />
        <SidebarInset>
          {children}
        </SidebarInset>
      </SidebarProvider>
    </DashboardModeProvider>
  );
}
