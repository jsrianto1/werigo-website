import { WhereToStay } from "@/components/pwa/WhereToStay";
import { publishedContent } from "@/lib/cms";
export const revalidate = 60;
export default async function Page() { return <WhereToStay places={(await publishedContent("places")).items.filter(p => p.enabled && p.kind === "stay")}/>; }
