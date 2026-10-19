import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Users } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/services/api";

interface Membership {
  courseId: string;
  courseName: string;
}
interface CourseState {
  userId: string | undefined;
  token: string | null;
  courses?: Membership[];
  failed?: boolean;
}

export default function StudentClasses() {
  const { t } = useTranslation();
  const { user, token } = useAuth();
  const userId = user?.id;
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<CourseState>();
  const current =
    state?.userId === userId && state?.token === token ? state : undefined;

  useEffect(() => {
    const controller = new AbortController();
    const owner = { userId, token };
    setState(owner);
    void api
      .getStudentCourses({ signal: controller.signal })
      .then((courses: unknown) => {
        if (
          !Array.isArray(courses) ||
          !courses.every(
            (course) =>
              course &&
              typeof course.courseId === "string" &&
              typeof course.courseName === "string",
          )
        ) {
          throw new Error("Invalid course response");
        }
        if (!controller.signal.aborted) setState({ ...owner, courses });
      })
      .catch(() => {
        if (!controller.signal.aborted) setState({ ...owner, failed: true });
      });
    return () => controller.abort();
  }, [userId, token, attempt]);

  const joinClass = (
    <Link
      to="/student/join"
      state={{ returnTo: "/student/classes" }}
      className="inline-flex min-h-11 items-center justify-center rounded-lg bg-brightboost-navy px-5 py-3 font-semibold text-white hover:bg-blue-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
    >
      {t(
        current?.courses?.length
          ? "studentClasses.joinAnother"
          : "studentClasses.join",
      )}
    </Link>
  );

  return (
    <section
      className="mx-auto max-w-3xl space-y-6"
      aria-labelledby="classes-title"
    >
      <header>
        <h1
          id="classes-title"
          className="text-2xl font-bold text-brightboost-navy"
        >
          {t("studentClasses.title")}
        </h1>
        <p className="mt-2 text-slate-700">{t("studentClasses.description")}</p>
      </header>
      {current?.failed ? (
        <div
          role="alert"
          className="space-y-4 rounded-xl border border-amber-300 bg-amber-50 p-6 text-amber-950"
        >
          <p>{t("studentClasses.failed")}</p>
          <button
            type="button"
            onClick={() => setAttempt((value) => value + 1)}
            className="min-h-11 rounded-lg border border-amber-800 px-5 py-2 font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            {t("studentClasses.retry")}
          </button>
        </div>
      ) : !current?.courses ? (
        <p role="status" className="rounded-xl bg-white p-6 text-slate-700">
          {t("studentClasses.loading")}
        </p>
      ) : current.courses.length ? (
        <>
          <ul className="space-y-3">
            {current.courses.map((course) => (
              <li
                key={course.courseId}
                className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-5"
              >
                <Users
                  aria-hidden="true"
                  className="h-7 w-7 shrink-0 text-brightboost-blue"
                />
                <h2 className="break-words text-lg font-semibold text-brightboost-navy">
                  {course.courseName}
                </h2>
              </li>
            ))}
          </ul>
          {joinClass}
        </>
      ) : (
        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6">
          <p className="text-lg font-semibold text-brightboost-navy">
            {t("studentClasses.empty")}
          </p>
          <p className="text-slate-700">{t("studentClasses.emptyHelp")}</p>
          {joinClass}
        </div>
      )}
    </section>
  );
}
