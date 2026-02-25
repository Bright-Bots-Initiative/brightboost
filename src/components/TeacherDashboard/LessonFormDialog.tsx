import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Lesson } from "./types";

interface LessonFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  initialData?: Lesson;
  onSubmit: (
    data: Pick<Lesson, "title" | "content" | "category">,
  ) => Promise<void>;
}

const LessonFormDialog: React.FC<LessonFormDialogProps> = ({
  open,
  onOpenChange,
  mode,
  initialData,
  onSubmit,
}) => {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle(initialData?.title ?? "");
      setContent(initialData?.content ?? "");
      setCategory(initialData?.category ?? "");
      setError(null);
      setSubmitting(false);
    }
  }, [open, initialData]);

  const isValid = title.trim() !== "" && category.trim() !== "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        title: title.trim(),
        content: content.trim(),
        category: category.trim(),
      });
      onOpenChange(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Add New Lesson" : "Edit Lesson"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Fill in the details below to create a new lesson."
              : "Update the lesson details below."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="lessonTitle"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Title <span className="text-red-500">*</span>
            </label>
            <input
              id="lessonTitle"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brightboost-blue focus:border-brightboost-blue"
              placeholder="Lesson title"
            />
            {title.trim() === "" && (
              <p className="text-xs text-gray-500 mt-1">Title is required.</p>
            )}
          </div>

          <div>
            <label
              htmlFor="lessonContent"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Content
            </label>
            <textarea
              id="lessonContent"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={4}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brightboost-blue focus:border-brightboost-blue"
              placeholder="Lesson content"
            />
          </div>

          <div>
            <label
              htmlFor="lessonCategory"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Category <span className="text-red-500">*</span>
            </label>
            <input
              id="lessonCategory"
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brightboost-blue focus:border-brightboost-blue"
              placeholder="e.g. Math, Science"
            />
            {category.trim() === "" && (
              <p className="text-xs text-gray-500 mt-1">
                Category is required.
              </p>
            )}
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-md px-3 py-2">
              {error}
            </p>
          )}

          <DialogFooter>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brightboost-blue"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isValid || submitting}
              className="px-4 py-2 text-sm font-medium text-white bg-brightboost-blue rounded-md hover:bg-brightboost-navy focus:outline-none focus:ring-2 focus:ring-brightboost-blue disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting
                ? "Saving..."
                : mode === "create"
                  ? "Create Lesson"
                  : "Save Changes"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default LessonFormDialog;
