// src/components/TeacherDashboard/Assignments/AssignmentTable.tsx

type Assignment = {
  id: string;
  title: string;
  dueDate: string;
  status: "Open" | "Closed" | "Draft";
};

type Props = {
  assignments: Assignment[];
  onRowClick: (assignmentId: string) => void;
};

export default function AssignmentTable({ assignments, onRowClick }: Props) {
  return (
    <div className="bg-white rounded-xl shadow p-4">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-gray-100 text-left">
            <th className="px-4 py-2">Title</th>
            <th className="px-4 py-2">Due</th>
            <th className="px-4 py-2">Status</th>
          </tr>
        </thead>
        <tbody>
          {assignments.map((a) => (
            <tr
              key={a.id}
              className="border-b hover:bg-gray-50 cursor-pointer"
              onClick={() => onRowClick(a.id)}
            >
              <td className="px-4 py-2">{a.title}</td>
              <td className="px-4 py-2">
                {new Date(a.dueDate).toLocaleDateString()}
              </td>
              <td className="px-4 py-2">{a.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
