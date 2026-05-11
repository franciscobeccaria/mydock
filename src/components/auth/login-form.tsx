import { ArrowRight, CalendarDays, CheckCheck, Mail } from "lucide-react";
import Link from "next/link";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const permissionHighlights = [
  {
    icon: <Mail className="size-4" />,
    title: "Inbox",
    description: "See recent messages and unread highlights.",
  },
  {
    icon: <CalendarDays className="size-4" />,
    title: "Calendar",
    description: "Bring the next events in front of you.",
  },
  {
    icon: <CheckCheck className="size-4" />,
    title: "Tasks",
    description: "Keep your pending tasks in view.",
  },
];

export function LoginForm({
  isConfigured,
  message,
}: {
  isConfigured: boolean;
  message?: string;
}) {
  return (
    <div className="space-y-5">
      {!isConfigured ? (
        <Alert>
          <AlertTitle>Sign in is temporarily unavailable</AlertTitle>
          <AlertDescription>
            Please try again in a few minutes.
          </AlertDescription>
        </Alert>
      ) : null}

      {message ? (
        <Alert>
          <AlertTitle>We couldn&apos;t finish that</AlertTitle>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-3">
        {permissionHighlights.map((item) => (
          <div
            key={item.title}
            className="border-border/70 bg-accent/20 rounded-2xl border p-4"
          >
            <div className="bg-background text-foreground mb-3 inline-flex size-8 items-center justify-center rounded-xl border">
              {item.icon}
            </div>
            <p className="font-medium">{item.title}</p>
            <p className="text-muted-foreground mt-1 text-sm">
              {item.description}
            </p>
          </div>
        ))}
      </div>

      {isConfigured ? (
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

      <p className="text-muted-foreground text-center text-sm">
        You can review or update access later from Integrations.
      </p>
    </div>
  );
}
