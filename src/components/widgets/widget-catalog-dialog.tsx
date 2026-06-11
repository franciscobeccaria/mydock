"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectIcon,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProviderIcon } from "@/components/widgets/provider-icon";
import { APP_GROUPS, CATALOG_BY_ID, type SlotId } from "@/components/widgets/widget-catalog";

/** A connectable account shown in the catalog's account dropdown. */
export type WidgetAccount = { id: string | null; label: string };

// Sentinel select value for the default (login) account, whose id is `null`.
const DEFAULT_ACCOUNT = "__default__";

export function WidgetCatalogDialog({
  open,
  onOpenChange,
  accounts,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Connectable accounts; today just the single login account. */
  accounts: WidgetAccount[];
  onAdd: (slotId: SlotId, accountId: string | null) => void;
}) {
  // The widget chosen in the list; its account is picked in the footer. Null
  // until a widget is selected, when the footer's add controls appear.
  const [selected, setSelected] = useState<SlotId | null>(null);
  const [accountValue, setAccountValue] = useState(DEFAULT_ACCOUNT);

  // Reset the in-progress selection as the dialog closes (event-driven, not an
  // effect) so it reopens clean.
  function handleOpenChange(next: boolean) {
    if (!next) {
      setSelected(null);
      setAccountValue(DEFAULT_ACCOUNT);
    }
    onOpenChange(next);
  }

  function resolveAccountId(): string | null {
    return accountValue === DEFAULT_ACCOUNT ? null : accountValue;
  }

  function commit(keepOpen: boolean) {
    if (!selected) return;
    onAdd(selected, resolveAccountId());
    if (keepOpen) {
      // "Add & choose another": keep the dialog open, clear the chosen widget so
      // the user can pick the next one (duplicates are allowed).
      setSelected(null);
    } else {
      handleOpenChange(false);
    }
  }

  const selectedEntry = selected ? CATALOG_BY_ID[selected] : null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <DialogHeader className="border-b border-[#F0F0F2] px-6 py-5">
          <DialogTitle className="text-lg">Add a widget</DialogTitle>
          <DialogDescription>
            Choose widgets from your connected apps. Add more than one of the same widget to
            track different projects or accounts side by side.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[55vh]">
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

                {/* Widgets for this app — duplicates allowed, so every widget can
                    always be added (no "already added" disabling). */}
                <ul className="flex flex-col gap-2">
                  {group.widgets.map((widget) => {
                    const isSelected = selected === widget.id;
                    return (
                      <li
                        key={widget.id}
                        className={
                          "flex items-center justify-between gap-4 rounded-xl border p-3.5 transition-colors " +
                          (isSelected
                            ? "border-[#18181B] bg-[#FAFAFA]"
                            : "border-[#E7E7EA]")
                        }
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-[#18181B]">{widget.label}</p>
                          <p className="text-xs text-[#71717A]">{widget.description}</p>
                        </div>
                        <Button
                          variant={isSelected ? "default" : "outline"}
                          size="sm"
                          className="shrink-0"
                          onClick={() => setSelected(widget.id)}
                        >
                          <Plus />
                          {isSelected ? "Selected" : "Add"}
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        </ScrollArea>

        {/* Footer: account picker + add actions, shown once a widget is chosen. */}
        {selectedEntry ? (
          <div className="flex flex-col gap-3 border-t border-[#F0F0F2] px-6 py-4">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs font-medium tracking-wide text-[#71717A] uppercase">
                  Adding
                </p>
                <p className="truncate text-sm font-semibold text-[#18181B]">
                  {selectedEntry.label}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="text-[11px] font-medium text-[#A1A1AA]">Account</span>
                <Select value={accountValue} onValueChange={(v) => setAccountValue(String(v))}>
                  <SelectTrigger className="h-9 min-w-[180px] text-[13px]">
                    <SelectValue>
                      {() =>
                        accounts.find((a) => (a.id ?? DEFAULT_ACCOUNT) === accountValue)?.label ??
                        accounts[0]?.label
                      }
                    </SelectValue>
                    <SelectIcon />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((account) => (
                      <SelectItem
                        key={account.id ?? DEFAULT_ACCOUNT}
                        value={account.id ?? DEFAULT_ACCOUNT}
                      >
                        {account.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
              <Button variant="outline" size="sm" onClick={() => commit(true)}>
                Add &amp; choose another
              </Button>
              <Button size="sm" onClick={() => commit(false)}>
                Add widget
              </Button>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
