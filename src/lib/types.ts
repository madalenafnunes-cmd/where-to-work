export type OsmElementType = "node" | "way" | "relation";

export type OsmPlace = {
  osmId: string;              // "<type>/<id>"
  name: string;
  lat: number;
  lng: number;
  tags: Record<string, string>;
};

export type BBox = {
  south: number;
  west: number;
  north: number;
  east: number;
};
