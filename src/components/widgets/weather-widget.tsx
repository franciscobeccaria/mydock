"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, MapPin } from "lucide-react";

import { WidgetCard } from "@/components/widgets/widget-card";
import { WidgetErrorState } from "@/components/widgets/widget-error-state";
import { WidgetLoadingState } from "@/components/widgets/widget-loading-state";
import { useDashboardMode } from "@/components/dashboard/dashboard-mode-context";
import { usePickerLock } from "@/components/dashboard/picker-lock-context";
import {
  Combobox,
  ComboboxContent,
  ComboboxIcon,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { cityLabelFromValue, type CityOption } from "@/features/integrations/providers/weather/adapter";
import type { WeatherSnapshot } from "@/features/integrations/providers/weather/types";
import type { WidgetProps } from "@/features/integrations/types";

/** WMO weather_code → emoji glyph + short label. Day/night picks sun vs moon. */
function describe(code: number, isDay: boolean): { glyph: string; label: string } {
  if (code === 0) return { glyph: isDay ? "☀️" : "🌙", label: "Clear" };
  if (code <= 2) return { glyph: isDay ? "🌤️" : "☁️", label: "Partly cloudy" };
  if (code === 3) return { glyph: "☁️", label: "Overcast" };
  if (code <= 48) return { glyph: "🌫️", label: "Fog" };
  if (code <= 57) return { glyph: "🌦️", label: "Drizzle" };
  if (code <= 67) return { glyph: "🌧️", label: "Rain" };
  if (code <= 77) return { glyph: "🌨️", label: "Snow" };
  if (code <= 82) return { glyph: "🌦️", label: "Showers" };
  if (code <= 86) return { glyph: "🌨️", label: "Snow showers" };
  return { glyph: "⛈️", label: "Storm" };
}

/**
 * Edit-mode city picker: a searchable input that suggests cities from Open-Meteo
 * geocoding as you type (same UX as the Notion page picker). Picking a result
 * stores its name on the widget instance; the forecast adapter re-geocodes it.
 */
function CityPicker({
  current,
  onSet,
}: {
  /** Currently selected city name, shown in the closed input like a Select value. */
  current?: string;
  onSet: (city: string) => void;
}) {
  // base-ui owns the popup's open state (uncontrolled); we only observe it to
  // gate the fetch and to suspend the grid's drag sensor (see picker-lock).
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [cities, setCities] = useState<CityOption[]>([]);
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  // Latest-request guard so a slow earlier response can't overwrite a newer one.
  const reqIdRef = useRef(0);
  const { setPickerOpen } = usePickerLock();

  // Release the drag-sensor lock if the picker unmounts while still open.
  useEffect(() => {
    return () => {
      if (open) setPickerOpen(false);
    };
  }, [open, setPickerOpen]);

  // Debounced city search while open. With no query yet, show nothing (cities
  // need a name to search) rather than firing an empty request. All state writes
  // happen inside the deferred callback, never synchronously in the effect body.
  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    const reqId = ++reqIdRef.current;
    const timer = setTimeout(async () => {
      if (!q) {
        setCities([]);
        setState("idle");
        return;
      }
      setState("loading");
      try {
        const res = await fetch(`/api/integrations/weather/cities?q=${encodeURIComponent(q)}`, {
          cache: "no-store",
        });
        if (reqId !== reqIdRef.current) return; // superseded
        if (!res.ok) {
          setState("error");
          return;
        }
        const data = (await res.json()) as { cities: CityOption[] };
        setCities(data.cities ?? []);
        setState("idle");
      } catch {
        if (reqId === reqIdRef.current) setState("error");
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [open, query]);

  function pick(value: string | null) {
    if (!value) return;
    onSet(value);
    setQuery("");
  }

  // Closed: show the clean city name (the stored value is "lat,lon|Label").
  // Open: show what the user is typing.
  const inputValue = open ? query : current ? cityLabelFromValue(current) : "";

  return (
    <Combobox
      items={cities.map((c) => c.value)}
      filter={null}
      value={current ?? null}
      onValueChange={(value) => pick(value as string | null)}
      inputValue={inputValue}
      onInputValueChange={(value, details) => {
        if (details.reason === "input-change") setQuery(value);
      }}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        setPickerOpen(nextOpen);
        if (!nextOpen) setQuery("");
      }}
    >
      <div data-no-drag className="relative inline-flex h-8 w-[150px] items-center">
        <ComboboxInput
          placeholder="Search city…"
          className="h-8 w-full cursor-pointer truncate rounded-md border-[#E4E4E7] bg-white pr-7 pl-2.5 text-[13px] font-medium text-[#18181B] shadow-none hover:bg-[#F4F4F5] focus-visible:cursor-text"
        />
        <ComboboxIcon className="pointer-events-none absolute right-2" />
      </div>
      <ComboboxContent align="end" className="w-64 p-1">
        {state === "loading" ? (
          <p className="flex items-center gap-2 px-3 py-3 text-xs text-[#71717A]">
            <Loader2 className="size-3.5 animate-spin" /> Searching…
          </p>
        ) : state === "error" ? (
          <p className="px-3 py-3 text-xs text-[#DC2626]">Couldn’t search cities. Try again.</p>
        ) : query.trim() && cities.length === 0 ? (
          <p className="px-3 py-3 text-xs text-[#A1A1AA]">No cities found.</p>
        ) : !query.trim() ? (
          <p className="px-3 py-3 text-xs text-[#A1A1AA]">Type a city name to search.</p>
        ) : (
          <ComboboxList>
            {cities.map((c) => (
              <ComboboxItem
                key={`${c.value}-${c.label}`}
                value={c.value}
                className="text-[13px] data-[selected]:font-medium"
              >
                <MapPin className="size-3.5 shrink-0 text-[#A1A1AA]" />
                <span className="min-w-0 flex-1 truncate text-[#18181B]">{c.label}</span>
              </ComboboxItem>
            ))}
          </ComboboxList>
        )}
      </ComboboxContent>
    </Combobox>
  );
}

export function WeatherWidget({
  payload,
  onRetry,
  isRetrying,
  size = "large",
  configValue,
  onConfigChange,
}: WidgetProps) {
  const { isEditing } = useDashboardMode();
  const snapshot = payload.items[0]?.metadata?.weather as WeatherSnapshot | undefined;

  const headerControl =
    isEditing && onConfigChange ? (
      <CityPicker current={configValue ?? snapshot?.city ?? ""} onSet={onConfigChange} />
    ) : undefined;

  // Non-data states reuse the shared loading/error views inside the full card so
  // the tile keeps its shell while resolving. (Weather is always "connected",
  // so not_connected / permission states never occur.)
  if (payload.state === "loading" || !snapshot) {
    return (
      <WidgetCard provider="weather" title="Weather" className="h-full" headerControl={headerControl}>
        <WidgetLoadingState />
      </WidgetCard>
    );
  }
  if (payload.state === "error") {
    return (
      <WidgetCard provider="weather" title="Weather" className="h-full" headerControl={headerControl}>
        <WidgetErrorState
          message={payload.error ?? "Weather could not load."}
          onRetry={onRetry}
          isRetrying={isRetrying}
        />
      </WidgetCard>
    );
  }

  const cur = describe(snapshot.code, snapshot.isDay);

  if (size === "small") {
    return (
      <WidgetCard provider="weather" title={snapshot.city} className="h-full" headerControl={headerControl}>
        <div className="flex flex-col">
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-semibold tracking-tight text-[#18181B]">
              {snapshot.temp}°
            </span>
            <span className="text-lg">{cur.glyph}</span>
          </div>
          <span className="mt-0.5 text-[11px] text-[#A1A1AA]">
            {cur.label} · feels {snapshot.feels}°
          </span>
        </div>
      </WidgetCard>
    );
  }

  if (size === "medium") {
    return (
      <WidgetCard provider="weather" title={snapshot.city} className="h-full" headerControl={headerControl}>
        <div className="flex items-end justify-between">
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-4xl font-semibold tracking-tight text-[#18181B]">
                {snapshot.temp}°
              </span>
              <span className="text-sm text-[#71717A]">{cur.label}</span>
            </div>
            <div className="mt-1 text-xs text-[#A1A1AA]">
              Feels {snapshot.feels}° · H {snapshot.hi}° L {snapshot.lo}°
            </div>
          </div>
          <span className="text-4xl leading-none">{cur.glyph}</span>
        </div>
      </WidgetCard>
    );
  }

  // Large: current conditions + 3-day forecast + attribution.
  return (
    <WidgetCard provider="weather" title={snapshot.city} className="h-full" headerControl={headerControl}>
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-5xl font-semibold tracking-tight text-[#18181B]">
              {snapshot.temp}°
            </div>
            <div className="mt-1 text-sm text-[#71717A]">{cur.label}</div>
            <div className="mt-0.5 text-xs text-[#A1A1AA]">
              Feels {snapshot.feels}° · H {snapshot.hi}° L {snapshot.lo}°
            </div>
          </div>
          <span className="text-6xl leading-none">{cur.glyph}</span>
        </div>
        <div className="mt-auto space-y-1 border-t border-[#F1F1F3] pt-3">
          {snapshot.days.map((d) => {
            const dc = describe(d.code, true);
            return (
              <div key={d.label} className="flex items-center justify-between text-sm">
                <span className="w-10 text-[#71717A]">{d.label}</span>
                <span className="text-lg">{dc.glyph}</span>
                <span className="text-[#A1A1AA]">
                  <span className="text-[#18181B]">{d.hi}°</span> / {d.lo}°
                </span>
              </div>
            );
          })}
        </div>
        <div className="mt-2 text-[10px] text-[#C4C4C8]">Weather by Open-Meteo</div>
      </div>
    </WidgetCard>
  );
}
