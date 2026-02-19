"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { revalidateWeather } from "@/app/actions/weather";

type Props = {
  fetchedAt: number;
  className?: string;
};

function minutesAgo(ts: number): number {
  return Math.max(0, Math.floor((Date.now() - ts) / 60_000));
}

export function WeatherForecastFooter({ fetchedAt, className = "" }: Props) {
  const router = useRouter();
  const [mins, setMins] = useState(() => minutesAgo(fetchedAt));
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setMins(minutesAgo(fetchedAt)), 60_000);
    return () => clearInterval(t);
  }, [fetchedAt]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await revalidateWeather();
      router.refresh();
    } finally {
      setRefreshing(false);
    }
  }, [router]);

  return (
    <div className={`flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-papa-muted ${className}`}>
      <span>Last updated {mins === 0 ? "just now" : mins === 1 ? "1 min ago" : `${mins} min ago`}</span>
      <button
        type="button"
        onClick={handleRefresh}
        disabled={refreshing}
        className="text-papa-accent hover:underline disabled:opacity-50"
      >
        {refreshing ? "Refreshing…" : "Refresh"}
      </button>
    </div>
  );
}
