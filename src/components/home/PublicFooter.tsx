/**
 * The public chrome footer.
 *
 * Carries the relationship line the owner supplied — "Bright Boost is a
 * program of Bright Bots Initiative." — as one restrained sentence, not a
 * badge, a seal or a co-branded lockup.
 *
 * Two visibility props, with opposite defaults, because the two links they
 * control are different kinds of thing:
 *
 *  - `giving` is OFF by default and that default is the point: the single
 *    discreet support link is adult-facing and appears on the homepage and
 *    `/for-teachers` only. Never on `/for-families`, and never on a learner
 *    surface — those pages have nowhere for an ask to live because this
 *    component is not asked for one.
 *  - `feedback` is ON by default: it is wayfinding, and it is the only public
 *    route to `/feedback` now that the homepage's secondary-link row is gone,
 *    so a page has to opt OUT rather than opt in.
 *
 * Both obey the same rule where they land on their own destination: a page
 * does not link to itself. `/donate` omits the giving link, and `/feedback`
 * passes `feedback={false}` for exactly the same reason — a self-link reads as
 * a broken control and, here, would also count a `feedback_clicked` for a
 * visitor who is already on the page.
 *
 * The contact address is the one that already ships on `main`. This slice does
 * not verify, approve or add an address.
 */
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { track } from "@/lib/analytics";

export interface PublicFooterProps {
  /** Render the one discreet support link. Default: no giving link at all. */
  giving?: boolean;
  /**
   * Render the "Give feedback" link. Default: yes — it is the only public
   * route to `/feedback`. `/feedback` itself passes `false`.
   */
  feedback?: boolean;
  /** Accessible name for the footer landmark. */
  label?: string;
}

const LINK_CLASS =
  "inline-flex min-h-[var(--bb-control-height)] items-center text-brightboost-lightblue underline-offset-2 hover:underline";

const PublicFooter = ({
  giving = false,
  feedback = true,
  label,
}: PublicFooterProps) => {
  const { t } = useTranslation();

  return (
    <footer
      className="bg-brightboost-navy text-white"
      data-ground="dark"
      aria-label={label ?? t("publicChrome.footer.label")}
    >
      <div className="mx-auto max-w-6xl px-4 py-6">
        <p className="font-semibold">{t("publicChrome.footer.relationship")}</p>

        {/* Footer links are wayfinding, not funnel entries, so none of them
            measures — with one exception. "Give feedback" is the only public
            route to `/feedback` now that the homepage's secondary-link row is
            gone, and the link it replaces fired `feedback_clicked`, so that
            count survives the move rather than quietly disappearing. The role
            events belong to the in-body entries a visitor actually chooses
            between (the homepage's teachers-and-families group).
            It is omitted on `/feedback` itself, under the same rule that keeps
            the giving link off `/donate`: a page does not link to itself, and a
            self-link would count an intent to reach a page the visitor has
            already reached. */}
        <ul className="m-0 mt-2 flex list-none flex-wrap gap-x-5 p-0 text-sm">
          <li>
            <Link to="/parents" className={LINK_CLASS}>
              {t("publicChrome.footer.families")}
            </Link>
          </li>
          <li>
            <Link to="/for-teachers" className={LINK_CLASS}>
              {t("publicChrome.footer.teachers")}
            </Link>
          </li>
          <li>
            <Link to="/for-reviewers" className={LINK_CLASS}>
              {t("publicChrome.footer.reviewers")}
            </Link>
          </li>
          <li>
            <Link to="/pathways/about" className={LINK_CLASS}>
              {t("publicChrome.footer.pathways")}
            </Link>
          </li>
          <li>
            <Link to="/privacy" className={LINK_CLASS}>
              {t("publicChrome.footer.privacy")}
            </Link>
          </li>
          <li>
            <Link to="/terms" className={LINK_CLASS}>
              {t("publicChrome.footer.terms")}
            </Link>
          </li>
          {feedback ? (
            <li>
              <Link
                to="/feedback"
                className={LINK_CLASS}
                onClick={() => track({ kind: "feedback_clicked" })}
              >
                {t("publicChrome.footer.feedback")}
              </Link>
            </li>
          ) : null}
          <li>
            <a href="mailto:hello@brightbots.org" className={LINK_CLASS}>
              {t("publicChrome.footer.contact")}
            </a>
          </li>
        </ul>

        {giving ? (
          <p className="mt-2 text-sm">
            {/* A link click, not a donation: `donation_clicked` counts the
                intent to look, which is all this control does. */}
            <Link
              to="/donate"
              className={LINK_CLASS}
              onClick={() => track({ kind: "donation_clicked" })}
            >
              {t("publicChrome.footer.support")}
            </Link>
          </p>
        ) : null}
      </div>
    </footer>
  );
};

export default PublicFooter;
