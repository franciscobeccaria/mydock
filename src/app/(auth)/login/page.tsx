import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

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
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 px-4">
      <div className="flex items-center gap-2">
        <div className="bg-primary text-primary-foreground flex size-9 shrink-0 items-center justify-center rounded-md text-base font-bold">
          M
        </div>
        <span className="text-lg font-semibold tracking-tight">MyDock</span>
      </div>

      <div className="w-full max-w-sm space-y-4">
        {!isSupabaseConfigured ? (
          <Alert>
            <AlertTitle>Sign in is temporarily unavailable</AlertTitle>
            <AlertDescription>Please try again in a few minutes.</AlertDescription>
          </Alert>
        ) : null}

        {message ? (
          <Alert>
            <AlertTitle>We couldn&apos;t finish that</AlertTitle>
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        ) : null}

        {isSupabaseConfigured ? (
          <Link
            href="/api/integrations/google/start?next=/dashboard"
            className={cn(buttonVariants({ size: "lg" }), "w-full")}
          >
            Continue with Google <ArrowRight className="ml-2 size-4" />
          </Link>
        ) : (
          <Button className="w-full" size="lg" disabled>
            Continue with Google
          </Button>
        )}
      </div>
    </main>
  );
}
