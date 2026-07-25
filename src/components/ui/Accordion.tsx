"use client";

import { useState, useId } from "react";
import { ChevronDown } from "lucide-react";

export interface AccordionItem {
  question: string;
  answer: string;
}

/**
 * Accessible accordion using native disclosure semantics.
 * One item open at a time within a group.
 */
export function Accordion({ items }: { items: AccordionItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const groupId = useId();

  return (
    <div className="divide-y divide-line rounded-[14px] border border-line bg-card">
      {items.map((item, i) => {
        const isOpen = openIndex === i;
        const buttonId = `${groupId}-btn-${i}`;
        const panelId = `${groupId}-panel-${i}`;
        return (
          <div key={item.question}>
            <h3>
              <button
                id={buttonId}
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => setOpenIndex(isOpen ? null : i)}
                className="flex w-full cursor-pointer items-center justify-between gap-4 px-5 py-4 text-left text-[15px] font-medium text-ink transition-colors hover:text-primary"
              >
                {item.question}
                <ChevronDown
                  aria-hidden="true"
                  className={`h-4 w-4 shrink-0 text-ink-faint transition-transform duration-200 ${
                    isOpen ? "rotate-180" : ""
                  }`}
                />
              </button>
            </h3>
            <div
              id={panelId}
              role="region"
              aria-labelledby={buttonId}
              hidden={!isOpen}
              className="px-5 pb-5"
            >
              <p className="text-sm leading-relaxed text-ink-soft">{item.answer}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
