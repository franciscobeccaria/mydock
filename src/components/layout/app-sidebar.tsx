"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { NavUser } from "@/components/layout/nav-user";
import { EditDashboardToggle } from "@/components/dashboard/edit-dashboard-toggle";

interface AppSidebarProps {
  user: {
    name: string;
    email: string;
    avatarUrl?: string | null;
  };
}

export function AppSidebar({ user }: AppSidebarProps) {
  const pathname = usePathname();
  const onDashboard = pathname === "/dashboard";

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center justify-between gap-2 px-1 py-1 group-data-[collapsible=icon]:justify-center">
          {/* Expanded: logo + trigger */}
          <Link
            href="/dashboard"
            className="flex items-center gap-2 overflow-hidden group-data-[collapsible=icon]:hidden"
          >
            <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground text-xs font-bold">
              M
            </div>
            <span className="font-semibold tracking-tight text-sm">MyDock</span>
          </Link>
          <SidebarTrigger className="shrink-0 group-data-[collapsible=icon]:hidden" />

          {/* Collapsed: icon fades to trigger on hover */}
          <div className="group/logo relative hidden group-data-[collapsible=icon]:flex size-7 items-center justify-center">
            <div className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground text-xs font-bold transition-opacity duration-150 group-hover/logo:opacity-0">
              M
            </div>
            <SidebarTrigger className="absolute inset-0 size-7 opacity-0 transition-opacity duration-150 group-hover/logo:opacity-100" />
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {onDashboard ? (
          <SidebarGroup>
            <SidebarGroupContent>
              <EditDashboardToggle />
            </SidebarGroupContent>
          </SidebarGroup>
        ) : null}
      </SidebarContent>

      <SidebarFooter>
        <NavUser {...user} />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
