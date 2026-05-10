import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { getWidgetsResponse } from "@/features/integrations/registry";
import { createClient } from "@/lib/supabase/server";

const searchSchema = z.object({
  previewState: z
    .enum(["loading", "empty", "error", "not_connected", "connected"])
    .optional(),
});

export async function GET(request: NextRequest) {
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

  const parsed = searchSchema.safeParse({
    previewState: request.nextUrl.searchParams.get("previewState") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid previewState parameter." },
      { status: 400 },
    );
  }

  const response = await getWidgetsResponse(user.id, parsed.data.previewState);
  return NextResponse.json(response);
}
