"use client";

import { useState } from "react";

import { ShortcutFavicon } from "@/components/dashboard/shortcut-favicon";
import { normalizeUrl } from "@/components/dashboard/use-shortcuts";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AddShortcutDialog({
  open,
  onOpenChange,
  existingUrls,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Normalized URLs already on the dock, for duplicate prevention. */
  existingUrls: string[];
  onAdd: (shortcut: { name: string; url: string; iconUrl?: string }) => void;
}) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [iconUrl, setIconUrl] = useState("");

  const normalized = normalizeUrl(url);
  const normalizedIcon = normalizeUrl(iconUrl);
  const trimmedName = name.trim();
  const isDuplicate = !!normalized && existingUrls.includes(normalized);
  const urlInvalid = url.trim().length > 0 && !normalized;
  const iconInvalid = iconUrl.trim().length > 0 && !normalizedIcon;
  const canSubmit = !!trimmedName && !!normalized && !isDuplicate && !iconInvalid;

  const error = urlInvalid
    ? "Enter a valid URL."
    : isDuplicate
      ? "That shortcut already exists."
      : iconInvalid
        ? "Enter a valid image URL, or leave it blank."
        : null;

  function reset() {
    setName("");
    setUrl("");
    setIconUrl("");
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;
    onAdd({ name: trimmedName, url, iconUrl: normalizedIcon || undefined });
    reset();
    onOpenChange(false);
  }

  function handleOpenChange(next: boolean) {
    if (!next) reset();
    onOpenChange(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Add shortcut</DialogTitle>
          <DialogDescription>
            Open any site in one tap. We&apos;ll fetch its icon automatically, or
            set a custom one.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            {/* Live preview of the resulting chip. */}
            <div className="flex size-11 shrink-0 items-center justify-center rounded-[14px] border border-[#E7E7EA] bg-white">
              <ShortcutFavicon
                url={normalized}
                name={trimmedName}
                iconUrl={normalizedIcon}
              />
            </div>
            <p className="min-w-0 truncate text-sm text-[#71717A]">
              {trimmedName || "Your shortcut"}
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="shortcut-name">Name</Label>
            <Input
              id="shortcut-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Figma"
              autoComplete="off"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="shortcut-url">URL</Label>
            <Input
              id="shortcut-url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="figma.com"
              autoComplete="off"
              aria-invalid={urlInvalid || isDuplicate}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="shortcut-icon">
              Custom icon URL <span className="text-[#A1A1AA]">(optional)</span>
            </Label>
            <Input
              id="shortcut-icon"
              value={iconUrl}
              onChange={(event) => setIconUrl(event.target.value)}
              placeholder="https://…/icon.png"
              autoComplete="off"
              aria-invalid={iconInvalid}
            />
          </div>

          {error ? <p className="text-xs text-destructive">{error}</p> : null}

          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>
              Cancel
            </DialogClose>
            <Button type="submit" disabled={!canSubmit}>
              Add shortcut
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
