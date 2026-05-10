"use client";

import { Mail, Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

export function LoginForm({
  isConfigured,
  message,
}: {
  isConfigured: boolean;
  message?: string;
}) {
  const [email, setEmail] = useState("");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatusMessage(null);

    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setStatusMessage("Enter an email address to continue.");
      return;
    }

    const supabase = createClient();

    if (!supabase) {
      setStatusMessage("Supabase is not configured yet.");
      return;
    }

    setIsSubmitting(true);

    const { error } = await supabase.auth.signInWithOtp({
      email: trimmedEmail,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
      },
    });

    setIsSubmitting(false);

    if (error) {
      setStatusMessage(error.message);
      return;
    }

    setEmail("");
    setStatusMessage("Magic link sent. Check your inbox to finish signing in.");
    toast.success("Magic link sent.");
  }

  return (
    <div className="space-y-5">
      {!isConfigured ? (
        <Alert>
          <AlertTitle>Supabase configuration required</AlertTitle>
          <AlertDescription>
            Add your Supabase URL and publishable key in `.env.local` before
            signing in.
          </AlertDescription>
        </Alert>
      ) : null}

      {message ? (
        <Alert>
          <AlertTitle>Heads up</AlertTitle>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      ) : null}

      <form className="space-y-4" onSubmit={onSubmit}>
        <div className="space-y-2">
          <Label htmlFor="email">Work email</Label>
          <div className="relative">
            <Mail className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input
              id="email"
              type="email"
              placeholder="you@company.com"
              className="pl-9"
              disabled={!isConfigured || isSubmitting}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
        </div>

        {statusMessage ? (
          <p className="text-muted-foreground text-sm">{statusMessage}</p>
        ) : null}

        <Button
          className="w-full"
          type="submit"
          disabled={!isConfigured || isSubmitting}
        >
          <Send className="mr-2 size-4" />
          {isSubmitting ? "Sending link…" : "Send magic link"}
        </Button>
      </form>
    </div>
  );
}
