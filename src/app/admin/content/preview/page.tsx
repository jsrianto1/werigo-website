import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdmin } from "@/lib/adminAuth";
import { cmsReady, getContentDocument } from "@/lib/cms";
import { placeKinds, placeKindLabels, type PlaceKind } from "@/lib/cmsRules";
import { HomeContent } from "@/components/home/HomeContent";
import { WhatToDo } from "@/components/pwa/WhatToDo";
import { WhereToStay } from "@/components/pwa/WhereToStay";
import { WhereToShop } from "@/components/pwa/WhereToShop";
import { WorkoutWellness } from "@/components/pwa/WorkoutWellness";
import "@/app/app/app.css";
import "@/app/app/reference.css";
import "@/app/app/identity.css";
import "@/app/app/guides.css";

export const metadata: Metadata = { title: "Private Content Preview", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function ContentPreview({ searchParams }: { searchParams: Promise<{ document?: string; kind?: string }> }) {
  const admin = await getAdmin();
  if (!admin) redirect("/admin");
  if (admin.mustChangePassword) redirect("/admin/profile?change=1");
  const params = await searchParams;
  const key = params.document === "places" ? "places" : "home";
  const kind: PlaceKind = placeKinds.includes(params.kind as PlaceKind) ? params.kind as PlaceKind : "cafe";
  const ready = await cmsReady().catch(() => false);
  const document = ready ? await getContentDocument(key) : null;
  const places = document?.key === "places" ? (document.draft as import("@/lib/cmsRules").ContentPayloads["places"]).items.filter(p => p.enabled) : [];
  return <>
    <aside className="relative z-50 border-b border-primary/20 bg-primary-faint px-5 py-4 text-sm text-ink">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
        <p><strong>Private draft preview.</strong> Saved version {document?.version ?? 0}. This content is not published.</p>
        <Link href="/admin/content" className="font-semibold text-primary underline">Back to Content Studio</Link>
        {key === "places" && <nav className="flex w-full flex-wrap gap-2" aria-label="Preview place category">{placeKinds.map(value => <Link key={value} href={`/admin/content/preview?document=places&kind=${value}`} className={`rounded-lg border px-3 py-2 ${kind === value ? "border-primary bg-primary text-white" : "border-line bg-card"}`}>{placeKindLabels[value]}</Link>)}</nav>}
      </div>
    </aside>
    {!document ? <p className="p-8">Activate the CMS and save a draft in Content Studio to preview it here.</p> :
      key === "home" ? <HomeContent content={document.draft as import("@/lib/cmsRules").HomeContentData}/> :
      <div className="ride-app" data-theme="light"><div className="ra-content">{kind === "stay" ? <WhereToStay places={places.filter(p => p.kind === "stay")}/> :
      kind === "wellness" ? <WorkoutWellness places={places.filter(p => p.kind === "wellness")}/> :
      kind === "shop" ? <WhereToShop places={places.filter(p => p.kind === "shop")}/> :
      <WhatToDo cafeGuide={kind === "cafe"} places={places.filter(p => p.kind === kind)}/>}</div></div>}
  </>;
}
