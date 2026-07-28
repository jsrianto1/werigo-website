/**
 * Help Center content — original Werigo answers.
 * Answers directing customers to WhatsApp are interim wording for
 * policies still being formalised in writing — replace them with the
 * final policy text once legal review completes.
 */

export interface FaqItem {
  question: string;
  answer: string;
}

export interface FaqCategory {
  id: string;
  title: string;
  items: FaqItem[];
}

export const faqCategories: FaqCategory[] = [
  {
    id: "general",
    title: "General",
    items: [
      {
        question: "What is Werigo?",
        answer:
          "Werigo is a premium electric motorcycle rental service based in Bali. We deliver fully charged electric motorcycles and scooters to hotels and villas across the island's south and centre, so you can explore Bali quietly, cleanly and on your own schedule.",
      },
      {
        question: "Why choose electric over a petrol scooter?",
        answer:
          "Electric riding suits Bali well. There are no fuel stops, no engine heat in traffic and no noise, and the smooth pull from a standstill makes busy roads easier to handle. You simply charge overnight at your accommodation, the same way you charge your phone.",
      },
      {
        question: "Where does Werigo operate?",
        answer:
          "We currently serve Canggu, Seminyak, Kuta, Ubud, Uluwatu, Jimbaran, Sanur and Denpasar. More areas are planned. If your stay falls outside these zones, contact us and we will try to arrange delivery.",
      },
    ],
  },
  {
    id: "reservations",
    title: "Reservations",
    items: [
      {
        question: "How do I book a Werigo ride?",
        answer:
          "Choose your location and dates in the search, pick your model, add any extras and confirm your details. Your request opens in WhatsApp, and our team confirms availability and your quote there.",
      },
      {
        question: "How far in advance should I book?",
        answer:
          "During high season, which runs from July to August and December to January, we recommend booking at least a few days ahead. Outside peak periods, same-day and next-day bookings are often possible.",
      },
      {
        question: "Can I extend my rental while I'm still riding?",
        answer:
          "Yes, subject to availability. Message us on WhatsApp before your rental ends and we will extend the booking and adjust the rate to the best applicable tier.",
      },
      {
        question: "Can I change the delivery location after booking?",
        answer:
          "Yes. Let us know on WhatsApp at least a few hours before your delivery window and we will update it. A different delivery fee may apply if the new address is in another zone.",
      },
    ],
  },
  {
    id: "requirements",
    title: "Rental requirements",
    items: [
      {
        question: "What do I need to rent with Werigo?",
        answer:
          "A valid driving licence for two-wheeled vehicles (see the licence section below), a passport or national ID, and a WhatsApp-reachable phone number. Riders must be 18 or older.",
      },
      {
        question: "Do I need to leave a deposit?",
        answer:
          "Deposit requirements depend on the model and rental length. Our team confirms the exact amount, if any, on WhatsApp before you commit. The full written policy is being added to this page.",
      },
      {
        question: "Can someone else ride the motorcycle I rented?",
        answer:
          "Only riders named on the booking who meet the licence requirements are covered to ride. Add a second rider's details in the special requests field when booking.",
      },
    ],
  },
  {
    id: "license",
    title: "Driving licence",
    items: [
      {
        question: "What licence do I need to ride in Bali?",
        answer:
          "Indonesian law requires a motorcycle licence valid in Indonesia. For most visitors that means an International Driving Permit (IDP) with the motorcycle category (A) endorsed, carried together with your home licence.",
      },
      {
        question: "My home licence covers scooters. Is that enough?",
        answer:
          "A home-country licence alone is generally not valid in Indonesia without an accompanying International Driving Permit. Police checks do occur in tourist areas, so we strongly recommend arranging an IDP before your trip.",
      },
      {
        question: "Do lower-speed electric models have different rules?",
        answer:
          "Regulations for low-power electric two-wheelers are evolving in Indonesia. We will always tell you the current requirements for the specific model you book. When in doubt, carry an IDP.",
      },
    ],
  },
  {
    id: "operation",
    title: "Riding an electric motorcycle",
    items: [
      {
        question: "I've never ridden an electric motorcycle. Is it hard?",
        answer:
          "If you can ride a scooter, you can ride electric. There are no gears and no clutch. The main difference is instant, smooth acceleration, so we walk every first-time rider through a short briefing at delivery.",
      },
      {
        question: "How does the throttle feel compared to petrol?",
        answer:
          "Power arrives immediately and silently. Start gently for the first few minutes; most riders tell us they never want to go back.",
      },
      {
        question: "Are the bikes quiet enough to be dangerous?",
        answer:
          "Electric motorcycles are quiet, so ride as if other people haven't heard you. Use your horn at blind corners. That is normal riding etiquette in Bali.",
      },
    ],
  },
  {
    id: "battery",
    title: "Battery & charging",
    items: [
      {
        question: "How do I charge the motorcycle?",
        answer:
          "Every Werigo ride charges from a standard Indonesian power outlet, the same socket that charges your laptop. Plug in overnight at your villa or hotel and wake up to a full battery.",
      },
      {
        question: "What range can I expect in real conditions?",
        answer:
          "The range figures on each model page are real-world estimates for two riders in Bali traffic, not lab numbers. Hills, heavy throttle and a passenger reduce range; flat coastal cruising extends it.",
      },
      {
        question: "What if I run out of charge mid-ride?",
        answer:
          "Contact our support line and we'll help. Battery swap or recovery options depend on your model and location. The battery indicator gives generous warnings, so you'll have plenty of notice.",
      },
      {
        question: "Can I swap batteries instead of waiting for a charge?",
        answer:
          "Most fleet models have swappable batteries. Ask our team on WhatsApp whether battery swap service is available for your model and area. We'll tell you honestly what's possible for your dates.",
      },
    ],
  },
  {
    id: "delivery",
    title: "Delivery & collection",
    items: [
      {
        question: "How does hotel delivery work?",
        answer:
          "Pick a delivery window during booking and we bring the motorcycle to your hotel, villa or guesthouse, fully charged. The handover includes a condition walk-around, a riding briefing and helmet fitting.",
      },
      {
        question: "Can I return the motorcycle in a different area?",
        answer:
          "Yes. Choose a different return location during booking. Depending on the zones involved, a one-way fee may apply, and it is shown in your summary before you confirm.",
      },
      {
        question: "What happens at collection?",
        answer:
          "We meet you at the agreed time and place, check the motorcycle together and confirm the return in writing on WhatsApp. There are no paperwork queues and no hidden checks after you leave.",
      },
    ],
  },
  {
    id: "payments",
    title: "Payments",
    items: [
      {
        question: "How do I pay for my rental?",
        answer:
          "Our team confirms current payment options with you on WhatsApp when your booking is confirmed. Online card payment for international visitors is being added. Until then, nothing is charged before you approve the final quote.",
      },
      {
        question: "When am I charged?",
        answer:
          "Payment timing is agreed with you on WhatsApp as part of your confirmation. Your booking summary always comes first, and nothing is charged until you approve the final quote.",
      },
      {
        question: "Are there any hidden costs?",
        answer:
          "No. The quote our team confirms with you covers the rental, your extras and any delivery or one-way fees in full. Anything optional is clearly marked before you select it.",
      },
    ],
  },
  {
    id: "cancellation",
    title: "Cancellation",
    items: [
      {
        question: "Can I cancel my booking?",
        answer:
          "Yes. Message us on WhatsApp with your name and rental dates and we'll handle it. Cancellation terms for your booking are confirmed with your quote before anything is charged. The full written policy is being added to this page.",
      },
      {
        question: "What if my flight is delayed?",
        answer:
          "Add your flight number during booking and message us when plans change. We'll move your delivery window to match your actual arrival.",
      },
    ],
  },
  {
    id: "damage",
    title: "Accidents & damage",
    items: [
      {
        question: "What should I do after an accident?",
        answer:
          "Make sure everyone is safe first, then contact our emergency line immediately. It is staffed during all riding hours. We'll guide you through the next steps and arrange recovery if the motorcycle can't be ridden.",
      },
      {
        question: "What am I liable for if the motorcycle is damaged?",
        answer:
          "Liability terms for your rental are confirmed in writing with your booking quote, and the optional damage protection plan is explained before you choose it. You will never be held to terms that weren't shown to you at booking.",
      },
      {
        question: "What about punctures and minor mechanical issues?",
        answer:
          "Message support and we'll direct you to the nearest partner workshop or send assistance. Normal wear items are on us; damage from riding off sealed roads is not.",
      },
    ],
  },
  {
    id: "emergency",
    title: "Emergency support",
    items: [
      {
        question: "Who do I contact in an emergency?",
        answer:
          "For medical emergencies in Bali call 112 first. Then contact the Werigo emergency line. The number is included in your booking confirmation and printed on the motorcycle's key tag.",
      },
      {
        question: "What if the motorcycle breaks down at night?",
        answer:
          "Contact the emergency line. Depending on your location we'll talk you through a fix, send roadside help, or arrange recovery and a replacement ride for the morning.",
      },
    ],
  },
];

/**
 * Help Center display groups — presentation-level regrouping of the
 * existing categories. Answers are unchanged; only the navigation
 * structure differs.
 */
export interface HelpGroup {
  id: string;
  title: string;
  categoryIds: string[];
}

export const helpGroups: HelpGroup[] = [
  { id: "booking", title: "Booking & availability", categoryIds: ["general", "reservations"] },
  { id: "delivery-return", title: "Delivery & return", categoryIds: ["delivery"] },
  { id: "licence-riding", title: "Licence & riding", categoryIds: ["requirements", "license", "operation"] },
  { id: "charging", title: "Charging & SuperCharge", categoryIds: ["battery"] },
  { id: "support", title: "Support", categoryIds: ["emergency", "damage"] },
  { id: "terms-privacy", title: "Terms & privacy", categoryIds: ["payments", "cancellation"] },
];
