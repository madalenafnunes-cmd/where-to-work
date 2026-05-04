import { searchPlace } from "./nominatim";
import { fetchVenuesInBBox, MAX_QUERY_AREA_DEG2, bboxAreaDeg2 } from "./overpass";
import { getSupabase, type RatingSummary } from "./supabase";
import type { OsmPlace, BBox } from "./types";

export type PlaceWithRating = OsmPlace & Partial<RatingSummary>;

export async function fetchTopPlaces(
  locationString: string,
  limit: number = 10,
): Promise<PlaceWithRating[]> {
  // Convert location string to coordinates
  const results = await searchPlace(locationString, new AbortController().signal);
  if (!results || results.length === 0) {
    return [];
  }

  const { lat, lon } = results[0];
  const centerLat = parseFloat(lat);
  const centerLng = parseFloat(lon);

  // Create a small bounding box around the center point (~2km radius at equator)
  const radiusDeg = 0.02; // ~2.2km at equator
  const bbox: BBox = {
    south: centerLat - radiusDeg,
    west: centerLng - radiusDeg,
    north: centerLat + radiusDeg,
    east: centerLng + radiusDeg,
  };

  if (bboxAreaDeg2(bbox) > MAX_QUERY_AREA_DEG2) {
    // If bbox is too large, shrink it
    const shrinkFactor = Math.sqrt(MAX_QUERY_AREA_DEG2 / bboxAreaDeg2(bbox));
    const newRadius = radiusDeg * shrinkFactor;
    return fetchTopPlaces(locationString, limit);
  }

  try {
    // Fetch venues from Overpass
    const places = await fetchVenuesInBBox(bbox);

    // Fetch rating summaries for all places
    const sb = getSupabase();
    if (!sb || places.length === 0) {
      return places.slice(0, limit);
    }

    const osmIds = places.map((p) => p.osmId);
    const { data: summaries } = await sb
      .from("place_ratings_summary")
      .select("*")
      .in("osm_id", osmIds);

    // Merge places with ratings
    const summaryMap = new Map(
      (summaries as RatingSummary[])?.map((s) => [s.osm_id, s]) ?? [],
    );

    const merged: PlaceWithRating[] = places.map((place) => ({
      ...place,
      ...summaryMap.get(place.osmId),
    }));

    // Sort by overall_rating (highest first), then by name
    merged.sort((a, b) => {
      const ratingDiff = (b.overall_rating ?? 0) - (a.overall_rating ?? 0);
      if (ratingDiff !== 0) return ratingDiff;
      return a.name.localeCompare(b.name);
    });

    return merged.slice(0, limit);
  } catch (err) {
    console.error("Error fetching top places:", err);
    return [];
  }
}

// Generate category tags from place rating summary
export function generateCategoryTags(place: PlaceWithRating): string[] {
  const tags: string[] = [];

  const highRatingThreshold = 3.5;

  if (place.avg_laptop_friendly !== null && place.avg_laptop_friendly >= highRatingThreshold) {
    tags.push("Laptop friendly");
  }
  if (place.avg_noise !== null && place.avg_noise >= highRatingThreshold) {
    tags.push("Quiet");
  }
  if (place.avg_wifi !== null && place.avg_wifi >= highRatingThreshold) {
    tags.push("Good wifi");
  }
  if (place.avg_plugs !== null && place.avg_plugs >= highRatingThreshold) {
    tags.push("Lots of plugs");
  }
  if (place.avg_food !== null && place.avg_food >= highRatingThreshold) {
    tags.push("Good food");
  }
  if (place.avg_coffee !== null && place.avg_coffee >= highRatingThreshold) {
    tags.push("Great coffee");
  }
  if (place.avg_price !== null && place.avg_price >= highRatingThreshold) {
    tags.push("Good value");
  }

  return tags.slice(0, 3); // Return top 3 tags
}
