import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { MessageSquarePlus, X, Send } from "lucide-react";
import { useApi } from "../services/api";

const FeedbackFab: React.FC = () => {
  const { t } = useTranslation();
  const api = useApi();
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState("");
  const [strongest, setStrongest] = useState("");
  const [confused, setConfused] = useState("");
  const [pilotInterest, setPilotInterest] = useState("");
  const [followUp, setFollowUp] = useState(false);
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const resetForm = () => {
    setRole("");
    setStrongest("");
    setConfused("");
    setPilotInterest("");
    setFollowUp(false);
    setEmail("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post("/feedback", {
        role,
        liked: strongest,
        confused,
        strongest,
        pilotInterest: pilotInterest || undefined,
        wantsFollowUp: followUp,
        email: followUp ? email : undefined,
      });
    } catch {
      // Best-effort — don't block on failure
    }
    setSubmitted(true);
    setSubmitting(false);
    setTimeout(() => {
      setOpen(false);
      setSubmitted(false);
      resetForm();
    }, 2500);
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 bg-brightboost-blue text-white rounded-full shadow-lg hover:bg-brightboost-navy transition-colors print:hidden"
        aria-label={t("feedback.button")}
      >
        <MessageSquarePlus className="w-5 h-5" />
        <span className="hidden sm:inline text-sm font-medium">
          {t("feedback.button")}
        </span>
      </button>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 print:hidden">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold text-brightboost-navy">
                {t("feedback.title")}
              </h2>
              <button
                onClick={() => setOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {submitted ? (
              <div className="p-8 text-center">
                <p className="text-xl font-semibold text-brightboost-green">
                  {t("feedback.thanks")}
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="p-4 space-y-4">
                {/* Role */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("feedback.roleLabel")}
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brightboost-blue"
                  >
                    <option value="">{t("feedback.roleSelect")}</option>
                    <option value="teacher">{t("feedback.roleTeacher")}</option>
                    <option value="student">{t("feedback.roleStudent")}</option>
                    <option value="admin">{t("feedback.roleAdmin")}</option>
                    <option value="school_leader">{t("feedback.roleSchoolLeader")}</option>
                    <option value="community">{t("feedback.roleCommunity")}</option>
                    <option value="parent">{t("feedback.roleParent")}</option>
                    <option value="technical">{t("feedback.roleTechnical")}</option>
                    <option value="other">{t("feedback.roleOther")}</option>
                  </select>
                </div>

                {/* Strongest */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("feedback.strongestLabel")}
                  </label>
                  <textarea
                    value={strongest}
                    onChange={(e) => setStrongest(e.target.value)}
                    rows={2}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brightboost-blue"
                    placeholder={t("feedback.strongestPlaceholder")}
                  />
                </div>

                {/* Confused */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("feedback.confusedLabel")}
                  </label>
                  <textarea
                    value={confused}
                    onChange={(e) => setConfused(e.target.value)}
                    rows={2}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brightboost-blue"
                    placeholder={t("feedback.confusedPlaceholder")}
                  />
                </div>

                {/* Pilot Interest */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("feedback.pilotLabel")}
                  </label>
                  <select
                    value={pilotInterest}
                    onChange={(e) => setPilotInterest(e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brightboost-blue"
                  >
                    <option value="">{t("feedback.pilotSelect")}</option>
                    <option value="high">{t("feedback.pilotHigh")}</option>
                    <option value="medium">{t("feedback.pilotMedium")}</option>
                    <option value="low">{t("feedback.pilotLow")}</option>
                    <option value="na">{t("feedback.pilotNa")}</option>
                  </select>
                </div>

                {/* Follow-up */}
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="followUp"
                    checked={followUp}
                    onChange={(e) => setFollowUp(e.target.checked)}
                    className="rounded border-gray-300 text-brightboost-blue focus:ring-brightboost-blue"
                  />
                  <label htmlFor="followUp" className="text-sm text-gray-700">
                    {t("feedback.followUp")}
                  </label>
                </div>

                {followUp && (
                  <div>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brightboost-blue"
                      placeholder={t("feedback.emailPlaceholder")}
                    />
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-brightboost-blue text-white rounded-md hover:bg-brightboost-navy disabled:opacity-50 transition-colors"
                >
                  <Send className="w-4 h-4" />
                  {submitting ? t("feedback.sending") : t("feedback.send")}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default FeedbackFab;
