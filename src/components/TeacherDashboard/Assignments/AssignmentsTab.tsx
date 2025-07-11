import { useNavigate, useParams } from "react-router-dom";
import { useAssignments } from "./useAssignments";
import AssignmentTable from "./AssignmentsTable";
import { Button } from "@/components/ui/button";

export default function AssignmentsPage() {
  const { classId } = useParams<{ classId: string }>();
  const navigate = useNavigate();
  const { assignments, isLoading } = useAssignments(classId);

  const navigateToAssignmentDetail = (assignmentId: string) => {
    navigate(`/dashboard/classes/${classId}/assignments/${assignmentId}`);
  };

  const openNewAssignmentDrawer = () => {
    console.log("TODO: Implement New Assignment Drawer");
  };

  if (!classId) return <div className="p-6">No class selected.</div>;

  return (
    <div className="container p-6">
      <header className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Assignments</h1>
        <Button onClick={openNewAssignmentDrawer}>+ New Assignment</Button>
      </header>

      {isLoading ? (
        <div className="text-gray-500">Loading assignments…</div>
      ) : assignments.length === 0 ? (
        <div className="text-gray-500">No assignments yet.</div>
      ) : (
        <AssignmentTable
          assignments={assignments}
          onRowClick={navigateToAssignmentDetail}
        />
      )}
    </div>
  );
}
