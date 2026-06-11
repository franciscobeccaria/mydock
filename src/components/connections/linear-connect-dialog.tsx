"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Eye, EyeOff, Loader2, ExternalLink } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function LinearConnectDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [key, setKey] = useState("");
  const [reveal, setReveal] = useState(false);
  const [state, setState] = useState<"idle" | "verifying" | "ok" | "error">("idle");
  // Distinguish a bad key (422) from a server failure (500): the messages differ.
  const [errorKind, setErrorKind] = useState<"key" | "server">("key");
  const [result, setResult] = useState<{
    email: string | null;
    workspaceName: string | null;
  } | null>(null);

  async function submit() {
    const trimmed = key.trim();
    if (!trimmed) return;
    setState("verifying");
    try {
      const res = await fetch("/api/connections/linear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: trimmed }),
      });
      if (res.ok) {
        const data = (await res.json()) as {
          email: string | null;
          workspaceName: string | null;
        };
        setResult(data);
        setState("ok");
        router.refresh(); // re-fetch the server page's connection list
      } else {
        setErrorKind(res.status === 500 ? "server" : "key");
        setState("error");
      }
    } catch {
      setErrorKind("server");
      setState("error");
    }
  }

  function handleOpenChange(next: boolean) {
    if (!next) {
      setKey("");
      setReveal(false);
      setState("idle");
      setErrorKind("key");
      setResult(null);
    }
    onOpenChange(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Connect a Linear workspace</DialogTitle>
          <DialogDescription>
            Create a personal API key in Linear and paste it below.
          </DialogDescription>
        </DialogHeader>

        <ol className="space-y-2.5 text-sm text-[#52525B]">
          <li className="flex gap-2">
            <Step n={1} />
            <span>
              In Linear, open Settings → Security &amp; access → Personal API keys.{" "}
              <a
                href="https://linear.app/settings/account/security"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 font-medium text-[#18181B] underline underline-offset-2"
              >
                Open Security &amp; access <ExternalLink className="size-3" />
              </a>
            </span>
          </li>
          <li className="flex gap-2">
            <Step n={2} />
            <span>
              Under Personal API keys, create a new key and name it
              &ldquo;MyDock&rdquo;.
            </span>
          </li>
          <li className="flex gap-2">
            <Step n={3} />
            <span>Copy the key and paste it below.</span>
          </li>
        </ol>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-[#71717A]">Linear API key</label>
          <div className="relative">
            <Input
              type={reveal ? "text" : "password"}
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="lin_api_..."
              className="pr-10"
              autoComplete="off"
              data-1p-ignore
              disabled={state === "verifying" || state === "ok"}
            />
            <button
              type="button"
              onClick={() => setReveal((r) => !r)}
              className="absolute top-1/2 right-3 -translate-y-1/2 text-[#A1A1AA] hover:text-[#52525B]"
              aria-label={reveal ? "Hide key" : "Show key"}
            >
              {reveal ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          <p className="text-xs text-[#A1A1AA]">
            We encrypt this and never show it again.
          </p>
        </div>

        {state === "verifying" ? (
          <p className="flex items-center gap-2 text-sm text-[#71717A]">
            <Loader2 className="size-4 animate-spin" /> Verifying key…
          </p>
        ) : null}
        {state === "ok" ? (
          <p className="flex items-center gap-2 text-sm text-[#16A34A]">
            <Check className="size-4" /> Connected
            {result?.workspaceName ? ` "${result.workspaceName}"` : ""}
            {result?.email ? ` (${result.email})` : ""}
          </p>
        ) : null}
        {state === "error" ? (
          <p className="text-sm text-[#DC2626]">
            {errorKind === "server"
              ? "Something went wrong on our end. Please try again."
              : "That key didn’t work. Check it and try again."}
          </p>
        ) : null}

        <DialogFooter>
          {state === "ok" ? (
            // Connected — the only action left is to close (the new row is already
            // in the refreshed list behind the dialog).
            <Button onClick={() => handleOpenChange(false)}>Done</Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={submit} disabled={state === "verifying"}>
                Connect workspace
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Step({ n }: { n: number }) {
  return (
    <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-[#18181B] text-[11px] font-semibold text-white">
      {n}
    </span>
  );
}
