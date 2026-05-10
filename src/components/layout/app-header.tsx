"use client";

import { useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  LayoutGrid,
  LogOut,
  PanelRightOpen,
  RefreshCw,
  Settings,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
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
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold tracking-tight">
                MyDock
              </span>
              <Badge variant="secondary" className="rounded-full">
                MVP
              </Badge>
            </div>
            <p className="text-muted-foreground truncate text-sm">
              Your workday, in one place.
            </p>
          </div>
        </div>

        <div className="hidden items-center gap-2 md:flex">
          <Badge
            variant="outline"
            className="rounded-full px-3 py-1 text-xs font-medium"
          >
            <Bell className="mr-1 size-3.5" /> Cloud auth + mock data
          </Badge>
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
                  queryClient.invalidateQueries({
                    queryKey: ["integrations-status"],
                  }),
                ]);
                toast.success("Widget snapshots refreshed.");
              });
            }}
          >
            <RefreshCw
              className={isPending ? "mr-2 size-4 animate-spin" : "mr-2 size-4"}
            />
            Refresh
          </Button>
          <Link
            href="/settings/integrations"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <Settings className="mr-2 size-4" />
            Integrations
          </Link>

          <Sheet>
            <SheetTrigger
              render={
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Open quick guide"
                />
              }
            >
              <PanelRightOpen className="size-4" />
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Quick guide</SheetTitle>
                <SheetDescription>
                  MyDock is running with real Supabase auth and mock-first
                  provider widgets.
                </SheetDescription>
              </SheetHeader>
              <div className="text-muted-foreground mt-6 space-y-4 text-sm">
                <div className="border-border/70 rounded-2xl border p-4">
                  <p className="text-foreground font-medium">Today</p>
                  <p className="mt-2">
                    Use Refresh to rehydrate mock snapshots and validate widget
                    loading flows.
                  </p>
                </div>
                <div className="border-border/70 rounded-2xl border p-4">
                  <p className="text-foreground font-medium">Next</p>
                  <p className="mt-2">
                    Add Google and Linear credentials in `.env.local`, then wire
                    token exchange in the scaffolded callbacks.
                  </p>
                </div>
              </div>
            </SheetContent>
          </Sheet>

          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="ghost" className="h-10 rounded-full px-1.5" />
              }
            >
              <Avatar className="border-border/70 size-8 border">
                <AvatarFallback>
                  {name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel>
                <div className="flex items-center gap-3">
                  <Avatar className="border-border/70 size-10 border">
                    <AvatarFallback>
                      {name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate font-medium">{name}</p>
                    <p className="text-muted-foreground truncate text-xs font-normal">
                      {email ?? "Signed in"}
                    </p>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push("/dashboard")}>
                <LayoutGrid className="mr-2 size-4" /> Dashboard
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => router.push("/settings/integrations")}
              >
                <Settings className="mr-2 size-4" /> Integrations
              </DropdownMenuItem>
              <Separator className="my-1" />
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
