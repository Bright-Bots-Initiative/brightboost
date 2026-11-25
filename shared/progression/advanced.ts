/** Shared curriculum identities for the first advanced technology release. */
export const BIOTRAIL_SLUG = "advanced-biotech-biotrail";
export const BIOTRAIL_ACTIVITY_ID = "biotrail";
export const BIOTRAIL_LESSON_ID = "biotrail-field-lab";
export const SPARBOTS_SLUG = "advanced-ai-sparbots";
export const SPARBOTS_ACTIVITY_ID = "sparbots";
export const SPARBOTS_LESSON_ID = "sparbots-training-tower";
export const QUBIT_COVE_SLUG = "advanced-quantum-qubit-cove";
export const QUBIT_COVE_LESSON_ID = "qubit-cove-expedition";
export const QUBIT_COVE_ACTIVITY_ID = "qubit_cove";
export const ADVANCED_ACTIVITIES = [
  {
    slug: BIOTRAIL_SLUG,
    lessonId: BIOTRAIL_LESSON_ID,
    activityId: BIOTRAIL_ACTIVITY_ID,
    specialty: "BIOTECH",
  },
  {
    slug: SPARBOTS_SLUG,
    lessonId: SPARBOTS_LESSON_ID,
    activityId: SPARBOTS_ACTIVITY_ID,
    specialty: "AI",
  },
  {
    slug: QUBIT_COVE_SLUG,
    lessonId: QUBIT_COVE_LESSON_ID,
    activityId: QUBIT_COVE_ACTIVITY_ID,
    specialty: "QUANTUM",
  },
] as const;
export const ADVANCED_SPECIALTIES: Readonly<Record<string, string>> =
  Object.fromEntries(
    ADVANCED_ACTIVITIES.map((activity) => [activity.slug, activity.specialty]),
  );
