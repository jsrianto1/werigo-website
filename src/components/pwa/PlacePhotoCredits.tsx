import type { CmsPlace } from "@/lib/cmsRules";
import { getPlacePhoto } from "@/data/appPlacePhotos";

export function PlacePhotoCredits({ ids, places }: { ids: string[]; places?: CmsPlace[] }) {
  const photos = [...new Set(ids)].flatMap(id => {
    const custom = places?.find(place => place.id === id);
    const photo = custom ? (custom.photoCredit || custom.photoSource ? { alt: custom.imageAlt, page: custom.photoSource, credit: custom.photoCredit } : undefined) : getPlacePhoto(id);
    return photo ? [{ id, ...photo }] : [];
  });
  if (!photos.length) return null;
  return <details className="wr-photo-credits"><summary>Venue photo sources</summary><p>Photos show the named venue or branch and are cropped to fit. Interiors and facilities can change. Images belong to their respective owners.</p>{photos.map(photo => <p key={photo.id}>{photo.page ? <a href={photo.page} target="_blank" rel="noopener noreferrer">{photo.alt}</a> : photo.alt} · {photo.credit}</p>)}</details>;
}
