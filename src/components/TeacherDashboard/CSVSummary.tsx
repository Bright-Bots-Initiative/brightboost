import React from "react";
import { Users, BookOpen, GraduationCap } from "lucide-react";
import { ParsedClassData } from "./types";

interface CSVSummaryProps {
  data: ParsedClassData;
}

const CSVSummary: React.FC<CSVSummaryProps> = ({ data }) => {
  return (
    <section className="space-y-6" aria-labelledby="csv-summary-heading">
      <h3 id="csv-summary-heading" className="sr-only">
        CSV Import Summary
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div
          className="bg-blue-50 border border-blue-200 rounded-lg p-4"
          role="region"
          aria-labelledby="class-name-summary"
        >
          <div className="flex items-center">
            <BookOpen className="w-8 h-8 text-brightboost-blue mr-3" />
            <div>
              <dt id="class-name-summary" className="text-sm text-gray-600">
                Class Name
              </dt>
              <dd className="font-semibold text-brightboost-navy">
                {data.className}
              </dd>
            </div>
          </div>
        </div>

        <div
          className="bg-green-50 border border-green-200 rounded-lg p-4"
          role="region"
          aria-labelledby="grade-summary"
        >
          <div className="flex items-center">
            <GraduationCap className="w-8 h-8 text-brightboost-green mr-3" />
            <div>
              <dt id="grade-summary" className="text-sm text-gray-600">
                Grade
              </dt>
              <dd className="font-semibold text-brightboost-navy">
                {data.grade || "Not specified"}
              </dd>
            </div>
          </div>
        </div>

        <div
          className="bg-yellow-50 border border-yellow-200 rounded-lg p-4"
          role="region"
          aria-labelledby="student-count-summary"
        >
          <div className="flex items-center">
            <Users className="w-8 h-8 text-brightboost-yellow mr-3" />
            <div>
              <dt id="student-count-summary" className="text-sm text-gray-600">
                Students
              </dt>
              <dd className="font-semibold text-brightboost-navy">
                {data.students.length}
              </dd>
            </div>
          </div>
        </div>
      </div>

      <section aria-labelledby="class-preview-heading">
        <h4
          id="class-preview-heading"
          className="text-lg font-medium text-brightboost-navy mb-4"
        >
          Class Preview
        </h4>
        <table
          className="w-full text-left table-auto mt-2"
          role="table"
          aria-labelledby="class-preview-heading"
        >
          <thead>
            <tr className="text-sm text-gray-600 border-b">
              <th scope="col" className="py-2">
                Student ID
              </th>
              <th scope="col" className="py-2">
                Name
              </th>
              <th scope="col" className="py-2">
                Email
              </th>
            </tr>
          </thead>
          <tbody>
            {data.students.map((student) => (
              <tr key={student.id} className="border-b text-sm text-gray-800">
                <th scope="row" className="py-2 font-mono text-xs">
                  {student.id}
                </th>
                <td className="py-2">{student.name}</td>
                <td className="py-2">
                  {student.email ? (
                    student.email
                  ) : (
                    <span
                      className="text-gray-400 italic"
                      aria-label="No email provided"
                    >
                      N/A
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </section>
  );
};

export default CSVSummary;
