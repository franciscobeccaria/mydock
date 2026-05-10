import { NextResponse } from "next/server";

import { getGoogleAuthorizationUrl } from "@/features/integrations/providers/google/oauth";

export async function GET() {
  const result = getGoogleAuthorizationUrl("google-shared-oauth");

  if (!result.ok) {
    return NextResponse.json(
      {
        error: result.message,
        missingEnv: result.missingEnv,
        provider: "google",
      },
      { status: 400 },
    );
  }

  return NextResponse.redirect(result.url);
}
