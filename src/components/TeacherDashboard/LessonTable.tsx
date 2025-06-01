import React from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { LessonsTableProps, SortableLessonRowProps } from './types';
import IconButton, { EditIcon, DuplicateIcon, DeleteIcon, DragHandleIcon } from '../shared/IconButton';

const SortableLessonRow: React.FC<SortableLessonRowProps> = ({ lesson, onEditLesson, onDuplicateLesson, onDeleteLesson }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: lesson.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.75 : 1,
    zIndex: isDragging ? 10 : 'auto',
  };

  return (
    <tr ref={setNodeRef} style={style} {...attributes} className={`hover:bg-gray-50 transition duration-150 ${isDragging ? 'shadow-xl bg-gray-100' : ''}`}>
      <td className="py-4 px-2 text-sm font-medium text-gray-900 whitespace-nowrap align-middle">
        <IconButton onClick={() => {}} title="Drag to reorder" className="cursor-grab" {...listeners}>
          <DragHandleIcon />
        </IconButton>
      </td>
      <td className="py-4 px-4 text-sm font-medium text-gray-900 whitespace-nowrap align-middle">{lesson.title}</td>
      <td className="py-4 px-6 text-sm text-gray-500 whitespace-nowrap align-middle max-w-xs truncate" title={lesson.content}>
        {lesson.content ? `${lesson.content.substring(0, 50)}...` : 'N/A'}
      </td>
      <td className="py-4 px-6 text-sm text-gray-500 whitespace-nowrap align-middle">{lesson.category}</td>
      <td className="py-4 px-6 text-sm text-gray-500 whitespace-nowrap align-middle">{lesson.date}</td>
      <td className="py-4 px-6 text-sm whitespace-nowrap align-middle">
        <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
          lesson.status === "Published" ? "bg-green-100 text-green-800" :
          lesson.status === "Draft" ? "bg-yellow-100 text-yellow-800" :
          "bg-blue-100 text-blue-800"
        }`}>
          {lesson.status}
        </span>
      </td>
      <td className="py-4 px-6 text-sm font-medium whitespace-nowrap align-middle">
        <div className="flex items-center space-x-2">
          <IconButton onClick={() => onEditLesson(lesson)} title="Edit" className="text-blue-600 hover:text-blue-900">
            <EditIcon />
          </IconButton>
          <IconButton onClick={() => onDuplicateLesson(lesson.id)} title="Duplicate" className="text-green-600 hover:text-green-900">
            <DuplicateIcon />
          </IconButton>
          <IconButton onClick={() => onDeleteLesson(lesson.id)} title="Delete" className="text-red-600 hover:text-red-900">
            <DeleteIcon />
          </IconButton>
        </div>
      </td>
    </tr>
  );
};

const LessonsTable: React.FC<LessonsTableProps> = ({ lessons, setLessons, onEditLesson, onDuplicateLesson, onDeleteLesson }) => {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = lessons.findIndex((lesson) => lesson.id === active.id);
      const newIndex = lessons.findIndex((lesson) => lesson.id === over.id);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        const newOrderLessons = arrayMove(lessons, oldIndex, newIndex);
        setLessons(newOrderLessons);
      }
    }
  }

  if (!lessons || lessons.length === 0) {
    return <p className="text-gray-600 p-4">No lessons available.</p>;
  }

  return (
    <div className="overflow-x-auto bg-white shadow-lg rounded-lg">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <table className="min-w-full table-auto">
          <thead className="bg-gray-100 border-b-2 border-gray-200">
            <tr>
              <th className="py-3 px-2 w-12 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"></th>
              <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
              <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Content (Summary)</th>
              <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
              <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]">Actions</th>
            </tr>
          </thead>
          <SortableContext items={lessons.map(l => l.id)} strategy={verticalListSortingStrategy}>
            <tbody className="bg-white divide-y divide-gray-200">
              {lessons.map((lesson) => (
                <SortableLessonRow
                  key={lesson.id}
                  lesson={lesson}
                  onEditLesson={onEditLesson}
                  onDuplicateLesson={onDuplicateLesson}
                  onDeleteLesson={onDeleteLesson}
                />
              ))}
            </tbody>
          </SortableContext>
        </table>
      </DndContext>
    </div>
  );
};

export default LessonsTable;
