import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import {
  validateNotionToken,
  storeNotionConnection,
} from "@/features/integrations/providers/notion/personal-key";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = supabase ? await supabase.auth.getUser() : { data: { user: null } };
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => null)) as { token?: string } | null;
  const token = body?.token?.trim();
  if (!token) return NextResponse.json({ error: "missing_token" }, { status: 400 });

  const identity = await validateNotionToken(token);
  if (!identity) return NextResponse.json({ error: "invalid_token" }, { status: 422 });

  try {
    await storeNotionConnection({ userId: user.id, token, identity });
  } catch {
    return NextResponse.json({ error: "store_failed" }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    email: identity.email,
    workspaceName: identity.workspaceName,
  });
}
