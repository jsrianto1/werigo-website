import Image from "next/image";
import { getPlacePhoto } from "@/data/appPlacePhotos";

export function PlacePhoto({ id, label, image, alt }: { id: string; label: string; image?: string; alt?: string }) {
  const photo = getPlacePhoto(id);
  const src = image || photo?.src;
  if (!src) return null;
  return <div className="wr-activity-photo"><Image src={src} alt={alt || photo?.alt || label} unoptimized={src.startsWith("/api/media/")} fill sizes="(max-width: 760px) 100vw, 550px"/><span>{label}</span></div>;
}
