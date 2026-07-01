import { ChevronDown } from "lucide-react";
import { faqSchema } from "@/lib/seo/jsonld";

/**
 * FAQ section — renders visible Q&A (AEO + People-Also-Ask bait) AND
 * emits matching FAQPage JSON-LD so Google can show rich results.
 *
 * The same faqs array feeds both the visible UI and the structured data,
 * keeping them in sync by construction.
 */
export function FaqSection({
  faqs,
  id = "faq",
}: {
  faqs: Array<{ question: string; answer: string }>;
  id?: string;
}) {
  return (
    <section id={id} className="scroll-mt-24 pt-4">
      <h2 className="mb-6 text-2xl font-semibold tracking-[-0.02em] text-[var(--ui-text)] sm:text-3xl">
        Frequently Asked Questions
      </h2>
      <div className="space-y-3">
        {faqs.map((faq) => (
          <details
            key={faq.question}
            className="group rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-panel)] p-4 open:bg-[var(--ui-panel-2)]"
          >
            <summary className="flex cursor-pointer items-center justify-between gap-3 text-sm font-semibold text-[var(--ui-text)] marker:hidden">
              {faq.question}
              <ChevronDown
                aria-hidden="true"
                className="h-4 w-4 shrink-0 text-[var(--ui-muted)] transition group-open:rotate-180"
              />
            </summary>
            <p className="mt-3 text-sm font-medium leading-6 text-[var(--ui-muted)]">
              {faq.answer}
            </p>
          </details>
        ))}
      </div>

      {/* Matching FAQPage structured data — kept in lockstep with the
          visible Q&A above so rich results never drift from page content. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema(faqs)) }}
      />
    </section>
  );
}
