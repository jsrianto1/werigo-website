import { WorkoutWellness } from "@/components/pwa/WorkoutWellness";
import { publishedContent } from "@/lib/cms";
export const revalidate = 60;
export default async function Page() { return <WorkoutWellness places={(await publishedContent("places")).items.filter(p => p.enabled && p.kind === "wellness")}/>; }
