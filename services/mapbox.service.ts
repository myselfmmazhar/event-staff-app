/**
 * Mapbox Service
 * Handles geocoding and reverse geocoding operations using Mapbox API
 */

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
const MAPBOX_API_BASE = "https://api.mapbox.com";

/**
 * Address components returned from geocoding
 */
export interface GeocodedAddress {
  address: string;
  city: string;
  state: string;
  zipCode: string;
  latitude: number;
  longitude: number;
  formattedAddress: string;
}

/**
 * Mapbox Geocoding API response feature
 */
interface MapboxFeature {
  place_name: string;
  center: [number, number]; // [longitude, latitude]
  context?: Array<{
    id: string;
    text: string;
    short_code?: string;
  }>;
  place_type: string[];
  text: string;
}

/**
 * Mapbox Geocoding API response
 */
interface MapboxGeocodingResponse {
  features: MapboxFeature[];
}

/**
 * Forward Geocoding: Convert address to coordinates
 * @param address - Full address string
 * @returns Geocoded address with coordinates
 */
export async function geocodeAddress(
  address: string
): Promise<GeocodedAddress | null> {
  if (!MAPBOX_TOKEN) {
    console.error("Mapbox token not configured");
    return null;
  }

  try {
    const encodedAddress = encodeURIComponent(address);
    const url = `${MAPBOX_API_BASE}/geocoding/v5/mapbox.places/${encodedAddress}.json?access_token=${MAPBOX_TOKEN}&types=address,place&limit=1`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Mapbox API error: ${response.statusText}`);
    }

    const data: MapboxGeocodingResponse = await response.json();

    if (!data.features || data.features.length === 0) {
      return null;
    }

    const feature = data.features[0];
    const [longitude, latitude] = feature.center;

    // Extract address components from context
    const context = feature.context || [];
    let city = "";
    let state = "";
    let zipCode = "";

    context.forEach((item) => {
      if (item.id.startsWith("place")) {
        city = item.text;
      } else if (item.id.startsWith("region")) {
        state = item.short_code?.replace("US-", "") || item.text;
      } else if (item.id.startsWith("postcode")) {
        zipCode = item.text;
      }
    });

    // If no city from context, use the place name
    if (!city && feature.place_type.includes("place")) {
      city = feature.text;
    }

    return {
      address: feature.text || address,
      city,
      state,
      zipCode,
      latitude,
      longitude,
      formattedAddress: feature.place_name,
    };
  } catch (error) {
    console.error("Geocoding error:", error);
    return null;
  }
}

/**
 * Reverse Geocoding: Convert coordinates to address
 * @param latitude - Latitude coordinate
 * @param longitude - Longitude coordinate
 * @returns Address information
 */
export async function reverseGeocode(
  latitude: number,
  longitude: number
): Promise<GeocodedAddress | null> {
  if (!MAPBOX_TOKEN) {
    console.error("Mapbox token not configured");
    return null;
  }

  try {
    const url = `${MAPBOX_API_BASE}/geocoding/v5/mapbox.places/${longitude},${latitude}.json?access_token=${MAPBOX_TOKEN}&types=address&limit=1`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Mapbox API error: ${response.statusText}`);
    }

    const data: MapboxGeocodingResponse = await response.json();

    if (!data.features || data.features.length === 0) {
      return null;
    }

    const feature = data.features[0];
    const context = feature.context || [];

    let city = "";
    let state = "";
    let zipCode = "";

    context.forEach((item) => {
      if (item.id.startsWith("place")) {
        city = item.text;
      } else if (item.id.startsWith("region")) {
        state = item.short_code?.replace("US-", "") || item.text;
      } else if (item.id.startsWith("postcode")) {
        zipCode = item.text;
      }
    });

    return {
      address: feature.text || "",
      city,
      state,
      zipCode,
      latitude,
      longitude,
      formattedAddress: feature.place_name,
    };
  } catch (error) {
    console.error("Reverse geocoding error:", error);
    return null;
  }
}

/**
 * Batch geocode multiple addresses
 * @param addresses - Array of address strings
 * @returns Array of geocoded results (null for failed geocodes)
 */
export async function geocodeAddresses(
  addresses: string[]
): Promise<(GeocodedAddress | null)[]> {
  // Mapbox doesn't support batch geocoding, so we need to make individual requests
  // Add delay to avoid rate limiting
  const results: (GeocodedAddress | null)[] = [];

  for (const address of addresses) {
    const result = await geocodeAddress(address);
    results.push(result);

    // Add small delay to avoid rate limiting (600 requests/minute = ~100ms between requests)
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  return results;
}

/**
 * Validate coordinates
 * @param latitude - Latitude coordinate
 * @param longitude - Longitude coordinate
 * @returns True if coordinates are valid
 */
export function validateCoordinates(
  latitude: number,
  longitude: number
): boolean {
  return (
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

/**
 * Calculate distance between two coordinates (Haversine formula)
 * @param lat1 - First point latitude
 * @param lon1 - First point longitude
 * @param lat2 - Second point latitude
 * @param lon2 - Second point longitude
 * @returns Distance in kilometers
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Convert degrees to radians
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}
