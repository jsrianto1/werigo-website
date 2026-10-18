import { RentalHome } from "@/components/pwa/RentalWizard";
import { getAppBikes } from "@/data/appBikes";
import { defaultAppDates } from "@/lib/appRental";
import { getSessionUser } from "@/lib/session";
export const dynamic = "force-dynamic";
export default async function RentPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await searchParams;
  const get = (key: string) => typeof query[key] === "string" ? query[key] as string : "";
  const dates = defaultAppDates();
  const user = await getSessionUser();
  const bikes = getAppBikes();
  return <RentalHome firstName={user?.name.trim().split(/\s+/)[0]} key={get("start") || "home"} begin={get("start") === "1" || Boolean(get("pickup"))} bikes={bikes} today={dates.today} initial={{ pickup: get("pickup"), vehicle: bikes.find(bike => bike.id === get("vehicle"))?.id ?? bikes[0]?.id ?? "", startDate: get("startDate") || dates.startDate, endDate: get("endDate") || dates.endDate, startTime: get("startTime") || dates.startTime, endTime: get("endTime") || dates.endTime, ref: get("ref") }}/>;
}
