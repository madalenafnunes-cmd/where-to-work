declare module "opening_hours" {
  export default class OpeningHours {
    constructor(tag: string, nominatim?: unknown, options?: unknown);
    getState(at?: Date): boolean;
  }
}
