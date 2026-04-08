import React from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import LanguageToggle from "../components/LanguageToggle";
import {
  Presentation,
  GraduationCap,
  Gamepad2,
  ShieldCheck,
  ClipboardCheck,
  ArrowLeft,
  ExternalLink,
  Users,
  BarChart3,
  Globe,
} from "lucide-react";

const Section: React.FC<{
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}> = ({ icon, title, children }) => (
  <div className="bg-white/90 backdrop-blur rounded-xl p-5 shadow-sm">
    <div className="flex items-center gap-2 mb-3">
      {icon}
      <h2 className="text-lg font-bold text-brightboost-navy">{title}</h2>
    </div>
    {children}
  </div>
);

const ForReviewers: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-gradient-to-b from-brightboost-lightblue/30 to-white">
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Link
            to="/"
            className="flex items-center gap-1 text-sm text-brightboost-navy/70 hover:text-brightboost-navy transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {t("reviewers.backHome")}
          </Link>
          <LanguageToggle />
        </div>

        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-extrabold text-brightboost-navy mb-2">
            {t("reviewers.title")}
          </h1>
          <p className="text-base text-brightboost-navy/70 max-w-xl mx-auto">
            {t("reviewers.subtitle")}
          </p>
        </div>

        <div className="space-y-5">
          {/* What is BrightBoost */}
          <Section
            icon={
              <GraduationCap className="w-5 h-5 text-brightboost-blue" />
            }
            title={t("reviewers.whatIs.title")}
          >
            <p className="text-sm text-gray-700 leading-relaxed mb-3">
              {t("reviewers.whatIs.body")}
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {[
                { icon: Gamepad2, key: "reviewers.whatIs.feat1" },
                { icon: BarChart3, key: "reviewers.whatIs.feat2" },
                { icon: Users, key: "reviewers.whatIs.feat3" },
                { icon: Globe, key: "reviewers.whatIs.feat4" },
              ].map(({ icon: Icon, key }) => (
                <div
                  key={key}
                  className="bg-brightboost-lightblue/20 rounded-lg p-2 text-center"
                >
                  <Icon className="w-4 h-4 mx-auto mb-1 text-brightboost-blue" />
                  <p className="text-xs font-medium text-brightboost-navy">
                    {t(key)}
                  </p>
                </div>
              ))}
            </div>
          </Section>

          {/* How to Explore */}
          <Section
            icon={
              <Presentation className="w-5 h-5 text-brightboost-blue" />
            }
            title={t("reviewers.explore.title")}
          >
            <div className="space-y-3 text-sm text-gray-700">
              <div className="flex gap-3 items-start">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-brightboost-blue/10 text-brightboost-navy font-bold text-xs flex items-center justify-center mt-0.5">
                  1
                </span>
                <div>
                  <p className="font-semibold text-brightboost-navy">
                    {t("reviewers.explore.step1Title")}
                  </p>
                  <p>{t("reviewers.explore.step1Desc")}</p>
                  <Link
                    to="/showcase"
                    className="inline-flex items-center gap-1 text-brightboost-blue hover:underline mt-1 text-xs font-medium"
                  >
                    {t("reviewers.explore.openShowcase")}
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
              </div>
              <div className="flex gap-3 items-start">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-brightboost-blue/10 text-brightboost-navy font-bold text-xs flex items-center justify-center mt-0.5">
                  2
                </span>
                <div>
                  <p className="font-semibold text-brightboost-navy">
                    {t("reviewers.explore.step2Title")}
                  </p>
                  <p>{t("reviewers.explore.step2Desc")}</p>
                  <div className="bg-gray-50 rounded-lg p-2 mt-1 font-mono text-xs">
                    <p>
                      {t("landing.demoTeacher")}:{" "}
                      <strong>teacher@school.com</strong> /{" "}
                      <strong>password123</strong>
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex gap-3 items-start">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-brightboost-blue/10 text-brightboost-navy font-bold text-xs flex items-center justify-center mt-0.5">
                  3
                </span>
                <div>
                  <p className="font-semibold text-brightboost-navy">
                    {t("reviewers.explore.step3Title")}
                  </p>
                  <p>{t("reviewers.explore.step3Desc")}</p>
                  <div className="bg-gray-50 rounded-lg p-2 mt-1 font-mono text-xs">
                    <p>
                      {t("landing.demoStudent")}:{" "}
                      <strong>student@test.com</strong> /{" "}
                      <strong>password</strong>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Section>

          {/* What Teachers Can Do */}
          <Section
            icon={
              <ClipboardCheck className="w-5 h-5 text-brightboost-blue" />
            }
            title={t("reviewers.teachers.title")}
          >
            <ul className="text-sm text-gray-700 space-y-1.5 list-disc list-inside">
              <li>{t("reviewers.teachers.item1")}</li>
              <li>{t("reviewers.teachers.item2")}</li>
              <li>{t("reviewers.teachers.item3")}</li>
              <li>{t("reviewers.teachers.item4")}</li>
              <li>{t("reviewers.teachers.item5")}</li>
              <li>{t("reviewers.teachers.item6")}</li>
            </ul>
          </Section>

          {/* What Students Experience */}
          <Section
            icon={<Gamepad2 className="w-5 h-5 text-brightboost-green" />}
            title={t("reviewers.students.title")}
          >
            <ul className="text-sm text-gray-700 space-y-1.5 list-disc list-inside">
              <li>{t("reviewers.students.item1")}</li>
              <li>{t("reviewers.students.item2")}</li>
              <li>{t("reviewers.students.item3")}</li>
              <li>{t("reviewers.students.item4")}</li>
              <li>{t("reviewers.students.item5")}</li>
            </ul>
          </Section>

          {/* What to Look For */}
          <Section
            icon={
              <ShieldCheck className="w-5 h-5 text-brightboost-blue" />
            }
            title={t("reviewers.lookFor.title")}
          >
            <p className="text-sm text-gray-700 mb-3">
              {t("reviewers.lookFor.intro")}
            </p>
            <div className="grid md:grid-cols-2 gap-3">
              {["engagement", "teacherUx", "accessibility", "trust"].map(
                (key) => (
                  <div
                    key={key}
                    className="bg-brightboost-lightblue/10 rounded-lg p-3"
                  >
                    <p className="text-sm font-semibold text-brightboost-navy mb-1">
                      {t(`reviewers.lookFor.${key}Title`)}
                    </p>
                    <p className="text-xs text-gray-600">
                      {t(`reviewers.lookFor.${key}Desc`)}
                    </p>
                  </div>
                ),
              )}
            </div>
          </Section>

          {/* Privacy & Trust */}
          <Section
            icon={
              <ShieldCheck className="w-5 h-5 text-brightboost-green" />
            }
            title={t("reviewers.privacy.title")}
          >
            <ul className="text-sm text-gray-700 space-y-1.5 list-disc list-inside">
              <li>{t("reviewers.privacy.item1")}</li>
              <li>{t("reviewers.privacy.item2")}</li>
              <li>{t("reviewers.privacy.item3")}</li>
              <li>{t("reviewers.privacy.item4")}</li>
            </ul>
            <div className="flex gap-3 mt-3">
              <Link
                to="/privacy"
                className="text-xs text-brightboost-blue hover:underline"
              >
                {t("landing.privacy")}
              </Link>
              <Link
                to="/terms"
                className="text-xs text-brightboost-blue hover:underline"
              >
                {t("landing.terms")}
              </Link>
            </div>
          </Section>

          {/* CTA */}
          <div className="text-center pt-4 pb-8 space-y-3">
            <p className="text-sm text-gray-600">
              {t("reviewers.ctaPrompt")}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                to="/showcase"
                className="rounded-xl px-6 py-3 bg-brightboost-blue text-white font-bold hover:bg-brightboost-navy transition-colors"
              >
                {t("reviewers.ctaShowcase")}
              </Link>
              <Link
                to="/teacher-login"
                className="rounded-xl px-6 py-3 bg-white border-2 border-brightboost-blue text-brightboost-navy font-bold hover:bg-brightboost-lightblue/20 transition-colors"
              >
                {t("reviewers.ctaTeacher")}
              </Link>
            </div>
          </div>
        </div>

        <footer className="text-center py-4 text-xs text-gray-500">
          {t("reviewers.footer")}
        </footer>
      </div>
    </div>
  );
};

export default ForReviewers;
