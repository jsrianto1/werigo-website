"use client";
import { useLanguage } from "./language";
import { useEffect, useRef, useState, type ReactNode, type FormEvent } from "react";
import { X, Plus, ImagePlus, LoaderCircle, Trash2, Inbox, ArrowUpRight, CheckCircle2 } from "./icons";
import { type Row } from "@/ops/lib/domain";
import { lockDialogScroll } from './dialog-scroll';
export function Button({ children, onClick, variant = "primary", type = "button", disabled = false, className = "" }: {
    children: ReactNode;
    onClick?: () => void;
    variant?: string;
    type?: "button" | "submit";
    disabled?: boolean;
    className?: string;
}) { const { t: tr, language, formatDate } = useLanguage(); return <button type={type} onClick={onClick} className={`btn ${variant} ${className}`} disabled={disabled}>{children}</button>; }
export function Badge({ status, children }: {
    status: string;
    children?: ReactNode;
}) { const { t: tr, language, formatDate } = useLanguage(); const labels: Row = { sold: language==="en"?"Sold / RTO":"Terjual / RTO",internal:language==="en"?"Internal use":"Operasional internal",ready: tr("Siap dipakai"), maintenance: tr("Dalam perawatan"), inactive: tr("Nonaktif"), pending_payment: language==="en"?"Awaiting website payment":"Menunggu pembayaran website", draft: "Draft", confirmed: tr("Sudah dibooking"), active: tr("Sedang disewa"), completed: tr("Selesai"), cancelled: tr("Dibatalkan"), open: tr("Belum ditangani"), in_progress: tr("Sedang ditangani"), resolved: tr("Selesai ditangani"), urgent: tr("Mendesak"), normal: "Normal", low: tr("Rendah"), damage: tr("Kerusakan"), complaint: tr("Keluhan"), service: tr("Servis"), general: tr("Catatan"), rental: tr("Pembayaran sewa"), refund: tr("Refund sewa"), deposit: tr("Deposit masuk"), deposit_refund: tr("Deposit kembali"), owner: tr("Pemilik"), manager: "Admin", ops: "Staff", finance: "Finance" }; return <span className={`badge ${status}`}><i />{children || labels[status] || status}</span>; }
export function Empty({ icon: Icon = Inbox, title, body, action, onAction }: {
    icon?: any;
    title: string;
    body: string;
    action?: string;
    onAction?: () => void;
}) { const { t: tr, language, formatDate } = useLanguage(); return <div className="empty"><div className="empty-icon"><Icon size={30} strokeWidth={1.5}/></div><h3>{title}</h3><p>{body}</p>{action && <Button onClick={onAction}><Plus size={16}/>{action}</Button>}</div>; }
export function Field({ label, hint, children, wide = false }: {
    label: string;
    hint?: string;
    children: ReactNode;
    wide?: boolean;
}) { const { t: tr, language, formatDate } = useLanguage(); return <label className={`field ${wide ? "wide" : ""}`}><span>{label}</span>{children}{hint && <small>{hint}</small>}</label>; }
export function Section({ title, body, children }: {
    title: string;
    body?: string;
    children: ReactNode;
}) { const { t: tr, language, formatDate } = useLanguage(); return <section className="form-section"><div className="section-label"><h3>{title}</h3>{body && <p>{body}</p>}</div><div className="form-grid">{children}</div></section>; }
export function Modal({ title, subtitle, onClose, children, wide = false }: {
    title: string;
    subtitle?: string;
    onClose: () => void;
    children: ReactNode;
    wide?: boolean;
}) { const { t: tr, language, formatDate } = useLanguage(); const ref = useRef<HTMLDialogElement>(null); useEffect(() => { const release=lockDialogScroll();ref.current?.showModal(); return () => {ref.current?.close();release();}; }, []); return <dialog ref={ref} className={`modal ${wide ? "modal-wide" : ""}`} onCancel={onClose} onClick={e => { if (e.target === ref.current) {
    const box = ref.current.getBoundingClientRect();
    if (e.clientX < box.left || e.clientX > box.right || e.clientY < box.top || e.clientY > box.bottom)
        onClose();
} }}><div className="modal-head"><div><span className="eyebrow">WERIGO OPS</span><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div><button className="icon-btn" onClick={onClose} aria-label={tr("Tutup")}><X size={21}/></button></div>{children}</dialog>; }
export function SimpleForm({ children, onSave, onClose, label = "Simpan", className = "" }: {
    children: ReactNode;
    onSave: (d: Row) => Promise<void>;
    onClose: () => void;
    label?: string;
    className?: string;
}) { const { t: tr, language, formatDate } = useLanguage(); const [busy, setBusy] = useState(false), [error, setError] = useState(""); async function submit(e: FormEvent<HTMLFormElement>) { e.preventDefault(); setError(""); setBusy(true); try {
    await onSave(Object.fromEntries(new FormData(e.currentTarget)));
}
catch (e) {
    setError(e instanceof Error ? e.message : tr("Belum tersimpan. Coba lagi."));
}
finally {
    setBusy(false);
} } return <form className={className} onSubmit={submit}><div className="modal-body">{children}{error && <div className="form-error" role="alert">{tr(error)}</div>}</div><div className="modal-foot"><span className="save-hint"><CheckCircle2 size={14}/>{tr("Tersimpan untuk seluruh tim")}</span><Button variant="ghost" onClick={onClose} disabled={busy}>{tr("Batal")}</Button><Button type="submit" disabled={busy}>{busy ? <LoaderCircle className="spin" size={17}/> : null}{busy ? tr("Menyimpan\u2026") : tr(label)}</Button></div></form>; }
export async function uploadFile(file: File | Blob, name = "photo.png") { const f = new FormData(); f.append("file", file, name); const res = await fetch("/api/ops/files", { method: "POST", body: f }); const data = await res.json() as Row; if (!res.ok)
    throw new Error(data.error); return data.id as string; }
