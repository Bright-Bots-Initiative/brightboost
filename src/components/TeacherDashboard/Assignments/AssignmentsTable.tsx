// src/components/TeacherDashboard/Assignments/AssignmentTable.tsx

import { Assignment } from "../../TeacherDashboard/types";
import { format } from "date-fns";
import clsx from "clsx";

type Props = {
  assignments: Assignment[];
  onRowClick: (assignmentId: string) => void;
};

export default function AssignmentTable({ assignments, onRowClick }: Props) {
  return (
    <div className="overflow-x-auto rounded-lg shadow-sm border border-gray-200">
      <table className="min-w-full text-sm text-gray-700">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th
              scope="col"
              className="px-6 py-3 text-left font-semibold tracking-wide"
            >
              Title
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left font-semibold tracking-wide"
            >
              Due Date
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left font-semibold tracking-wide"
            >
              Status
            </th>
          </tr>
        </thead>
        <tbody>
          {assignments.map((assignment, idx) => (
            <tr
              key={assignment.id}
              className={clsx(
                "border-b border-gray-100 transition-colors",
                "hover:bg-blue-50 hover:cursor-pointer",
                idx % 2 === 0 ? "bg-white" : "bg-gray-50", // zebra striping
              )}
              onClick={() => onRowClick(assignment.id)}
            >
              <td className="px-6 py-4 font-medium">{assignment.title}</td>
              <td className="px-6 py-4">
                {format(new Date(assignment.dueDate), "PPP")}
              </td>
              <td className="px-6 py-4">
                <StatusBadge status={assignment.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

type StatusBadgeProps = {
  status: Assignment["status"];
};

function StatusBadge({ status }: StatusBadgeProps) {
  const statusStyles = {
    Open: "bg-green-100 text-green-800",
    Closed: "bg-red-100 text-red-800",
    Draft: "bg-yellow-100 text-yellow-800",
  };

  return (
    <span
      className={clsx(
        "inline-block rounded-full px-3 py-1 text-xs font-semibold",
        statusStyles[status],
      )}
    >
      {status}
    </span>
  );
}
