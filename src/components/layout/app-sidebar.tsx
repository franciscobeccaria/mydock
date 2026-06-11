"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { LayoutGrid, Plug } from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { NavUser } from "@/components/layout/nav-user";
import { EditDashboardToggle } from "@/components/dashboard/edit-dashboard-toggle";

// Top-level navigation. Dashboard is the root route (/).
const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutGrid },
  { href: "/connections", label: "Connections", icon: Plug },
] as const;

interface AppSidebarProps {
  user: {
    name: string;
    email: string;
    avatarUrl?: string | null;
  };
}

export function AppSidebar({ user }: AppSidebarProps) {
  const pathname = usePathname();
  const onDashboard = pathname === "/";

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center justify-between gap-2 px-1 py-1 group-data-[collapsible=icon]:justify-center">
          {/* Expanded: logo + trigger */}
          <Link
            href="/"
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

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_ITEMS.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    isActive={pathname === item.href}
                    tooltip={item.label}
                    render={
                      <Link href={item.href}>
                        <item.icon />
                        <span>{item.label}</span>
                      </Link>
                    }
                  />
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <NavUser {...user} />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
