import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { getAdmin } from "@/lib/adminAuth";
import { getArticleDraft } from "@/lib/articles";
import { ArticleView } from "@/components/articles/ArticleView";
export const metadata:Metadata={title:"Private Article Preview",robots:{index:false,follow:false}};
export const dynamic="force-dynamic";
export default async function Page({searchParams}:{searchParams:Promise<{id?:string}>}){
  const admin=await getAdmin();if(!admin)redirect("/admin");if(admin.mustChangePassword)redirect("/admin/profile?change=1");
  const {id}=await searchParams;if(!z.string().uuid().safeParse(id).success)notFound();
  const article=await getArticleDraft(id!);if(!article)notFound();
  return <><aside className="border-b border-primary/20 bg-primary-faint px-5 py-4 text-sm"><div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3"><p><strong>Private draft preview.</strong> Saved version {article.version}. Publishing is a separate action.</p><Link href="/admin/articles" className="font-semibold text-primary underline">Back to Articles</Link></div></aside><ArticleView article={article} preview/></>;
}