export function UploadField({ value, onChange, label = "Foto kondisi motor" }: {
    value: string[];
    onChange: (v: string[]) => void;
    label?: string;
}) { const { t: tr, language, formatDate } = useLanguage(); const [busy, setBusy] = useState(false), [error, setError] = useState(""); return <div className="upload-field wide"><label className="upload-zone"><ImagePlus size={23}/><strong>{busy ? tr("Mengunggah foto\u2026") : tr(label)}</strong><span>{tr("Ambil foto atau pilih dari galeri \u00B7 JPG, PNG, WebP \u00B7 maks. 6 MB/foto")}</span><input type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={busy} aria-label={tr(label)} onChange={async (e) => { const chosen = Array.from(e.target.files || []); if (value.length + chosen.length > 8) {
    setError(tr("Maksimum 8 foto."));
    return;
} setBusy(true); setError(""); const saved = [...value]; try {
    for (const file of chosen) {
        saved.push(await uploadFile(file, file.name));
        onChange([...saved]);
    }
}
catch (e) {
    setError((e as Error).message);
}
finally {
    setBusy(false);
} }}/></label>{error && <div role="alert" className="form-error">{tr(error)}</div>}<div className="photo-strip">{value.map(id => <div key={id}><img src={`/api/ops/files/${id}`} alt={tr("Foto terunggah")}/><button type="button" aria-label={tr("Hapus foto dari pilihan")} onClick={() => onChange(value.filter(x => x !== id))}><X size={14}/></button></div>)}</div>{busy && <span className="inline-loading"><LoaderCircle size={15} className="spin"/>{tr("Tunggu sampai seluruh foto selesai diunggah.")}</span>}</div>; }
export function SignaturePad({ onChange }: {
    onChange: (v: string) => void;
}) { const { t: tr, language, formatDate } = useLanguage(); const ref = useRef<HTMLCanvasElement>(null), drawing = useRef(false); function point(e: React.PointerEvent<HTMLCanvasElement>) { const canvas = ref.current!, box = canvas.getBoundingClientRect(); return { x: (e.clientX - box.left) * canvas.width / box.width, y: (e.clientY - box.top) * canvas.height / box.height }; } return <div className="signature wide"><div><strong>{tr("Tanda tangan customer")}</strong><button type="button" className="text-btn" onClick={() => { const c = ref.current!; c.getContext("2d")?.clearRect(0, 0, c.width, c.height); onChange(""); }}>{tr("Hapus & ulangi")}</button></div><canvas ref={ref} width={1000} height={300} aria-label={tr("Area tanda tangan customer, gambar dengan jari atau pena")} onPointerDown={e => { drawing.current = true; e.currentTarget.setPointerCapture(e.pointerId); const p = point(e), ctx = ref.current!.getContext("2d")!; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + .5, p.y + .5); ctx.strokeStyle = "#173F37"; ctx.lineWidth = 5; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.stroke(); }} onPointerMove={e => { if (!drawing.current)
    return; const p = point(e), ctx = ref.current!.getContext("2d")!; ctx.lineTo(p.x, p.y); ctx.stroke(); }} onPointerUp={() => { drawing.current = false; onChange(ref.current!.toDataURL("image/png")); }} onPointerCancel={() => { drawing.current = false; }}/><small>{tr("Customer menggambar tanda tangan di area ini menggunakan jari, stylus, atau mouse.")}</small></div>; }
export function PhotoGallery({ ids }: {
    ids: string[];
}) { const { t: tr, language, formatDate } = useLanguage(); return <div className="evidence-gallery">{ids.map(id => <a href={`/api/ops/files/${id}`} target="_blank" rel="noreferrer" key={id}><img src={`/api/ops/files/${id}`} alt={tr("Bukti kondisi motor")} loading="lazy"/><ArrowUpRight size={15}/></a>)}</div>; }
