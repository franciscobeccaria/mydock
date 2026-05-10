import { NextResponse } from "next/server";

import {
  envValidationIssues,
  getMissingGoogleEnv,
  getMissingLinearEnv,
  getMissingSupabaseEnv,
  isSupabaseConfigured,
} from "@/lib/env";

export async function GET() {
  return NextResponse.json({
    ok: true,
    app: "mydock",
    supabaseConfigured: isSupabaseConfigured,
    missingEnv: {
      supabase: getMissingSupabaseEnv(),
      google: getMissingGoogleEnv(),
      linear: getMissingLinearEnv(),
    },
    envValidationIssues,
  });
}
