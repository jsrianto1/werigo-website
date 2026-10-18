import { getListedModels, sharedSpec } from "@/data/vehicles";
import { minRiderAge } from "@/lib/pricing";

export interface AppBike {
  id: string;
  modelSlug: string;
  model: string;
  displayName: string;
  bestFor: string;
  supercharge: boolean;
  image: string;
  imageAlt: string;
  character: string;
  introduction: string;
  highlights: { title: string; detail: string }[];
  minimumAge?: number;
}

/** App-only presentation. Specifications stay in the approved Wedison fleet data. */
export function getAppBikes(): AppBike[] {
  const order = ["edpower", "athena", "victory", "bees"];
  return getListedModels().map(bike => {
    const power = sharedSpec(bike.modelSlug, "motorW");
    const range = sharedSpec(bike.modelSlug, "claimedRangeKm");
    const seat = sharedSpec(bike.modelSlug, "seatHeightMm");
    const brakes = sharedSpec(bike.modelSlug, "brakes");
    const charge = sharedSpec(bike.modelSlug, "homeCharging");
    const profiles: Record<string, Pick<AppBike, "character" | "introduction" | "highlights">> = {
      edpower: {
        character: "The connected flagship",
        introduction: "Our longest claimed range meets a connected cockpit. Choose EdPower for longer island days and the most complete technology in the Werigo fleet.",
        highlights: [
          { title: `Up to ${range} km`, detail: "Claimed riding range. Actual range varies with riding conditions." },
          { title: "Connected cockpit", detail: (sharedSpec(bike.modelSlug, "features") ?? []).join(" · ") },
          { title: "SuperCharge ready", detail: "Supports home charging and Wedison SuperCharge." },
          { title: `${seat} mm seat`, detail: "A seat-height reference to help you choose your fit." },
        ],
      },
      athena: {
        character: "The comfortable cruiser",
        introduction: `Settle into a full day of exploring. Athena pairs a ${seat} mm seat with front and rear disc brakes, plus home charging and SuperCharge support.`,
        highlights: [
          { title: `${seat} mm seat`, detail: "A useful fit reference for your island ride." },
          { title: "Disc brakes", detail: brakes ?? "" },
          { title: "Home charging", detail: charge ?? "" },
          { title: "SuperCharge ready", detail: "Top up at compatible Wedison SuperCharge locations." },
        ],
      },
      victory: {
        character: "The everyday all-rounder",
        introduction: `From everyday errands to exploring the south. Victory combines a relaxed riding position, a ${power?.toLocaleString("en-US")} W motor and two ways to charge between plans.`,
        highlights: [
          { title: `${power?.toLocaleString("en-US")} W motor`, detail: "The all-rounder’s electric drive." },
          { title: `${sharedSpec(bike.modelSlug, "tiresFront")} wheels`, detail: "Front and rear wheel size." },
          { title: "Braking with CBS", detail: brakes ?? "" },
          { title: "Two ways to charge", detail: "Supports home charging and Wedison SuperCharge." },
        ],
      },
      bees: {
        character: "The compact city companion",
        introduction: "Coffee stops, coworking and short beach hops. Bees is the compact, lightweight option for local exploring, with charging from a standard 220V outlet.",
        highlights: [
          { title: "Compact & lightweight", detail: "Designed for urban trips and easy parking." },
          { title: `${power?.toLocaleString("en-US")} W motor`, detail: "Electric power for your local Bali routine." },
          { title: `Up to ${range} km`, detail: "Claimed riding range. Actual range varies with riding conditions." },
          { title: "220V home charging", detail: `${charge}. Bees does not support SuperCharge.` },
        ],
      },
    };
    return {
      id: bike.id, modelSlug: bike.modelSlug, model: bike.model, displayName: bike.displayName,
      bestFor: bike.bestFor, supercharge: bike.supercharge,
      image: bike.modelSlug === "edpower" ? "/app/edpower-red.webp" : `/media/fleet/${bike.modelSlug}/catalog.webp`,
      imageAlt: bike.modelSlug === "edpower" ? "Red Wedison EdPower motorcycle" : bike.displayName,
      minimumAge: minRiderAge[bike.modelSlug], ...profiles[bike.modelSlug],
    };
  }).sort((a, b) => order.indexOf(a.modelSlug) - order.indexOf(b.modelSlug));
}
