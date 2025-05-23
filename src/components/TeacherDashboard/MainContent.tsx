import React, { useState } from 'react';
import { MainContentProps, Lesson } from './types';
import LessonsTable from './LessonTable';
import { Button } from '@/components/ui/button'; // Assuming Button component is available
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';


const MainContent: React.FC<MainContentProps> = ({
  activeView,
  lessonsData,
  setLessonsData,
  onAddLesson,
  onEditLesson,
  onDeleteLesson,
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newLessonTitle, setNewLessonTitle] = useState('');
  const [newLessonContent, setNewLessonContent] = useState('');
  const [newLessonCategory, setNewLessonCategory] = useState('');
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);


  const handleAddLessonSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLessonTitle || !newLessonContent || !newLessonCategory) {
      alert('Please fill in all fields for the new lesson.');
      return;
    }
    onAddLesson({
      title: newLessonTitle,
      content: newLessonContent,
      category: newLessonCategory,
      // date and status will be set by backend or a more complex form
    });
    setNewLessonTitle('');
    setNewLessonContent('');
    setNewLessonCategory('');
    setShowAddForm(false);
  };
  
  const handleEditLessonSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLesson) return;
    // Call the actual update function passed from TeacherDashboard
    // For this, onEditLesson in MainContentProps should probably take the full lesson object
    // or TeacherDashboard.tsx's handleEditLesson should manage fetching the lesson to edit.
    // For now, assuming onEditLesson can take partial data or TeacherDashboard.tsx handles it.
    onEditLesson(editingLesson); // Pass the whole lesson object
    setEditingLesson(null); // Close form
  };

  const openEditForm = (lesson: Lesson) => {
    setEditingLesson(lesson); // Pre-fill form with lesson data
    setShowAddForm(false); // Close add form if open
  };

  const handleDuplicateLesson = (id: string | number) => {
    console.log('Duplicate lesson (not implemented):', id);
    // Implementation might involve fetching the lesson, modifying title, and calling onAddLesson
  };


  return (
    <div className="flex-grow p-6 ml-64"> {/* Ensure ml-64 matches sidebar width */}
      <h2 className="text-2xl font-bold mb-6 text-brightboost-navy">{activeView}</h2>

      {activeView === 'Lessons' && (
        <>
          <div className="mb-4">
            <Button onClick={() => { setShowAddForm(!showAddForm); setEditingLesson(null); }}>
              {showAddForm ? 'Cancel' : 'Add New Lesson'}
            </Button>
          </div>

          {(showAddForm || editingLesson) && (
            <form onSubmit={editingLesson ? handleEditLessonSubmit : handleAddLessonSubmit} className="bg-white p-4 rounded-lg shadow-md mb-6 space-y-4">
              <h4 className="text-lg font-semibold">{editingLesson ? 'Edit Lesson' : 'Add New Lesson'}</h4>
              <div>
                <label htmlFor="lessonTitle" className="block text-sm font-medium text-gray-700">Title</label>
                <Input
                  id="lessonTitle"
                  value={editingLesson ? editingLesson.title : newLessonTitle}
                  onChange={(e) => editingLesson ? setEditingLesson({...editingLesson, title: e.target.value}) : setNewLessonTitle(e.target.value)}
                  required
                />
              </div>
              <div>
                <label htmlFor="lessonContent" className="block text-sm font-medium text-gray-700">Content</label>
                <Textarea
                  id="lessonContent"
                  value={editingLesson ? editingLesson.content || '' : newLessonContent}
                  onChange={(e) => editingLesson ? setEditingLesson({...editingLesson, content: e.target.value}) : setNewLessonContent(e.target.value)}
                  required
                />
              </div>
              <div>
                <label htmlFor="lessonCategory" className="block text-sm font-medium text-gray-700">Category</label>
                <Input
                  id="lessonCategory"
                  value={editingLesson ? editingLesson.category : newLessonCategory}
                  onChange={(e) => editingLesson ? setEditingLesson({...editingLesson, category: e.target.value}) : setNewLessonCategory(e.target.value)}
                  required
                />
              </div>
               {editingLesson && (
                <div>
                  <label htmlFor="lessonStatus" className="block text-sm font-medium text-gray-700">Status</label>
                  <Select
                    value={editingLesson.status}
                    onValueChange={(value) => setEditingLesson({...editingLesson, status: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Draft">Draft</SelectItem>
                      <SelectItem value="Published">Published</SelectItem>
                      <SelectItem value="Review">Review</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              <Button type="submit">{editingLesson ? 'Save Changes' : 'Create Lesson'}</Button>
              {editingLesson && <Button type="button" variant="outline" onClick={() => setEditingLesson(null)} className="ml-2">Cancel Edit</Button>}
            </form>
          )}

          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-semibold mb-4">Lessons Management</h3>
            <p className="text-gray-600 mb-4">
              You have {lessonsData.length} lessons available.
            </p>
            <LessonsTable
              lessons={lessonsData}
              setLessons={setLessonsData} // For drag-n-drop reordering primarily
              onEditLesson={openEditForm} // Pass the function to open the edit form
              onDuplicateLesson={handleDuplicateLesson} // Keep for now, can be enhanced later
              onDeleteLesson={onDeleteLesson} // Pass through delete handler
            />
          </div>
        </>
      )}
      
      {activeView === 'Students' && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-semibold mb-4">Student Management</h3>
          <p className="text-gray-600">
            Student management features will be implemented in a future update.
          </p>
        </div>
      )}
      
      {activeView === 'Settings' && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-semibold mb-4">Dashboard Settings</h3>
          <p className="text-gray-600">
            Settings and configuration options will be implemented in a future update.
          </p>
        </div>
      )}
    </div>
  );
};

export default MainContent;
