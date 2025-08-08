Accessibility Improvements Overview  
This document outlines accessibility enhancements made across key components and pages in the Teacher Dashboard section of the app.

Component Updates  
**ProfileModal.tsx**  
Added ARIA attributes such as:

```jsx
role="alert"
aria-busy="true"
```

to improve user support.

Error messaging is now announced using:

```jsx
<div role="alert">Name is required</div>
```

Focus is automatically set when the modal opens:

```jsx
useEffect(() => {
  if (isOpen) {
    setTimeout(
      () => document.querySelector("#edit-profile-name")?.focus(),
      100,
    );
  }
}, [isOpen]);
```

**CSVImportModal.tsx**  
Progress bar includes ARIA attributes like:

```jsx
<div
  role="progressbar"
  aria-valuenow={step}
  aria-valuemin={1}
  aria-valuemax={3}
/>
```

Status updates are provided through live regions:

```jsx
<span aria-live="polite">Import in progress</span>
```

Errors are clearly announced:

```jsx
<div role="alert">Upload failed</div>
```

**CSVDropzone.tsx**  
Drop area is enhanced with keyboard support:

```jsx
<div role="button" tabIndex={0} aria-label="CSV file upload area">
  onKeyDown=
  {(e) => {
    if (e.key === "Enter") handleClick();
  }}
</div>
```

Loading state is marked with:

```jsx
<div aria-live="polite" aria-busy="true">
  Uploading...
</div>
```

**ExportGradesButton.tsx**  
Clear labeling and tooltip support:

```jsx
<button aria-describedby="export-tooltip" aria-label="Export class progress" />
```

Status feedback with live region:

```jsx
<span aria-live="polite">Exporting...</span>
```

**CSVSummary.tsx**  
Summary sections have been wrapped with defined regions:

```jsx
<section aria-labelledby="summary-heading">
  <div role="region" aria-labelledby="class-name-summary" />
</section>
```

Table headers use scoped attributes:

```jsx
<th scope="col">Student ID</th>
<th scope="row">{{student.id}}</th>
```

**TeacherLayout.tsx**  
Quick keyboard access:

```jsx
<a href="#main-content">Skip to main content</a>
```

Main content is defined for assistive navigation:

```jsx
<main id="main-content" role="main" />
```

**TeacherNavbar.tsx**  
Dropdown interactions now use ARIA roles:

```jsx
<button
  aria-haspopup="true"
  aria-expanded={{ isOpen }}
  aria-label="User menu"
/>
```

Menu items are keyboard-accessible:

```jsx
<div role="menu">
  <button role="menuitem">View Profile</button>
</div>
```

**MainContent.tsx**  
Improved heading levels and region definition:

```jsx
<main role="main" aria-labelledby="dashboard-title" />
```

Page Updates  
**TeacherClassDetail.tsx**  
Status and progress sections are now grouped under:

```jsx
<section aria-labelledby="summary-heading" />
```

Tables include scoped headers for clarity:

```jsx
<th scope="col">Student ID</th>
<th scope="row">{{student.id}}</th>
```

Progress updates announced via:

```jsx
<div aria-live="polite">Loading student roster...</div>
```

**TeacherClasses.tsx**  
Class information structured for screen readers:

```jsx
<article aria-labelledby={`class-${cls.id}-title`} />
```

Region roles provide context to classroom stats:

```jsx
<div role="region" aria-label="Progress overview" />
```

**TeacherDashboard.tsx**  
Dashboard loading and error states use:

```jsx
<div aria-live="polite" aria-busy={{isLoading}}>
  {{isLoading ? 'Loading dashboard data…' : error ? <div role="alert">Error: {error}</div> : null}}
</div>
```
