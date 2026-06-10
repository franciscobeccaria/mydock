"use client";

import { Check, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ProviderIcon } from "@/components/widgets/provider-icon";
import { APP_GROUPS, type SlotId } from "@/components/widgets/widget-catalog";

export function WidgetCatalogDialog({
  open,
  onOpenChange,
  isActive,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isActive: (id: SlotId) => boolean;
  onAdd: (id: SlotId) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <DialogHeader className="border-b border-[#F0F0F2] px-6 py-5">
          <DialogTitle className="text-lg">Add a widget</DialogTitle>
          <DialogDescription>
            Choose widgets from your connected apps. You can rearrange or remove them anytime
            while editing.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[65vh]">
          <div className="flex flex-col gap-7 px-6 py-5">
            {APP_GROUPS.map((group) => (
              <section key={group.id} className="flex flex-col gap-3">
                {/* App section header */}
                <div className="flex items-center gap-2">
                  <div className="flex size-6 items-center justify-center rounded-md bg-[#F4F4F5]">
                    <ProviderIcon provider={group.provider} className="size-3.5" />
                  </div>
                  <h3 className="text-xs font-semibold tracking-wide text-[#71717A] uppercase">
                    {group.label}
                  </h3>
                </div>

                {/* Widgets for this app */}
                <ul className="flex flex-col gap-2">
                  {group.widgets.map((widget) => {
                    const active = isActive(widget.id);
                    return (
                      <li
                        key={widget.id}
                        className="flex items-center justify-between gap-4 rounded-xl border border-[#E7E7EA] p-3.5"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-[#18181B]">{widget.label}</p>
                          <p className="text-xs text-[#71717A]">{widget.description}</p>
                        </div>
                        {active ? (
                          <Button variant="ghost" size="sm" disabled className="shrink-0">
                            <Check />
                            Added
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            className="shrink-0"
                            onClick={() => onAdd(widget.id)}
                          >
                            <Plus />
                            Add
                          </Button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
