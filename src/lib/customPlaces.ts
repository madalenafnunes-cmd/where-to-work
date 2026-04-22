import { v4 as uuidv4 } from "uuid";
import { getSupabase } from "./supabase";
import { getContributorId } from "./contributor";
import type { BBox, OsmPlace } from "./types";

export type CustomPlaceInput = {
  name: string;
  address: string | null;
  lat: number;
  lng: number;
};

export async function createCustomPlace(input: CustomPlaceInput): Promise<OsmPlace> {
  const sb = getSupabase();
  if (!sb) throw new Error("Supabase not configured");

  const osmId = `custom/${uuidv4()}`;
  const { data, error } = await sb
    .from("places")
    .insert({
      osm_id: osmId,
      name: input.name,
      address: input.address,
      lat: input.lat,
      lng: input.lng,
      created_by: getContributorId(),
    })
    .select("osm_id, name, address, lat, lng")
    .single();

  if (error || !data) throw error ?? new Error("insert failed");

  return {
    osmId: data.osm_id,
    name: data.name,
    lat: data.lat,
    lng: data.lng,
    tags: data.address ? { "addr:street": data.address } : {},
  };
}

export async function fetchCustomPlacesInBBox(bbox: BBox): Promise<OsmPlace[]> {
  const sb = getSupabase();
  if (!sb) return [];

  const { data, error } = await sb
    .from("places")
    .select("osm_id, name, address, lat, lng")
    .like("osm_id", "custom/%")
    .gte("lat", bbox.south)
    .lte("lat", bbox.north)
    .gte("lng", bbox.west)
    .lte("lng", bbox.east);

  if (error || !data) return [];

  return data.map((row) => ({
    osmId: row.osm_id as string,
    name: row.name as string,
    lat: row.lat as number,
    lng: row.lng as number,
    tags: (row.address ? { "addr:street": row.address as string } : {}) as Record<string, string>,
  }));
}

export function isCustomPlace(osmId: string): boolean {
  return osmId.startsWith("custom/");
}
