import React from "react";
import { Users, BookOpen, GraduationCap } from "lucide-react";
import { ParsedClassData } from "../TeacherDashboard/types";

interface CSVSummaryProps {
  data: ParsedClassData;
}

const CSVSummary: React.FC<CSVSummaryProps> = ({ data }) => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center">
            <BookOpen className="w-8 h-8 text-brightboost-blue mr-3" />
            <div>
              <p className="text-sm text-gray-600">Class Name</p>
              <p className="font-semibold text-brightboost-navy">
                {data.className}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <GraduationCap className="w-8 h-8 text-brightboost-green mr-3" />
            <div>
              <p className="text-sm text-gray-600">Grade</p>
              <p className="font-semibold text-brightboost-navy">
                {data.grade || "Not specified"}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center">
            <Users className="w-8 h-8 text-brightboost-yellow mr-3" />
            <div>
              <p className="text-sm text-gray-600">Students</p>
              <p className="font-semibold text-brightboost-navy">
                {data.students.length}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h4 className="text-lg font-medium text-brightboost-navy mb-4">
          Class Preview
        </h4>
        <table className="w-full text-left table-auto mt-2">
          <thead>
            <tr className="text-sm text-gray-600 border-b">
              <th className="py-2">Student ID</th>
              <th className="py-2">Name</th>
              <th className="py-2">Email</th>
            </tr>
          </thead>
          <tbody>
            {data.students.map((student) => (
              <tr key={student.id} className="border-b text-sm text-gray-800">
                <td className="py-2">{student.id}</td>
                <td className="py-2">{student.name}</td>
                <td className="py-2">
                  {student.email ?? (
                    <span className="text-gray-400 italic">N/A</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CSVSummary;
