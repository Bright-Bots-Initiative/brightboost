import { Class, Student } from "../components/TeacherDashboard/types";

// STEM-1 specific quest data structure
export interface STEM1Quest {
  id: string;
  name: string;
  description: string;
  maxXP: number;
  requiredScore: number; // 70% minimum
}

export interface STEM1StudentProgress {
  studentId: string;
  studentName: string;
  studentEmail?: string;

  // Core Quests Progress
  matterMixUp: {
    completed: boolean;
    quizScore: number; // out of 5 questions
    xpEarned: number;
    completedDate?: string;
  };

  forceFunLand: {
    completed: boolean;
    simulationScore: number; // percentage
    xpEarned: number;
    completedDate?: string;
  };

  codeAPathJr: {
    completed: boolean;
    blocksUsed: number; // max 4 blocks
    hintsUsed: number;
    xpEarned: number;
    completedDate?: string;
  };

  showTellSprint: {
    completed: boolean;
    reflectionUploaded: boolean;
    reflectionDuration: number; // in seconds, target 20
    xpEarned: number;
    completedDate?: string;
  };

  // Overall Progress
  totalXP: number; // out of 500
  badgesEarned: number; // out of 4
  dailyStreak: number;
  overallCompletion: number; // percentage
  passedSTEM1: boolean; // 70% completion + all reflections
  lastActivity: string;
  notes?: string;
}

// STEM-1 Quest definitions
export const STEM1_QUESTS: STEM1Quest[] = [
  {
    id: "matter-mix-up",
    name: "Matter Mix-Up",
    description: "Sort solids, liquids, and gases → 5-question quiz",
    maxXP: 125,
    requiredScore: 70,
  },
  {
    id: "force-fun-land",
    name: "Force Fun-Land Lite",
    description: "Pinball sim to explore pushes & pulls",
    maxXP: 125,
    requiredScore: 70,
  },
  {
    id: "code-a-path-jr",
    name: "Code-A-Path Jr.",
    description: "Blockly maze, max 4 blocks, hint after 2 fails",
    maxXP: 125,
    requiredScore: 70,
  },
  {
    id: "show-tell-sprint",
    name: "Show & Tell Sprint",
    description: "Build a straw maze, upload 20-sec reflection",
    maxXP: 125,
    requiredScore: 70,
  },
];

// Mock data generator for STEM-1 progress
const generateMockSTEM1Progress = (
  students: Student[]
): STEM1StudentProgress[] => {
  return students.map((student) => {
    const matterScore = Math.floor(Math.random() * 3) + 3; // 3-5 out of 5
    const forceScore = Math.floor(Math.random() * 30) + 70; // 70-100%
    const codeBlocks = Math.floor(Math.random() * 4) + 1; // 1-4 blocks
    const reflectionDuration = Math.floor(Math.random() * 10) + 15; // 15-25 seconds

    const matterXP =
      matterScore >= 4 ? 125 : Math.floor((matterScore / 5) * 125);
    const forceXP =
      forceScore >= 70 ? 125 : Math.floor((forceScore / 100) * 125);
    const codeXP = codeBlocks <= 4 ? 125 : Math.floor(125 * 0.8); // Penalty for using too many blocks
    const showTellXP =
      reflectionDuration >= 15 ? 125 : Math.floor(125 * 0.6);

    const totalXP = matterXP + forceXP + codeXP + showTellXP;
    const badgesEarned = [matterXP, forceXP, codeXP, showTellXP].filter(
      (xp) => xp >= 87.5
    ).length; // 70% of 125
    const overallCompletion = (totalXP / 500) * 100;
    const passedSTEM1 = overallCompletion >= 70 && reflectionDuration >= 15;

    return {
      studentId: student.id,
      studentName: student.name,
      studentEmail: student.email,

      matterMixUp: {
        completed: matterScore >= 4,
        quizScore: matterScore,
        xpEarned: matterXP,
        completedDate:
          matterScore >= 4
            ? new Date(
                Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000
              )
                .toISOString()
                .split("T")[0]
            : undefined,
      },

      forceFunLand: {
        completed: forceScore >= 70,
        simulationScore: forceScore,
        xpEarned: forceXP,
        completedDate:
          forceScore >= 70
            ? new Date(
                Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000
              )
                .toISOString()
                .split("T")[0]
            : undefined,
      },

      codeAPathJr: {
        completed: codeBlocks <= 4,
        blocksUsed: codeBlocks,
        hintsUsed: Math.floor(Math.random() * 3), // 0-2 hints
        xpEarned: codeXP,
        completedDate:
          codeBlocks <= 4
            ? new Date(
                Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000
              )
                .toISOString()
                .split("T")[0]
            : undefined,
      },

      showTellSprint: {
        completed: reflectionDuration >= 15,
        reflectionUploaded: reflectionDuration >= 15,
        reflectionDuration,
        xpEarned: showTellXP,
        completedDate:
          reflectionDuration >= 15
            ? new Date(
                Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000
              )
                .toISOString()
                .split("T")[0]
            : undefined,
      },

      totalXP,
      badgesEarned,
      dailyStreak: Math.floor(Math.random() * 14) + 1, // 1-14 days
      overallCompletion: Math.round(overallCompletion),
      passedSTEM1,
      lastActivity: new Date(
        Date.now() - Math.random() * 3 * 24 * 60 * 60 * 1000
      )
        .toISOString()
        .split("T")[0],
      notes:
        Math.random() > 0.7
          ? "Excellent engagement with STEM concepts!"
          : undefined,
    };
  });
};

