import { redirect } from "next/navigation";
import { CalendarRange, Mail, PanelsTopLeft, Sparkles } from "lucide-react";

import { LoginForm } from "@/components/auth/login-form";
import { PageContainer } from "@/components/layout/page-container";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

const featureList = [
  {
    icon: <PanelsTopLeft className="size-5" />,
    title: "One calm workspace",
    description: "Keep your most important updates in a single desktop view.",
  },
  {
    icon: <Mail className="size-5" />,
    title: "Inbox + tasks together",
    description: "See messages, tasks, and your next events without tab hopping.",
  },
  {
    icon: <CalendarRange className="size-5" />,
    title: "Built for your day",
    description: "Start with the highlights that matter right now.",
  },
];

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const supabase = await createClient();

  if (supabase) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      redirect("/dashboard");
    }
  }

  const params = await searchParams;
  const reason = typeof params.reason === "string" ? params.reason : undefined;
  const message =
    reason === "auth-failed"
      ? "We couldn't finish signing you in. Please try again."
      : reason === "auth-unavailable"
        ? "Google sign in isn't available right now."
        : undefined;

  return (
    <PageContainer className="flex min-h-screen items-center py-12">
      <div className="grid w-full gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div className="space-y-6">
          <Badge variant="outline" className="rounded-full px-3 py-1 text-xs font-medium">
            Google-first workspace
          </Badge>
          <div className="space-y-4">
            <h1 className="max-w-xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
              Bring your inbox, calendar, tasks, and focus into one place.
            </h1>
            <p className="text-muted-foreground max-w-2xl text-lg">
              MyDock turns the tools you already use into a calm daily workspace built for a big screen.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {featureList.map((feature) => (
              <div key={feature.title} className="border-border/70 bg-card/80 rounded-3xl border p-5 shadow-sm">
                <div className="bg-accent text-foreground mb-3 inline-flex size-10 items-center justify-center rounded-2xl">
                  {feature.icon}
                </div>
                <h3 className="font-medium">{feature.title}</h3>
                <p className="text-muted-foreground mt-2 text-sm">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>

        <Card className="border-border/70 shadow-xl shadow-black/5">
          <CardContent className="space-y-6 p-8">
            <div>
              <p className="text-muted-foreground text-sm font-medium tracking-[0.18em] uppercase">
                Sign in to MyDock
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight">
                Continue with your Google account
              </h2>
              <p className="text-muted-foreground mt-2 text-sm">
                Sign in once and choose the Google tools you want to bring into your workspace.
              </p>
            </div>

            <LoginForm isConfigured={isSupabaseConfigured} message={message} />

            <div className="bg-accent/30 rounded-2xl p-4 text-sm">
              <div className="text-foreground flex items-center gap-2 font-medium">
                <Sparkles className="size-4" /> What you&apos;ll see first
              </div>
              <ul className="text-muted-foreground mt-3 space-y-2">
                <li>Your top inbox signals</li>
                <li>Upcoming events and tasks</li>
                <li>A clean dashboard you can scan in seconds</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
