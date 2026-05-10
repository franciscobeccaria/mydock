import { Sparkles } from "lucide-react";

import { WidgetCard } from "@/components/widgets/widget-card";
import { Progress } from "@/components/ui/progress";
import type { TodaySummary } from "@/features/integrations/types";

export function TodaySummaryWidget({ summary }: { summary: TodaySummary }) {
  return (
    <WidgetCard provider="today" title="Today Summary" wide>
      <div className="grid gap-6 lg:grid-cols-[1.4fr_0.8fr] lg:items-center">
        <div>
          <div className="border-border/70 bg-accent/40 text-muted-foreground inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium">
            <Sparkles className="size-3.5" /> Deterministic summary
          </div>
          <h3 className="mt-4 text-2xl font-semibold tracking-tight">
            {summary.headline}
          </h3>
          <ul className="text-muted-foreground mt-4 space-y-3 text-sm">
            {summary.bullets.map((bullet) => (
              <li key={bullet} className="flex gap-3">
                <span className="bg-primary mt-1 size-2 rounded-full" />
                <span>{bullet}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="border-border/60 bg-accent/30 rounded-3xl border p-5">
          <p className="text-muted-foreground text-sm font-medium">
            Workspace readiness
          </p>
          <p className="mt-2 text-4xl font-semibold">92%</p>
          <Progress className="mt-5" value={92} />
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="bg-background/80 rounded-2xl p-4">
              <p className="text-muted-foreground text-xs tracking-[0.18em] uppercase">
                Signals
              </p>
              <p className="mt-2 text-lg font-semibold">4 sources</p>
            </div>
            <div className="bg-background/80 rounded-2xl p-4">
              <p className="text-muted-foreground text-xs tracking-[0.18em] uppercase">
                Generated
              </p>
              <p className="mt-2 text-lg font-semibold">
                {new Date(summary.generatedAt).toLocaleTimeString([], {
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </div>
        </div>
      </div>
    </WidgetCard>
  );
}
