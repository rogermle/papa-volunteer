import type { ForecastDay } from "@/lib/weather";
import { WeatherForecastFooter } from "./WeatherForecastFooter";

function formatDayLabel(d: ForecastDay, compact?: boolean): string {
  const dateObj = new Date(d.date + "T12:00:00Z");
  if (compact) {
    const short = dateObj.toLocaleDateString("en-US", { month: "numeric", day: "numeric" });
    return `${d.dayName} ${short}`;
  }
  const dateStr = dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${d.dayName}, ${dateStr}`;
}

type Props = {
  days: ForecastDay[];
  compact?: boolean;
  fetchedAt?: number;
  locationLabel?: string | null;
};

export function WeatherForecast({ days, compact, fetchedAt, locationLabel }: Props) {
  if (!days.length) return null;

  return (
    <div className={compact ? "flex flex-wrap gap-2" : "rounded-lg border border-papa-border bg-papa-offwhite/50 p-3"}>
      <div className={compact ? "w-full" : "mb-2"}>
        <h3 className="text-xs font-medium uppercase tracking-wide text-papa-muted">
          Weather
        </h3>
        {locationLabel?.trim() && (
          <p className="mt-0.5 text-xs text-papa-muted">{locationLabel.trim()}</p>
        )}
      </div>
      <div className={compact ? "flex gap-3" : "grid grid-cols-3 gap-2"}>
        {days.map((d) => (
          <div
            key={d.date}
            className={
              compact
                ? "flex items-center gap-1.5 rounded border border-papa-border bg-background px-2 py-1 text-xs"
                : "rounded border border-papa-border bg-background p-2 text-center text-sm"
            }
          >
            <span className={compact ? "font-medium text-foreground" : "block font-medium text-foreground"} title={formatDayLabel(d, false)}>{formatDayLabel(d, compact)}</span>
            {compact ? (
              <>
                <span className="text-lg" aria-hidden>{d.weatherIcon}</span>
                <span className="text-papa-muted capitalize">{d.weatherLabel}</span>
              </>
            ) : (
              <span className="block text-foreground text-papa-muted"><span className="text-lg" aria-hidden>{d.weatherIcon}</span> {d.weatherLabel}</span>
            )}
            <span className={compact ? "text-papa-muted" : "block text-foreground"}>
              {d.highF}° / {d.lowF}°
            </span>
            {!compact && (d.precipProbMax != null && d.precipProbMax > 0) && (
              <span className="block text-xs text-papa-muted">{d.precipProbMax}% precip</span>
            )}
            {!compact && d.feelsLikeF != null && (
              <span className="block text-xs text-papa-muted">Feels {d.feelsLikeF}°</span>
            )}
          </div>
        ))}
      </div>
      {fetchedAt != null && (
        <WeatherForecastFooter fetchedAt={fetchedAt} className={compact ? "mt-2 w-full" : "mt-2"} />
      )}
    </div>
  );
}
