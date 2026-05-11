import { NextResponse, type NextRequest } from "next/server";

import { getLinearAuthorizationUrl } from "@/features/integrations/providers/linear/oauth";

function getSafeNext(request: NextRequest) {
  const next = request.nextUrl.searchParams.get("next") ?? "/settings/integrations";
  return next.startsWith("/") ? next : "/settings/integrations";
}

export async function GET(request: NextRequest) {
  const result = getLinearAuthorizationUrl("linear-oauth");

  if (!result.ok) {
    return NextResponse.redirect(
      new URL(`${getSafeNext(request)}?notice=linear-unavailable`, request.url),
    );
  }

  return NextResponse.redirect(result.url);
}
