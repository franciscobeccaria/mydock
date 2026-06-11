import { connection } from "next/server";

import { PageContainer } from "@/components/layout/page-container";
import { WidgetGridClient } from "@/components/widgets/widget-grid-client";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  await connection();

  const supabase = await createClient();
  const {
    data: { user },
  } = supabase ? await supabase.auth.getUser() : { data: { user: null } };

  return (
    <PageContainer>
      <WidgetGridClient
        accountEmail={user?.email ?? null}
        accountName={user?.user_metadata?.full_name ?? user?.user_metadata?.name ?? null}
        accountAvatarUrl={user?.user_metadata?.avatar_url ?? null}
        userId={user?.id ?? null}
      />
    </PageContainer>
  );
}
