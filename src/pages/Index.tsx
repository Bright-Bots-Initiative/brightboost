import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import GameBackground from "../components/GameBackground";
import LanguageToggle from "../components/LanguageToggle";
import { track } from "@/lib/analytics";
import MascotHeroVisual from "@/components/home/MascotHeroVisual";

const HOMEPAGE_TITLE = "Bright Boost — Free K-8 STEM Learning for Students, Teachers & Families";
const HOMEPAGE_DESCRIPTION =
  "Bright Boost is a free STEM K-8 bilingual, classroom-friendly platform where students, teachers, and families explore playful learning challenges together.";

type Audience = "teacher" | "student" | "parent" | "org";

const secondaryLinks = [
  { label: "Give Feedback", to: "/feedback", analytics: "feedback_clicked" as const },
  { label: "Support Bright Boost", to: "/donate", analytics: "donation_clicked" as const },
  { label: "Explore Pathways", to: "/pathways", analytics: undefined },
];

const audienceCards = [
  { title: "Students", description: "Play through STEM missions and track your progress.", to: "/students", event: "student_page_clicked" as const },
  { title: "Teachers", description: "Bring standards-friendly STEM exploration into your classroom.", to: "/teachers", event: "teacher_page_clicked" as const },
  { title: "Parents", description: "Support fun STEM practice and confidence at home.", to: "/parents", event: "parent_page_clicked" as const },
  { title: "Organizations", description: "Partner on pilots and bring access to more learners.", to: "/organizations", event: "organization_page_clicked" as const },
];

