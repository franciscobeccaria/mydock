import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import {
  env,
  isSupabaseConfigured,
  isSupabaseServiceRoleConfigured,
} from "@/lib/env";
import type { Database } from "@/types/supabase";

export function createServiceRoleClient() {
  if (!isSupabaseConfigured || !isSupabaseServiceRoleConfigured) {
    return null;
  }

  return createSupabaseClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL!,
    env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
