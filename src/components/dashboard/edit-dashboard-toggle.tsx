"use client";

import { Check, Pencil, Plus } from "lucide-react";

import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useDashboardMode } from "@/components/dashboard/dashboard-mode-context";

export function EditDashboardToggle() {
  const { isEditing, toggleMode, setCatalogOpen } = useDashboardMode();

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

      {/* Add-widget lives here (not in the grid) so it never reorders or leaves a
          phantom tile. Only while editing — adding is an edit-mode action. */}
      {isEditing ? (
        <SidebarMenuItem>
          <SidebarMenuButton onClick={() => setCatalogOpen(true)} tooltip="Add widget">
            <Plus />
            <span>Add widget</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ) : null}
    </SidebarMenu>
  );
}
