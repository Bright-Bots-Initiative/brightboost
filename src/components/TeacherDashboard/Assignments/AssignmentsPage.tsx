import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAssignments } from "./useAssignments";
import AssignmentTable from "./AssignmentsTable";
import NewAssignmentDrawer from "./NewAssignmentDrawer";
import { Assignment } from "../../TeacherDashboard/types";

export default function AssignmentsPage() {
  const { id: classId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { assignments, isLoading, setAssignments } = useAssignments(classId);
  const [isDrawerOpen, setDrawerOpen] = useState(false);

  const navigateToAssignmentDetail = (assignmentId: string) => {
    navigate(`/teacher/classes/${classId}/assignments/${assignmentId}`);
  };

  const openNewAssignmentDrawer = () => {
    setDrawerOpen(true);
  };

  const handleAssignmentCreated = (newAssignment: Assignment) => {
    setAssignments((prev) => [...prev, newAssignment]);
  };

  if (!classId) return <div className="p-6">No class selected.</div>;

  return (
    <div className="container p-6">
        <button
        onClick={() => navigate(`/teacher/classes/${classId}`)}
        className="flex items-center bg-gray-100 hover:bg-gray-200 text-gray-800 text-sm font-medium px-3 py-1.5 rounded-full transition"
        >
        <span className="mr-1">←</span> Back to Class
        </button>
        <header className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-brightboost-navy">Assignments</h1>
        </div>
        <button
            onClick={openNewAssignmentDrawer}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
        >
            + New Assignment
        </button>
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

      <NewAssignmentDrawer
        classId={classId}
        isOpen={isDrawerOpen}
        onClose={() => setDrawerOpen(false)}
        onAssignmentCreated={handleAssignmentCreated}
      />
    </div>
  );
}
