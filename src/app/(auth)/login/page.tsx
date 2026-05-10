import {
  ArrowRight,
  LayoutDashboard,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { LoginForm } from "@/components/auth/login-form";
import { PageContainer } from "@/components/layout/page-container";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { getMissingSupabaseEnv, isSupabaseConfigured } from "@/lib/env";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const reason = typeof params.reason === "string" ? params.reason : undefined;
  const message =
    reason === "missing-supabase"
      ? `Missing ${getMissingSupabaseEnv().join(", ")}. Add them to continue.`
      : reason === "auth-callback-failed"
        ? "The auth callback could not complete. Try another magic link or review your Supabase redirect settings."
        : undefined;

  return (
    <PageContainer className="flex min-h-screen items-center py-12">
      <div className="grid w-full gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div className="space-y-6">
          <Badge
            variant="outline"
            className="rounded-full px-3 py-1 text-xs font-medium"
          >
            Desktop-first • Read-first • Supabase auth
          </Badge>
          <div className="space-y-4">
            <h1 className="max-w-xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
              The productivity dashboard that feels like a calm desktop.
            </h1>
            <p className="text-muted-foreground max-w-2xl text-lg">
              Connect Linear, Gmail, Google Tasks, and Google Calendar into one
              clean workspace with mock-first widgets and real production
              scaffolding.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <FeatureCard
              icon={<LayoutDashboard className="size-5" />}
              title="Focused layout"
              description="One dashboard, no sidebar, polished cards."
            />
            <FeatureCard
              icon={<ShieldCheck className="size-5" />}
              title="Server-first auth"
              description="Supabase SSR with protected app routes."
            />
            <FeatureCard
              icon={<Sparkles className="size-5" />}
              title="Mock-ready data"
              description="Works before Google or Linear creds exist."
            />
          </div>
        </div>

        <Card className="border-border/70 shadow-xl shadow-black/5">
          <CardContent className="space-y-6 p-8">
            <div>
              <p className="text-muted-foreground text-sm font-medium tracking-[0.18em] uppercase">
                Sign in to MyDock
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight">
                Continue with a magic link
              </h2>
              <p className="text-muted-foreground mt-2 text-sm">
                A Supabase project is required for authentication. Provider
                widgets will still use mock data until their own OAuth
                credentials are added.
              </p>
            </div>

            <LoginForm isConfigured={isSupabaseConfigured} message={message} />

            <div className="bg-accent/40 text-muted-foreground flex items-center justify-between rounded-2xl p-4 text-sm">
              <div>
                <p className="text-foreground font-medium">Need setup help?</p>
                <p className="mt-1">
                  Open the quick setup checklist for local and remote config.
                </p>
              </div>
              <Dialog>
                <DialogTrigger render={<Button variant="outline" />}>
                  Open checklist
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Setup checklist</DialogTitle>
                    <DialogDescription>
                      Use the generated `.env.example`, Supabase docs, and
                      migrations in this repo.
                    </DialogDescription>
                  </DialogHeader>
                  <ol className="text-muted-foreground space-y-3 text-sm">
                    <li>1. Copy `.env.example` to `.env.local`.</li>
                    <li>
                      2. Add `NEXT_PUBLIC_SUPABASE_URL` and
                      `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
                    </li>
                    <li>
                      3. Keep provider OAuth vars empty until you are ready to
                      enable Google or Linear.
                    </li>
                    <li>
                      4. Run `pnpm dev` and sign in with a Supabase magic link.
                    </li>
                  </ol>
                </DialogContent>
              </Dialog>
            </div>

            <div className="bg-accent/40 text-muted-foreground rounded-2xl p-4 text-sm">
              <p className="text-foreground font-medium">What happens next?</p>
              <ol className="mt-3 space-y-2">
                <li className="flex gap-2">
                  <ArrowRight className="mt-0.5 size-4 shrink-0" /> Receive a
                  magic link from Supabase Auth.
                </li>
                <li className="flex gap-2">
                  <ArrowRight className="mt-0.5 size-4 shrink-0" /> Land on
                  `/auth/callback` to exchange the PKCE code for a session.
                </li>
                <li className="flex gap-2">
                  <ArrowRight className="mt-0.5 size-4 shrink-0" /> Open the
                  dashboard with mock widgets and real integration scaffolding.
                </li>
              </ol>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="border-border/70 bg-card/80 rounded-3xl border p-5 shadow-sm">
      <div className="bg-accent text-foreground mb-3 inline-flex size-10 items-center justify-center rounded-2xl">
        {icon}
      </div>
      <h3 className="font-medium">{title}</h3>
      <p className="text-muted-foreground mt-2 text-sm">{description}</p>
    </div>
  );
}
