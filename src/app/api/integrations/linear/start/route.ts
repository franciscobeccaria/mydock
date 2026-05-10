import { NextResponse } from "next/server";

import { getLinearAuthorizationUrl } from "@/features/integrations/providers/linear/oauth";

export async function GET() {
  const result = getLinearAuthorizationUrl("linear-oauth");

  if (!result.ok) {
    return NextResponse.json(
      {
        error: result.message,
        missingEnv: result.missingEnv,
        provider: "linear",
      },
      { status: 400 },
    );
  }

  return NextResponse.redirect(result.url);
}
