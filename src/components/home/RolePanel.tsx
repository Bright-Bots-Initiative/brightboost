/**
 * "For your classroom or family" — one panel, two audiences, chosen by the
 * visitor instead of guessed by the page.
 *
 * It replaces the two side-by-side adult cards, which said their piece and
 * then asked an adult to read both before doing anything. Here the segmented
 * control is a real ARIA radio group (arrow keys move and select, the
 * selection is visible, exactly one control is in the tab order), the panel
 * under it carries three short facts and the actions that belong to that
 * audience, and the choice is remembered for the session so the page does not
 * ask twice.
 *
 * What it is NOT: a grade selector, a game picker, or anything that changes
 * what a child can reach. The stored value is one of two literals under a
 * namespaced key, it identifies nobody, and unavailable storage is not an
 * error — the panel simply opens on Teachers again.
 *
 * Destinations and events are the existing ones, unchanged:
 *   Teachers — /teacher/signup (signup_clicked{teacher}), /for-teachers
 *              (teacher_page_clicked), /teacher-login (no event)
 *   Families — /class-login (no event), /for-families (parent_page_clicked),
 *              /teacher/signup?intent=home (no event)
 */
import {
  useCallback,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { track } from "@/lib/analytics";
import {
  PUBLIC_ACTION_PRIMARY,
  PUBLIC_ACTION_QUIET,
  PUBLIC_ACTION_SECONDARY,
} from "./publicEntry";

type Role = "teacher" | "family";

const ROLES: readonly Role[] = ["teacher", "family"] as const;

/** Namespaced, non-identifying, and read only for these two literals. */
const ROLE_KEY = "bb-public-role";

/** The one query value this page carries through to the role landings. Any
 *  other search string is ignored rather than echoed. */
const NONPROFIT_SEARCH = "?source=nonprofit";

function readStoredRole(): Role {
  try {
    const raw = sessionStorage.getItem(ROLE_KEY);
    return raw === "family" ? "family" : "teacher";
  } catch {
    return "teacher";
  }
}

function storeRole(role: Role) {
  try {
    sessionStorage.setItem(ROLE_KEY, role);
  } catch {
    /* private-mode storage failures are fine — the choice is a convenience */
  }
}

const RolePanel = () => {
  const { t } = useTranslation();
  const { search } = useLocation();
  const [role, setRole] = useState<Role>(readStoredRole);
  const buttonRefs = useRef<Record<Role, HTMLButtonElement | null>>({
    teacher: null,
    family: null,
  });

  const suffix = search === NONPROFIT_SEARCH ? NONPROFIT_SEARCH : "";

  const select = useCallback((next: Role) => {
    setRole(next);
    storeRole(next);
  }, []);

  /** Arrow keys move the selection and the focus together, which is what a
   *  radio group does everywhere else; Home/End jump to the ends. */
  const handleKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLButtonElement>, current: Role) => {
      const index = ROLES.indexOf(current);
      let next: Role | null = null;
      switch (event.key) {
        case "ArrowRight":
        case "ArrowDown":
          next = ROLES[(index + 1) % ROLES.length];
          break;
        case "ArrowLeft":
        case "ArrowUp":
          next = ROLES[(index - 1 + ROLES.length) % ROLES.length];
          break;
        case "Home":
          next = ROLES[0];
          break;
        case "End":
          next = ROLES[ROLES.length - 1];
          break;
        default:
          return;
      }
      event.preventDefault();
      select(next);
      buttonRefs.current[next]?.focus();
    },
    [select],
  );

  const isTeacher = role === "teacher";
  const points = isTeacher
    ? [
        "home.roles.teacher.point1",
        "home.roles.teacher.point2",
        "home.roles.teacher.point3",
      ]
    : [
        "home.roles.family.point1",
        "home.roles.family.point2",
        "home.roles.family.point3",
      ];

  return (
    <section
      id="for-adults"
      aria-labelledby="adults-heading"
      className="bg-[color:var(--bb-color-surface-sunken)]"
    >
      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-6">
        <h2 id="adults-heading" className="text-2xl font-extrabold md:text-3xl">
          {t("home.roles.title")}
        </h2>
        <p className="mt-2 max-w-[62ch] leading-relaxed">
          {t("home.adults.intro")}
        </p>

        <div
          className="bb-seg mt-5"
          role="radiogroup"
          aria-label={t("home.roles.groupLabel")}
        >
          {ROLES.map((option) => {
            const selected = option === role;
            return (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={selected}
                tabIndex={selected ? 0 : -1}
                ref={(node) => {
                  buttonRefs.current[option] = node;
                }}
                onClick={() => select(option)}
                onKeyDown={(event) => handleKeyDown(event, option)}
                className="bb-seg-option"
              >
                {t(
                  option === "teacher"
                    ? "home.adults.teacherTitle"
                    : "home.adults.familyTitle",
                )}
              </button>
            );
          })}
        </div>

        <div
          className="bb-role-panel mt-5"
          role="group"
          aria-label={t(
            isTeacher ? "home.adults.teacherTitle" : "home.adults.familyTitle",
          )}
        >
          <ul className="m-0 grid list-none gap-2 p-0 sm:grid-cols-3">
            {points.map((key) => (
              <li key={key} className="bb-role-point">
                {t(key)}
              </li>
            ))}
          </ul>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            {isTeacher ? (
              <Link
                to="/teacher/signup"
                className={PUBLIC_ACTION_PRIMARY}
                onClick={() =>
                  track({ kind: "signup_clicked", audience: "teacher" })
                }
              >
                {t("home.roles.teacher.primary")}
              </Link>
            ) : (
              <Link to="/class-login" className={PUBLIC_ACTION_PRIMARY}>
                {t("home.roles.family.primary")}
              </Link>
            )}
            <Link
              to={isTeacher ? "/teacher-login" : "/teacher/signup?intent=home"}
              className={PUBLIC_ACTION_SECONDARY}
            >
              {t(
                isTeacher
                  ? "home.roles.teacher.tertiary"
                  : "home.roles.family.tertiary",
              )}
            </Link>
          </div>

          {/* Both landings stay reachable whichever side is selected — a
              visitor who picked the wrong one is one link away, not one more
              decision away. The selected audience reads first. */}
          <p className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-[color:var(--bb-color-text-muted)]">
            <span className="font-bold">{t("home.roles.bothPaths")}</span>
            {(isTeacher ? ROLES : [...ROLES].reverse()).map((option) =>
              option === "teacher" ? (
                <Link
                  key={option}
                  to={`/for-teachers${suffix}`}
                  className={PUBLIC_ACTION_QUIET}
                  onClick={() => track({ kind: "teacher_page_clicked" })}
                >
                  {t("home.roles.teacherPath")}
                </Link>
              ) : (
                <Link
                  key={option}
                  to={`/for-families${suffix}`}
                  className={PUBLIC_ACTION_QUIET}
                  onClick={() => track({ kind: "parent_page_clicked" })}
                >
                  {t("home.roles.familyPath")}
                </Link>
              ),
            )}
          </p>
        </div>
      </div>
    </section>
  );
};

export default RolePanel;
