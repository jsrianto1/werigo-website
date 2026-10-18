import { getPlacePhoto } from "@/data/appPlacePhotos";

export function PlacePhotoCredits({ ids }: { ids: string[] }) {
  const photos = [...new Set(ids)].flatMap(id => {
    const photo = getPlacePhoto(id);
    return photo ? [{ id, ...photo }] : [];
  });
  if (!photos.length) return null;
  return <details className="wr-photo-credits"><summary>Venue photo sources</summary><p>Photos show the named venue or branch and are cropped to fit. Interiors and facilities can change. Images belong to their respective owners.</p>{photos.map(photo => <p key={photo.id}><a href={photo.page} target="_blank" rel="noopener noreferrer">{photo.alt}</a> · {photo.credit}</p>)}</details>;
}
