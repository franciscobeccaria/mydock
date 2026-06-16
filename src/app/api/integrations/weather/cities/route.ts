import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { searchCities } from "@/features/integrations/providers/weather/adapter";
import { createClient } from "@/lib/supabase/server";

const searchSchema = z.object({
  q: z.string().max(200).optional(),
});

/**
 * City autocomplete for the Weather widget picker. Proxies Open-Meteo geocoding
 * (no key) and returns a slim {value, label}[] — only what the dropdown renders.
 * Auth-gated like the other widget routes even though the data is public.
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
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  try {
    const cities = await searchCities(parsed.data.q ?? "");
    return NextResponse.json({ cities });
  } catch {
    return NextResponse.json({ error: "Could not search cities." }, { status: 502 });
  }
}
