import { Student } from '../components/TeacherDashboard/types';

interface ParsedClassData {
  className: string;
  grade?: string;
  students: Student[];
}

export const parseCSVData = (csvContent: string): ParsedClassData => {
  const lines = csvContent.trim().split('\n');
  
  if (lines.length < 2) {
    throw new Error('CSV file must contain at least a header row and one data row. Please ensure your file has the correct format.');
  }

  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  const dataRows = lines.slice(1);

  // Find required column indices
  const classNameIndex = headers.findIndex(h => 
    h.toLowerCase().includes('classname') || h.toLowerCase().includes('class_name')
  );
  const gradeIndex = headers.findIndex(h => 
    h.toLowerCase().includes('grade')
  );
  const studentNameIndex = headers.findIndex(h => 
    h.toLowerCase().includes('studentname') || h.toLowerCase().includes('student_name') || h.toLowerCase().includes('name')
  );
  const studentEmailIndex = headers.findIndex(h => 
    h.toLowerCase().includes('studentemail') || h.toLowerCase().includes('student_email') || h.toLowerCase().includes('email')
  );
  const studentIdIndex = headers.findIndex(h => 
    h.toLowerCase().includes('studentid') || h.toLowerCase().includes('student_id') || h.toLowerCase().includes('id')
  );

  if (classNameIndex === -1) {
    throw new Error('CSV must contain a "className" or "class_name" column. Found columns: ' + headers.join(', '));
  }
  if (studentNameIndex === -1) {
    throw new Error('CSV must contain a "studentName", "student_name", or "name" column. Found columns: ' + headers.join(', '));
  }

  const students: Student[] = [];
  let className = '';
  let grade = '';

  dataRows.forEach((row, index) => {
    const columns = row.split(',').map(col => col.trim().replace(/"/g, ''));
    
    if (columns.length < headers.length) {
      throw new Error(`Row ${index + 2} has ${columns.length} columns but expected ${headers.length} columns. Please check your CSV format.`);
    }

    // Get class info from first row
    if (index === 0) {
      className = columns[classNameIndex];
      if (gradeIndex !== -1) {
        grade = columns[gradeIndex];
      }
    }

    const studentName = columns[studentNameIndex];
    const studentEmail = studentEmailIndex !== -1 ? columns[studentEmailIndex] : undefined;
    const studentId = studentIdIndex !== -1 ? columns[studentIdIndex] : `stu-${Date.now()}-${index}`;

    if (studentName) {
      students.push({
        id: studentId,
        name: studentName,
        email: studentEmail
      });
    }
  });

  return {
    className,
    grade: grade || undefined,
    students
  };
};

export const validateCSVData = (data: ParsedClassData): string[] => {
  const errors: string[] = [];

  if (!data.className || data.className.trim() === '') {
    errors.push('Class name is required and cannot be empty');
  }

  if (data.students.length === 0) {
    errors.push('At least one student is required. Please ensure your CSV contains student data.');
  }

  // Check for duplicate student names
  const studentNames = data.students.map(s => s.name.toLowerCase());
  const duplicateNames = studentNames.filter((name, index) => studentNames.indexOf(name) !== index);
  if (duplicateNames.length > 0) {
    errors.push(`Duplicate student names found: ${[...new Set(duplicateNames)].join(', ')}. Each student must have a unique name.`);
  }

  // Check for duplicate student emails
  const studentEmails = data.students
    .filter(s => s.email)
    .map(s => s.email!.toLowerCase());
  const duplicateEmails = studentEmails.filter((email, index) => studentEmails.indexOf(email) !== index);
  if (duplicateEmails.length > 0) {
    errors.push(`Duplicate student emails found: ${[...new Set(duplicateEmails)].join(', ')}. Each student must have a unique email address.`);
  }

  // Validate email formats
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const invalidEmails = data.students
    .filter(s => s.email && !emailRegex.test(s.email))
    .map(s => s.email);
  if (invalidEmails.length > 0) {
    errors.push(`Invalid email formats found: ${invalidEmails.join(', ')}. Please use valid email addresses (e.g., student@example.com).`);
  }

  return errors;
};