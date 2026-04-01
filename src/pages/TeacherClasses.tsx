import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import BrightBoostRobot from "../components/BrightBoostRobot";
import { Plus, Users, Copy, Check, Zap, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useApi, ApiError } from "../services/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface CourseListItem {
  id: string;
  name: string;
  joinCode: string;
  enrollmentCount: number;
  createdAt: string;
}

const ClassesPage: React.FC = () => {
  const { t } = useTranslation();
  const api = useApi();
  const [courses, setCourses] = useState<CourseListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const courseToDelete = courses.find((c) => c.id === deleteId);

  const loadCourses = async () => {
    setIsLoading(true);
    try {
      const response = await api.get("/teacher/courses");
      setCourses(Array.isArray(response) ? response : []);
    } catch {
      setCourses([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCourses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api]);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const course = await api.post("/teacher/courses", {
        name: newName.trim(),
      });
      setCourses((prev) => [course, ...prev]);
      setNewName("");
      setCreateOpen(false);
    } catch {
      // toast handled by useApi
    } finally {
      setCreating(false);
    }
  };

  const copyCode = (code: string, courseId: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(courseId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDelete = async (courseId: string) => {
    try {
      await api.delete(`/teacher/courses/${courseId}`);
    } catch (err) {
      const is404 = (err instanceof ApiError && err.status === 404) ||
        (err instanceof Error && /404/.test(err.message));
      if (!is404) return;
    }
    setCourses((prev) => prev.filter((c) => c.id !== courseId));
  };

  return (
    <div className="w-full">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold text-brightboost-navy flex items-center">
            <Zap className="w-7 h-7 mr-2 text-brightboost-blue" />
            {t("teacher.classes.title")}
          </h1>
          <p className="text-gray-600 mt-1">
            {t("teacher.classes.subtitle")}
          </p>
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          className="flex items-center px-4 py-2 bg-brightboost-blue text-white rounded-md hover:bg-brightboost-navy transition-colors focus:outline-none focus:ring-2 focus:ring-brightboost-blue"
        >
          <Plus className="w-4 h-4 mr-2" />
          {t("teacher.classes.newClass")}
        </button>
      </div>

      {isLoading ? (
        <div className="bg-white p-6 rounded-lg shadow-md" aria-busy="true">
          <div className="h-6 bg-gray-300 animate-pulse w-1/3 mb-4 rounded" />
          <div className="space-y-2">
            {[1, 2, 3].map((_, i) => (
              <div key={i} className="h-5 bg-gray-200 animate-pulse rounded" />
            ))}
          </div>
        </div>
      ) : courses.length === 0 ? (
        <section className="bg-white rounded-lg shadow-md p-8 text-center">
          <BrightBoostRobot size="lg" />
          <h2 className="text-xl text-brightboost-navy mt-4">
            {t("teacher.classes.noClasses")}
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            {t("teacher.classes.noClassesDesc")}
          </p>
          <button
            onClick={() => setCreateOpen(true)}
            className="inline-flex items-center px-4 py-2 bg-brightboost-blue text-white rounded-md hover:bg-brightboost-navy transition-colors focus:outline-none focus:ring-2 focus:ring-brightboost-blue"
          >
            <Plus className="w-4 h-4 mr-2" />
            {t("teacher.classes.createFirst")}
          </button>
        </section>
      ) : (
        <section className="space-y-4">
          {courses.map((c) => (
            <article
              key={c.id}
              className="bg-white rounded-lg shadow-md p-6 border border-gray-100 hover:shadow-lg transition-all"
            >
              <div className="flex justify-between items-start">
                <div>
                  <Link
                    to={`/teacher/classes/${c.id}`}
                    className="text-lg font-semibold text-brightboost-navy hover:text-brightboost-blue transition-colors"
                  >
                    {c.name}
                  </Link>
                  <div className="flex items-center space-x-6 mt-2 text-sm text-gray-600">
                    <span className="flex items-center">
                      <Users className="w-4 h-4 mr-1" />
                      {t("teacher.classes.students", { count: c.enrollmentCount })}
                    </span>
                    <span className="flex items-center font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                      {t("teacher.classes.joinCode")} <strong className="ml-1">{c.joinCode}</strong>
                      <button
                        onClick={() => copyCode(c.joinCode, c.id)}
                        className="ml-1 text-brightboost-blue hover:text-brightboost-navy"
                        title={t("teacher.classes.copyJoinCode")}
                      >
                        {copiedId === c.id ? (
                          <Check className="w-3.5 h-3.5" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    to={`/teacher/classes/${c.id}`}
                    className="px-3 py-1.5 text-sm bg-brightboost-blue text-white rounded-md hover:bg-brightboost-navy transition-colors"
                  >
                    {t("teacher.classes.open")}
                  </Link>
                  <button
                    onClick={() => setDeleteId(c.id)}
                    className="p-1.5 text-gray-400 hover:text-red-600 rounded-md hover:bg-red-50 transition-colors"
                    title={t("teacher.classes.deleteClass")}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </section>
      )}

      {/* Create Class Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("teacher.classes.createTitle")}</DialogTitle>
            <DialogDescription>
              {t("teacher.classes.createDesc")}
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleCreate();
            }}
            className="space-y-4"
          >
            <div>
              <label
                htmlFor="className"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                {t("teacher.classes.className")}
              </label>
              <input
                id="className"
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brightboost-blue"
                placeholder={t("teacher.classes.classNamePlaceholder")}
              />
            </div>
            <DialogFooter>
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                {t("teacher.classes.cancel")}
              </button>
              <button
                type="submit"
                disabled={!newName.trim() || creating}
                className="px-4 py-2 text-sm text-white bg-brightboost-blue rounded-md hover:bg-brightboost-navy disabled:opacity-50"
              >
                {creating ? t("teacher.classes.creating") : t("teacher.classes.createClass")}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("teacher.classes.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("teacher.classes.deleteConfirm", { name: courseToDelete?.name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("teacher.classes.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 focus:ring-red-500 text-white"
              onClick={() => {
                if (deleteId) handleDelete(deleteId);
                setDeleteId(null);
              }}
            >
              {t("teacher.classes.deleteClass")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ClassesPage;
