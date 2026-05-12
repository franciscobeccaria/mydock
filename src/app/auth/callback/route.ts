import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

import { syncGoogleWorkspaceFromSession } from "@/features/integrations/providers/google/account";
import { createClient } from "@/lib/supabase/server";

function getSafeNext(request: NextRequest) {
  const next = request.nextUrl.searchParams.get("next") ?? "/dashboard";
  return next.startsWith("/") ? next : "/dashboard";
}

function isGoogleSessionProvider(
  provider: string | undefined,
  providers: unknown,
  identities: { provider?: string }[] | undefined,
) {
  if (provider === "google") {
    return true;
  }

  if (Array.isArray(providers) && providers.includes("google")) {
    return true;
  }

  return identities?.some((identity) => identity.provider === "google") ?? false;
}

export async function GET(request: NextRequest) {
  const redirectUrl = new URL(getSafeNext(request), request.url);
  const supabase = await createClient({ writeCookies: true });

  if (!supabase) {
    return NextResponse.redirect(new URL("/login?reason=auth-unavailable", request.url));
  }

  const code = request.nextUrl.searchParams.get("code");

  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      if (
        data.session &&
        isGoogleSessionProvider(
          data.session.user.app_metadata.provider,
          data.session.user.app_metadata.providers,
          data.session.user.identities,
        )
      ) {
        try {
          await syncGoogleWorkspaceFromSession({
            sessionClient: supabase,
            session: data.session,
          });
        } catch (syncError) {
          console.error("Google workspace sync failed", syncError);
        }
      }

      return NextResponse.redirect(redirectUrl);
    }
  }

  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type") as EmailOtpType | null;

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    });

    if (!error) {
      return NextResponse.redirect(redirectUrl);
    }
  }

  return NextResponse.redirect(new URL("/login?reason=auth-failed", request.url));
}
