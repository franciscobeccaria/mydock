import { randomUUID } from "crypto";
import { NextResponse, type NextRequest } from "next/server";

import { getLinearAuthorizationUrl } from "@/features/integrations/providers/linear/oauth";

const LINEAR_STATE_COOKIE = "mydock_linear_oauth_state";

function getSafeNext(request: NextRequest) {
  const next = request.nextUrl.searchParams.get("next") ?? "/settings/integrations";
  return next.startsWith("/") ? next : "/settings/integrations";
}

export async function GET(request: NextRequest) {
  const next = getSafeNext(request);
  const state = randomUUID();
  const result = getLinearAuthorizationUrl(state);

  if (!result.ok) {
    return NextResponse.redirect(
      new URL(`${next}?notice=linear-unavailable`, request.url),
    );
  }

  const response = NextResponse.redirect(result.url);
  response.cookies.set(
    LINEAR_STATE_COOKIE,
    JSON.stringify({
      state,
      next,
    }),
    {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 10,
    },
  );

  return response;
}
