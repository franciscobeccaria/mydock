import { NextResponse, type NextRequest } from "next/server";

import {
  exchangeLinearCodeForToken,
  fetchLinearViewer,
  storeLinearConnection,
} from "@/features/integrations/providers/linear/account";
import { env, getMissingLinearEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

const LINEAR_STATE_COOKIE = "mydock_linear_oauth_state";

export async function GET(request: NextRequest) {
  const missingEnv = getMissingLinearEnv();

  if (missingEnv.length > 0) {
    return NextResponse.redirect(
      new URL("/settings/integrations?notice=linear-unavailable", request.url),
    );
  }

  const cookieValue = request.cookies.get(LINEAR_STATE_COOKIE)?.value;
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const error = request.nextUrl.searchParams.get("error");

  let safeNext = "/settings/integrations";
  let expectedState: string | null = null;

  if (cookieValue) {
    try {
      const parsed = JSON.parse(cookieValue) as { next?: string; state?: string };
      if (parsed.next?.startsWith("/")) {
        safeNext = parsed.next;
      }
      expectedState = parsed.state ?? null;
    } catch {
      expectedState = null;
    }
  }

  const errorRedirect = new URL(`${safeNext}?notice=linear-error`, request.url);

  if (error || !code || !state || !expectedState || state !== expectedState) {
    const response = NextResponse.redirect(errorRedirect);
    response.cookies.delete(LINEAR_STATE_COOKIE);
    return response;
  }

  const supabase = await createClient();

  if (!supabase) {
    const response = NextResponse.redirect(errorRedirect);
    response.cookies.delete(LINEAR_STATE_COOKIE);
    return response;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.delete(LINEAR_STATE_COOKIE);
    return response;
  }

  try {
    const token = await exchangeLinearCodeForToken({
      code,
      redirectUri: env.LINEAR_REDIRECT_URI!,
      clientId: env.LINEAR_CLIENT_ID!,
      clientSecret: env.LINEAR_CLIENT_SECRET!,
    });
    const viewer = await fetchLinearViewer(token.access_token!);
    await storeLinearConnection({
      userId: user.id,
      token,
      viewer,
    });

    const response = NextResponse.redirect(
      new URL(`${safeNext}?notice=linear-connected`, request.url),
    );
    response.cookies.delete(LINEAR_STATE_COOKIE);
    return response;
  } catch (callbackError) {
    console.error("Linear OAuth callback failed", callbackError);
    const response = NextResponse.redirect(errorRedirect);
    response.cookies.delete(LINEAR_STATE_COOKIE);
    return response;
  }
}
