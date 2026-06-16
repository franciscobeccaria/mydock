// Weather is a NO-AUTH provider: Open-Meteo is a free public API (no key, no
// sign-up). It never enters the Connections / scope machinery — the empty scope
// list keeps it out of consent checks (see NO_AUTH_PROVIDERS in registry.ts).
export const weatherScopes = [] as const;

export const OPEN_METEO_FORECAST = "https://api.open-meteo.com/v1/forecast";
export const OPEN_METEO_GEOCODING = "https://geocoding-api.open-meteo.com/v1/search";

/** Default city when an instance has no `weather-city` config yet. */
export const DEFAULT_CITY = "Buenos Aires";

/**
 * The current + forecast snapshot a Weather widget renders, carried inside the
 * single WidgetItem's `metadata` (the generic item shape has no weather fields).
 * Mirrors the Open-Meteo response we request.
 */
export type WeatherSnapshot = {
  city: string;
  /** Current temperature, °C, rounded. */
  temp: number;
  /** Apparent ("feels like") temperature, °C, rounded. */
  feels: number;
  /** WMO weather_code for the current conditions. */
  code: number;
  /** Whether it is currently daytime (Open-Meteo `is_day`). */
  isDay: boolean;
  /** Today's high / low, °C, rounded. */
  hi: number;
  lo: number;
  /** Next days (excluding today), short label + code + hi/lo. */
  days: { label: string; code: number; hi: number; lo: number }[];
};
