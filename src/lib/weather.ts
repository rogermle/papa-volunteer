/**
 * Weather forecast via Open-Meteo (free, no API key).
 * Cache: 15 minutes; use revalidateWeather() to force refresh.
 * https://open-meteo.com/en/docs
 */

import { unstable_cache } from "next/cache";

export type ForecastDay = {
  date: string; // YYYY-MM-DD
  dayName: string;
  highF: number;
  lowF: number;
  weatherCode: number;
  weatherLabel: string;
  weatherIcon: string;
  precipProbMax: number | null;
  feelsLikeF: number | null;
};

const WMO_ICONS: Record<number, string> = {
  0: "☀️",
  1: "🌤️",
  2: "⛅",
  3: "☁️",
  45: "🌫️",
  48: "🌫️",
  51: "🌧️",
  53: "🌧️",
  55: "🌧️",
  56: "🌧️",
  57: "🌧️",
  61: "🌧️",
  63: "🌧️",
  65: "🌧️",
  66: "🌧️",
  67: "🌧️",
  71: "❄️",
  73: "❄️",
  75: "❄️",
  77: "❄️",
  80: "🌦️",
  81: "🌧️",
  82: "🌧️",
  85: "🌨️",
  86: "🌨️",
  95: "⛈️",
  96: "⛈️",
  99: "⛈️",
};

const WMO_LABELS: Record<number, string> = {
  0: "Clear",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Foggy",
  48: "Foggy",
  51: "Light drizzle",
  53: "Drizzle",
  55: "Dense drizzle",
  56: "Light freezing drizzle",
  57: "Freezing drizzle",
  61: "Slight rain",
  63: "Moderate rain",
  65: "Heavy rain",
  66: "Light freezing rain",
  67: "Freezing rain",
  71: "Slight snow",
  73: "Moderate snow",
  75: "Heavy snow",
  77: "Snow grains",
  80: "Slight rain showers",
  81: "Rain showers",
  82: "Heavy rain showers",
  85: "Slight snow showers",
  86: "Heavy snow showers",
  95: "Thunderstorm",
  96: "Thunderstorm + hail",
  99: "Thunderstorm + heavy hail",
};

function wmoToIcon(code: number): string {
  return WMO_ICONS[code] ?? "🌡️";
}

function wmoToLabel(code: number): string {
  return WMO_LABELS[code] ?? "—";
}

function celsiusToF(n: number): number {
  return Math.round((n * 9) / 5 + 32);
}

/**
 * First 3 days of the event: start_date, start_date+1, start_date+2 (capped at end_date).
 */
export function getEventForecastDateRange(
  startDate: string,
  endDate: string
): { start: string; end: string } {
  const start = startDate.slice(0, 10);
  const end = endDate.slice(0, 10);
  const startD = new Date(start + "T12:00:00Z");
  const endD = new Date(end + "T12:00:00Z");
  const day2 = new Date(startD);
  day2.setUTCDate(day2.getUTCDate() + 1);
  const day3 = new Date(startD);
  day3.setUTCDate(day3.getUTCDate() + 2);
  const last = day3.getTime() > endD.getTime() ? endD : day3;
  const lastStr = last.toISOString().slice(0, 10);
  return { start, end: lastStr };
}

async function fetchForecastUncached(
  lat: number,
  lon: number,
  start: string,
  end: string
): Promise<ForecastDay[]> {
  const url = `https://api.open-meteo.com/v1/forecast?${new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    daily:
      "temperature_2m_max,temperature_2m_min,weathercode,precipitation_probability_max,apparent_temperature_max",
    timezone: "America/New_York",
    start,
    end,
  })}`;
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return [];
    const data = (await res.json()) as {
      daily?: {
        time?: string[];
        temperature_2m_max?: (number | null)[];
        temperature_2m_min?: (number | null)[];
        weathercode?: (number | null)[];
        precipitation_probability_max?: (number | null)[];
        apparent_temperature_max?: (number | null)[];
      };
    };
    const daily = data.daily;
    if (!daily?.time?.length) return [];
    const times = daily.time;
    const maxT = daily.temperature_2m_max ?? [];
    const minT = daily.temperature_2m_min ?? [];
    const codes = daily.weathercode ?? [];
    const precip = daily.precipitation_probability_max ?? [];
    const feels = daily.apparent_temperature_max ?? [];
    const result: ForecastDay[] = [];
    for (let i = 0; i < times.length; i++) {
      const date = times[i]!.slice(0, 10);
      const dateObj = new Date(date + "T12:00:00Z");
      const dayName = dateObj.toLocaleDateString("en-US", { weekday: "short" });
      const highC = maxT[i] ?? 0;
      const lowC = minT[i] ?? 0;
      const code = codes[i] ?? 0;
      result.push({
        date,
        dayName,
        highF: celsiusToF(highC),
        lowF: celsiusToF(lowC),
        weatherCode: code,
        weatherLabel: wmoToLabel(code),
        weatherIcon: wmoToIcon(code),
        precipProbMax: precip[i] ?? null,
        feelsLikeF: feels[i] != null ? celsiusToF(feels[i]!) : null,
      });
    }
    return result;
  } catch {
    return [];
  }
}

/**
 * Fetch daily forecast for a location and date range.
 * Cached 15 minutes; call revalidateWeather() to force refresh.
 */
export async function fetchForecast(
  lat: number,
  lon: number,
  startDate: string,
  endDate: string
): Promise<ForecastDay[]> {
  const start = startDate.slice(0, 10);
  const end = endDate.slice(0, 10);
  return unstable_cache(
    () => fetchForecastUncached(lat, lon, start, end),
    ["weather", String(lat), String(lon), start, end],
    { revalidate: 900, tags: ["weather"] }
  )();
}
