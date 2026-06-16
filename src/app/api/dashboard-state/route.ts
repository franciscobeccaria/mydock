import { NextResponse, type NextRequest } from "next/server";

import { dashboardStateSchema, normalizeToPages } from "@/components/dashboard/widget-instance";
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

  const { data, error } = await supabase
    .from("dashboard_state")
    .select("pages, layout, shortcuts, version")
    .eq("user_id", user.id)
    .maybeSingle();

  // Distinguish a real read failure from "no row yet": returning null on an error
  // would make the client treat it as a fresh user and seed (overwrite) the row.
  if (error) {
    return NextResponse.json({ error: "Failed to load dashboard state." }, { status: 500 });
  }

  // No row → fresh user; the client seeds defaults. A row with empty `pages` but a
  // legacy `layout` (e.g. written between the migration and a client deploy) is
  // wrapped into one page so multi-page clients always read the new shape.
  if (!data) return NextResponse.json(null);
  const pages = Array.isArray(data.pages) ? data.pages : [];
  if (pages.length > 0) {
    return NextResponse.json({ pages, shortcuts: data.shortcuts ?? [] });
  }
  return NextResponse.json(
    normalizeToPages({ layout: data.layout ?? [], shortcuts: data.shortcuts ?? [] }),
  );
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

  // Write `pages` only — the legacy `layout` column is kept read-only for one
  // release (rollback safety) and is no longer the source of truth.
  const { error } = await supabase
    .from("dashboard_state")
    .upsert(
      {
        user_id: user.id,
        pages: parsed.data.pages,
        shortcuts: parsed.data.shortcuts,
      },
      { onConflict: "user_id" },
    );

  if (error) {
    return NextResponse.json({ error: "Failed to save." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
