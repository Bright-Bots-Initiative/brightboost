# Teacher Dashboard – Frontend Guide

Welcome to the Bright Bots Teacher Dashboard. This guide documents the structure, patterns, and practices used to build and maintain the Teacher Dashboard UI, a core part of our app where teachers view class data, manage students, and track progress. Developers should read and create addendums in order to understand the exisiting codebase.

---

## Overview

The teacher dashboard allows educators to:

- View and edit class details
- Track student STEM-1 progress
- View and export grades
- Open and edit student/teacher profiles
- View and manage assignments

---

## File Structure

Main files and components:

```
src/
├── pages/
│   └── teacher/
│       ├── TeacherDashboard.tsx
│       └── TeacherClassDetail.tsx
├── components/
│   └── TeacherDashboard/
# All reusable dashboard components
│       ├── Sidebar.tsx
│       ├── MainContent.tsx
│       ├── ExportGradesButton.tsx
│       ├── ProfileModal.tsx
│       ├── EditProfileModal.tsx
│       └── Assignments/
│           └── AssignmentsTable.tsx
├── services/
│   ├── mockClassService.ts
│   ├── profileService.ts
│   ├── stem1GradeService.ts
│   └── assignmentService.ts
```

---

## Styling & UX Patterns

Bright Bots uses **Tailwind CSS** with the following conventions:

- `bg-brightboost-blue`, `bg-brightboost-navy`, etc. for brand colors
- Use `rounded-md`, `shadow-md`, `transition` for consistent button aesthetics
- Status pills (e.g., STEM-1 Complete, Open/Closed) use color-coded `inline-flex` badges
- Profile buttons are **icon-only**, using Lucide icons inside a consistent clickable container

**Examples:**

- Primary Action Button:

  ```tsx
  className =
    "flex items-center px-3 py-1.5 text-sm bg-brightboost-blue text-white rounded-md hover:bg-brightboost-navy transition-colors hover:shadow-md";
  ```

- Status pill:
  ```tsx
  className =
    "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800";
  ```

---

## Data Mocking

The app uses/used mock services (if not in use, they should be marked as [deprecated]):

- fetchMockClasses, fetchMockClassById simulate class data

- getAssignments returns mock assignment objects

- getSTEM1Summary() dynamically computes XP/completion

---

## Testing in Context

You can test the full dashboard workflow locally by:

1. Visiting /teacher/dashboard (Sidebar + Overview)

2. Clicking into a class → /teacher/classes/:id

3. Viewing student XP/completion

4. Opening profile modals

5. Clicking "View All" in assignments

6. Exporting STEM-1 progress

---

## State Management Pattern

Currently use **local React state** (`useState`, `useEffect`) for most view-specific logic, especially in:

- `TeacherDashboard.tsx` (top-level tab selection, login context)
- `TeacherClassDetail.tsx` (editing class name/grade, modal toggles, student selection)

### State Guidelines

| Scope                            | State Location                  |
| -------------------------------- | ------------------------------- |
| Widget-level only                | Component-level `useState`      |
| Shared across sibling components | Lifted up to parent container   |
| Needed app-wide                  | React Context (`useAuth`, etc.) |

**Note:** Avoiding global state libraries (e.g. Redux, Zustand) for now.

---

## Guide: Adding a New Widget

Use this checklist to guide development of new features like UI components, tools, or interactions.

#### 1. Define the Feature

- What is its purpose?
- Who is it for (teachers, admins)?
- Where will it appear (page, modal, sidebar, etc.)?

#### 2. Build the Component

- Add to `src/components/TeacherDashboard/`
- Use functional components + Tailwind classes
- For full pages, create under `src/pages/teacher/`

ie.

```tsx
<div className="p-4 bg-white rounded-lg shadow text-gray-700">...</div>
```

### 3. Connect to Data

- Add fetch logic to a file in src/services/

- Use api.get, api.post, or mock data if backend isn’t ready

### 4. Manage State Properly

Practices like:

- Use useState and useEffect in the page component

- Pass props to child components for isolation

- Use toast notifications (e.g., react-hot-toast) to surface errors or status

### 6. Test and Document

- Testing

- In line comments

- Documentation for anything major
