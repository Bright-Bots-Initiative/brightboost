import { Class, Student } from '../components/TeacherDashboard/types';

export interface StudentGrade {
  studentId: string;
  studentName: string;
  studentEmail?: string;
  mathScore?: number;
  scienceScore?: number;
  readingScore?: number;
  writingScore?: number;
  overallGrade?: string;
  lastUpdated: string;
  notes?: string;
}

export interface GradeExportData {
  className: string;
  grade?: string;
  exportDate: string;
  teacherName: string;
  students: StudentGrade[];
}

// Mock grade data generator for demonstration
const generateMockGrades = (students: Student[]): StudentGrade[] => {
  return students.map(student => ({
    studentId: student.id,
    studentName: student.name,
    studentEmail: student.email,
    mathScore: Math.floor(Math.random() * 40) + 60, // 60-100
    scienceScore: Math.floor(Math.random() * 40) + 60,
    readingScore: Math.floor(Math.random() * 40) + 60,
    writingScore: Math.floor(Math.random() * 40) + 60,
    overallGrade: ['A', 'A-', 'B+', 'B', 'B-', 'C+'][Math.floor(Math.random() * 6)],
    lastUpdated: new Date().toISOString().split('T')[0],
    notes: Math.random() > 0.7 ? 'Excellent progress this semester' : undefined
  }));
};

export const exportGradesToCSV = async (
  classData: Class,
  teacherName: string = 'Teacher'
): Promise<void> => {
  // Generate mock grades for demonstration
  const studentGrades = generateMockGrades(classData.students);
  
  const exportData: GradeExportData = {
    className: classData.name,
    grade: classData.grade,
    exportDate: new Date().toISOString().split('T')[0],
    teacherName,
    students: studentGrades
  };

  // Create CSV content
  const headers = [
    'Student ID',
    'Student Name',
    'Email',
    'Math Score',
    'Science Score',
    'Reading Score',
    'Writing Score',
    'Overall Grade',
    'Last Updated',
    'Notes'
  ];

  const csvRows = [
    headers.join(','),
    ...exportData.students.map(student => [
      `"${student.studentId}"`,
      `"${student.studentName}"`,
      `"${student.studentEmail || 'N/A'}"`,
      student.mathScore?.toString() || 'N/A',
      student.scienceScore?.toString() || 'N/A',
      student.readingScore?.toString() || 'N/A',
      student.writingScore?.toString() || 'N/A',
      `"${student.overallGrade || 'N/A'}"`,
      `"${student.lastUpdated}"`,
      `"${student.notes || ''}"`
    ].join(','))
  ];

  const csvContent = csvRows.join('\n');
  
  // Create and trigger download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${classData.name}_grades_${exportData.exportDate}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
};

export const getGradesSummary = (classData: Class): {
  totalStudents: number;
  averageGrade: string;
  lastUpdated: string;
} => {
  const mockGrades = generateMockGrades(classData.students);
  const scores = mockGrades.map(g => (g.mathScore || 0) + (g.scienceScore || 0) + (g.readingScore || 0) + (g.writingScore || 0)).filter(s => s > 0);
  const averageScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length / 4 : 0;
  
  let averageGrade = 'N/A';
  if (averageScore >= 90) averageGrade = 'A';
  else if (averageScore >= 80) averageGrade = 'B';
  else if (averageScore >= 70) averageGrade = 'C';
  else if (averageScore >= 60) averageGrade = 'D';
  else if (averageScore > 0) averageGrade = 'F';

  return {
    totalStudents: classData.students.length,
    averageGrade,
    lastUpdated: new Date().toISOString().split('T')[0]
  };
};