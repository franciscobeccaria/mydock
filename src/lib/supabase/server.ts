import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import {
  env,
  getSupabasePublishableKey,
  isSupabaseConfigured,
} from "@/lib/env";
import type { Database } from "@/types/supabase";

export async function createClient() {
  if (!isSupabaseConfigured) {
    return null;
  }

  const cookieStore = await cookies();

  return createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL!,
    getSupabasePublishableKey()!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    },
  );
}
