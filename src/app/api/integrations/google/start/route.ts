import { NextResponse, type NextRequest } from "next/server";

import { allGoogleWorkspaceScopes } from "@/features/integrations/providers/google/types";
import { createClient } from "@/lib/supabase/server";

function getSafeNext(request: NextRequest) {
  const next = request.nextUrl.searchParams.get("next") ?? "/";
  return next.startsWith("/") ? next : "/";
}

export async function GET(request: NextRequest) {
  const supabase = await createClient({ writeCookies: true });

  if (!supabase) {
    return NextResponse.redirect(new URL("/login?reason=auth-unavailable", request.url));
  }

  const next = getSafeNext(request);
  const redirectTo = new URL(`/auth/callback?next=${encodeURIComponent(next)}`, request.nextUrl.origin).toString();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
      scopes: allGoogleWorkspaceScopes.join(" "),
      queryParams: {
        access_type: "offline",
        include_granted_scopes: "true",
        prompt: "consent",
      },
    },
  });

  if (error || !data.url) {
    console.error("Google sign-in could not start", error);

    const fallbackPath = next.startsWith("/connections")
      ? "/connections?notice=google-unavailable"
      : "/login?reason=auth-unavailable";

    return NextResponse.redirect(new URL(fallbackPath, request.url));
  }

  return NextResponse.redirect(data.url);
}
