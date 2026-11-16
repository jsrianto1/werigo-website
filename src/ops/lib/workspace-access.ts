const pages=['dashboard','settings','activity','reminders','sales','rentals','bookings','fleet','handovers','customers','payments','reports','notes','feedback','pricing'];
/** Navigation only. Every action still uses its existing server-side guard. */
export function opsPageIds(role?:string){
 if(!['owner','manager','finance','ops'].includes(role||''))return [];
 return pages.filter(id=>!['settings','activity'].includes(id)||role==='owner').filter(id=>!['payments','reports'].includes(id)||role!=='ops');
}
