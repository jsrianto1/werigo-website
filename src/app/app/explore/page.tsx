import { Explore } from "@/components/pwa/Explore";
import { WhatToDo } from "@/components/pwa/WhatToDo";
import { publishedContent } from "@/lib/cms";
export const revalidate = 60;
export default async function ExplorePage() { return <><WhatToDo places={(await publishedContent("places")).items.filter(p => p.enabled && ["cafe","activity","place"].includes(p.kind))}/><details className="wr-area-guides"><summary>Browse Bali area guides</summary><Explore/></details></>; }
