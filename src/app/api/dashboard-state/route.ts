import { NextResponse, type NextRequest } from "next/server";

import { dashboardStateSchema } from "@/components/dashboard/widget-instance";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient({ writeCookies: true });

  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data } = await supabase
    .from("dashboard_state")
    .select("layout, shortcuts, version")
    .eq("user_id", user.id)
    .maybeSingle();

  return NextResponse.json(data ?? null);
}

export async function PUT(request: NextRequest) {
  const supabase = await createClient({ writeCookies: true });

  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = dashboardStateSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid dashboard state." }, { status: 400 });
  }

  const { error } = await supabase
    .from("dashboard_state")
    .upsert(
      {
        user_id: user.id,
        layout: parsed.data.layout,
        shortcuts: parsed.data.shortcuts,
      },
      { onConflict: "user_id" },
    );

  if (error) {
    return NextResponse.json({ error: "Failed to save." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
