import { WhereToShop } from "@/components/pwa/WhereToShop";
import { publishedContent } from "@/lib/cms";
export const revalidate = 60;
export default async function Page() { return <WhereToShop places={(await publishedContent("places")).items.filter(p => p.enabled && p.kind === "shop")}/>; }
