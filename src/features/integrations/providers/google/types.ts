import type { GoogleCapabilityProvider } from "@/features/integrations/types";

export const googleIdentityScopes = [
  "openid",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
] as const;

export const googleProviderScopes = {
  gmail: ["https://www.googleapis.com/auth/gmail.readonly"],
  google_tasks: ["https://www.googleapis.com/auth/tasks.readonly"],
  google_calendar: [
    "https://www.googleapis.com/auth/calendar.events.readonly",
  ],
} as const satisfies Record<GoogleCapabilityProvider, readonly string[]>;

export const googleCapabilityProviders = [
  "gmail",
  "google_tasks",
  "google_calendar",
] as const satisfies readonly GoogleCapabilityProvider[];

export const allGoogleWorkspaceScopes = [
  ...googleIdentityScopes,
  ...googleCapabilityProviders.flatMap((provider) => googleProviderScopes[provider]),
] as const;

export function getRequiredGoogleScopes(provider: GoogleCapabilityProvider) {
  return [...googleProviderScopes[provider]];
}
