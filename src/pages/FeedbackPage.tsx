/**
 * `/feedback` — the homepage feedback form, moved onto its own page.
 *
 * This is a MOVE, not a rebuild. The behaviour on `main` was verified before
 * the move: `submitFeedback` in `src/pages/Index.tsx` called
 * `setFeedbackSubmitted(true)` and `track({ kind: "feedback_submitted",
 * audience })` and did nothing else — no fetch, no storage, no delivery. That
 * is still exactly what happens here.
 *
 * Two rules the move makes explicit:
 *
 *  1. **The page says so before submission.** The old form told a visitor that
 *     their feedback "was captured in this browser session" only AFTER they
 *     pressed Send. Someone typing a message deserves to know where it goes
 *     before they type it, so the same truth is stated up front and the
 *     confirmation keeps its original wording.
 *  2. **The message and the e-mail address never leave this component.** They
 *     live in React state, are never put in the analytics payload, never
 *     written to storage, never logged and never sent anywhere. The only thing
 *     measured is that a submission happened and which audience tab was
 *     selected — an enum, not content.
 */
import { useState, type FormEvent } from "react";
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

type Audience = "teacher" | "student" | "parent" | "org";

const AUDIENCES: ReadonlyArray<{ key: Audience; labelKey: string }> = [
  { key: "teacher", labelKey: "feedbackPage.audienceTeacher" },
  { key: "student", labelKey: "feedbackPage.audienceStudent" },
  { key: "parent", labelKey: "feedbackPage.audienceParent" },
  { key: "org", labelKey: "feedbackPage.audienceOrg" },
];

const FeedbackPage = () => {
  const { t } = useTranslation();
  const lang = useRenderedLanguage();

  const [audience, setAudience] = useState<Audience>("teacher");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  usePublicPageMeta(
    t("feedbackPage.meta.title"),
    t("feedbackPage.meta.description"),
    lang,
  );

  const submitFeedback = (event: FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    // Audience only. The message and the e-mail address are deliberately not
    // in this payload and must never be added to it.
    track({ kind: "feedback_submitted", audience });
  };

  const fieldClass =
    "mt-1 w-full rounded-[var(--bb-radius-md)] border border-[color:var(--bb-color-border-strong)] bg-white p-3 focus:outline-none";

  return (
    <div className="bb-public flex min-h-screen flex-col bg-white text-[color:var(--bb-color-text)]">
      <PublicHeader
        label={t("feedbackPage.nav.label")}
        renderedLanguage={lang}
      />

      <main className="flex-1">
        <section style={PUBLIC_SKY_BAND}>
          <div className="mx-auto max-w-6xl px-5 py-8 sm:px-6 md:py-12">
            <h1 className="text-[clamp(1.875rem,4vw,2.5rem)] font-extrabold leading-tight tracking-[-0.01em]">
              {t("feedbackPage.title")}
            </h1>

            {/* Stated BEFORE anything is typed, not after it is sent. */}
            <p
              role="note"
              className="mt-4 max-w-[62ch] rounded-[var(--bb-radius-md)] border border-[color:var(--bb-color-warn-border)] bg-[color:var(--bb-color-warn-soft)] px-4 py-3 text-[color:var(--bb-color-warn-text)]"
            >
              {t("feedbackPage.localOnly")}
            </p>

            <form
              className="mt-6 max-w-[62ch] space-y-4"
              onSubmit={submitFeedback}
            >
              <div
                className="flex flex-wrap gap-2"
                role="tablist"
                aria-label={t("feedbackPage.audienceLegend")}
              >
                {AUDIENCES.map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    role="tab"
                    aria-selected={audience === tab.key}
                    onClick={() => setAudience(tab.key)}
                    className={`min-h-[var(--bb-control-height)] rounded-full px-4 py-1.5 text-sm font-bold ${
                      audience === tab.key
                        ? "bg-brightboost-navy text-white"
                        : "bg-[color:var(--bb-color-surface-sunken)] text-brightboost-navy"
                    }`}
                  >
                    {t(tab.labelKey)}
                  </button>
                ))}
              </div>

              <label className="block">
                <span className="text-sm font-semibold">
                  {t("feedbackPage.messageLabel")}
                </span>
                <textarea
                  className={fieldClass}
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
              </label>

              <label className="block">
                <span className="text-sm font-semibold">
                  {t("feedbackPage.emailLabel")}
                </span>
                <input
                  type="email"
                  className={fieldClass}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>

              <button type="submit" className={PUBLIC_ACTION_PRIMARY}>
                {t("feedbackPage.submit")}
              </button>

              {submitted && (
                <p role="status" className="text-sm font-semibold">
                  {t("feedbackPage.confirmation")}
                </p>
              )}
            </form>
          </div>
        </section>
      </main>

      {/* No "Give feedback" link on `/feedback`: the same self-link rule
          `/donate` follows for the giving link. */}
      <PublicFooter feedback={false} />
    </div>
  );
};

export default FeedbackPage;
