import Image from "next/image";
import { getPlacePhoto } from "@/data/appPlacePhotos";

export function PlacePhoto({ id, label }: { id: string; label: string }) {
  const photo = getPlacePhoto(id);
  if (!photo) return null;
  return <div className="wr-activity-photo"><Image src={photo.src} alt={photo.alt} fill sizes="(max-width: 760px) 100vw, 550px"/><span>{label}</span></div>;
}
