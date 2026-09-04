export interface Class {
  id: string;
  name: string;
  grade: number;
}

export type SubjectType = 'main' | 'sub' | 'integrated';
export type SessionType = 'all' | 'morning' | 'afternoon';

export interface Subject {
  id: string;
  name: string;
  lessonsPerWeek: number;
  gradeConfigs?: Record<number, { term1?: number, term2?: number, oddWeek?: number, evenWeek?: number, customWeek?: number }>;
  type: SubjectType;
  allowDouble: boolean;
  session: SessionType;
  hasExam?: boolean;
  examDuration?: number; // 1 or 2 periods
  allowGradeOverlap?: boolean; // Cho phép trùng tiết giữa các lớp trong cùng 1 khối (VD: Tiếng Anh, Thể dục)
  maxOverlapClasses?: number; // Số lớp trùng tối đa trong cùng 1 tiết (2, 3, hoặc undefined/0 = không giới hạn/tất cả)
  bannedPeriods?: number[]; // Các tiết tránh xếp lịch
  morningPriority?: boolean; // Ưu tiên học buổi sáng
}

export interface TeacherAssignment {
  subjectId: string;
  classIds: string[];
  classLessons?: Record<string, number>; // classId -> lessonsPerWeek for this teacher
  subTopics?: Record<string, string>; // classId -> subTopic string (e.g., "Vật lý", "Hóa học", "Sinh học", "Lịch sử", "Địa lý")
  weekTypes?: Record<string, 'all' | 'odd' | 'even'>; // classId -> week assignment type
}

export interface Teacher {
  id: string;
  name: string;
  specialization?: string;
  assignments: TeacherAssignment[];
  maxLessonsPerWeek: number;
  maxLessonsPerSession: number;
  maxConsecutive: number;
  timeOff?: { day: number, session: SessionType }[];
  normalLessons?: number; // Số tiết bình thường (chính khóa / tiêu chuẩn)
  extraLessons?: number;  // Số tiết bổ sung (tăng cường / dạy thay / bổ trợ)
}

export interface ExamConfig {
  grade: number;
  midTerm1Subjects?: string[];
  finalTerm1Subjects?: string[];
  midTerm2Subjects?: string[];
  finalTerm2Subjects?: string[];
  preferredDay?: number; // 0-5 (Thứ 2 - Thứ 7)
  preferredPeriod?: number; // 0-9 (Tiết 1 - Tiết 10)
}

export interface DailyPeriodLimit {
  morning: number;
  afternoon: number;
}

export interface FixedPeriod {
  id: string;
  day: number; // 0 = Monday, 5 = Saturday
  period: number; // 0 to morningLessons + afternoonLessons - 1
  subjectId: string;
}

export interface Config {
  days: number; // e.g., 6 for Mon-Sat
  morningLessons: number;
  afternoonLessons: number;
  schoolName: string;
  appName: string;
  appSubtitle: string;
  schoolYear: string;
  currentTerm?: 'I' | 'II';
  currentWeekType?: 'all' | 'odd' | 'even' | 'custom';
  executionDate: string;
  exams: ExamConfig[];
  currentExamTerm?: 'none' | 'midTerm1' | 'finalTerm1' | 'midTerm2' | 'finalTerm2';
  gradeCounts?: Record<number, number>;
  gradePrefixes?: Record<number, string>;
  timeOff?: { day: number, session: SessionType }[];
  gradeDailyPeriods?: Record<number, DailyPeriodLimit[]>; // grade -> day -> { morning, afternoon }
  classDailyPeriods?: Record<string, DailyPeriodLimit[]>; // classId -> day -> { morning, afternoon }
  fixedPeriods?: FixedPeriod[];
  relaxConstraints?: boolean;
}

export interface TimetableSlot {
  classId: string;
  day: number; // 0 = Monday, 5 = Saturday
  period: number; // 0 to morningLessons + afternoonLessons - 1
  subjectId: string;
  teacherId: string;
  isExam?: boolean;
  subTopic?: string; // e.g., "Vật lý", "Hóa học", "Sinh học", "Lịch sử", "Địa lý"
  isFixed?: boolean;
}

export interface AppState {
  classes: Class[];
  subjects: Subject[];
  teachers: Teacher[];
  config: Config;
  timetable: TimetableSlot[];
  unassigned: any[];
}

export function getAssignmentDefaultLessons(
  subject: Subject | undefined,
  grade: number,
  weekType: 'all' | 'odd' | 'even',
  config: Config
): number {
  if (!subject) return 1;
  if (subject.gradeConfigs && subject.gradeConfigs[grade]) {
    const gConf = subject.gradeConfigs[grade];
    
    // If teacher is assigned specifically to odd week
    if (weekType === 'odd' && gConf.oddWeek !== undefined && gConf.oddWeek !== null) {
      const val = parseInt(gConf.oddWeek as any);
      if (!isNaN(val)) return val;
    }
    
    // If teacher is assigned specifically to even week
    if (weekType === 'even' && gConf.evenWeek !== undefined && gConf.evenWeek !== null) {
      const val = parseInt(gConf.evenWeek as any);
      if (!isNaN(val)) return val;
    }
    
    // Otherwise, check current term config
    const currentTerm = config?.currentTerm || 'I';
    const termConfig = currentTerm === 'I' ? gConf.term1 : gConf.term2;
    if (termConfig !== undefined && termConfig !== null) {
      const val = parseInt(termConfig as any);
      if (!isNaN(val)) return val;
    }
  }
  return subject.lessonsPerWeek || 0;
}

export function getSubjectDefaultWeekType(
  subject: Subject | undefined,
  grade: number
): 'all' | 'odd' | 'even' {
  if (!subject) return 'all';
  if (subject.gradeConfigs && subject.gradeConfigs[grade]) {
    const gConf = subject.gradeConfigs[grade];
    const hasOdd = gConf.oddWeek !== undefined && gConf.oddWeek !== null && Number(gConf.oddWeek) > 0;
    const hasEven = gConf.evenWeek !== undefined && gConf.evenWeek !== null && Number(gConf.evenWeek) > 0;
    
    if (hasOdd && !hasEven) return 'odd';
    if (hasEven && !hasOdd) return 'even';
  }
  return 'all';
}
