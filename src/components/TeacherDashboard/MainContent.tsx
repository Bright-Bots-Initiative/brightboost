import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { MainContentProps, Lesson } from "./types";
import LessonsTable from "./LessonTable";
import LessonFormDialog from "./LessonFormDialog";
import { Plus } from "lucide-react";

const MainContent: React.FC<MainContentProps> = ({
  lessonsData,
  setLessonsData,
  onAddLesson,
  onEditLesson,
  onDeleteLesson,
}) => {
  const { t } = useTranslation();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");
  const [editingLesson, setEditingLesson] = useState<Lesson | undefined>();

  const handleOpenCreate = () => {
    setDialogMode("create");
    setEditingLesson(undefined);
    setDialogOpen(true);
  };

  const handleOpenEdit = (lesson: Lesson) => {
    setDialogMode("edit");
    setEditingLesson(lesson);
    setDialogOpen(true);
  };

  const handleSubmit = async (
    data: Pick<Lesson, "title" | "content" | "category">,
  ) => {
    if (dialogMode === "create") {
      await onAddLesson(data);
    } else if (editingLesson) {
      await onEditLesson({ ...editingLesson, ...data });
    }
  };

  const handleDuplicateLesson = (id: string | number) => {
    const original = lessonsData.find(
      (l) => String(l.id) === String(id),
    );
    if (!original) return;
    onAddLesson({
      title: `${original.title} ${t("teacher.lessonTable.copy")}`,
      content: original.content ?? "",
      category: original.category,
    });
  };

  return (
    <section className="flex-grow p-6">
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-brightboost-navy">{t("teacher.lessons.title")}</h1>
        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-brightboost-blue rounded-md hover:bg-brightboost-navy focus:outline-none focus:ring-2 focus:ring-brightboost-blue transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" />
          {t("teacher.lessons.addNew")}
        </button>
      </header>

      <section
        className="bg-white rounded-lg shadow-md p-6"
        aria-labelledby="lessons-management-heading"
      >
        <h2
          id="lessons-management-heading"
          className="text-xl font-semibold mb-4"
        >
          {t("teacher.lessons.management")}
        </h2>
        <p className="text-gray-600 mb-4">
          {t("teacher.lessons.available", { count: lessonsData.length })}
        </p>
        <LessonsTable
          lessons={lessonsData}
          setLessons={setLessonsData}
          onEditLesson={handleOpenEdit}
          onDuplicateLesson={handleDuplicateLesson}
          onDeleteLesson={onDeleteLesson}
        />
      </section>

      <LessonFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        mode={dialogMode}
        initialData={editingLesson}
        onSubmit={handleSubmit}
      />
    </section>
  );
};

export default MainContent;
