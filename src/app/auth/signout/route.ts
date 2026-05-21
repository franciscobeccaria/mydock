import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";

const GOOGLE_ACCESS_COOKIE = "mydock_google_access_token";
const GOOGLE_REFRESH_COOKIE = "mydock_google_refresh_token";

export async function POST(request: NextRequest) {
  const supabase = await createClient({ writeCookies: true });

  if (supabase) {
    await supabase.auth.signOut();
  }

  const response = NextResponse.redirect(new URL("/login", request.url), { status: 302 });
  response.cookies.delete(GOOGLE_ACCESS_COOKIE);
  response.cookies.delete(GOOGLE_REFRESH_COOKIE);
  return response;
}
