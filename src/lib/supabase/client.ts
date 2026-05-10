"use client";

import { createBrowserClient } from "@supabase/ssr";

import {
  env,
  getSupabasePublishableKey,
  isSupabaseConfigured,
} from "@/lib/env";
import type { Database } from "@/types/supabase";

export function createClient() {
  if (!isSupabaseConfigured) {
    return null;
  }

  return createBrowserClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL!,
    getSupabasePublishableKey()!,
  );
}
