import { NextResponse, type NextRequest } from "next/server";

import { getMissingGoogleEnv } from "@/lib/env";

export async function GET(request: NextRequest) {
  const missingEnv = getMissingGoogleEnv();

  if (missingEnv.length > 0) {
    return NextResponse.json(
      {
        error: "Google OAuth callback is scaffolded but not configured.",
        missingEnv,
      },
      { status: 400 },
    );
  }

  // TODO: Exchange Google OAuth code server-side and upsert 3 integration rows:
  // gmail, google_tasks, google_calendar. Tokens must stay server-only.
  return NextResponse.redirect(
    new URL("/settings/integrations?google=todo", request.url),
  );
}
