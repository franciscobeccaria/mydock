import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { providers } from "@/features/integrations/types";
import { createClient } from "@/lib/supabase/server";

const bodySchema = z
  .object({
    providers: z.array(z.enum(providers)).optional(),
  })
  .optional();

export async function POST(request: NextRequest) {
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

  let rawBody: unknown;

  if (request.headers.get("content-length")) {
    try {
      rawBody = await request.json();
    } catch {
      rawBody = undefined;
    }
  }

  const parsedBody = bodySchema.safeParse(rawBody);

  if (!parsedBody.success) {
    return NextResponse.json(
      { error: "Invalid refresh body." },
      { status: 400 },
    );
  }

  return NextResponse.json({
    refreshedAt: new Date().toISOString(),
    providers: parsedBody.data?.providers ?? [...providers],
  });
}
