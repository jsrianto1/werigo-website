import { englishMessages } from "./messages";
export type Language = "en" | "id";
export const DEFAULT_LANGUAGE:Language="en";
export const LANGUAGE_STORAGE_KEY="werigo-ops-language";
export const extraEnglish:Record<string,string>={
 "Data rental":"Rental records","Update motor kembali, perpanjangan dan masalah dalam satu tempat.":"Update returns, extensions and issues in one place.","Data rental sumber":"Imported rental records","Login belum diatur":"Login not set",
 "Aktivitas user":"User activity","Pantau login, halaman dan perubahan data seluruh user.":"Monitor sign-ins, page visits and record changes across your team.","Login saya":"My login","Atur username dan password akunmu sendiri.":"Manage your own username and password.","Akses Owner":"Owner access","User tersimpan. Login siap dipakai dengan username dan password.":"User saved. They can now sign in with their username and password.","Aktivitas seluruh user, khusus Owner":"All user activity, visible only to the Owner","Buka log login, halaman dan perubahan data.":"Review sign-ins, page visits and record changes.","Lihat aktivitas":"View activity","Login saya berhasil disimpan.":"My login was saved.","Logout gagal. Coba lagi.":"Sign-out failed. Try again.",
 "User & akses":"Users & access","Tambah user":"Add user","Ubah user":"Edit user","Simpan user":"Save user","Tambah user, atur peran dan akses untuk tim Werigo.":"Add users and manage roles for your Werigo team.","Tambah user & atur peran":"Add users & manage roles","Lihat anggota tim":"View team members","Akses aplikasi":"App access","User tersimpan. Pastikan email ini juga diberi akses ke Site.":"User saved. Make sure the same email also has Site access.","Nama user *":"User name *","Akses user aktif":"User access enabled","Gunakan email akun ChatGPT user. Setelah disimpan, pemilik perlu membagikan Site ke email yang sama.":"Use the user’s ChatGPT email. After saving, the owner must share this Site with the same email.",
 "Pengingat rental":"Rental reminders","Pantau masa sewa, jadwal keluar dan pickup motor.":"Track rental expiry, handovers and motorbike collection.","Data sales":"Sales records","Data sales Werigo":"Werigo sales records","Catatan rental dan refund dari sumber Excel, khusus Werigo.":"Rental and refund records from the Werigo source workbook.",
 "Data WERIGO sudah diimpor":"WERIGO sales data imported","{count} baris sumber · rental & refund":"{count} source rows · rentals & refunds","Rental dari Excel":"Rentals from Excel","Lihat rental berjalan dan riwayat sumber":"View active rentals and source history","Customer dari data sales":"Customers from sales records","Lihat nama dan riwayat rental dari Excel":"View customer names and rental history from Excel","Data sales diimpor":"Sales records imported","Pengembalian sumber ditindaklanjuti":"Source rental return updated",
 "Bahasa aplikasi":"App language","Buka menu":"Open menu","Tutup menu":"Close menu","Lewati ke konten":"Skip to content",
 "Tim Bali":"Bali team","Semua aktivitas tim, satu tempat.":"Your team’s day, in one place.","Siap untuk perjalanan hari ini?":"Ready for the day?",
 "Lihat motor, booking, dan pekerjaan yang perlu ditangani.":"Check your fleet, bookings, and what needs attention.",
 "Halo,":"Hi,","motor":"bikes","hari":"days","helm":"helmets","sewa":"rental","motor ·":"bikes ·","hari · tarif":"days · rate",
 "dari {count} unit tercatat":"of {count} registered bikes","{count} booking berjalan":"{count} active bookings","{count} booking perlu diperhatikan hari ini.":"{count} bookings need attention today.",
 "Tersimpan untuk seluruh tim":"Saved for your team","Kembali {date}":"Return {date}","Booking berikutnya {date}":"Next booking {date}",
 "Sisa {amount}":"Balance {amount}","Odometer saat keluar: {value} km":"Pickup odometer: {value} km",
 "Dicatat {actor} · {date} · Bukti {id}":"Recorded by {actor} · {date} · Record {id}",
 "{count} booking":"{count} bookings","{count} motor":"{count} bikes","{count} feedback tercatat · rating hanya dari customer yang memberikannya.":"{count} feedback entries · ratings only from customers who gave one.",
 "{rating} / 5 dari rating tercatat":"{rating} / 5 from recorded ratings","{count} belum ditangani":"{count} to do","{count} sedang ditangani":"{count} in progress","{count} selesai":"{count} resolved",
 "{count} tersedia":"{count} available","{count} total unit":"{count} total bikes","Geser ke samping untuk melihat 14 hari":"Scroll sideways to see all 14 days",
 "per {count} hari":"every {count} days","per hari":"daily","{count} hari · tarif {tier}":"{count} days · {tier} rate",
 "Pendapatan sewa":"Rental revenue","Motor keluar & kembali":"Pickup & return","Muat ulang data":"Refresh data","Terhubung":"Connected","Offline":"Offline",
 "Tanda tangan {name}":"Signature of {name}","{count} helm":"{count} helmets",
 "s/d":"to","selesai":"resolved","tersedia":"available","Pasang aplikasi":"Install app",
 "Belum ada promo publik yang dikonfirmasi. Tanyakan pengelola sebelum menawarkan diskon.":"No public promotion has been confirmed. Ask a manager before offering a discount.",
 "{unit} · {plate}. Pastikan foto, kelengkapan dan catatan di atas sudah benar.":"{unit} · {plate}. Review the photos, accessories and notes above before signing.",
 "{date}: uang masuk {cash}, sewa {rental}":"{date}: cash received {cash}, rental allocation {rental}",
 "2–6 hari":"2–6 days","7–13 hari":"7–13 days","14–20 hari":"14–20 days","21 hari–<1 bulan":"21 days–<1 month","≥1 bulan kalender":"≥1 calendar month",
};
export function translate(language:Language,input:string,vars?:Record<string,string|number>){
 const key=input.trim().replace(/\s+/g," ");let translated=language==="en"?(extraEnglish[key]??englishMessages[key]??key):key;
 if(vars)translated=translated.replace(/\{(\w+)\}/g,(match,name)=>vars[name]===undefined?match:String(vars[name]));
 if(language==="en"&&Number(vars?.count)===1)translated=translated.replace(/\bbikes\b/g,"bike").replace(/\bbookings\b/g,"booking").replace(/\bhelmets\b/g,"helmet");
 return (input.match(/^\s*/)?.[0]||"")+translated+(input.match(/\s*$/)?.[0]||"");
}
