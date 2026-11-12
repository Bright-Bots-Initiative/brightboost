/**
 * `/donate` — a small standalone support page.
 *
 * It replaces the homepage donation module, and it deliberately does less than
 * that module did. What went, and why:
 *
 *  - the amount chips ($5 / $15 / $50 / $100 / Other) set React state and were
 *    never read by anything — no amount was ever carried to a destination, so
 *    they were a control that looked like it worked;
 *  - "Give monthly" rendered `href={donationUrl || "#"}`, which means it was a
 *    dead link whenever the URL was absent, and it fired
 *    `donation_clicked{cadence:"monthly"}` for a cadence nothing here can
 *    honour. Both are gone; no cadence is claimed or measured.
 *
 * What is left is one honest state or the other: a single external link when
 * `VITE_DONATION_URL` is configured and parses to `http:`/`https:`, and a
 * plain "not available yet" sentence when it is not. There is never an
 * `href="#"`, never a simulated checkout, and no tax, frequency, policy or
 * destination claim — none of those is verified in this repository.
 *
 * `donation_clicked` fires on the link click. A click is an intent to look at
 * a giving page; it is not a donation, and nothing here can observe one.
 */
import { useTranslation } from "react-i18next";
import PublicHeader from "@/components/home/PublicHeader";
import PublicFooter from "@/components/home/PublicFooter";
import {
  PUBLIC_ACTION_PRIMARY,
  PUBLIC_SKY_BAND,
  usePublicPageMeta,
  useRenderedLanguage,
} from "@/components/home/publicEntry";
import { track } from "@/lib/analytics";
import "@/styles/public-entry.css";

/**
 * A configured value is only usable if it parses AND is http(s). A `javascript:`
 * or `data:` value, or anything `new URL()` rejects, is treated exactly like no
 * configuration at all.
 */
export function resolveDonationUrl(raw: unknown): string | null {
  if (typeof raw !== "string" || raw.trim() === "") return null;
  try {
    const parsed = new URL(raw.trim());
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:")
      return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

const Donate = () => {
  const { t } = useTranslation();
  const lang = useRenderedLanguage();

  usePublicPageMeta(
    t("donatePage.meta.title"),
    t("donatePage.meta.description"),
    lang,
  );

  const donationUrl = resolveDonationUrl(import.meta.env.VITE_DONATION_URL);

  return (
    <div className="bb-public flex min-h-screen flex-col bg-white text-[color:var(--bb-color-text)]">
      <PublicHeader label={t("donatePage.nav.label")} renderedLanguage={lang} />

      <main className="flex-1">
        <section style={PUBLIC_SKY_BAND}>
          <div className="mx-auto max-w-6xl px-5 py-8 sm:px-6 md:py-12">
            <h1 className="max-w-[20ch] text-[clamp(1.875rem,4vw,2.5rem)] font-extrabold leading-tight tracking-[-0.01em]">
              {t("donatePage.title")}
            </h1>

            <p className="mt-4 max-w-[62ch] text-lg leading-[1.65]">
              {t("publicChrome.footer.relationship")}
            </p>

            <p className="mt-3 max-w-[62ch] leading-relaxed">
              {t("donatePage.optional")}
            </p>

            {donationUrl ? (
              <p className="mt-6">
                <a
                  href={donationUrl}
                  target="_blank"
                  rel="noreferrer"
                  className={PUBLIC_ACTION_PRIMARY}
                  onClick={() => track({ kind: "donation_clicked" })}
                >
                  {t("donatePage.donateCta")}
                </a>
              </p>
            ) : (
              <p
                role="note"
                className="mt-6 max-w-[62ch] rounded-[var(--bb-radius-md)] border border-[color:var(--bb-color-warn-border)] bg-[color:var(--bb-color-warn-soft)] px-4 py-3 text-[color:var(--bb-color-warn-text)]"
              >
                {t("donatePage.unavailable")}
              </p>
            )}
          </div>
        </section>
      </main>

      {/* No giving link in the footer here: this page IS the giving link's
          destination, and a footer link back to itself is noise. */}
      <PublicFooter />
    </div>
  );
};

export default Donate;
