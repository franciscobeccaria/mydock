import { NextResponse } from "next/server";

import { getIntegrationStatusRecords } from "@/features/integrations/registry";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();

  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase is not configured." },
      { status: 503 },
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const records = await getIntegrationStatusRecords(user.id);
  return NextResponse.json({ integrations: records });
}
