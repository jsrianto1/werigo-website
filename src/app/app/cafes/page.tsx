import { WhatToDo } from "@/components/pwa/WhatToDo";
import { publishedContent } from "@/lib/cms";
export const revalidate = 60;
export default async function CafesPage() { return <WhatToDo cafeGuide places={(await publishedContent("places")).items.filter(p => p.enabled && ["cafe","activity","place"].includes(p.kind))}/>; }
