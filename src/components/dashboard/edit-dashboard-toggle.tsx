"use client";

import { Check, Pencil } from "lucide-react";

import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useDashboardMode } from "@/components/dashboard/dashboard-mode-context";

export function EditDashboardToggle() {
  const { isEditing, toggleMode } = useDashboardMode();

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton
          onClick={toggleMode}
          isActive={isEditing}
          tooltip={isEditing ? "Done" : "Edit dashboard"}
        >
          {isEditing ? <Check /> : <Pencil />}
          <span>{isEditing ? "Done" : "Edit dashboard"}</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
