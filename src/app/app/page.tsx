import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
export const dynamic = "force-dynamic";
export default async function AppEntry() { redirect(await getSessionUser() ? "/app/rent" : "/app/login"); }
