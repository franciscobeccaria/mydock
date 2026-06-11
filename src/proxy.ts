import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { env, getSupabasePublishableKey, isSupabaseConfigured } from "@/lib/env";
import type { Database } from "@/types/supabase";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public paths that must never be auth-gated. Everything else is protected
  // by default (the matcher below also excludes static assets / API / auth).
  if (pathname === "/login" || pathname.startsWith("/auth")) {
    return NextResponse.next();
  }

  if (!isSupabaseConfigured) {
    return NextResponse.redirect(new URL("/login?reason=auth-unavailable", request.url));
  }

  const response = NextResponse.next();
  const supabase = createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL!,
    getSupabasePublishableKey()!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return response;
}

export const config = {
  // Protect by default: run on every path except API routes, static assets,
  // and metadata files. Public auth paths (/login, /auth/*) are let through
  // inside the proxy function above.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)"],
};
