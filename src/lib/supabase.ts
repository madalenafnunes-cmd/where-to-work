import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { getContributorId } from "./contributor";

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (client) return client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return null;

  client = createClient(url, anon, {
    auth: { persistSession: false },
    global: {
      headers: {
        // Used by the ratings RLS policy to gate updates/deletes.
        "x-contributor-id": getContributorId(),
      },
    },
  });
  return client;
}

export type RatingSummary = {
  place_id: string;
  osm_id: string;
  name: string;
  address: string | null;
  lat: number;
  lng: number;
  rating_count: number;
  overall_rating: number | null;
  avg_noise: number | null;
  avg_plugs: number | null;
  avg_wifi: number | null;
  avg_laptop_friendly: number | null;
  avg_price: number | null;
  avg_food: number | null;
  avg_coffee: number | null;
  noise_count: number;
  plugs_count: number;
  wifi_count: number;
  laptop_friendly_count: number;
  price_count: number;
  food_count: number;
  coffee_count: number;
};

export type RatingInput = {
  noise: number | null;
  plugs: number | null;
  wifi: number | null;
  laptop_friendly: number | null;
  price: number | null;
  food: number | null;
  coffee: number | null;
  note: string | null;
};
