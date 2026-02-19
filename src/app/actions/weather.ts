"use server";

import { revalidateTag } from "next/cache";

export async function revalidateWeather() {
  revalidateTag("weather");
}
