import { searchPlace } from "./nominatim";
import { fetchVenuesInBBox, MAX_QUERY_AREA_DEG2, bboxAreaDeg2 } from "./overpass";
import { getSupabase, type RatingSummary } from "./supabase";
import { haversineDistance } from "./distance";
import type { OsmPlace, BBox } from "./types";

export type PlaceWithRating = OsmPlace & Partial<RatingSummary> & { distance?: number };

export async function fetchTopPlaces(
  locationString: string,
  limit: number = 10,
  userLat?: number,
  userLng?: number,
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

  // Use a smaller search radius if needed
  let searchBbox = bbox;
  const area = bboxAreaDeg2(bbox);
  if (area > MAX_QUERY_AREA_DEG2) {
    const shrinkFactor = Math.sqrt(MAX_QUERY_AREA_DEG2 / area);
    const smallerRadius = radiusDeg * shrinkFactor;
    searchBbox = {
      south: centerLat - smallerRadius,
      west: centerLng - smallerRadius,
      north: centerLat + smallerRadius,
      east: centerLng + smallerRadius,
    };
  }

  try {
    // Fetch venues from Overpass
    const places = await fetchVenuesInBBox(searchBbox);

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

    const merged: PlaceWithRating[] = places.map((place) => {
      const summary = summaryMap.get(place.osmId);
      const distance =
        userLat != null &&
        userLng != null &&
        summary?.lat != null &&
        summary?.lng != null
          ? haversineDistance(userLat, userLng, summary.lat, summary.lng)
          : undefined;

      return {
        ...place,
        ...summary,
        distance,
      } as PlaceWithRating;
    });

    // Filter to 2km radius if user location provided
    let filtered = merged;
    if (userLat != null && userLng != null) {
      filtered = merged.filter((place) => {
        if (place.distance == null) return true; // Include if distance can't be calculated
        return place.distance <= 2; // 2km radius
      });
    }

    // Sort by overall_rating (highest first), then by rating_count (highest first), then by distance (lowest first)
    filtered.sort((a, b) => {
      const ratingDiff = (b.overall_rating ?? 0) - (a.overall_rating ?? 0);
      if (ratingDiff !== 0) return ratingDiff;

      const countDiff = (b.rating_count ?? 0) - (a.rating_count ?? 0);
      if (countDiff !== 0) return countDiff;

      const distA = a.distance ?? Infinity;
      const distB = b.distance ?? Infinity;
      return distA - distB;
    });

    return filtered.slice(0, limit);
  } catch (err) {
    console.error("Error fetching top places:", err);
    return [];
  }
}

// Generate category tags from place rating summary
export function generateCategoryTags(place: PlaceWithRating): string[] {
  const tags: string[] = [];

  const highRatingThreshold = 3.5;

  if (place.avg_laptop_friendly != null && place.avg_laptop_friendly >= highRatingThreshold) {
    tags.push("Laptop friendly");
  }
  if (place.avg_noise != null && place.avg_noise >= highRatingThreshold) {
    tags.push("Quiet");
  }
  if (place.avg_wifi != null && place.avg_wifi >= highRatingThreshold) {
    tags.push("Good wifi");
  }
  if (place.avg_plugs != null && place.avg_plugs >= highRatingThreshold) {
    tags.push("Lots of plugs");
  }
  if (place.avg_food != null && place.avg_food >= highRatingThreshold) {
    tags.push("Good food");
  }
  if (place.avg_coffee != null && place.avg_coffee >= highRatingThreshold) {
    tags.push("Great coffee");
  }
  if (place.avg_price != null && place.avg_price >= highRatingThreshold) {
    tags.push("Good value");
  }

  return tags.slice(0, 3); // Return top 3 tags
}
