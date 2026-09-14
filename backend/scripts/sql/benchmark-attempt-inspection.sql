-- #879 (DATA-03) — historical inspection of benchmark attempts. READ-ONLY.
--
-- Compares every stored BenchmarkAttempt with the template its assignment
-- carries and returns one row per attempt that the canonical scorer (PR #920)
-- would now refuse, or that is internally inconsistent. Run against production
-- by the owner. Validated against seeded malformed attempts by
-- backend/src/routes/__tests__/benchmarkInspection.db.test.ts.
--
-- Columns
--   reasons                    why the attempt is invalid, comma-separated
--   repair_first_answer_score  ONLY a candidate repair policy ("keep the first
--                              stored answer per known question, in range"),
--                              NOT what the scorer produces: the scorer refuses
--                              these attempts outright. NULL when the policy
--                              cannot apply (a question unanswered, an unknown
--                              id present, malformed JSON).
--
-- Repairing an attempt by any policy must rewrite answers[] (isCorrect,
-- skillTag, order), score AND totalQuestions together. The per-skill growth
-- report reads answers[].isCorrect and skillTag, so changing score alone
-- leaves it wrong. Deleting the attempt (a retake) is the other option; note
-- a deleted PRE attempt re-locks that learner's POST.
--
-- Casts are guarded: an index that is not a short non-negative integer (a
-- huge historical value, a negative, a string) is reported as a bad index,
-- never cast.

WITH canon AS (
  SELECT a.id            AS attempt_id,
         a."assignmentId",
         a."studentId",
         a.score,
         a."totalQuestions",
         a."createdAt",
         a.answers,
         t.questions     AS template_questions,
         CASE WHEN jsonb_typeof(t.questions) = 'array' THEN jsonb_array_length(t.questions) END AS template_count,
         CASE WHEN jsonb_typeof(a.answers)   = 'array' THEN jsonb_array_length(a.answers)   END AS answer_count
  FROM "BenchmarkAttempt" a
  JOIN "BenchmarkAssignment" s ON s.id = a."assignmentId"
  JOIN "BenchmarkTemplate"   t ON t.id = s."templateId"
),
answers AS (
  SELECT c.attempt_id,
         x.ord,
         x.val->>'questionId' AS question_id,
         CASE WHEN (x.val->>'selectedIndex') ~ '^[0-9]{1,6}$'
              THEN (x.val->>'selectedIndex')::int END AS selected_index
  FROM canon c
  CROSS JOIN LATERAL jsonb_array_elements(
    CASE WHEN jsonb_typeof(c.answers) = 'array' THEN c.answers ELSE '[]'::jsonb END
  ) WITH ORDINALITY AS x(val, ord)
),
questions AS (
  SELECT c.attempt_id,
         q.val->>'id' AS question_id,
         CASE WHEN jsonb_typeof(q.val->'choices') = 'array'
              THEN jsonb_array_length(q.val->'choices') ELSE 0 END AS choice_count,
         CASE WHEN (q.val->>'correctIndex') ~ '^[0-9]{1,6}$'
              THEN (q.val->>'correctIndex')::int END AS correct_index
  FROM canon c
  CROSS JOIN LATERAL jsonb_array_elements(
    CASE WHEN jsonb_typeof(c.template_questions) = 'array' THEN c.template_questions ELSE '[]'::jsonb END
  ) AS q(val)
),
first_answers AS (
  -- The candidate repair policy's view: the first stored answer per question id.
  SELECT DISTINCT ON (attempt_id, question_id) attempt_id, question_id, selected_index
  FROM answers
  ORDER BY attempt_id, question_id, ord
),
per_attempt AS (
  SELECT c.attempt_id, c."assignmentId", c."studentId", c."createdAt",
         c.score, c."totalQuestions", c.template_count, c.answer_count,
         (SELECT count(*) - count(DISTINCT a.question_id)
            FROM answers a WHERE a.attempt_id = c.attempt_id)::int AS duplicate_answers,
         (SELECT count(*) FROM answers a
            WHERE a.attempt_id = c.attempt_id
              AND NOT EXISTS (SELECT 1 FROM questions q
                               WHERE q.attempt_id = c.attempt_id AND q.question_id = a.question_id))::int AS unknown_ids,
         (SELECT count(*) FROM questions q
            WHERE q.attempt_id = c.attempt_id
              AND NOT EXISTS (SELECT 1 FROM answers a
                               WHERE a.attempt_id = c.attempt_id AND a.question_id = q.question_id))::int AS missing_questions,
         (SELECT count(*) FROM answers a
            JOIN questions q ON q.attempt_id = a.attempt_id AND q.question_id = a.question_id
            WHERE a.attempt_id = c.attempt_id
              AND (a.selected_index IS NULL OR a.selected_index >= q.choice_count))::int AS bad_index,
         (SELECT count(*) FROM questions q
            WHERE q.attempt_id = c.attempt_id
              AND EXISTS (SELECT 1 FROM first_answers f
                           WHERE f.attempt_id = c.attempt_id AND f.question_id = q.question_id
                             AND f.selected_index IS NOT NULL
                             AND f.selected_index < q.choice_count
                             AND f.selected_index = q.correct_index))::int AS first_answer_correct
  FROM canon c
)
SELECT attempt_id, "assignmentId", "studentId", "createdAt",
       score, "totalQuestions", template_count, answer_count,
       duplicate_answers, unknown_ids, missing_questions, bad_index,
       CASE WHEN template_count IS NOT NULL AND answer_count IS NOT NULL
             AND missing_questions = 0 AND unknown_ids = 0
            THEN first_answer_correct END AS repair_first_answer_score,
       concat_ws(', ',
         CASE WHEN template_count IS NULL OR answer_count IS NULL                      THEN 'malformed json' END,
         CASE WHEN score > "totalQuestions"                                            THEN 'score above total' END,
         CASE WHEN template_count IS NOT NULL AND "totalQuestions" <> template_count   THEN 'total differs from template' END,
         CASE WHEN duplicate_answers > 0                                               THEN 'duplicate answers' END,
         CASE WHEN unknown_ids > 0                                                     THEN 'unknown question id' END,
         CASE WHEN missing_questions > 0                                               THEN 'missing question' END,
         CASE WHEN bad_index > 0                                                       THEN 'choice index out of range or not an integer' END,
         CASE WHEN duplicate_answers = 0 AND unknown_ids = 0 AND missing_questions = 0
               AND bad_index = 0 AND template_count IS NOT NULL
               AND score <> first_answer_correct                                       THEN 'score inconsistent with answers' END
       ) AS reasons
FROM per_attempt
WHERE template_count IS NULL OR answer_count IS NULL
   OR score > "totalQuestions"
   OR "totalQuestions" <> template_count
   OR duplicate_answers > 0
   OR unknown_ids > 0
   OR missing_questions > 0
   OR bad_index > 0
   OR score <> first_answer_correct
ORDER BY "createdAt";
