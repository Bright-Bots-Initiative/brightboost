import { join } from "../services/api";

export async function submitCheckpoint(input: {
  studentId: string;
  moduleSlug?: string;
  lessonId: string;
  activityId?: string;
  status: "IN_PROGRESS" | "COMPLETED";
  timeDeltaS?: number;
}) {
  const API_BASE = import.meta.env.VITE_API_BASE ?? "/api";
  const token = localStorage.getItem("bb_access_token");
  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(join(API_BASE, "/progress/checkpoint"), {
    method: "POST",
    headers,
    body: JSON.stringify({
      moduleSlug: "stem-1",
      timeDeltaS: 0,
      ...input,
    }),
  });
  if (!res.ok) {
    try {
      console.error(await res.json());
    } catch (_e) {
      void 0;
    }
    throw new Error(`checkpoint_failed_${res.status}`);
  }
  return res.json();
}
