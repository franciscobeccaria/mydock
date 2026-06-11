import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { validateLinearKey, storeLinearConnection } from "@/features/integrations/providers/linear/personal-key";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = supabase ? await supabase.auth.getUser() : { data: { user: null } };
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => null)) as { apiKey?: string } | null;
  const apiKey = body?.apiKey?.trim();
  if (!apiKey) return NextResponse.json({ error: "missing_key" }, { status: 400 });

  const identity = await validateLinearKey(apiKey);
  if (!identity) return NextResponse.json({ error: "invalid_key" }, { status: 422 });

  try {
    await storeLinearConnection({ userId: user.id, apiKey, identity });
  } catch {
    return NextResponse.json({ error: "store_failed" }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    email: identity.email,
    workspaceName: identity.workspaceName,
  });
}
