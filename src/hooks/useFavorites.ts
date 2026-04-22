"use client";

import { useEffect, useState } from "react";
import { listFavorites, FAVORITES_EVENT, type Favorite } from "@/lib/favorites";

export function useFavorites(): Favorite[] {
  const [list, setList] = useState<Favorite[]>([]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial read of localStorage
    setList(listFavorites());
    const handler = () => setList(listFavorites());
    window.addEventListener(FAVORITES_EVENT, handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener(FAVORITES_EVENT, handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  return list;
}
