import Link from "next/link";
import { breadcrumbSchema, jsonLd, type BreadcrumbItem } from "@/lib/schema";

export function Breadcrumbs({ items, dark = false, schemaOnly = false }: {
  items: BreadcrumbItem[]; dark?: boolean; schemaOnly?: boolean;
}) {
  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(breadcrumbSchema(items)) }} />
    {!schemaOnly && <nav aria-label="Breadcrumb" className={`mx-auto max-w-[1400px] px-4 py-4 text-sm sm:px-6 lg:px-8 ${dark ? "text-white/70" : "text-ink-soft"}`}>
      <ol className="flex flex-wrap items-center gap-2">
        {items.map((item, i) => <li key={item.path} className="flex items-center gap-2">
          {i > 0 && <span aria-hidden="true">/</span>}
          {i === items.length - 1 ? <span aria-current="page">{item.name}</span> : <Link href={item.path} className="underline-offset-4 hover:underline">{item.name}</Link>}
        </li>)}
      </ol>
    </nav>}
  </>;
}
