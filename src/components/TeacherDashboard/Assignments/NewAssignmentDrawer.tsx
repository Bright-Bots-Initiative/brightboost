// src/components/TeacherDashboard/Assignments/NewAssignmentDrawer.tsx

import { useState } from "react";
import { AssignmentStatus, Assignment } from "../../TeacherDashboard/types";
import { createMockAssignment } from "@/services/assignmentService";
import clsx from "clsx";

type Props = {
  classId: string;
  isOpen: boolean;
  onClose: () => void;
  onAssignmentCreated: (newAssignment: Assignment) => void;
};

export default function NewAssignmentDrawer({
  classId,
  isOpen,
  onClose,
  onAssignmentCreated,
}: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title || !dueDate) {
      setError("Title and Due Date are required.");
      return;
    }

    setIsSaving(true);
    try {
      const newAssignment = await createMockAssignment(classId, {
        title,
        description,
        dueDate,
        status: AssignmentStatus.Open,
      });
      onAssignmentCreated(newAssignment);
      resetForm();
      onClose();
    } catch (err) {
      setError("Failed to create assignment.");
    } finally {
      setIsSaving(false);
    }
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setDueDate("");
    setError(null);
  };

  return (
    <div
      className={clsx(
        "fixed inset-0 z-40 transition-transform duration-300 ease-in-out",
        isOpen ? "translate-x-0" : "translate-x-full"
      )}
    >
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black bg-opacity-30"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="absolute right-0 top-0 h-full w-96 bg-white shadow-lg p-6 flex flex-col">
        <h2 className="text-xl font-bold mb-4 text-brightboost-navy">
          New Assignment
        </h2>

        <form onSubmit={handleSubmit} className="flex flex-col space-y-4 flex-1">
          {/* Title */}
          <label className="text-sm font-semibold text-gray-700">
            Title
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 p-2 border rounded w-full"
              placeholder="e.g., Essay 1"
              required
            />
          </label>

          {/* Description */}
          <label className="text-sm font-semibold text-gray-700">
            Description
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 p-2 border rounded w-full"
              rows={3}
              placeholder="Optional details for students..."
            />
          </label>

          {/* Due Date */}
          <label className="text-sm font-semibold text-gray-700">
            Due Date
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="mt-1 p-2 border rounded w-full"
              required
            />
          </label>

          {error && (
            <p className="text-red-600 text-sm font-medium">{error}</p>
          )}

          <div className="flex justify-end gap-2 mt-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-100 rounded border text-gray-700 hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className={clsx(
                "px-4 py-2 rounded text-white",
                isSaving
                  ? "bg-blue-400 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700"
              )}
            >
              {isSaving ? "Saving..." : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
