/**
 * The shared "unavailable" surface for a module the access policy refuses
 * (#856), used by ModuleDetail and ActivityPlayer instead of a silent redirect.
 *
 * It implements the `unavailable` row of the Safe Exploration accessibility
 * contract (`docs/safe-exploration-accessibility.md` §1 and §7):
 * - the reason is **text on the surface**, not just a dimmed look or a toast;
 * - entering the state never steals focus and announces nothing unprompted;
 * - a visible, focusable route back to the ordered learning path is present.
 *
 * The copy for `unregistered` and `hidden` is identical on purpose — a learner
 * must not be able to tell held-back content from content that never existed.
 */
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  MODULE_UNAVAILABLE_REASON_KEYS,
  type ModuleAccessDenialReason,
} from "@/lib/moduleAccess";

export default function ModuleUnavailable({
  reason,
}: {
  reason: ModuleAccessDenialReason;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="p-6 max-w-2xl mx-auto" data-testid="module-unavailable">
      <div className="rounded-2xl border-2 border-slate-200 bg-white p-8 text-center space-y-4 shadow-sm">
        <div
          className="mx-auto w-16 h-16 rounded-full bg-brightboost-blue/10 text-brightboost-navy flex items-center justify-center"
          aria-hidden="true"
        >
          <Compass className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-brightboost-navy">
          {t("modules.unavailable.title")}
        </h1>
        <p className="text-lg leading-relaxed max-w-prose mx-auto text-slate-600">
          {t(MODULE_UNAVAILABLE_REASON_KEYS[reason])}
        </p>
        <Button
          size="lg"
          className="min-h-[44px] px-6"
          onClick={() => navigate("/student/modules")}
        >
          {t("modules.unavailable.backToModules")}
        </Button>
      </div>
    </div>
  );
}
