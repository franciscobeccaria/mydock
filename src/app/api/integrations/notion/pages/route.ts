import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { getNotionRecentPages } from "@/features/integrations/providers/notion/recent-pages.adapter";
import { createClient } from "@/lib/supabase/server";

const searchSchema = z.object({
  q: z.string().max(200).optional(),
  accountId: z.string().uuid().optional(),
});

/**
 * Lists Notion pages for the Page widget's picker: recent pages by default,
 * title-filtered when `q` is set. Returns a slim {id, title, emoji}[] — only
 * what the picker dropdown renders.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json({ error: "Authentication is unavailable." }, { status: 503 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = searchSchema.safeParse({
    q: request.nextUrl.searchParams.get("q") ?? undefined,
    accountId: request.nextUrl.searchParams.get("accountId") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  try {
    const items = await getNotionRecentPages(user.id, parsed.data.accountId, parsed.data.q);
    return NextResponse.json({
      pages: items.map((item) => ({
        id: item.id,
        title: item.title,
        emoji: (item.metadata?.emoji as string | undefined) ?? null,
      })),
    });
  } catch {
    return NextResponse.json({ error: "Could not load Notion pages." }, { status: 502 });
  }
}
