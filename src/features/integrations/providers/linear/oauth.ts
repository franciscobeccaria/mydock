import { env, getMissingLinearEnv } from "@/lib/env";

export function getLinearAuthorizationUrl(state: string) {
  const missingEnv = getMissingLinearEnv();

  if (missingEnv.length > 0) {
    return {
      ok: false as const,
      missingEnv,
      message:
        "Linear OAuth is not configured. Add the required env vars before enabling real Linear connections.",
    };
  }

  const url = new URL("https://linear.app/oauth/authorize");
  url.searchParams.set("client_id", env.LINEAR_CLIENT_ID!);
  url.searchParams.set("redirect_uri", env.LINEAR_REDIRECT_URI!);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "read");
  url.searchParams.set("state", state);

  return { ok: true as const, url: url.toString(), scopes: ["read"] };
}
