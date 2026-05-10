import { env, getMissingGoogleEnv } from "@/lib/env";

export function getGoogleAuthorizationUrl(state: string) {
  const missingEnv = getMissingGoogleEnv();

  if (missingEnv.length > 0) {
    return {
      ok: false as const,
      missingEnv,
      message:
        "Google OAuth is not configured. Add the required env vars before enabling real Google connections.",
    };
  }

  const scopes = [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/tasks.readonly",
    "https://www.googleapis.com/auth/calendar.events.readonly",
  ];

  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", env.GOOGLE_CLIENT_ID!);
  url.searchParams.set("redirect_uri", env.GOOGLE_REDIRECT_URI!);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("scope", scopes.join(" "));
  url.searchParams.set("state", state);

  return { ok: true as const, url: url.toString(), scopes };
}
