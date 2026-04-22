const KEY = "wtw.favorites";
const EVENT = "wtw:favorites-changed";

export type Favorite = {
  osmId: string;
  name: string;
  lat: number;
  lng: number;
  addedAt: number;
};

function read(): Favorite[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Favorite[]) : [];
  } catch {
    return [];
  }
}

function write(list: Favorite[]) {
  window.localStorage.setItem(KEY, JSON.stringify(list));
  window.dispatchEvent(new CustomEvent(EVENT));
}

export function listFavorites(): Favorite[] {
  return read().sort((a, b) => b.addedAt - a.addedAt);
}

export function isFavorite(osmId: string): boolean {
  return read().some((f) => f.osmId === osmId);
}

export function addFavorite(fav: Omit<Favorite, "addedAt">) {
  const list = read();
  if (list.some((f) => f.osmId === fav.osmId)) return;
  list.push({ ...fav, addedAt: Date.now() });
  write(list);
}

export function removeFavorite(osmId: string) {
  write(read().filter((f) => f.osmId !== osmId));
}

export function toggleFavorite(fav: Omit<Favorite, "addedAt">) {
  if (isFavorite(fav.osmId)) removeFavorite(fav.osmId);
  else addFavorite(fav);
}

export const FAVORITES_EVENT = EVENT;
