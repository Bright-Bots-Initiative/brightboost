/**
 * The public chrome header: the brand pair, the language control, Sign in.
 *
 * Exactly three controls at every width, so there is no menu to collapse into
 * and nothing that a phone-width visitor has to open before they can read the
 * page. The wordmark stays type, not a lockup — no combined mark has been
 * approved — and the mascot sits BESIDE it as its own image rather than inside
 * the link, so the two read as a pair without becoming one mark. It is
 * decorative (`alt=""`): the link is already named "Bright Boost".
 *
 * `flex-wrap` is a last resort, not a layout: from 320px up with normal text
 * the row fits on one line and nothing wraps. It is there for text zoom — at
 * 390px with the root font at 200% the wordmark, the language control and
 * "Iniciar sesión" cannot share a line at any padding, and a row that cannot
 * fit must reflow rather than push the page sideways.
 *
 * Nothing in this row may wrap at 320px, which is what the shipped version did
 * — the wordmark broke across two lines and "Sign in" followed it onto a
 * second. Four things keep it on one line: `whitespace-nowrap` on both labels,
 * a step down in label size and padding below `sm`, the language control in
 * its `public` variant (the same 44px box as its navy neighbours instead of a
 * 30px coral chip), and the mascot hidden below 360px
 * (`src/styles/public-entry.css`) — at 320px the row is full and the wordmark
 * has the stronger claim on it.
 *
 * Sign in only. `/signup` still resolves and the role pages still carry their
 * own account actions; the header does not duplicate them.
 */
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import LanguageToggle from "@/components/LanguageToggle";

const MASCOT_SRC = "/mascots/bright-bot-character.png";

export interface PublicHeaderProps {
  /**
   * Accessible name for the nav landmark. Defaults to the shipped homepage
   * convention (`nav[aria-label="Homepage"]`); a page that is not the homepage
   * passes its own.
   */
  label?: string;
  /**
   * The language the page is actually rendering, when that can differ from the
   * app language. Passed straight to `LanguageToggle` so the control names
   * what the reader is looking at without changing their saved preference.
   */
  renderedLanguage?: string;
}

const PublicHeader = ({ label, renderedLanguage }: PublicHeaderProps) => {
  const { t } = useTranslation();

  return (
    <nav
      className="sticky top-0 z-20 border-b border-[color:var(--bb-color-border)] bg-white/95 backdrop-blur"
      aria-label={label ?? t("publicChrome.nav.homepageLabel")}
    >
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-1.5 px-5 py-1.5 sm:gap-3 sm:px-6">
        <div className="flex min-h-[var(--bb-control-height)] items-center gap-2">
          <img
            className="bb-brand-mark h-9 w-9 flex-none"
            src={MASCOT_SRC}
            alt=""
            aria-hidden="true"
            width={36}
            height={36}
            decoding="async"
          />
          <Link
            to="/"
            className="-mx-0.5 inline-flex min-h-[var(--bb-control-height)] items-center whitespace-nowrap px-0.5 text-base font-extrabold tracking-tight text-brightboost-navy sm:-mx-2 sm:px-2 sm:text-lg"
          >
            {t("publicChrome.nav.brand")}
          </Link>
        </div>
        <div className="flex min-h-[var(--bb-control-height)] flex-wrap items-center justify-end gap-1.5 sm:gap-3">
          <LanguageToggle
            variant="public"
            renderedLanguage={renderedLanguage}
          />
          <Link
            to="/student-login"
            className="button-shadow inline-flex min-h-[var(--bb-control-height)] items-center justify-center whitespace-nowrap rounded-[var(--bb-radius-md)] bg-brightboost-navy px-2.5 py-2 text-sm font-extrabold text-white hover:brightness-110 active:translate-y-[3px] sm:px-4"
          >
            {t("publicChrome.nav.signIn")}
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default PublicHeader;
