import {
  DEFAULT_CITY,
  OPEN_METEO_FORECAST,
  OPEN_METEO_GEOCODING,
  type WeatherSnapshot,
} from "@/features/integrations/providers/weather/types";
import type { WidgetItem } from "@/features/integrations/types";

type GeocodeResponse = {
  results?: Array<{
    id?: number;
    name: string;
    latitude: number;
    longitude: number;
    country?: string;
    country_code?: string;
    admin1?: string;
    timezone?: string;
  }>;
};

/** A city suggestion for the searchable picker. */
export type CityOption = {
  /** Stable value stored on the widget (the query the forecast adapter geocodes). */
  value: string;
  /** "Buenos Aires, Argentina" — what the user sees in the list. */
  label: string;
};

/**
 * Search cities by name for the picker autocomplete (Open-Meteo geocoding, no
 * key). Returns several matches with region/country so duplicates are
 * distinguishable. The stored value is the city name (re-geocoded at fetch
 * time), keeping the instance config a simple human string.
 */
export async function searchCities(query: string): Promise<CityOption[]> {
  const q = query.trim();
  if (!q) return [];
  const url = `${OPEN_METEO_GEOCODING}?name=${encodeURIComponent(q)}&count=8&language=en&format=json`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("city search failed");
  const data = (await res.json()) as GeocodeResponse;
  return (data.results ?? []).map((r) => ({
    value: r.name,
    label: [r.name, r.admin1, r.country].filter(Boolean).join(", "),
  }));
}

type ForecastResponse = {
  current?: {
    temperature_2m?: number;
    apparent_temperature?: number;
    weather_code?: number;
    is_day?: number;
  };
  daily?: {
    time?: string[];
    temperature_2m_max?: number[];
    temperature_2m_min?: number[];
    weather_code?: number[];
  };
};

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Open-Meteo gives a UTC ISO date string (YYYY-MM-DD); label it as a weekday. */
function weekdayLabel(isoDate: string): string {
  const day = new Date(`${isoDate}T00:00:00Z`).getUTCDay();
  return DAY_LABELS[day] ?? "";
}

/** Resolve a free-text city to coordinates via Open-Meteo geocoding (no key). */
async function geocode(city: string) {
  const url = `${OPEN_METEO_GEOCODING}?name=${encodeURIComponent(city)}&count=1&format=json`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("geocode failed");
  const data = (await res.json()) as GeocodeResponse;
  const hit = data.results?.[0];
  if (!hit) throw new Error("city not found");
  return { name: hit.name, lat: hit.latitude, lon: hit.longitude };
}

/**
 * Builds the single Weather WidgetItem for a city. The whole snapshot lives in
 * `metadata.weather` so the widget can render any of its three sizes from one
 * payload. No auth — Open-Meteo is public — so `userId`/`accountId` are unused,
 * kept only to match the registry's adapter signature.
 */
export async function getWeatherItems(
  _userId: string,
  _accountId?: string | null,
  city?: string | null,
): Promise<WidgetItem[]> {
  const query = city?.trim() || DEFAULT_CITY;
  const place = await geocode(query);

  const params = new URLSearchParams({
    latitude: String(place.lat),
    longitude: String(place.lon),
    current: "temperature_2m,apparent_temperature,weather_code,is_day",
    daily: "temperature_2m_max,temperature_2m_min,weather_code",
    timezone: "auto",
    forecast_days: "4",
  });
  const res = await fetch(`${OPEN_METEO_FORECAST}?${params.toString()}`, { cache: "no-store" });
  if (!res.ok) throw new Error("forecast failed");
  const data = (await res.json()) as ForecastResponse;

  const cur = data.current ?? {};
  const daily = data.daily ?? {};
  const times = daily.time ?? [];
  const maxes = daily.temperature_2m_max ?? [];
  const mins = daily.temperature_2m_min ?? [];
  const codes = daily.weather_code ?? [];

  // Index 0 is today; the next days drive the Large widget's forecast strip.
  const days = times.slice(1, 4).map((iso, i) => ({
    label: weekdayLabel(iso),
    code: Math.round(codes[i + 1] ?? 0),
    hi: Math.round(maxes[i + 1] ?? 0),
    lo: Math.round(mins[i + 1] ?? 0),
  }));

  const snapshot: WeatherSnapshot = {
    city: place.name,
    temp: Math.round(cur.temperature_2m ?? 0),
    feels: Math.round(cur.apparent_temperature ?? 0),
    code: Math.round(cur.weather_code ?? 0),
    isDay: (cur.is_day ?? 1) === 1,
    hi: Math.round(maxes[0] ?? 0),
    lo: Math.round(mins[0] ?? 0),
    days,
  };

  return [
    {
      id: `weather-${place.lat},${place.lon}`,
      provider: "weather",
      title: place.name,
      metadata: { weather: snapshot },
    },
  ];
}
