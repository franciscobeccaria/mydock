import { z } from "zod";

const envSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1).optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  TOKEN_ENCRYPTION_SECRET: z.string().min(1).optional(),
  GOOGLE_CLIENT_ID: z.string().min(1).optional(),
  GOOGLE_CLIENT_SECRET: z.string().min(1).optional(),
  GOOGLE_REDIRECT_URI: z.string().url().optional(),
  LINEAR_CLIENT_ID: z.string().min(1).optional(),
  LINEAR_CLIENT_SECRET: z.string().min(1).optional(),
  LINEAR_REDIRECT_URI: z.string().url().optional(),
  OPENAI_API_KEY: z.string().min(1).optional(),
});

const rawEnv = {
  NEXT_PUBLIC_APP_URL:
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  TOKEN_ENCRYPTION_SECRET: process.env.TOKEN_ENCRYPTION_SECRET,
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI,
  LINEAR_CLIENT_ID: process.env.LINEAR_CLIENT_ID,
  LINEAR_CLIENT_SECRET: process.env.LINEAR_CLIENT_SECRET,
  LINEAR_REDIRECT_URI: process.env.LINEAR_REDIRECT_URI,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
};

const parsed = envSchema.safeParse(rawEnv);

export const env = parsed.success
  ? parsed.data
  : {
      ...rawEnv,
      NEXT_PUBLIC_APP_URL: rawEnv.NEXT_PUBLIC_APP_URL,
    };

export const envValidationIssues = parsed.success ? [] : parsed.error.issues;

export function getSupabasePublishableKey() {
  return (
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export const isSupabaseConfigured = Boolean(
  env.NEXT_PUBLIC_SUPABASE_URL && getSupabasePublishableKey(),
);

export const isSupabaseServiceRoleConfigured = Boolean(
  env.SUPABASE_SERVICE_ROLE_KEY,
);

export function getMissingSupabaseEnv() {
  const missing: string[] = [];

  if (!env.NEXT_PUBLIC_SUPABASE_URL) {
    missing.push("NEXT_PUBLIC_SUPABASE_URL");
  }

  if (!getSupabasePublishableKey()) {
    missing.push(
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY)",
    );
  }

  return missing;
}

export function getMissingGoogleEnv() {
  const missing: string[] = [];

  if (!env.GOOGLE_CLIENT_ID) missing.push("GOOGLE_CLIENT_ID");
  if (!env.GOOGLE_CLIENT_SECRET) missing.push("GOOGLE_CLIENT_SECRET");
  if (!env.GOOGLE_REDIRECT_URI) missing.push("GOOGLE_REDIRECT_URI");

  return missing;
}

export function getMissingLinearEnv() {
  const missing: string[] = [];

  if (!env.LINEAR_CLIENT_ID) missing.push("LINEAR_CLIENT_ID");
  if (!env.LINEAR_CLIENT_SECRET) missing.push("LINEAR_CLIENT_SECRET");
  if (!env.LINEAR_REDIRECT_URI) missing.push("LINEAR_REDIRECT_URI");

  return missing;
}
