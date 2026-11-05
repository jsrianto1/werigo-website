import { HomeContent } from "@/components/home/HomeContent";
import { publishedContent } from "@/lib/cms";
import { pageMetadata } from "@/lib/seo";
export const revalidate = 60;
export async function generateMetadata() {
  const content = await publishedContent("home");
  return pageMetadata(content.copy.seoTitle.en, content.copy.seoDescription.en, "/");
}
export default async function HomePage() {
  return <HomeContent content={await publishedContent("home")}/>;
}
