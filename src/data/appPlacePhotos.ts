import photos from "./appPlacePhotos.json";

export function getPlacePhoto(id?: string) {
  return id ? (photos as Record<string, (typeof photos)[keyof typeof photos]>)[id] : undefined;
}
