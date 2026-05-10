import { NextResponse, type NextRequest } from "next/server";

import { getMissingLinearEnv } from "@/lib/env";

export async function GET(request: NextRequest) {
  const missingEnv = getMissingLinearEnv();

  if (missingEnv.length > 0) {
    return NextResponse.json(
      {
        error: "Linear OAuth callback is scaffolded but not configured.",
        missingEnv,
      },
      { status: 400 },
    );
  }

  // TODO: Exchange Linear OAuth code and persist encrypted tokens server-side only.
  return NextResponse.redirect(
    new URL("/settings/integrations?linear=todo", request.url),
  );
}
