import { Class, Subject, Teacher, Config } from './types';

export const initialConfig: Config = {
  days: 6, // Mon-Sat
  morningLessons: 4, // 4 tiết sáng (Tiết 1 đến Tiết 4)
  afternoonLessons: 3, // 3 tiết chiều (Tiết 1 đến Tiết 3)
  schoolName: 'TRƯỜNG PTDTBT TH&THCS SUỐI LƯ',
  appName: 'TKB Smart',
  appSubtitle: 'ỨNG DỤNG SẮP XẾP THỜI KHÓA BIỂU',
  schoolYear: '2025 - 2026',
  executionDate: '23/03/2026',
  relaxConstraints: true,
  timeOff: [
    { day: 0, session: 'afternoon' }, // Chiều Thứ 2 nghỉ
    { day: 1, session: 'afternoon' }, // Chiều Thứ 3 nghỉ
    { day: 2, session: 'afternoon' }, // Chiều Thứ 4 nghỉ
    { day: 3, session: 'afternoon' }, // Chiều Thứ 5 nghỉ
    { day: 5, session: 'afternoon' }, // Chiều Thứ 7 nghỉ
  ],
  exams: [
    { grade: 6, midTerm1Subjects: [], finalTerm1Subjects: [], midTerm2Subjects: [], finalTerm2Subjects: [] },
    { grade: 7, midTerm1Subjects: [], finalTerm1Subjects: [], midTerm2Subjects: [], finalTerm2Subjects: [] },
    { grade: 8, midTerm1Subjects: [], finalTerm1Subjects: [], midTerm2Subjects: [], finalTerm2Subjects: [] },
    { grade: 9, midTerm1Subjects: [], finalTerm1Subjects: [], midTerm2Subjects: [], finalTerm2Subjects: [] },
  ],
  currentExamTerm: 'none',
  gradeCounts: { 6: 2, 7: 2, 8: 2, 9: 2 },
  gradePrefixes: { 6: 'A', 7: 'B', 8: 'C', 9: 'D' },
};

export const initialClasses: Class[] = [
  { id: 'c1', name: '6A1', grade: 6 },
  { id: 'c2', name: '6A2', grade: 6 },
  { id: 'c3', name: '7B1', grade: 7 },
  { id: 'c4', name: '7B2', grade: 7 },
  { id: 'c5', name: '8C1', grade: 8 },
  { id: 'c6', name: '8C2', grade: 8 },
  { id: 'c7', name: '9D1', grade: 9 },
  { id: 'c8', name: '9D2', grade: 9 },
];

export const initialSubjects: Subject[] = [
  { id: 's1', name: 'Toán', lessonsPerWeek: 4, type: 'main', allowDouble: true, session: 'all', hasExam: true, allowGradeOverlap: false },
  { id: 's2', name: 'Ngữ Văn', lessonsPerWeek: 4, type: 'main', allowDouble: true, session: 'all', hasExam: true, allowGradeOverlap: false },
  { id: 's3', name: 'Tiếng Anh', lessonsPerWeek: 3, type: 'main', allowDouble: false, session: 'all', hasExam: true, allowGradeOverlap: true },
  { id: 's4_1', name: 'KHTN (Lý)', lessonsPerWeek: 1, type: 'integrated', allowDouble: false, session: 'all', hasExam: true, allowGradeOverlap: true },
  { id: 's4_2', name: 'KHTN (Hóa)', lessonsPerWeek: 1, type: 'integrated', allowDouble: false, session: 'all', hasExam: true, allowGradeOverlap: true },
  { id: 's4_3', name: 'KHTN (Sinh)', lessonsPerWeek: 2, type: 'integrated', allowDouble: true, session: 'all', hasExam: true, allowGradeOverlap: true },
  { id: 's5_1', name: 'LS&ĐL (Sử)', lessonsPerWeek: 2, type: 'integrated', allowDouble: true, session: 'all', hasExam: true, allowGradeOverlap: true },
  { id: 's5_2', name: 'LS&ĐL (Địa)', lessonsPerWeek: 1, type: 'integrated', allowDouble: false, session: 'all', hasExam: true, allowGradeOverlap: true },
  { id: 's6', name: 'GDCD', lessonsPerWeek: 1, type: 'sub', allowDouble: false, session: 'all', allowGradeOverlap: true },
  { id: 's7', name: 'Thể dục', lessonsPerWeek: 2, type: 'sub', allowDouble: false, session: 'all', allowGradeOverlap: true },
  { id: 's8', name: 'Nghệ thuật', lessonsPerWeek: 2, type: 'sub', allowDouble: false, session: 'all', allowGradeOverlap: true },
  { id: 's9', name: 'Tin học', lessonsPerWeek: 2, type: 'sub', allowDouble: false, session: 'all', allowGradeOverlap: true },
  { id: 's10', name: 'Công nghệ', lessonsPerWeek: 1, type: 'sub', allowDouble: false, session: 'all', allowGradeOverlap: true },
];

