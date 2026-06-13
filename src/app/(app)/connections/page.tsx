import { PageContainer } from "@/components/layout/page-container";
import { ConnectionsList } from "@/components/connections/connections-list";
import { listConnections } from "@/features/connections/queries";
import { createClient } from "@/lib/supabase/server";

export default async function ConnectionsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = supabase ? await supabase.auth.getUser() : { data: { user: null } };
  const connections = user
    ? await listConnections(user.id)
    : { google: [], linear: [], notion: [] };

  return (
    <PageContainer className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[#18181B]">Connections</h1>
        <p className="mt-1 text-sm text-[#71717A]">
          Connect your accounts. Widgets use these connections to show your data.
        </p>
      </div>
      <ConnectionsList connections={connections} />
    </PageContainer>
  );
}
