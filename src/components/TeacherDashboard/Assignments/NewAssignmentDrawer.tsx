// src/components/TeacherDashboard/Assignments/NewAssignmentDrawer.tsx

import { useState } from "react";
import { AssignmentStatus, Assignment } from "../../TeacherDashboard/types";
import { createMockAssignment } from "@/services/assignmentService";
import clsx from "clsx";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

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

  // Determine field-level error states
  const hasRequiredError = error === "Title and Due Date are required.";
  const titleError = hasRequiredError && !title;
  const dateError = hasRequiredError && !dueDate;

  return (
    <div
      className={clsx(
        "fixed inset-0 z-40 transition-transform duration-300 ease-in-out",
        isOpen ? "translate-x-0" : "translate-x-full",
      )}
      role="dialog"
      aria-modal="true"
      aria-labelledby="drawer-title"
    >
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black bg-opacity-30"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div className="absolute right-0 top-0 h-full w-96 bg-white shadow-lg p-6 flex flex-col">
        <h2
          id="drawer-title"
          className="text-xl font-bold mb-4 text-brightboost-navy"
        >
          New Assignment
        </h2>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col space-y-4 flex-1"
        >
          {/* Title */}
          <Input
            label="Title"
            placeholder="e.g., Essay 1"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            error={titleError}
          />

          {/* Description */}
          <Textarea
            label="Description"
            placeholder="Optional details for students..."
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          {/* Due Date */}
          <Input
            label="Due Date"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            required
            error={dateError}
          />

          {error && (
            <p className="text-red-600 text-sm font-medium" role="alert">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2 mt-auto">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isSaving}
              disabled={isSaving}
            >
              {isSaving ? "Saving..." : "Create"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
