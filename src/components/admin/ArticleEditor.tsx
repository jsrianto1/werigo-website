"use client";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect, useState } from "react";
import { Bold, Italic, Underline, Strikethrough, List, ListOrdered, Quote, Link2, Undo2, Redo2, Minus } from "lucide-react";
import { parseRichBody, safeArticleLink } from "@/lib/articleRichText";
import "./article-editor.css";
export function ArticleEditor({value,onChange,disabled}:{value:string;onChange:(value:string)=>void;disabled:boolean}) {
  const [url,setUrl]=useState("");const [linkOpen,setLinkOpen]=useState(false);const [linkError,setLinkError]=useState("");
  const editor=useEditor({extensions:[StarterKit.configure({heading:{levels:[2,3]},code:false,codeBlock:false,link:{openOnClick:false,autolink:false}})],content:parseRichBody(value),immediatelyRender:false,editable:!disabled,
    editorProps:{attributes:{"aria-label":"Article body","role":"textbox","aria-multiline":"true","class":"werigo-article-editor"}},
    onUpdate:({editor})=>onChange(JSON.stringify(editor.getJSON()))});
  useEffect(()=>{editor?.setEditable(!disabled,false);},[editor,disabled]);
  useEffect(()=>{if(editor&&JSON.stringify(editor.getJSON())!==value)editor.commands.setContent(parseRichBody(value),{emitUpdate:false});},[editor,value]);
  const cls="inline-flex h-9 min-w-9 items-center justify-center rounded-lg px-2 text-ink hover:bg-primary-faint focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-40";
  if(!editor)return <div className="min-h-[360px] p-5 text-sm text-ink-soft">Loading article editor…</div>;
  const controls=[
    {name:"Undo",Icon:Undo2,run:()=>editor.chain().focus().undo().run()},
    {name:"Redo",Icon:Redo2,run:()=>editor.chain().focus().redo().run()},
    {name:"Bold",Icon:Bold,run:()=>editor.chain().focus().toggleBold().run()},
    {name:"Italic",Icon:Italic,run:()=>editor.chain().focus().toggleItalic().run()},
    {name:"Underline",Icon:Underline,run:()=>editor.chain().focus().toggleUnderline().run()},
    {name:"Strikethrough",Icon:Strikethrough,run:()=>editor.chain().focus().toggleStrike().run()},
    {name:"Bulleted list",Icon:List,run:()=>editor.chain().focus().toggleBulletList().run()},
    {name:"Numbered list",Icon:ListOrdered,run:()=>editor.chain().focus().toggleOrderedList().run()},
    {name:"Quote",Icon:Quote,run:()=>editor.chain().focus().toggleBlockquote().run()},
    {name:"Divider",Icon:Minus,run:()=>editor.chain().focus().setHorizontalRule().run()},
  ];
  return <div className="overflow-hidden rounded-2xl border border-line bg-card"><div className="flex flex-wrap items-center gap-1 border-b border-line p-2" role="toolbar" aria-label="Article formatting">
    <select className="h-9 rounded-lg border border-line bg-card px-2 text-xs" aria-label="Text style" disabled={disabled} defaultValue="" onChange={e=>{if(e.target.value==="p")editor.chain().focus().setParagraph().run();else editor.chain().focus().toggleHeading({level:Number(e.target.value) as 2|3}).run();e.target.value="";}}><option value="" disabled>Text style</option><option value="p">Paragraph</option><option value="2">Section heading</option><option value="3">Subheading</option></select>
    {controls.map(({name,Icon,run})=><button type="button" key={name} title={name} aria-label={name} className={cls} disabled={disabled} onClick={run}><Icon size={16}/></button>)}
    <button type="button" className={cls} disabled={disabled} aria-label="Add or edit link" aria-expanded={linkOpen} onClick={()=>{setUrl(editor.getAttributes("link").href??"");setLinkOpen(!linkOpen);setLinkError("");}}><Link2 size={16}/></button>
  </div>{linkOpen&&<div className="flex flex-wrap gap-2 border-b border-line p-3"><input aria-label="Link address" placeholder="https://… or /fleet" className="min-w-0 flex-1 rounded-lg border border-line px-3 py-2 text-sm" value={url} onChange={e=>setUrl(e.target.value)}/><button className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white" onClick={()=>{if(!safeArticleLink(url)){setLinkError("Use an HTTPS link or a Werigo page path.");return;}editor.chain().focus().extendMarkRange("link").setLink({href:url}).run();setLinkOpen(false);}}>Apply link</button><button className={cls} onClick={()=>{editor.chain().focus().unsetLink().run();setLinkOpen(false);}}>Remove</button>{linkError&&<p role="alert" className="w-full text-xs text-danger">{linkError}</p>}</div>}
  <EditorContent editor={editor}/></div>;
}