export const initialTeachers: Teacher[] = [
  { id: 't1', name: 'GV Toán 1', specialization: 'Toán', assignments: [{ subjectId: 's1', classIds: ['c1', 'c2', 'c3', 'c4'] }], maxLessonsPerWeek: 20, maxLessonsPerSession: 4, maxConsecutive: 3 },
  { id: 't2', name: 'GV Toán 2', specialization: 'Toán', assignments: [{ subjectId: 's1', classIds: ['c5', 'c6', 'c7', 'c8'] }], maxLessonsPerWeek: 20, maxLessonsPerSession: 4, maxConsecutive: 3 },
  { id: 't3', name: 'GV Văn 1', specialization: 'Ngữ Văn', assignments: [{ subjectId: 's2', classIds: ['c1', 'c2', 'c3', 'c4'] }], maxLessonsPerWeek: 20, maxLessonsPerSession: 4, maxConsecutive: 3 },
  { id: 't4', name: 'GV Văn 2', specialization: 'Ngữ Văn', assignments: [{ subjectId: 's2', classIds: ['c5', 'c6', 'c7', 'c8'] }], maxLessonsPerWeek: 20, maxLessonsPerSession: 4, maxConsecutive: 3 },
  { id: 't5', name: 'GV Anh 1', specialization: 'Tiếng Anh', assignments: [{ subjectId: 's3', classIds: ['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8'] }], maxLessonsPerWeek: 24, maxLessonsPerSession: 4, maxConsecutive: 3 },
  { id: 't6_1', name: 'GV KHTN (Lý)', specialization: 'Vật Lý', assignments: [{ subjectId: 's4_1', classIds: ['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8'] }], maxLessonsPerWeek: 32, maxLessonsPerSession: 4, maxConsecutive: 3 },
  { id: 't6_2', name: 'GV KHTN (Hóa)', specialization: 'Hóa Học', assignments: [{ subjectId: 's4_2', classIds: ['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8'] }], maxLessonsPerWeek: 32, maxLessonsPerSession: 4, maxConsecutive: 3 },
  { id: 't6_3', name: 'GV KHTN (Sinh)', specialization: 'Sinh Học', assignments: [{ subjectId: 's4_3', classIds: ['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8'] }], maxLessonsPerWeek: 32, maxLessonsPerSession: 4, maxConsecutive: 3 },
  { id: 't7_1', name: 'GV LS&ĐL (Sử)', specialization: 'Lịch Sử', assignments: [{ subjectId: 's5_1', classIds: ['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8'] }], maxLessonsPerWeek: 24, maxLessonsPerSession: 4, maxConsecutive: 3 },
  { id: 't7_2', name: 'GV LS&ĐL (Địa)', specialization: 'Địa Lý', assignments: [{ subjectId: 's5_2', classIds: ['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8'] }], maxLessonsPerWeek: 24, maxLessonsPerSession: 4, maxConsecutive: 3 },
  { id: 't8', name: 'GV Phụ 1', specialization: 'GDCD', assignments: [{ subjectId: 's6', classIds: ['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8'] }], maxLessonsPerWeek: 20, maxLessonsPerSession: 4, maxConsecutive: 3 },
  { id: 't9', name: 'GV Phụ 2', specialization: 'Thể dục', assignments: [{ subjectId: 's7', classIds: ['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8'] }], maxLessonsPerWeek: 20, maxLessonsPerSession: 4, maxConsecutive: 3 },
  { id: 't10', name: 'GV Phụ 3', specialization: 'Nghệ thuật', assignments: [{ subjectId: 's8', classIds: ['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8'] }], maxLessonsPerWeek: 20, maxLessonsPerSession: 4, maxConsecutive: 3 },
  { id: 't11', name: 'GV Phụ 4', specialization: 'Tin học', assignments: [{ subjectId: 's9', classIds: ['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8'] }], maxLessonsPerWeek: 20, maxLessonsPerSession: 4, maxConsecutive: 3 },
  { id: 't12', name: 'GV Phụ 5', specialization: 'Công nghệ', assignments: [{ subjectId: 's10', classIds: ['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8'] }], maxLessonsPerWeek: 20, maxLessonsPerSession: 4, maxConsecutive: 3 },
];
