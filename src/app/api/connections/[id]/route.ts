import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";

async function getUserId() {
  const supabase = await createClient();
  const { data: { user } } = supabase ? await supabase.auth.getUser() : { data: { user: null } };
  return user?.id ?? null;
}

// Disconnect a connection. The default (login Google) connection cannot be removed.
export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await ctx.params;

  const service = createServiceRoleClient();
  if (!service) return NextResponse.json({ error: "unavailable" }, { status: 503 });

  const row = await service
    .from("integration_accounts")
    .select("id,provider,is_default")
    .eq("user_id", userId)
    .eq("id", id)
    .maybeSingle();

  if (row.error || !row.data) return NextResponse.json({ error: "not_found" }, { status: 404 });
  // Only the Google login account is non-removable (it's the user's identity).
  // Linear connections are always removable, even the provider's default one.
  if (row.data.provider === "google" && row.data.is_default)
    return NextResponse.json({ error: "default_not_removable" }, { status: 409 });

  const del = await service.from("integration_accounts").delete().eq("user_id", userId).eq("id", id);
  if (del.error) return NextResponse.json({ error: "delete_failed" }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// Set a connection as the default for its provider.
export async function PATCH(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await ctx.params;

  const service = createServiceRoleClient();
  if (!service) return NextResponse.json({ error: "unavailable" }, { status: 503 });

  const target = await service
    .from("integration_accounts")
    .select("id,provider")
    .eq("user_id", userId)
    .eq("id", id)
    .maybeSingle();
  if (target.error || !target.data)
    return NextResponse.json({ error: "not_found" }, { status: 404 });

  // Set the new default first, then clear the others for this provider. Done in
  // this order (not the reverse) so a failure between the two statements leaves
  // two defaults — benign and recoverable — rather than zero, which would break
  // token resolution. Not transactional; fine for this low-concurrency app.
  const set = await service
    .from("integration_accounts")
    .update({ is_default: true })
    .eq("user_id", userId)
    .eq("id", id);
  if (set.error) return NextResponse.json({ error: "update_failed" }, { status: 500 });

  const clear = await service
    .from("integration_accounts")
    .update({ is_default: false })
    .eq("user_id", userId)
    .eq("provider", target.data.provider)
    .neq("id", id);
  if (clear.error) return NextResponse.json({ error: "update_failed" }, { status: 500 });

  return NextResponse.json({ ok: true });
}
