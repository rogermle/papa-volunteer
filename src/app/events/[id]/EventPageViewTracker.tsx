"use client";

import posthog from "posthog-js";
import { useEffect } from "react";

type Props = { eventId: string };

export function EventPageViewTracker({ eventId }: Props) {
  useEffect(() => {
    posthog.capture("event_viewed", { event_id: eventId });
  }, [eventId]);
  return null;
}
