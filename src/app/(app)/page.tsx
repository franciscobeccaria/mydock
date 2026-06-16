import { connection } from "next/server";

import { PageContainer } from "@/components/layout/page-container";
import { WidgetGridClient } from "@/components/widgets/widget-grid-client";
import { listConnections } from "@/features/connections/queries";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  await connection();

  const supabase = await createClient();
  const {
    data: { user },
  } = supabase ? await supabase.auth.getUser() : { data: { user: null } };

  const connections = user
    ? await listConnections(user.id)
    : { google: [], linear: [], notion: [] };

  return (
    // The dashboard manages its own horizontal rhythm: page dots + dock sit at
    // the top (no top padding needed now that the dots mark the top), and the
    // swipeable pages carry their own side padding so the sliding track has air
    // at the edges instead of the neighbour page bleeding against the border.
    <PageContainer className="px-0 pt-0">
      <WidgetGridClient
        accountEmail={user?.email ?? null}
        accountName={user?.user_metadata?.full_name ?? user?.user_metadata?.name ?? null}
        accountAvatarUrl={user?.user_metadata?.avatar_url ?? null}
        userId={user?.id ?? null}
        connections={connections}
      />
    </PageContainer>
  );
}
