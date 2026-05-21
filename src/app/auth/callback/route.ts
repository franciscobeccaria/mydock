import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

import { encryptSecret } from "@/lib/crypto";
import { syncGoogleWorkspaceFromSession } from "@/features/integrations/providers/google/account";
import { createClient } from "@/lib/supabase/server";

const GOOGLE_ACCESS_COOKIE = "mydock_google_access_token";
const GOOGLE_REFRESH_COOKIE = "mydock_google_refresh_token";

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
      const response = NextResponse.redirect(redirectUrl);

      if (
        data.session &&
        isGoogleSessionProvider(
          data.session.user.app_metadata.provider,
          data.session.user.app_metadata.providers,
          data.session.user.identities,
        )
      ) {
        if (data.session.provider_token) {
          response.cookies.set(GOOGLE_ACCESS_COOKIE, encryptSecret(data.session.provider_token) ?? "", {
            httpOnly: true,
            secure: true,
            sameSite: "lax",
            path: "/",
            maxAge: 60 * 60 * 24 * 7,
          });
        }

        if (data.session.provider_refresh_token) {
          response.cookies.set(
            GOOGLE_REFRESH_COOKIE,
            encryptSecret(data.session.provider_refresh_token) ?? "",
            {
              httpOnly: true,
              secure: true,
              sameSite: "lax",
              path: "/",
              maxAge: 60 * 60 * 24 * 30,
            },
          );
        }

        try {
          await syncGoogleWorkspaceFromSession({
            sessionClient: supabase,
            session: data.session,
          });
        } catch (syncError) {
          console.error("Google workspace sync failed", syncError);
        }
      }

      return response;
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
