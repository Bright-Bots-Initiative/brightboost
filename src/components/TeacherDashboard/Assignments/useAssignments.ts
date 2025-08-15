import { useEffect, useState } from "react";
import { getAssignments } from "@/services/assignmentService";
import { Assignment } from "../../TeacherDashboard/types";

export function useAssignments(classId?: string) {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!classId) return;

    setIsLoading(true);
    getAssignments(classId)
      .then(setAssignments)
      .finally(() => setIsLoading(false));
  }, [classId]);

  return { assignments, isLoading, setAssignments };
}
