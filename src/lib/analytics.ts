export type AnalyticsEvent =
  | { kind: "quest_start"; questId: string }
  | { kind: "quest_complete"; questId: string; attempts: number }
  | { kind: "quiz_answer"; questionId: string; isCorrect: boolean }
  | { kind: "homepage_viewed" }
  | { kind: "signup_clicked"; audience: "teacher" | "student" }
  | { kind: "feedback_clicked" }
  | { kind: "donation_clicked"; cadence?: "monthly" }
  | { kind: "student_page_clicked" }
  | { kind: "teacher_page_clicked" }
  | { kind: "parent_page_clicked" }
  | { kind: "organization_page_clicked" }
  | { kind: "free_plan_clicked"; plan: string }
  | { kind: "feedback_submitted"; audience: "teacher" | "student" | "parent" | "org" };

export function track(_event: AnalyticsEvent): void {}
