"use client";

import {
  LayoutGrid,
  LogOut,
  Plus,
  Settings,
  Sparkles,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
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
  const pathname = usePathname();
  const router = useRouter();
  const isDashboard = pathname === "/";

  return (
    <header className="sticky top-0 z-20 border-b border-[#ECECEF] bg-[#FAFAFA]/95 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4 px-5 py-5 sm:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-2xl border border-[#ECECEF] bg-white text-[#18181B] shadow-sm">
            <Sparkles className="size-[18px]" />
          </div>
          <span className="text-lg font-semibold tracking-tight text-[#18181B]">
            MyDock
          </span>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            disabled
            className="rounded-full border-[#E4E4E7] bg-white px-4 text-[#18181B] shadow-sm hover:bg-[#F4F4F5]"
          >
            <Plus className="size-4" />
            Add widget
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  className="h-11 rounded-full border border-transparent px-1.5 hover:bg-transparent"
                />
              }
            >
              <Avatar className="size-9 border border-[#E4E4E7] bg-white">
                <AvatarFallback>{name.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 rounded-2xl">
              <div className="px-2 py-1.5">
                <div className="flex items-center gap-3">
                  <Avatar className="size-10 border border-[#E4E4E7] bg-white">
                    <AvatarFallback>{name.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate font-medium text-[#18181B]">{name}</p>
                    <p className="truncate text-xs font-normal text-[#71717A]">
                      {email ?? "Signed in"}
                    </p>
                  </div>
                </div>
              </div>
              <DropdownMenuSeparator />
              {isDashboard ? (
                <DropdownMenuItem onClick={() => router.push("/connections")}>
                  <Settings className="mr-2 size-4" /> Connections
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={() => router.push("/")}>
                  <LayoutGrid className="mr-2 size-4" /> Dashboard
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <form action="/auth/signout" method="post">
                <button
                  className={cn(
                    "flex w-full items-center rounded-md px-2 py-1.5 text-sm text-[#18181B]",
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
