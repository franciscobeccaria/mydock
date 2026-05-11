"use client";

import { useQueryClient } from "@tanstack/react-query";
import { LayoutGrid, LogOut, RefreshCw, Settings, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export function AppHeader({
  name,
  email,
}: {
  name: string;
  email: string | undefined;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isPending, startTransition] = useTransition();

  return (
    <header className="border-border/70 bg-background/85 sticky top-0 z-20 border-b backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="bg-primary text-primary-foreground flex size-10 items-center justify-center rounded-2xl shadow-sm">
            <Sparkles className="size-5" />
          </div>
          <div className="min-w-0">
            <span className="text-lg font-semibold tracking-tight">MyDock</span>
            <p className="text-muted-foreground truncate text-sm">
              Your workday, in one place.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              startTransition(async () => {
                await fetch("/api/widgets/refresh", { method: "POST" });
                await Promise.all([
                  queryClient.invalidateQueries({ queryKey: ["widgets"] }),
                  queryClient.invalidateQueries({ queryKey: ["integrations-status"] }),
                ]);
                toast.success("Workspace refreshed.");
              });
            }}
          >
            <RefreshCw className={isPending ? "mr-2 size-4 animate-spin" : "mr-2 size-4"} />
            Refresh
          </Button>
          <Link
            href="/settings/integrations"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <Settings className="mr-2 size-4" />
            Integrations
          </Link>

          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button variant="ghost" className="h-10 rounded-full px-1.5" />}
            >
              <Avatar className="border-border/70 size-8 border">
                <AvatarFallback>{name.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <div className="px-2 py-1.5">
                <div className="flex items-center gap-3">
                  <Avatar className="border-border/70 size-10 border">
                    <AvatarFallback>{name.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate font-medium">{name}</p>
                    <p className="text-muted-foreground truncate text-xs font-normal">
                      {email ?? "Signed in"}
                    </p>
                  </div>
                </div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push("/dashboard")}>
                <LayoutGrid className="mr-2 size-4" /> Dashboard
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push("/settings/integrations")}>
                <Settings className="mr-2 size-4" /> Integrations
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <form action="/auth/signout" method="post">
                <button
                  className={cn(
                    "flex w-full items-center rounded-md px-2 py-1.5 text-sm",
                    "hover:bg-accent",
                  )}
                  type="submit"
                >
                  <LogOut className="mr-2 size-4" /> Sign out
                </button>
              </form>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
