import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { getWidgetPayload } from "@/features/integrations/registry";
import { providers } from "@/features/integrations/types";
import { createClient } from "@/lib/supabase/server";

const paramsSchema = z.object({
  provider: z.enum(providers),
});

const searchSchema = z.object({
  previewState: z
    .enum([
      "loading",
      "empty",
      "error",
      "not_connected",
      "permission_required",
      "connected",
    ])
    .optional(),
  view: z.enum(["all", "unread"]).optional(),
});

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ provider: string }> },
) {
  const supabase = await createClient({ writeCookies: true });

  if (!supabase) {
    return NextResponse.json({ error: "Authentication is unavailable." }, { status: 503 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params = await context.params;
  const parsedParams = paramsSchema.safeParse(params);
  const parsedSearch = searchSchema.safeParse({
    previewState: request.nextUrl.searchParams.get("previewState") ?? undefined,
    view: request.nextUrl.searchParams.get("view") ?? undefined,
  });

  if (!parsedParams.success || !parsedSearch.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const payload = await getWidgetPayload(
    parsedParams.data.provider,
    user.id,
    parsedSearch.data.previewState,
    parsedSearch.data.view,
  );

  return NextResponse.json(payload);
}
