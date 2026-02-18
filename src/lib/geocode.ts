/**
 * Geocode an address using OpenStreetMap Nominatim (free, no API key).
 * Usage policy: https://operations.osmfoundation.org/policies/nominatim/
 * - 1 request/sec, identifiable User-Agent, cache results.
 */

const NOMINATIM_USER_AGENT = 'PAPAVolunteerApp/1.0 (https://www.asianpilots.org)'

export type GeocodeResult = { lat: number; lon: number; displayName: string }

/**
 * Returns true if the location string looks like a full address (suitable for geocoding).
 * Avoids sending "TBD", "Virtual", or short venue names to Nominatim.
 */
export function looksLikeAddress(location: string | null): boolean {
  if (!location || location.trim().length < 10) return false
  const t = location.trim()
  if (/^(TBD|Virtual|Online|Zoom|TBA)$/i.test(t)) return false
  return /\d/.test(t) || t.includes(',')
}

/**
 * Geocode a single address. Returns null if no result or on error.
 * Cached per-address (Next.js fetch cache) to respect Nominatim policy.
 */
export async function geocodeAddress(address: string): Promise<GeocodeResult | null> {
  const q = address.trim()
  if (!q) return null
  const url = `https://nominatim.openstreetmap.org/search?${new URLSearchParams({
    q,
    format: 'json',
    limit: '1',
  })}`
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': NOMINATIM_USER_AGENT },
      next: { revalidate: 86400 },
    })
    if (!res.ok) return null
    const data = (await res.json()) as Array<{ lat: string; lon: string; display_name: string }>
    const first = data[0]
    if (!first?.lat || !first?.lon) return null
    return {
      lat: parseFloat(first.lat),
      lon: parseFloat(first.lon),
      displayName: first.display_name ?? address,
    }
  } catch {
    return null
  }
}
