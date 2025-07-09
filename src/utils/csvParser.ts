import { Student, ParsedClassData, CSVRow, ParseError } from '../components/TeacherDashboard/types';

export const parseCSVData = (csvContent: string): ParsedClassData => {
  const lines = csvContent.trim().split('\n');
  
  if (lines.length < 2) {
    throw new Error('CSV file must contain at least a header row and one data row. Please ensure your file has the correct format with headers like: className,grade,studentName,studentEmail,studentId');
  }

  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  const dataRows = lines.slice(1);

  // Find required column indices with more flexible matching
  const classNameIndex = headers.findIndex(h => 
    h.toLowerCase().includes('classname') || 
    h.toLowerCase().includes('class_name') || 
    h.toLowerCase().includes('class')
  );
  const gradeIndex = headers.findIndex(h => 
    h.toLowerCase().includes('grade')
  );
  const studentNameIndex = headers.findIndex(h => 
    h.toLowerCase().includes('studentname') || 
    h.toLowerCase().includes('student_name') || 
    h.toLowerCase().includes('name')
  );
  const studentEmailIndex = headers.findIndex(h => 
    h.toLowerCase().includes('studentemail') || 
    h.toLowerCase().includes('student_email') || 
    h.toLowerCase().includes('email')
  );
  const studentIdIndex = headers.findIndex(h => 
    h.toLowerCase().includes('studentid') || 
    h.toLowerCase().includes('student_id') || 
    h.toLowerCase().includes('id')
  );

  // Enhanced error messages with column suggestions
  if (classNameIndex === -1) {
    throw new Error(`CSV must contain a class name column. Expected column names: "className", "class_name", or "class". Found columns: ${headers.join(', ')}. Please check your CSV header row.`);
  }
  if (studentNameIndex === -1) {
    throw new Error(`CSV must contain a student name column. Expected column names: "studentName", "student_name", or "name". Found columns: ${headers.join(', ')}. Please check your CSV header row.`);
  }

  const students: Student[] = [];
  let className = '';
  let grade = '';
  const parseErrors: ParseError[] = [];

  dataRows.forEach((row, index) => {
    const rowNumber = index + 2; // +2 because index starts at 0 and we skip header
    const columns = row.split(',').map(col => col.trim().replace(/"/g, ''));
    
    if (columns.length < headers.length) {
      parseErrors.push({
        line: rowNumber,
        message: `Row ${rowNumber} has ${columns.length} columns but expected ${headers.length} columns. Please ensure all rows have the same number of columns as the header.`
      });
      return; // Skip this row but continue processing others
    }

    // Get class info from first row
    if (index === 0) {
      className = columns[classNameIndex];
      if (gradeIndex !== -1) {
        grade = columns[gradeIndex];
      }
      
      if (!className || className.trim() === '') {
        parseErrors.push({
          line: rowNumber,
          message: `Class name is empty in row ${rowNumber}. Please provide a valid class name.`
        });
      }
    }

    const studentName = columns[studentNameIndex];
    const studentEmail = studentEmailIndex !== -1 ? columns[studentEmailIndex] : undefined;
    const studentId = studentIdIndex !== -1 ? columns[studentIdIndex] : `stu-${Date.now()}-${index}`;

    if (!studentName || studentName.trim() === '') {
      parseErrors.push({
        line: rowNumber,
        message: `Student name is empty in row ${rowNumber}. Please provide a valid student name.`
      });
      return;
    }

    // Validate email format if provided
    if (studentEmail && studentEmail.trim() !== '') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(studentEmail)) {
        parseErrors.push({
          line: rowNumber,
          message: `Invalid email format "${studentEmail}" in row ${rowNumber}. Please use a valid email address like student@example.com.`
        });
      }
    }

    students.push({
      id: studentId,
      name: studentName,
      email: studentEmail && studentEmail.trim() !== '' ? studentEmail : undefined
    });
  });

  // If we have parse errors, throw them as a combined message
  if (parseErrors.length > 0) {
    const errorMessages = parseErrors.map(error => `Line ${error.line}: ${error.message}`).join('\n');
    throw new Error(`CSV parsing failed with the following errors:\n\n${errorMessages}\n\nPlease fix these issues and try uploading again.`);
  }

  return {
    className,
    grade: grade || undefined,
    students
  };
};

export const validateCSVData = (data: ParsedClassData): string[] => {
  const errors: string[] = [];

  if (!data.className || data.className.trim() === '') {
    errors.push('Class name is required and cannot be empty. Please ensure your CSV has a valid class name.');
  }

  if (data.students.length === 0) {
    errors.push('At least one student is required. Please ensure your CSV contains student data with valid names.');
  }

  // Check for duplicate student names
  const studentNames = data.students.map(s => s.name.toLowerCase().trim());
  const duplicateNames = studentNames.filter((name, index) => studentNames.indexOf(name) !== index);
  if (duplicateNames.length > 0) {
    const uniqueDuplicates = [...new Set(duplicateNames)];
    // Filter out class name from duplicate check
    const actualDuplicates = uniqueDuplicates.filter(name => 
      name !== data.className.toLowerCase().trim()
    );
    if (actualDuplicates.length > 0) {
      errors.push(`Duplicate student names found: ${actualDuplicates.join(', ')}. Each student must have a unique name. Please review your CSV and ensure all student names are distinct.`);
    }
  }

  // Check for duplicate student emails (only for non-empty emails)
  const studentEmails = data.students
    .filter(s => s.email && s.email.trim() !== '')
    .map(s => s.email!.toLowerCase().trim());
  
  if (studentEmails.length > 0) {
    const duplicateEmails = studentEmails.filter((email, index) => studentEmails.indexOf(email) !== index);
    if (duplicateEmails.length > 0) {
      const uniqueDuplicateEmails = [...new Set(duplicateEmails)];
      errors.push(`Duplicate student emails found: ${uniqueDuplicateEmails.join(', ')}. Each student must have a unique email address. Please review your CSV and ensure all email addresses are distinct.`);
    }
  }

  // Additional validation for email formats (double-check after parsing)
  const invalidEmails = data.students
    .filter(s => s.email && s.email.trim() !== '')
    .filter(s => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return !emailRegex.test(s.email!);
    })
    .map(s => s.email);
    
  if (invalidEmails.length > 0) {
    errors.push(`Invalid email formats found: ${invalidEmails.join(', ')}. Please use valid email addresses (e.g., student@example.com).`);
  }

  return errors;
};