export interface STEM1ExportData {
  className: string;
  grade?: string;
  exportDate: string;
  teacherName: string;
  totalStudents: number;
  studentsPassedSTEM1: number;
  averageXP: number;
  averageCompletion: number;
  students: STEM1StudentProgress[];
}

export const exportSTEM1GradesToCSV = async (
  classData: Class,
  teacherName: string = "Teacher"
): Promise<void> => {
  const studentProgress = generateMockSTEM1Progress(classData.students);

  const exportData: STEM1ExportData = {
    className: classData.name,
    grade: classData.grade,
    exportDate: new Date().toISOString().split("T")[0],
    teacherName,
    totalStudents: classData.students.length,
    studentsPassedSTEM1: studentProgress.filter((s) => s.passedSTEM1).length,
    averageXP: Math.round(
      studentProgress.reduce((sum, s) => sum + s.totalXP, 0) /
        studentProgress.length
    ),
    averageCompletion: Math.round(
      studentProgress.reduce((sum, s) => sum + s.overallCompletion, 0) /
        studentProgress.length
    ),
    students: studentProgress,
  };

  // Create comprehensive CSV with STEM-1 specific columns
  const headers = [
    "Student ID",
    "Student Name",
    "Email",
    "Total XP (500 max)",
    "Overall Completion %",
    "Badges Earned (4 max)",
    "Daily Streak",
    "STEM-1 Status",

    // Matter Mix-Up Quest
    "Matter Mix-Up Completed",
    "Matter Quiz Score (5 max)",
    "Matter XP Earned",
    "Matter Completion Date",

    // Force Fun-Land Quest
    "Force Fun-Land Completed",
    "Force Simulation Score %",
    "Force XP Earned",
    "Force Completion Date",

    // Code-A-Path Jr Quest
    "Code-A-Path Completed",
    "Blocks Used (4 max)",
    "Hints Used",
    "Code XP Earned",
    "Code Completion Date",

    // Show & Tell Sprint Quest
    "Show & Tell Completed",
    "Reflection Uploaded",
    "Reflection Duration (sec)",
    "Show & Tell XP Earned",
    "Show & Tell Completion Date",

    "Last Activity",
    "Notes",
  ];

  const csvRows = [
    headers.join(","),
    ...exportData.students.map((student) =>
      [
        `"${student.studentId}"`,
        `"${student.studentName}"`,
        `"${student.studentEmail || "N/A"}"`,
        student.totalXP.toString(),
        `${student.overallCompletion}%`,
        student.badgesEarned.toString(),
        student.dailyStreak.toString(),
        `"${student.passedSTEM1 ? "PASSED" : "IN PROGRESS"}"`,

        // Matter Mix-Up
        student.matterMixUp.completed ? "YES" : "NO",
        student.matterMixUp.quizScore.toString(),
        student.matterMixUp.xpEarned.toString(),
        `"${student.matterMixUp.completedDate || "Not Completed"}"`,

        // Force Fun-Land
        student.forceFunLand.completed ? "YES" : "NO",
        `${student.forceFunLand.simulationScore}%`,
        student.forceFunLand.xpEarned.toString(),
        `"${student.forceFunLand.completedDate || "Not Completed"}"`,

        // Code-A-Path Jr
        student.codeAPathJr.completed ? "YES" : "NO",
        student.codeAPathJr.blocksUsed.toString(),
        student.codeAPathJr.hintsUsed.toString(),
        student.codeAPathJr.xpEarned.toString(),
        `"${student.codeAPathJr.completedDate || "Not Completed"}"`,

        // Show & Tell Sprint
        student.showTellSprint.completed ? "YES" : "NO",
        student.showTellSprint.reflectionUploaded ? "YES" : "NO",
        student.showTellSprint.reflectionDuration.toString(),
        student.showTellSprint.xpEarned.toString(),
        `"${student.showTellSprint.completedDate || "Not Completed"}"`,

        `"${student.lastActivity}"`,
        `"${student.notes || ""}"`,
      ].join(",")
    ),
  ];

  const csvContent = csvRows.join("\n");

  // Create and trigger download
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");

  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `STEM1_${classData.name}_Progress_${exportData.exportDate}.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
};

export const getSTEM1Summary = (
  classData: Class
): {
  totalStudents: number;
  studentsPassedSTEM1: number;
  averageXP: number;
  averageCompletion: number;
  lastUpdated: string;
} => {
  const mockProgress = generateMockSTEM1Progress(classData.students);

  return {
    totalStudents: classData.students.length,
    studentsPassedSTEM1: mockProgress.filter((s) => s.passedSTEM1).length,
    averageXP:
      mockProgress.length > 0
        ? Math.round(
            mockProgress.reduce((sum, s) => sum + s.totalXP, 0) /
              mockProgress.length
          )
        : 0,
    averageCompletion:
      mockProgress.length > 0
        ? Math.round(
            mockProgress.reduce((sum, s) => sum + s.overallCompletion, 0) /
              mockProgress.length
          )
        : 0,
    lastUpdated: new Date().toISOString().split("T")[0],
  };
};