const Index: React.FC = () => {
  const [feedbackAudience, setFeedbackAudience] = useState<Audience>("teacher");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [feedbackEmail, setFeedbackEmail] = useState("");
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [donationAmount, setDonationAmount] = useState<string>("15");
  const donationUrl = import.meta.env.VITE_DONATION_URL;

  useEffect(() => {
    track({ kind: "homepage_viewed" });
  }, []);

  useEffect(() => {
    document.title = HOMEPAGE_TITLE;

    const upsertMeta = (name: string, content: string, property = false) => {
      const selector = property ? `meta[property="${name}"]` : `meta[name="${name}"]`;
      let el = document.head.querySelector(selector) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement("meta");
        if (property) {
          el.setAttribute("property", name);
        } else {
          el.setAttribute("name", name);
        }
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };

    upsertMeta("description", HOMEPAGE_DESCRIPTION);
    upsertMeta("og:title", HOMEPAGE_TITLE, true);
    upsertMeta("og:description", HOMEPAGE_DESCRIPTION, true);
    upsertMeta("twitter:title", HOMEPAGE_TITLE);
    upsertMeta("twitter:description", HOMEPAGE_DESCRIPTION);

    const schemaId = "bb-home-schema";
    const existing = document.getElementById(schemaId);
    if (existing) existing.remove();

    const schema = document.createElement("script");
    schema.id = schemaId;
    schema.type = "application/ld+json";
    schema.text = JSON.stringify([
      {
        "@context": "https://schema.org",
        "@type": "Organization",
        name: "Bright Bots Initiative",
        url: window.location.origin,
      },
      {
        "@context": "https://schema.org",
        "@type": "EducationalOrganization",
        name: "Bright Boost",
        educationalLevel: "K-8",
      },
    ]);
    document.head.appendChild(schema);

    return () => {
      const current = document.getElementById(schemaId);
      if (current) current.remove();
    };
  }, []);

  useEffect(() => {
    const section = sessionStorage.getItem("bb-home-scroll");
    if (section) {
      sessionStorage.removeItem("bb-home-scroll");
      requestAnimationFrame(() => {
        document.getElementById(section)?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  }, []);

  const feedbackTabs = useMemo(
    () => [
      { key: "teacher" as const, label: "Teacher" },
      { key: "student" as const, label: "Student" },
      { key: "parent" as const, label: "Parent" },
      { key: "org" as const, label: "Org" },
    ],
    [],
  );

  const submitFeedback = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedbackSubmitted(true);
    track({ kind: "feedback_submitted", audience: feedbackAudience });
  };

  const chunkyPrimary =
    "button-shadow rounded-[12px] font-extrabold text-base md:text-lg px-6 py-3 text-white transition-all active:translate-y-[3px] hover:brightness-110 focus-visible:ring-2 focus-visible:ring-offset-2";

  return (
    <GameBackground>
      <div className="relative z-10">
        <nav className="sticky top-0 z-20 bg-white/80 backdrop-blur border-b border-white/70" aria-label="Homepage">
          <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between gap-3">
            <Link to="/" className="font-extrabold text-brightboost-navy tracking-tight text-lg">
              Bright Boost
            </Link>
            <div className="flex items-center gap-3">
              <LanguageToggle />
              <Link
                to="/student-login"
                className="button-shadow rounded-[12px] px-4 py-2 font-extrabold bg-brightboost-navy text-white text-sm hover:brightness-110 active:translate-y-[3px]"
              >
                Sign in
              </Link>
            </div>
          </div>
        </nav>

        <main>
          <section
            id="hero"
            aria-labelledby="hero-heading"
            className="mx-auto max-w-6xl px-4 py-10 md:py-12 md:min-h-[500px] min-h-[620px] max-h-[660px] md:max-h-[540px]"
            style={{ background: "linear-gradient(180deg,#BFE5F7 0%,#DCEEFB 55%,#EAF6FD 100%)" }}
          >
            <div className="grid md:grid-cols-2 gap-6 items-center h-full">
              <div>
                <p className="inline-flex items-center gap-2 rounded-full px-4 py-1 text-xs uppercase tracking-[0.15em] bg-white text-brightboost-navy font-bold">
                  <span className="w-2 h-2 rounded-full bg-brightboost-green" aria-hidden="true" />
                  Free STEM Learning Platform
                </p>
                <h1 id="hero-heading" className="mt-4 text-[30px] md:text-[40px] leading-tight font-extrabold text-brightboost-navy">
                  Build STEM confidence through playful learning
                </h1>
                <p className="mt-4 text-brightboost-navy/85 text-base md:text-lg font-semibold max-w-xl">
                  Bright Boost helps students explore STEM through games, guided challenges, progress
                  tracking, and classroom-friendly tools.
                </p>

                <div className="mt-6 flex flex-wrap gap-3">
                  <Link
                    to="/teacher-login"
                    className={`${chunkyPrimary} bg-gradient-to-r from-[#46B1E6] to-[#2f92ca]`}
                    onClick={() => track({ kind: "signup_clicked", audience: "teacher" })}
                  >
                    I’m a Teacher
                  </Link>
                  <Link
                    to="/student-login"
                    className={`${chunkyPrimary} bg-gradient-to-r from-purple-500 to-pink-500`}
                    onClick={() => track({ kind: "signup_clicked", audience: "student" })}
                  >
                    I’m a Student!
                  </Link>
                </div>

                <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm">
                  {secondaryLinks.map((item) => (
                    <Link
                      key={item.label}
                      to={item.to}
                      className="text-brightboost-navy font-semibold underline-offset-2 hover:underline"
                      onClick={() => item.analytics && track({ kind: item.analytics })}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>

                <p className="mt-4 inline-flex rounded-full bg-white/85 px-4 py-2 text-sm text-brightboost-navy font-semibold">
                  🌱 Early access · join our first 1,000 users
                </p>
              </div>

              <MascotHeroVisual />
            </div>
          </section>

          <section id="early-access" aria-labelledby="early-access-heading" className="mx-auto max-w-6xl px-4 py-14">
            <h2 id="early-access-heading" className="text-2xl font-extrabold text-brightboost-navy">Early Access Goal</h2>
            <Card className="mt-4 rounded-[18px] border-2 border-white/80 bg-white/85">
              <CardContent className="pt-1 text-brightboost-navy font-semibold">
                Join our first 1,000 users
              </CardContent>
            </Card>
          </section>

          <section id="plans" aria-labelledby="plans-heading" className="mx-auto max-w-6xl px-4 py-14">
            <h2 id="plans-heading" className="text-2xl font-extrabold text-brightboost-navy">Free Access Plans</h2>
            <div className="grid md:grid-cols-3 gap-4 mt-4">
              {[
                { name: "Learner", details: "Hands-on STEM games, challenges, and personal progress tracking." },
                { name: "Classroom", details: "Teacher-friendly tools, shared activities, and student progress visibility." },
                { name: "Organization", details: "Support multiple classrooms and collaboration for outreach programs." },
              ].map((plan) => (
                <Card key={plan.name} className="rounded-[18px] border-2 border-[#46B1E6]/20">
                  <CardHeader>
                    <CardTitle className="text-brightboost-navy">{plan.name}</CardTitle>
                    <span className="inline-flex rounded-full bg-[#69D681]/25 text-brightboost-navy px-3 py-1 text-xs font-bold w-fit">
                      Always Free
                    </span>
                  </CardHeader>
                  <CardContent>
                    <p className="text-brightboost-navy/85 font-medium">{plan.details}</p>
                    <Button
                      className="mt-4 rounded-[12px] font-extrabold bg-brightboost-navy text-white hover:bg-brightboost-navy/90"
                      onClick={() => track({ kind: "free_plan_clicked", plan: plan.name.toLowerCase() })}
                    >
                      Learn more
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          <section id="audience" aria-labelledby="audience-heading" className="mx-auto max-w-6xl px-4 py-14">
            <h2 id="audience-heading" className="text-2xl font-extrabold text-brightboost-navy">Who Bright Boost Supports</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
              {audienceCards.map((audience) => (
                <Card key={audience.title} className="rounded-[18px] border border-sky-100">
                  <CardHeader>
                    <CardTitle className="text-lg text-brightboost-navy">{audience.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm font-medium text-brightboost-navy/80">{audience.description}</p>
                    <Link
                      to={audience.to}
                      className="inline-block mt-3 text-sm text-brightboost-blue font-bold underline"
                      onClick={() => track({ kind: audience.event })}
                    >
                      Explore
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          <section id="feedback" aria-labelledby="feedback-heading" className="mx-auto max-w-6xl px-4 py-14">
            <h2 id="feedback-heading" className="text-2xl font-extrabold text-brightboost-navy">Feedback</h2>
            <Card className="mt-4 rounded-[18px]">
              <CardContent className="pt-1">
                <form className="space-y-4" onSubmit={submitFeedback}>
                  <div className="flex flex-wrap gap-2" role="tablist" aria-label="Feedback audience type">
                    {feedbackTabs.map((tab) => (
                      <button
                        key={tab.key}
                        type="button"
                        role="tab"
                        aria-selected={feedbackAudience === tab.key}
                        onClick={() => setFeedbackAudience(tab.key)}
                        className={`rounded-full px-4 py-1.5 text-sm font-bold ${
                          feedbackAudience === tab.key
                            ? "bg-brightboost-navy text-white"
                            : "bg-slate-100 text-brightboost-navy"
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  <label className="block">
                    <span className="text-sm font-semibold text-brightboost-navy">Share your ideas</span>
                    <textarea
                      className="mt-1 w-full rounded-xl border border-slate-200 p-3 focus:ring-2 focus:ring-brightboost-blue focus:outline-none"
                      rows={4}
                      value={feedbackMessage}
                      onChange={(e) => setFeedbackMessage(e.target.value)}
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-semibold text-brightboost-navy">Email (optional)</span>
                    <input
                      type="email"
                      className="mt-1 w-full rounded-xl border border-slate-200 p-3 focus:ring-2 focus:ring-brightboost-blue focus:outline-none"
                      value={feedbackEmail}
                      onChange={(e) => setFeedbackEmail(e.target.value)}
                    />
                  </label>

                  <Button type="submit" className="rounded-[12px] bg-brightboost-blue hover:bg-brightboost-blue/90 font-extrabold text-white">
                    Send Feedback
                  </Button>

                  {feedbackSubmitted && (
                    <p className="text-sm text-brightboost-navy font-semibold">
                      Thank you! Your feedback was captured in this browser session. Backend persistence still needs to be connected.
                    </p>
                  )}
                </form>
              </CardContent>
            </Card>
          </section>

          <section id="donation" aria-labelledby="donation-heading" className="mx-auto max-w-6xl px-4 py-14">
            <h2 id="donation-heading" className="text-2xl font-extrabold text-brightboost-navy">Donation</h2>
            <Card className="mt-4 rounded-[18px]">
              <CardContent className="pt-1">
                <div className="flex flex-wrap gap-2">
                  {["5", "15", "50", "100", "Other"].map((amount) => (
                    <button
                      key={amount}
                      type="button"
                      onClick={() => setDonationAmount(amount)}
                      className={`rounded-full px-4 py-2 text-sm font-bold ${
                        donationAmount === amount
                          ? "bg-brightboost-navy text-white"
                          : "bg-slate-100 text-brightboost-navy"
                      }`}
                    >
                      {amount === "Other" ? "Other" : `$${amount}`}
                    </button>
                  ))}
                </div>

                <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-3">
                  {donationUrl ? (
                    <a
                      href={donationUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center rounded-[12px] px-5 py-2.5 font-extrabold bg-[#FF9C81] text-brightboost-navy button-shadow"
                      onClick={() => track({ kind: "donation_clicked" })}
                    >
                      Donate Once
                    </a>
                  ) : (
                    <p className="text-sm text-brightboost-navy font-semibold">Donation link coming soon.</p>
                  )}
                  <a
                    href={donationUrl || "#"}
                    className="text-sm font-bold text-brightboost-navy underline"
                    onClick={() => donationUrl && track({ kind: "donation_clicked", cadence: "monthly" })}
                  >
                    Give monthly
                  </a>
                </div>

                <p className="mt-4 text-sm text-brightboost-navy font-semibold">
                  Donating is optional and never required to use Bright Boost.
                </p>
              </CardContent>
            </Card>
          </section>
        </main>

        <footer className="bg-[#1C3D6C] text-white mt-8" aria-label="Footer">
          <div className="mx-auto max-w-6xl px-4 py-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <p className="font-semibold">Bright Boost by Bright Bots Initiative — playful STEM growth for every learner.</p>
            <div className="flex flex-wrap gap-4 text-sm">
              <Link to="/for-reviewers" className="hover:underline">Evaluator Guide</Link>
              <Link to="/pathways/about" className="hover:underline">Pathways</Link>
              <Link to="/privacy" className="hover:underline">Privacy</Link>
              <Link to="/terms" className="hover:underline">Terms</Link>
              <a href="mailto:hello@brightbots.org" className="hover:underline">Contact</a>
            </div>
          </div>
        </footer>
      </div>
    </GameBackground>
  );
};

export default Index;
