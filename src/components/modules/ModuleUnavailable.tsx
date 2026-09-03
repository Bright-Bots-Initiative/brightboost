/**
 * The shared "this isn't open" surface for a module the access policy refuses
 * (#856), used by ModuleDetail and ActivityPlayer instead of a silent redirect.
 *
 * It covers two rows of the Safe Exploration accessibility contract
 * (`docs/safe-exploration-accessibility.md` §1), and keeps them distinct
 * (§6 — a system failure must never masquerade as a learner outcome):
 *
 * - **unavailable** (`reason` is a policy denial): the reason is text on the
 *   surface, entering the state announces nothing and **never moves focus**,
 *   and a visible focusable route back to the ordered path is present (§7).
 * - **unexpected error** (`reason: "system_problem"`): says a system problem
 *   occurred, never that the content does not exist or that the learner has
 *   not earned it; focus moves to the message region as the contract requires,
 *   and both retry and leave are reachable.
 *
 * The copy for `unregistered` and `hidden` is identical on purpose — a learner
 * must not be able to tell held-back content from content that never existed.
 */
import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Compass, CloudOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  MODULE_UNAVAILABLE_REASON_KEYS,
  type ModuleAccessDenialReason,
} from "@/lib/moduleAccess";

export type ModuleUnavailableReason =
  | ModuleAccessDenialReason
  | "system_problem";

export default function ModuleUnavailable({
  reason,
  onRetry,
  backTo = "/student/modules",
}: {
  reason: ModuleUnavailableReason;
  /** Present only for `system_problem`: re-runs the failed requests. */
  onRetry?: () => void;
  /** Where the "way back" leads. Defaults to the ordered learning path. */
  backTo?: string;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isSystemProblem = reason === "system_problem";
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    // Contract §1: an unexpected error focuses its message region; a policy
    // denial must NOT steal focus.
    if (isSystemProblem) headingRef.current?.focus();
  }, [isSystemProblem]);

  return (
    <div
      className="p-6 max-w-2xl mx-auto"
      data-testid={
        isSystemProblem ? "module-system-problem" : "module-unavailable"
      }
    >
      <div className="rounded-2xl border-2 border-slate-200 bg-white p-8 text-center space-y-4 shadow-sm">
        <div
          className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center ${
            isSystemProblem
              ? "bg-amber-100 text-amber-700"
              : "bg-brightboost-blue/10 text-brightboost-navy"
          }`}
          aria-hidden="true"
        >
          {isSystemProblem ? (
            <CloudOff className="w-8 h-8" />
          ) : (
            <Compass className="w-8 h-8" />
          )}
        </div>
        {/* `tabIndex={-1}` makes this heading a programmatic focus target ONLY:
            it never becomes a Tab stop, so `outline-none` removes no focus
            indicator any keyboard learner could reach — the page is this one
            message, and the real actions below keep their own focus rings.
            The denial state passes no tabIndex at all and is never focused. */}
        <h1
          ref={headingRef}
          tabIndex={isSystemProblem ? -1 : undefined}
          className="text-2xl font-bold text-brightboost-navy outline-none"
        >
          {t(
            isSystemProblem
              ? "modules.unavailable.systemTitle"
              : "modules.unavailable.title",
          )}
        </h1>
        <p className="text-lg leading-relaxed max-w-prose mx-auto text-slate-600">
          {t(
            isSystemProblem
              ? "modules.unavailable.systemProblem"
              : MODULE_UNAVAILABLE_REASON_KEYS[reason],
          )}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          {isSystemProblem && onRetry && (
            <Button size="lg" className="min-h-[44px] px-6" onClick={onRetry}>
              {t("modules.unavailable.tryAgain")}
            </Button>
          )}
          <Button
            size="lg"
            variant={isSystemProblem && onRetry ? "outline" : "default"}
            className="min-h-[44px] px-6"
            onClick={() => navigate(backTo)}
          >
            {t("modules.unavailable.backToModules")}
          </Button>
        </div>
      </div>
    </div>
  );
}
