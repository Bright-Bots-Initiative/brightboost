export async function submitCheckpoint(input: {
  studentId: string;
  moduleSlug?: string;
  lessonId: string;
  activityId?: string;
  status: 'IN_PROGRESS' | 'COMPLETED';
  timeDeltaS?: number;
}) {
  const res = await fetch('/api/progress/checkpoint', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      moduleSlug: 'stem-1',
      timeDeltaS: 0,
      ...input,
    }),
  });
  if (!res.ok) {
    try { console.error(await res.json()); } catch {}
    throw new Error(`checkpoint_failed_${res.status}`);
  }
  return res.json();
}
