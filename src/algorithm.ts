import { Class, Subject, Teacher, Config, TimetableSlot, getAssignmentDefaultLessons, getSubjectDefaultWeekType, DailyPeriodLimit } from './types';

export function getDailyPeriodsForClass(
  cls: Class,
  day: number,
  config: Config
): { morning: number; afternoon: number } {
  if (config.classDailyPeriods && config.classDailyPeriods[cls.id] && config.classDailyPeriods[cls.id][day] !== undefined) {
    const lim = config.classDailyPeriods[cls.id][day];
    return {
      morning: lim.morning ?? config.morningLessons,
      afternoon: lim.afternoon ?? config.afternoonLessons,
    };
  }
  if (config.gradeDailyPeriods && config.gradeDailyPeriods[cls.grade] && config.gradeDailyPeriods[cls.grade][day] !== undefined) {
    const lim = config.gradeDailyPeriods[cls.grade][day];
    return {
      morning: lim.morning ?? config.morningLessons,
      afternoon: lim.afternoon ?? config.afternoonLessons,
    };
  }
  return {
    morning: config.morningLessons,
    afternoon: config.afternoonLessons,
  };
}

export function calculateClassRequiredLessons(
  classes: Class[],
  subjects: Subject[],
  teachers: Teacher[],
  config: Config
): Record<string, number> {
  const currentTerm = config.currentTerm || 'I';
  const currentWeekType = config.currentWeekType || 'all';

  const getSubjectLessons = (subject: Subject, grade: number): number => {
    if (subject.gradeConfigs && subject.gradeConfigs[grade]) {
      const gConf = subject.gradeConfigs[grade];
      if (currentWeekType === 'custom' && gConf.customWeek !== undefined && gConf.customWeek !== null && gConf.customWeek >= 0) {
        return gConf.customWeek;
      }
      if (currentWeekType === 'odd' && gConf.oddWeek !== undefined && gConf.oddWeek !== null && gConf.oddWeek >= 0) {
        return gConf.oddWeek;
      }
      if (currentWeekType === 'even' && gConf.evenWeek !== undefined && gConf.evenWeek !== null && gConf.evenWeek >= 0) {
        return gConf.evenWeek;
      }
      const termConfig = currentTerm === 'I' ? gConf.term1 : gConf.term2;
      if (termConfig !== undefined && termConfig !== null) return termConfig;
    }
    return subject.lessonsPerWeek || 0;
  };

  const req: Record<string, number> = {};

  for (const cls of classes) {
    let total = 0;
    for (const sub of subjects) {
      const clsLessonsPerWeek = getSubjectLessons(sub, cls.grade);
      if (clsLessonsPerWeek <= 0) continue;

      const assignedTeacherInfos: Array<{ allocatedLessons: number }> = [];

      for (const t of teachers) {
        for (const a of t.assignments) {
          if (a.subjectId === sub.id && a.classIds.includes(cls.id)) {
            const alloc = a.classLessons?.[cls.id];
            const wType = a.weekTypes?.[cls.id] || getSubjectDefaultWeekType(sub, cls.grade);

            if (currentWeekType === 'odd' && wType === 'even') continue;
            if (currentWeekType === 'even' && wType === 'odd') continue;

            const finalLessons = alloc !== undefined && alloc !== null && alloc >= 0
              ? alloc
              : getAssignmentDefaultLessons(sub, cls.grade, wType, config);

            assignedTeacherInfos.push({ allocatedLessons: finalLessons });
          }
        }
      }

      if (assignedTeacherInfos.length === 0) {
        total += clsLessonsPerWeek;
      } else {
        let totalExplicit = 0;
        let unassignedTeachersCount = 0;
        assignedTeacherInfos.forEach(info => {
          if (info.allocatedLessons >= 0) {
            totalExplicit += info.allocatedLessons;
          } else {
            unassignedTeachersCount++;
          }
        });

        let defaultPerTeacher = 0;
        if (unassignedTeachersCount > 0) {
          const remainingLessons = Math.max(0, clsLessonsPerWeek - totalExplicit);
          defaultPerTeacher = Math.floor(remainingLessons / unassignedTeachersCount);
        }

        const counts = assignedTeacherInfos.map(info => info.allocatedLessons >= 0 ? info.allocatedLessons : defaultPerTeacher);
        total += counts.reduce((a, b) => a + b, 0);
      }
    }
    req[cls.id] = total;
  }
  return req;
}

export interface AutoOptimizeResult {
  newConfig: Config;
  classRequiredLessons: Record<string, number>;
  adjustedSummary: {
    classId: string;
    className: string;
    grade: number;
    required: number;
    oldCapacity: number;
    newCapacity: number;
  }[];
}

export function autoOptimizeClassDailyPeriods(
  classes: Class[],
  subjects: Subject[],
  teachers: Teacher[],
  config: Config
): AutoOptimizeResult {
  const req = calculateClassRequiredLessons(classes, subjects, teachers, config);
  const numDays = config.days || 6;
  const daysList = Array.from({ length: numDays }, (_, i) => i);

  const isSchoolOff = (day: number, session: 'morning' | 'afternoon'): boolean => {
    if (!config.timeOff) return false;
    return config.timeOff.some(off => off.day === day && (off.session === 'all' || off.session === session));
  };

  const newClassDailyPeriods: Record<string, DailyPeriodLimit[]> = { ...(config.classDailyPeriods || {}) };
  const newGradeDailyPeriods: Record<number, DailyPeriodLimit[]> = { ...(config.gradeDailyPeriods || {}) };

  let maxMorningFound = Math.max(config.morningLessons || 5, 5);
  let maxAfternoonFound = Math.max(config.afternoonLessons || 3, 3);

  const adjustedSummary: AutoOptimizeResult['adjustedSummary'] = [];

  const grades = Array.from(new Set(classes.map(c => c.grade))).sort();

  for (const grade of grades) {
    const gradeClasses = classes.filter(c => c.grade === grade);
    if (gradeClasses.length === 0) continue;

    const reqs = gradeClasses.map(c => req[c.id] || 0);
    const maxReq = Math.max(...reqs, 0);

    const calculateSchedule = (targetLessons: number): DailyPeriodLimit[] => {
      const openMorningDays = daysList.filter(d => !isSchoolOff(d, 'morning'));
      const openAfternoonDays = daysList.filter(d => !isSchoolOff(d, 'afternoon') && d !== 5);

      const schedule: DailyPeriodLimit[] = daysList.map(() => ({ morning: 0, afternoon: 0 }));
      if (targetLessons <= 0) return schedule;

      // Check if Saturday morning is open
      const hasSaturdayMorning = openMorningDays.includes(5);
      const weekdayMornings = openMorningDays.filter(d => d !== 5);

      // Strategy 1: If can fit entirely in mornings with 4 periods:
      if (targetLessons <= openMorningDays.length * 4) {
        let rem = targetLessons;
        for (const d of openMorningDays) {
          if (rem <= 0) break;
          const alloc = Math.min(4, rem);
          schedule[d].morning = alloc;
          rem -= alloc;
        }
        return schedule;
      }

      // Strategy 2: If can fit entirely in mornings with up to 5 periods:
      if (targetLessons <= (weekdayMornings.length * 5 + (hasSaturdayMorning ? 4 : 0))) {
        // First allocate 4 to all open mornings
        let rem = targetLessons;
        for (const d of openMorningDays) {
          schedule[d].morning = 4;
          rem -= 4;
        }
        // Distribute extra 5th period to weekday mornings
        for (const d of weekdayMornings) {
          if (rem <= 0) break;
          schedule[d].morning = 5;
          rem--;
        }
        return schedule;
      }

      // Strategy 3: Target lessons > morning capacity (e.g. 26 to 32 lessons)
      // Max out weekday mornings to 5 periods, and Saturday morning to 4 (if open)
      let morningTotal = 0;
      for (const d of weekdayMornings) {
        schedule[d].morning = 5;
        morningTotal += 5;
      }
      if (hasSaturdayMorning) {
        schedule[5].morning = 4;
        morningTotal += 4;
      }

      let remainingAfternoon = targetLessons - morningTotal;

      // Preferred afternoons: T3 (1), T5 (3), T4 (2), T6 (4), T2 (0)
      const preferredAfternoonOrder = [1, 3, 2, 4, 0].filter(d => openAfternoonDays.includes(d));

      for (const d of preferredAfternoonOrder) {
        if (remainingAfternoon <= 0) break;
        const alloc = Math.min(3, remainingAfternoon);
        schedule[d].afternoon = alloc;
        remainingAfternoon -= alloc;
      }

      if (remainingAfternoon > 0) {
        for (const d of preferredAfternoonOrder) {
          if (remainingAfternoon <= 0) break;
          if (schedule[d].afternoon < 4) {
            const add = Math.min(4 - schedule[d].afternoon, remainingAfternoon);
            schedule[d].afternoon += add;
            remainingAfternoon -= add;
          }
        }
      }

      return schedule;
    };

    const gradeSchedule = calculateSchedule(maxReq);
    newGradeDailyPeriods[grade] = gradeSchedule;

    for (const cls of gradeClasses) {
      const clsReq = req[cls.id] || 0;
      let oldCap = 0;
      for (let d = 0; d < numDays; d++) {
        const lim = getDailyPeriodsForClass(cls, d, config);
        if (!isSchoolOff(d, 'morning')) oldCap += lim.morning;
        if (!isSchoolOff(d, 'afternoon')) oldCap += lim.afternoon;
      }

      let clsSchedule: DailyPeriodLimit[];
      if (clsReq === maxReq) {
        clsSchedule = gradeSchedule;
        delete newClassDailyPeriods[cls.id];
      } else {
        clsSchedule = calculateSchedule(clsReq);
        newClassDailyPeriods[cls.id] = clsSchedule;
      }

      let newCap = 0;
      for (let d = 0; d < numDays; d++) {
        newCap += clsSchedule[d].morning + clsSchedule[d].afternoon;
        if (clsSchedule[d].morning > maxMorningFound) maxMorningFound = clsSchedule[d].morning;
        if (clsSchedule[d].afternoon > maxAfternoonFound) maxAfternoonFound = clsSchedule[d].afternoon;
      }

      if (oldCap !== newCap || oldCap < clsReq) {
        adjustedSummary.push({
          classId: cls.id,
          className: cls.name,
          grade: cls.grade,
          required: clsReq,
          oldCapacity: oldCap,
          newCapacity: newCap,
        });
      }
    }
  }

  const newConfig: Config = {
    ...config,
    classDailyPeriods: newClassDailyPeriods,
    gradeDailyPeriods: newGradeDailyPeriods,
    morningLessons: Math.max(5, maxMorningFound),
    afternoonLessons: Math.max(3, maxAfternoonFound),
  };

  return {
    newConfig,
    classRequiredLessons: req,
    adjustedSummary,
  };
}

export interface LessonToSchedule {
  classId: string;
  subjectId: string;
  teacherId: string;
  type: string;
  isDouble: boolean;
  session: string;
  isExam?: boolean;
  subTopic?: string;
  reason?: string;
}

export function generateTimetable(
  classes: Class[],
  subjects: Subject[],
  teachers: Teacher[],
  config: Config
): { slots: TimetableSlot[], unassigned: LessonToSchedule[], autoAdjustedConfig?: Config } {
  // 0. Auto-check and optimize class daily periods if capacity is mismatched
  const classReq = calculateClassRequiredLessons(classes, subjects, teachers, config);
  const numDays = config.days || 6;
  let hasCapacityDeficit = false;

  for (const cls of classes) {
    const required = classReq[cls.id] || 0;
    let cap = 0;
    for (let d = 0; d < numDays; d++) {
      const isMOff = config.timeOff?.some(off => off.day === d && (off.session === 'all' || off.session === 'morning'));
      const isAOff = config.timeOff?.some(off => off.day === d && (off.session === 'all' || off.session === 'afternoon'));
      const lim = getDailyPeriodsForClass(cls, d, config);
      if (!isMOff) cap += lim.morning;
      if (!isAOff) cap += lim.afternoon;
    }
    if (cap < required) {
      hasCapacityDeficit = true;
      break;
    }
  }

  let effectiveConfig = config;
  let autoAdjustedConfig: Config | undefined = undefined;

  if (hasCapacityDeficit) {
    const opt = autoOptimizeClassDailyPeriods(classes, subjects, teachers, config);
    effectiveConfig = opt.newConfig;
    autoAdjustedConfig = opt.newConfig;
  }

  config = effectiveConfig;

  const slots: TimetableSlot[] = [];
  const unassigned: LessonToSchedule[] = [];
  const totalPeriods = config.morningLessons + config.afternoonLessons;

  // Helper to get exam subjects for a grade based on config
  const getExamSubjectsForGrade = (grade: number): Subject[] => {
    const gradeExamConfig = (config.exams || []).find(e => e.grade === grade);
    const examTerm = config.currentExamTerm || 'none';
    if (examTerm === 'none' || !gradeExamConfig) return [];
    
    const subjectsKey = `${examTerm}Subjects` as keyof typeof gradeExamConfig;
    const selectedIds = gradeExamConfig[subjectsKey] as string[] | undefined;

    if (selectedIds && selectedIds.length > 0) {
      return subjects.filter(s => selectedIds.includes(s.id));
    }

    const examCount = (gradeExamConfig[examTerm as keyof typeof gradeExamConfig] as number) || 0;
    if (examCount <= 0) return [];

    const availableExamSubjects = subjects
      .filter(s => s.hasExam)
      .sort((a, b) => {
        const typeOrder = { main: 0, integrated: 1, sub: 2 };
        if (a.type !== b.type) {
          return typeOrder[a.type as keyof typeof typeOrder] - typeOrder[b.type as keyof typeof typeOrder];
        }
        return a.name.localeCompare(b.name);
      });

    let currentExamPeriods = 0;
    const examSubjects: Subject[] = [];
    for (const s of availableExamSubjects) {
      const duration = s.examDuration || 1;
      if (currentExamPeriods + duration <= examCount) {
        examSubjects.push(s);
        currentExamPeriods += duration;
      }
    }
    return examSubjects;
  };

  // 1. Generate all required lessons
  let lessons: LessonToSchedule[] = [];
  
  const currentTerm = config.currentTerm || 'I';
  const currentWeekType = config.currentWeekType || 'all';

  const getSubjectLessons = (subject: Subject, grade: number): number => {
    if (subject.gradeConfigs && subject.gradeConfigs[grade]) {
      const gConf = subject.gradeConfigs[grade];
      if (currentWeekType === 'custom' && gConf.customWeek !== undefined && gConf.customWeek !== null && gConf.customWeek >= 0) {
        return gConf.customWeek;
      }
      if (currentWeekType === 'odd' && gConf.oddWeek !== undefined && gConf.oddWeek !== null && gConf.oddWeek >= 0) {
        return gConf.oddWeek;
      }
      if (currentWeekType === 'even' && gConf.evenWeek !== undefined && gConf.evenWeek !== null && gConf.evenWeek >= 0) {
        return gConf.evenWeek;
      }
      const termConfig = currentTerm === 'I' ? gConf.term1 : gConf.term2;
      if (termConfig !== undefined && termConfig !== null) return termConfig;
    }
    return subject.lessonsPerWeek || 0;
  };

  for (const cls of classes) {
    const examSubjects = getExamSubjectsForGrade(cls.grade);
    
    for (const sub of subjects) {
      const clsLessonsPerWeek = getSubjectLessons(sub, cls.grade);
      
      if (clsLessonsPerWeek <= 0) continue;

      // Find ALL teachers assigned to this class for this subject
      const assignedTeacherInfos: Array<{
        teacher: Teacher;
        assignment: any;
        allocatedLessons: number;
        subTopic?: string;
        weekType?: 'all' | 'odd' | 'even';
      }> = [];

      for (const t of teachers) {
        for (const a of t.assignments) {
          if (a.subjectId === sub.id && a.classIds.includes(cls.id)) {
            const alloc = a.classLessons?.[cls.id];
            const subTop = a.subTopics?.[cls.id];
            const wType = a.weekTypes?.[cls.id] || getSubjectDefaultWeekType(sub, cls.grade);

            if (currentWeekType === 'odd' && wType === 'even') continue;
            if (currentWeekType === 'even' && wType === 'odd') continue;

            const finalLessons = alloc !== undefined && alloc !== null && alloc >= 0
              ? alloc
              : getAssignmentDefaultLessons(sub, cls.grade, wType, config);

            assignedTeacherInfos.push({
              teacher: t,
              assignment: a,
              allocatedLessons: finalLessons,
              subTopic: subTop,
              weekType: wType,
            });
          }
        }
      }

      if (assignedTeacherInfos.length === 0) {
        for (let i = 0; i < clsLessonsPerWeek; i++) {
          unassigned.push({
            classId: cls.id,
            subjectId: sub.id,
            teacherId: 'none',
            type: sub.type,
            isDouble: false,
            session: sub.session,
            reason: 'Chưa phân công giáo viên'
          });
        }
        continue;
      }

      // Calculate lesson count for each assigned teacher
      let totalExplicit = 0;
      let unassignedTeachersCount = 0;

      assignedTeacherInfos.forEach(info => {
        if (info.allocatedLessons >= 0) {
          totalExplicit += info.allocatedLessons;
        } else {
          unassignedTeachersCount++;
        }
      });

      let defaultPerTeacher = 0;
      if (unassignedTeachersCount > 0) {
        const remainingLessons = Math.max(0, clsLessonsPerWeek - totalExplicit);
        defaultPerTeacher = Math.floor(remainingLessons / unassignedTeachersCount);
      }

      const finalTeacherList = assignedTeacherInfos.map(info => {
        const count = info.allocatedLessons >= 0 ? info.allocatedLessons : defaultPerTeacher;
        return { ...info, count };
      }).filter(item => item.count > 0);

      if (finalTeacherList.length === 0) {
        for (let i = 0; i < clsLessonsPerWeek; i++) {
          unassigned.push({
            classId: cls.id,
            subjectId: sub.id,
            teacherId: 'none',
            type: sub.type,
            isDouble: false,
            session: sub.session,
            reason: 'Chưa đủ định mức tiết phân công'
          });
        }
        continue;
      }

      let isFirstLessonForSubject = true;
      const isSubjectExam = examSubjects.some(es => es.id === sub.id);

      for (const tInfo of finalTeacherList) {
        let remaining = tInfo.count;
        const teacherId = tInfo.teacher.id;
        const subTopic = tInfo.subTopic;

        while (remaining > 0) {
          let isExam = false;
          let isExamDouble = false;
          if (isSubjectExam && isFirstLessonForSubject) {
            isExam = true;
            isFirstLessonForSubject = false;
            if ((sub.examDuration || 1) === 2 && remaining >= 2) {
              isExamDouble = true;
            }
          }

          if (isExamDouble) {
            lessons.push({ classId: cls.id, subjectId: sub.id, teacherId, type: sub.type, isDouble: true, session: sub.session, isExam: true, subTopic });
            remaining -= 2;
          } else if (sub.allowDouble && remaining >= 2 && !isExam) {
            lessons.push({ classId: cls.id, subjectId: sub.id, teacherId, type: sub.type, isDouble: true, session: sub.session, isExam: false, subTopic });
            remaining -= 2;
          } else {
            lessons.push({ classId: cls.id, subjectId: sub.id, teacherId, type: sub.type, isDouble: false, session: sub.session, isExam, subTopic });
            remaining -= 1;
          }
        }
      }
    }
  }

  // 2. Count teacher loads
  const teacherLoad: Record<string, number> = {};
  for (const l of lessons) {
    if (l.teacherId && l.teacherId !== 'none') {
      teacherLoad[l.teacherId] = (teacherLoad[l.teacherId] || 0) + (l.isDouble ? 2 : 1);
    }
  }

  // Sort lessons: Exams first, then heavy teachers, then double lessons, then type
  lessons.sort((a, b) => {
    if (a.isExam && !b.isExam) return -1;
    if (!a.isExam && b.isExam) return 1;

    const loadA = teacherLoad[a.teacherId] || 0;
    const loadB = teacherLoad[b.teacherId] || 0;
    
    // Extremely busy teachers (>= 20 lessons) MUST be scheduled first to avoid conflicts
    if (loadA >= 20 || loadB >= 20) {
      if (loadA !== loadB) return loadB - loadA;
    }

    // Sort by teacher load first. Only group by type if load difference is small
    if (Math.abs(loadB - loadA) > 2) {
       return loadB - loadA;
    }

    const typeOrder = { main: 0, integrated: 1, sub: 2 };
    if (typeOrder[a.type as keyof typeof typeOrder] !== typeOrder[b.type as keyof typeof typeOrder]) {
      return typeOrder[a.type as keyof typeof typeOrder] - typeOrder[b.type as keyof typeof typeOrder];
    }
    
    if (loadA !== loadB) return loadB - loadA;

    if (a.isDouble && !b.isDouble) return -1;
    if (!a.isDouble && b.isDouble) return 1;
    return 0;
  });

  // State maps
  const classSchedule: Record<string, Record<number, Record<number, string>>> = {};
  const teacherSchedule: Record<string, Record<number, Record<number, string>>> = {};
  const classSubjectDays: Record<string, Record<string, Set<number>>> = {};
  const teacherDailyCount: Record<string, Record<number, number>> = {};
  const gradeSubjectExamSlot: Record<number, Record<string, { day: number, period: number }>> = {};

  for (const cls of classes) {
    classSchedule[cls.id] = {};
    classSubjectDays[cls.id] = {};
    for (let d = 0; d < config.days; d++) classSchedule[cls.id][d] = {};
    for (const sub of subjects) classSubjectDays[cls.id][sub.id] = new Set();
  }
  for (const t of teachers) {
    teacherSchedule[t.id] = {};
    teacherDailyCount[t.id] = {};
    for (let d = 0; d < config.days; d++) {
      teacherSchedule[t.id][d] = {};
      teacherDailyCount[t.id][d] = 0;
    }
  }

  const teacherSubjects: Record<string, Set<string>> = {};
  for (const t of teachers) {
    teacherSubjects[t.id] = new Set(t.assignments.map(a => a.subjectId));
  }

  const isSchoolOff = (day: number, period: number): boolean => {
    if (!config.timeOff) return false;
    const session = period < config.morningLessons ? 'morning' : 'afternoon';
    return config.timeOff.some(off => off.day === day && (off.session === 'all' || off.session === session));
  };

  const isTeacherOff = (teacherId: string, day: number, period: number): boolean => {
    const teacher = teachers.find(t => t.id === teacherId);
    if (!teacher || !teacher.timeOff) return false;
    const session = period < config.morningLessons ? 'morning' : 'afternoon';
    return teacher.timeOff.some(off => off.day === day && (off.session === 'all' || off.session === session));
  };

  const isTeacherOccupiedAtAll = (teacherId: string, day: number, period: number): boolean => {
    if (teacherId === 'none') return false;
    return slots.some(s => s.teacherId === teacherId && s.day === day && s.period === period);
  };

  const isTeacherBusyForClass = (
    teacherId: string,
    day: number,
    period: number,
    classId: string,
    subjectId: string,
    relaxConstraints: boolean = false
  ): boolean => {
    if (teacherId === 'none') return false;
    if (isTeacherOff(teacherId, day, period)) return true;

    const activeSlots = slots.filter(s => s.teacherId === teacherId && s.day === day && s.period === period && s.classId !== classId);
    if (activeSlots.length === 0) return false;

    const cls = classes.find(c => c.id === classId);
    if (!cls) return true;

    const sub = subjects.find(s => s.id === subjectId);
    const allowGradeOverlap = sub?.allowGradeOverlap !== false;

    if (!allowGradeOverlap) {
      return true;
    }

    const hasConflict = activeSlots.some(s => {
      const otherCls = classes.find(c => c.id === s.classId);
      return !otherCls || otherCls.grade !== cls.grade || s.subjectId !== subjectId;
    });

    if (hasConflict) return true;

    const maxOverlap = sub?.maxOverlapClasses;
    if (maxOverlap && maxOverlap > 0 && !relaxConstraints) {
      if (activeSlots.length >= maxOverlap) {
        return true;
      }
    }

    return false;
  };

  const findExamTeacher = (lesson: LessonToSchedule, day: number, period: number, excludeTeacherId?: string): string | null => {
    const sub = subjects.find(s => s.id === lesson.subjectId);
    if (!sub || !lesson.isExam) return lesson.teacherId;

    const isTeacherQualified = (teacherId: string) => {
      const teacher = teachers.find(t => t.id === teacherId);
      if (!teacher) return false;
      const isTeachingSubject = teacherSubjects[teacherId].has(lesson.subjectId);
      if (isTeachingSubject) return false;

      if (teacher.specialization && sub.name) {
        const spec = teacher.specialization.toLowerCase();
        const subName = sub.name.toLowerCase();
        if (spec.includes(subName) || subName.includes(spec)) return false;
      }
      return true;
    };

    for (const t of teachers) {
      if (t.id === excludeTeacherId) continue;
      if (!isTeacherQualified(t.id)) continue;
      if (isTeacherOff(t.id, day, period)) continue;
      if (isTeacherOccupiedAtAll(t.id, day, period)) continue;
      if (teacherDailyCount[t.id][day] + 1 > t.maxLessonsPerSession) continue;
      return t.id;
    }
    return null;
  };

  const checkSlotValidity = (
    lesson: LessonToSchedule, 
    day: number, 
    period: number, 
    relaxConstraints: boolean = false
  ): { valid: boolean, reason?: string } => {
    const cls = classes.find(c => c.id === lesson.classId);
    const sub = subjects.find(s => s.id === lesson.subjectId);

    // Subject-specific banned periods check (Tránh tiết cấu hình môn học)
    if (sub && sub.bannedPeriods && sub.bannedPeriods.length > 0 && !relaxConstraints) {
      if (sub.bannedPeriods.includes(period)) {
        return { valid: false, reason: 'Tránh tiết cấu hình môn học' };
      }
      if (lesson.isDouble && sub.bannedPeriods.includes(period + 1)) {
        return { valid: false, reason: 'Tránh tiết cấu hình môn học (Tiết đôi)' };
      }
    }
    
    // Exam sync
    if (lesson.isExam && cls) {
      const gradeSlot = gradeSubjectExamSlot[cls.grade]?.[lesson.subjectId];
      if (gradeSlot) {
        if (gradeSlot.day !== day || gradeSlot.period !== period) return { valid: false, reason: 'Lịch thi đồng bộ khối' };
      } else {
        const gradeExamConfig = (config.exams || []).find(e => e.grade === cls.grade);
        if (gradeExamConfig && gradeExamConfig.preferredDay !== undefined) {
          if (day !== gradeExamConfig.preferredDay) return { valid: false, reason: 'Ngày thi ưu tiên' };
          const gradeExamSubjects = getExamSubjectsForGrade(cls.grade);
          const isFirstExamSubject = gradeExamSubjects[0]?.id === lesson.subjectId;
          if (isFirstExamSubject && gradeExamConfig.preferredPeriod !== undefined && period !== gradeExamConfig.preferredPeriod) {
            return { valid: false, reason: 'Tiết thi ưu tiên' };
          }
        }
      }
    }

    // Session check
    if (lesson.session === 'morning' && period >= config.morningLessons) return { valid: false, reason: 'Sai buổi học' };
    if (lesson.session === 'afternoon' && period < config.morningLessons) return { valid: false, reason: 'Sai buổi học' };

    // Daily periods limit check for class
    if (cls && !relaxConstraints) {
      const limits = getDailyPeriodsForClass(cls, day, config);
      const isMorning = period < config.morningLessons;
      if (isMorning) {
        if (period >= limits.morning) return { valid: false, reason: 'Vượt quá số tiết sáng cấu hình cho lớp' };
        if (lesson.isDouble && period + 1 >= limits.morning) return { valid: false, reason: 'Tiết đôi vượt giới hạn tiết sáng' };
      } else {
        const afternoonP = period - config.morningLessons;
        if (afternoonP >= limits.afternoon) return { valid: false, reason: 'Vượt quá số tiết chiều cấu hình cho lớp' };
        if (lesson.isDouble && afternoonP + 1 >= limits.afternoon) return { valid: false, reason: 'Tiết đôi vượt giới hạn tiết chiều' };
      }
    }

    // School off
    if (isSchoolOff(day, period)) return { valid: false, reason: 'Trường nghỉ' };
    if (lesson.isDouble && isSchoolOff(day, period + 1)) return { valid: false, reason: 'Trường nghỉ (Tiết đôi)' };

    // Class occupied?
    if (classSchedule[lesson.classId][day][period]) return { valid: false, reason: 'Lớp bận' };
    if (lesson.isDouble && (period + 1 >= totalPeriods || classSchedule[lesson.classId][day][period + 1])) {
      return { valid: false, reason: 'Không đủ tiết đôi cho lớp' };
    }

    // Teacher occupied?
    if (lesson.isExam) {
      if (lesson.isDouble) {
        const t1 = findExamTeacher(lesson, day, period);
        if (!t1) return { valid: false, reason: 'Thiếu giám thị (Tiết 1)' };
        const t2 = findExamTeacher(lesson, day, period + 1, t1);
        if (!t2) return { valid: false, reason: 'Thiếu giám thị (Tiết 2)' };
      } else {
        const primary = findExamTeacher(lesson, day, period);
        if (!primary) return { valid: false, reason: 'Thiếu giám thị' };
      }
    } else {
      if (isTeacherOff(lesson.teacherId, day, period)) return { valid: false, reason: 'Giáo viên xin nghỉ' };
      if (lesson.isDouble && isTeacherOff(lesson.teacherId, day, period + 1)) return { valid: false, reason: 'Giáo viên xin nghỉ (Tiết đôi)' };

      if (lesson.teacherId !== 'none') {
        if (isTeacherBusyForClass(lesson.teacherId, day, period, lesson.classId, lesson.subjectId, relaxConstraints)) {
          return { valid: false, reason: 'Giáo viên bận ở lớp khác' };
        }
        if (lesson.isDouble && isTeacherBusyForClass(lesson.teacherId, day, period + 1, lesson.classId, lesson.subjectId, relaxConstraints)) {
          return { valid: false, reason: 'Giáo viên bận ở lớp khác (Tiết đôi)' };
        }
      }

      const teacher = teachers.find(t => t.id === lesson.teacherId);
      if (teacher) {
        let newPeriodsAdded = 0;
        if (!isTeacherOccupiedAtAll(lesson.teacherId, day, period)) {
          newPeriodsAdded += 1;
        }
        if (lesson.isDouble && !isTeacherOccupiedAtAll(lesson.teacherId, day, period + 1)) {
          newPeriodsAdded += 1;
        }
        
        if ((teacherDailyCount[lesson.teacherId][day] || 0) + newPeriodsAdded > teacher.maxLessonsPerSession) {
          if (!relaxConstraints) return { valid: false, reason: 'Vượt định mức tiết/buổi của giáo viên' };
        }
      }
    }

    // Subject daily limit check
    if (classSubjectDays[lesson.classId][lesson.subjectId].has(day)) {
      if (!relaxConstraints) return { valid: false, reason: 'Môn học đã có trong ngày' };
    }

    // Subject grade overlap restriction (if allowGradeOverlap === false)
    const allowGradeOverlap = sub?.allowGradeOverlap !== false; // Default true unless explicitly false

    if (!allowGradeOverlap && cls) {
      const isSameGradeOverlap = classes.some(otherCls => 
        otherCls.grade === cls.grade &&
        otherCls.id !== cls.id &&
        classSchedule[otherCls.id]?.[day]?.[period] === lesson.subjectId
      );
      if (isSameGradeOverlap && !relaxConstraints) {
        return { valid: false, reason: 'Không cho phép trùng tiết môn trong cùng khối' };
      }
    }

    return { valid: true };
  };

  const placeLesson = (lesson: LessonToSchedule, day: number, period: number) => {
    const cls = classes.find(c => c.id === lesson.classId);
    if (lesson.isExam && cls) {
      if (!gradeSubjectExamSlot[cls.grade]) gradeSubjectExamSlot[cls.grade] = {};
      if (!gradeSubjectExamSlot[cls.grade][lesson.subjectId]) {
        gradeSubjectExamSlot[cls.grade][lesson.subjectId] = { day, period };
      }
    }

    if (lesson.isExam && lesson.isDouble) {
      const t1 = findExamTeacher(lesson, day, period);
      const t2 = findExamTeacher(lesson, day, period + 1, t1);
      
      if (t1 && t2) {
        classSchedule[lesson.classId][day][period] = lesson.subjectId;
        teacherSchedule[t1][day][period] = lesson.classId;
        teacherDailyCount[t1][day]++;
        slots.push({ classId: lesson.classId, day, period, subjectId: lesson.subjectId, teacherId: t1, isExam: true });

        classSchedule[lesson.classId][day][period + 1] = lesson.subjectId;
        teacherSchedule[t2][day][period + 1] = lesson.classId;
        teacherDailyCount[t2][day]++;
        slots.push({ classId: lesson.classId, day, period: period + 1, subjectId: lesson.subjectId, teacherId: t2, isExam: true });
        
        classSubjectDays[lesson.classId][lesson.subjectId].add(day);
      }
    } else {
      const primaryTeacherId = findExamTeacher(lesson, day, period) || lesson.teacherId;

      classSchedule[lesson.classId][day][period] = lesson.subjectId;
      if (primaryTeacherId && primaryTeacherId !== 'none' && teacherSchedule[primaryTeacherId]) {
        if (!teacherSchedule[primaryTeacherId][day][period]) {
          teacherDailyCount[primaryTeacherId][day]++;
        }
        teacherSchedule[primaryTeacherId][day][period] = lesson.classId;
      }

      classSubjectDays[lesson.classId][lesson.subjectId].add(day);
      slots.push({ 
        classId: lesson.classId, 
        day, 
        period, 
        subjectId: lesson.subjectId, 
        teacherId: primaryTeacherId, 
        isExam: lesson.isExam,
        subTopic: lesson.subTopic,
      });

      if (lesson.isDouble) {
        classSchedule[lesson.classId][day][period + 1] = lesson.subjectId;
        if (primaryTeacherId && primaryTeacherId !== 'none' && teacherSchedule[primaryTeacherId]) {
          if (!teacherSchedule[primaryTeacherId][day][period + 1]) {
            teacherDailyCount[primaryTeacherId][day]++;
          }
          teacherSchedule[primaryTeacherId][day][period + 1] = lesson.classId;
        }
        slots.push({ 
          classId: lesson.classId, 
          day, 
          period: period + 1, 
          subjectId: lesson.subjectId, 
          teacherId: primaryTeacherId, 
          isExam: lesson.isExam,
          subTopic: lesson.subTopic,
        });
      }
    }
  };

  // Pre-assign Fixed Periods (Chào cờ, HĐTN...)
  if (config.fixedPeriods && config.fixedPeriods.length > 0) {
    for (const fp of config.fixedPeriods) {
      const { day, period, subjectId } = fp;
      if (day < 0 || day >= config.days || period < 0 || period >= totalPeriods) continue;

      for (const cls of classes) {
        // Find if this class already has a lesson of this subject in the 'lessons' pool
        const idx = lessons.findIndex(l => l.classId === cls.id && l.subjectId === subjectId);
        
        if (idx !== -1) {
          const l = lessons[idx];
          if (l.isDouble) {
            // Split it: convert current to single and place it, and add a single lesson back to pool
            l.isDouble = false;
            lessons.push({
              ...l,
              isDouble: false
            });
            lessons.splice(idx, 1);
          } else {
            lessons.splice(idx, 1);
          }
          
          // Place directly
          classSchedule[cls.id][day][period] = subjectId;
          classSubjectDays[cls.id][subjectId].add(day);

          const teacherId = l.teacherId;
          if (teacherId && teacherId !== 'none' && teacherSchedule[teacherId]) {
            teacherSchedule[teacherId][day][period] = cls.id;
            teacherDailyCount[teacherId][day] = (teacherDailyCount[teacherId][day] || 0) + 1;
          }

          slots.push({
            classId: cls.id,
            day,
            period,
            subjectId,
            teacherId,
            subTopic: l.subTopic,
            isExam: l.isExam,
            isFixed: true
          });
        } else {
          // Reserve the slot as a placeholder if not explicitly in the lessons list
          classSchedule[cls.id][day][period] = subjectId;
          classSubjectDays[cls.id][subjectId].add(day);
          
          slots.push({
            classId: cls.id,
            day,
            period,
            subjectId,
            teacherId: 'none',
            isFixed: true
          });
        }
      }
    }
  }

  // 3. Greedy placement prioritizing filling daily target periods cleanly
  for (let i = 0; i < lessons.length; i++) {
    const lesson = lessons[i];
    let placed = false;
    const failureReasons = new Set<string>();
    const openSlotFailureReasons: string[] = [];
    
    const tryPlace = (relaxConstraints: boolean) => {
      let bestSlot: { day: number, period: number } | null = null;
      let bestScore = Infinity;

      const cls = classes.find(c => c.id === lesson.classId);

      for (let day = 0; day < config.days; day++) {
        const limits = cls ? getDailyPeriodsForClass(cls, day, config) : { morning: config.morningLessons, afternoon: config.afternoonLessons };
        
        for (let period = 0; period < totalPeriods; period++) {
          if (lesson.isDouble && period === config.morningLessons - 1) continue;
          
          const result = checkSlotValidity(lesson, day, period, relaxConstraints);
          if (result.valid) {
            const isMorning = period < config.morningLessons;
            const targetCapacity = isMorning ? limits.morning : limits.afternoon;
            if (targetCapacity <= 0 && !relaxConstraints) continue;

            // Count existing lessons on this session for the class
            const sessionStart = isMorning ? 0 : config.morningLessons;
            const sessionEnd = isMorning ? config.morningLessons : totalPeriods;
            let currentCount = 0;
            let lowestEmpty = sessionStart;

            for (let p = sessionStart; p < sessionEnd; p++) {
              if (classSchedule[lesson.classId][day]?.[p]) {
                currentCount++;
              }
            }
            while (lowestEmpty < sessionEnd && classSchedule[lesson.classId][day]?.[lowestEmpty]) {
              lowestEmpty++;
            }

            // Strong penalty if period leaves a gap (not filling from period 1 onwards)
            const gapPenalty = (period - lowestEmpty) * 100000;

            // Strong reward for filling days that already have lessons up to targetCapacity
            const underFill = targetCapacity - (currentCount + (lesson.isDouble ? 2 : 1));
            const targetFillReward = (underFill < 0 ? 50000 : underFill * 20000);

            // Day preference: fill early days completely first
            const dayOrderPenalty = day * 100;

            // Teacher gap penalty
            let teacherGapPenalty = 0;
            const tId = lesson.teacherId;
            if (tId && tId !== 'none') {
              let tLowest = sessionStart;
              while (tLowest < sessionEnd && isTeacherOccupiedAtAll(tId, day, tLowest)) {
                tLowest++;
              }
              if (period > tLowest) {
                teacherGapPenalty = (period - tLowest) * 15000;
              }
            }

            // Grade parallel scheduling preference (for subjects allowing grade overlap like Tiếng Anh, Thể dục)
            let gradeParallelBonus = 0;
            let staggerGradePenalty = 0;
            const sub = subjects.find(s => s.id === lesson.subjectId);
            const allowGradeOverlap = sub?.allowGradeOverlap !== false;
            if (allowGradeOverlap && cls) {
              const sameGradeCount = classes.filter(otherCls => 
                otherCls.grade === cls.grade &&
                otherCls.id !== cls.id &&
                classSchedule[otherCls.id]?.[day]?.[period] === lesson.subjectId
              ).length;
              if (sameGradeCount > 0) {
                // If it is the same teacher, give an even stronger bonus to combine them and reduce teacher quota (dạy ghép)
                const sameTeacherAndSubject = slots.some(s => 
                  s.teacherId === lesson.teacherId && 
                  s.day === day && 
                  s.period === period && 
                  s.subjectId === lesson.subjectId
                );
                if (sameTeacherAndSubject) {
                  gradeParallelBonus = -500000; // Extremely strong bonus to group them with the same teacher
                } else {
                  gradeParallelBonus = -150000; // Strong bonus to align parallel classes for different teachers
                }

                // Check for grade overlap staggering (trùng so le giữa các khối)
                // If another grade already has an overlapping block of classes for a grade-overlap subject on this same slot, apply a penalty
                const otherGradesOverlapping = Array.from(new Set(classes.map(c => c.grade)))
                  .filter(g => g !== cls.grade)
                  .some(otherGrade => {
                    const classesOfOtherGrade = classes.filter(c => c.grade === otherGrade);
                    const subjectsInPeriod = classesOfOtherGrade
                      .map(c => classSchedule[c.id]?.[day]?.[period])
                      .filter(Boolean);
                    
                    const freqs: Record<string, number> = {};
                    for (const sId of subjectsInPeriod) {
                      freqs[sId] = (freqs[sId] || 0) + 1;
                    }
                    
                    return Object.entries(freqs).some(([sId, count]) => {
                      if (count < 2) return false;
                      const otherSub = subjects.find(s => s.id === sId);
                      return otherSub?.allowGradeOverlap !== false;
                    });
                  });

                if (otherGradesOverlapping) {
                  staggerGradePenalty = 250000; // Apply staggered penalty to push this grade's overlap to another period
                }
              }
            }

            // Morning priority penalty
            let morningPriorityPenalty = 0;
            if (sub?.morningPriority && !isMorning) {
              morningPriorityPenalty = 400000; // Strong penalty for afternoon slots of morning priority subjects
            }

            const relaxPenalty = relaxConstraints ? 2000000 : 0;
            const score = gapPenalty + targetFillReward + dayOrderPenalty + teacherGapPenalty + gradeParallelBonus + staggerGradePenalty + morningPriorityPenalty + relaxPenalty + Math.random();
            
            if (score < bestScore) {
              bestScore = score;
              bestSlot = { day, period };
            }
          } else if (!relaxConstraints && result.reason) {
            failureReasons.add(result.reason);
            if (!isSchoolOff(day, period)) {
              openSlotFailureReasons.push(result.reason);
            }
          }
        }
      }
      if (bestSlot) {
        placeLesson(lesson, bestSlot.day, bestSlot.period);
        return true;
      }
      return false;
    };

    placed = tryPlace(false);

    if (!placed && lesson.isDouble) {
      lessons.push({ ...lesson, isDouble: false });
      lessons.push({ ...lesson, isDouble: false });
      continue;
    }

    if (!placed && !lesson.isDouble) {
      placed = tryPlace(true);
    }

    if (!placed) {
      let reason = 'Không tìm thấy tiết trống phù hợp';

      const teacher = teachers.find(t => t.id === lesson.teacherId);
      const cls = classes.find(c => c.id === lesson.classId);

      let totalOpenSchoolSlots = 0;
      for (let d = 0; d < config.days; d++) {
        for (let p = 0; p < totalPeriods; p++) {
          if (!isSchoolOff(d, p)) totalOpenSchoolSlots++;
        }
      }

      const openTeacherConflictCount = openSlotFailureReasons.filter(r => r === 'Giáo viên bận ở lớp khác').length;
      const openClassOccupiedCount = openSlotFailureReasons.filter(r => r === 'Lớp bận').length;
      const openSubjectSameDayCount = openSlotFailureReasons.filter(r => r === 'Môn học đã có trong ngày').length;

      if (teacher && (teacherLoad[teacher.id] || 0) > totalOpenSchoolSlots) {
        reason = `Giáo viên ${teacher.name} bị trùng/quá tải lịch (${teacherLoad[teacher.id]} tiết/tuần)`;
      } else if (openTeacherConflictCount > 0 && openTeacherConflictCount >= openClassOccupiedCount) {
        reason = `Giáo viên ${teacher?.name || ''} bị trùng lịch dạy ở các lớp khác`;
      } else if (openSubjectSameDayCount > 0 && openClassOccupiedCount > 0) {
        reason = `Môn học đã trùng trong ngày hoặc không còn tiết trống phù hợp`;
      } else if (openClassOccupiedCount > 0) {
        reason = `Lớp ${cls?.name || ''} đã kín tiết trong các buổi mở`;
      } else if (failureReasons.has('Giáo viên xin nghỉ')) {
        reason = `Giáo viên ${teacher?.name || ''} xin nghỉ vào các tiết trống còn lại`;
      } else if (failureReasons.has('Vượt định mức tiết/buổi của giáo viên')) {
        reason = `Giáo viên ${teacher?.name || ''} vượt định mức tiết/buổi`;
      } else if (failureReasons.has('Trường nghỉ')) {
        reason = 'Các buổi chiều đã thiết lập nghỉ học';
      }
      
      unassigned.push({ ...lesson, reason });
    }
  }

  // 3.5 Displacement / Swap Resolver for Unassigned Lessons
  for (let u = unassigned.length - 1; u >= 0; u--) {
    const lesson = unassigned[u];
    const cls = classes.find(c => c.id === lesson.classId);
    if (!cls) continue;

    let resolved = false;

    for (let d = 0; d < config.days && !resolved; d++) {
      const limits = getDailyPeriodsForClass(cls, d, config);
      for (let p = 0; p < totalPeriods && !resolved; p++) {
        if (isSchoolOff(d, p)) continue;

        const isMorning = p < config.morningLessons;
        if (isMorning && p >= limits.morning) continue;
        if (!isMorning && (p - config.morningLessons) >= limits.afternoon) continue;

        // Check if teacher for unassigned lesson is free at (d, p)
        if (lesson.teacherId !== 'none') {
          if (isTeacherBusyForClass(lesson.teacherId, d, p, cls.id, lesson.subjectId)) continue;
        }

        if (classSubjectDays[cls.id][lesson.subjectId].has(d)) continue;

        const existingSubId = classSchedule[cls.id][d][p];
        if (!existingSubId) continue;

        const existingSlot = slots.find(s => s.classId === cls.id && s.day === d && s.period === p);
        if (!existingSlot || existingSlot.isExam || existingSlot.isFixed) continue;

        const existingTeacherId = existingSlot.teacherId;

        // Find alternative slot (d2, p2) for existingSlot
        for (let d2 = 0; d2 < config.days && !resolved; d2++) {
          if (d2 === d) continue;
          if (classSubjectDays[cls.id][existingSubId].has(d2)) continue;

          const limits2 = getDailyPeriodsForClass(cls, d2, config);
          for (let p2 = 0; p2 < totalPeriods && !resolved; p2++) {
            if (isSchoolOff(d2, p2)) continue;

            const isMorning2 = p2 < config.morningLessons;
            if (isMorning2 && p2 >= limits2.morning) continue;
            if (!isMorning2 && (p2 - config.morningLessons) >= limits2.afternoon) continue;

            if (classSchedule[cls.id][d2][p2]) continue;

            if (existingTeacherId !== 'none') {
              if (isTeacherBusyForClass(existingTeacherId, d2, p2, cls.id, existingSubId)) continue;
            }

            // Perform swap
            delete classSchedule[cls.id][d][p];
            if (existingTeacherId !== 'none' && teacherSchedule[existingTeacherId]) {
              delete teacherSchedule[existingTeacherId][d][p];
              teacherSchedule[existingTeacherId][d2][p2] = cls.id;
            }
            classSchedule[cls.id][d2][p2] = existingSubId;
            existingSlot.day = d2;
            existingSlot.period = p2;
            classSubjectDays[cls.id][existingSubId].delete(d);
            classSubjectDays[cls.id][existingSubId].add(d2);

            placeLesson(lesson, d, p);
            unassigned.splice(u, 1);
            resolved = true;
          }
        }
      }
    }
  }

  // 3.8 Direct Relaxation Fill Pass for Remaining Unassigned Lessons
  for (let u = unassigned.length - 1; u >= 0; u--) {
    const lesson = unassigned[u];
    const cls = classes.find(c => c.id === lesson.classId);
    if (!cls) continue;

    let placed = false;
    for (let d = 0; d < config.days && !placed; d++) {
      const limits = getDailyPeriodsForClass(cls, d, config);
      for (let p = 0; p < totalPeriods && !placed; p++) {
        if (isSchoolOff(d, p)) continue;

        const isMorning = p < config.morningLessons;
        if (isMorning && p >= limits.morning) continue;
        if (!isMorning && (p - config.morningLessons) >= limits.afternoon) continue;

        // Slot already taken?
        if (classSchedule[cls.id][d][p]) continue;

        // Is session correct for subject?
        if (lesson.session === 'morning' && !isMorning) continue;
        if (lesson.session === 'afternoon' && isMorning) continue;

        // Is teacher available?
        if (lesson.teacherId !== 'none') {
          if (isTeacherBusyForClass(lesson.teacherId, d, p, cls.id, lesson.subjectId, true)) continue;
        }

        // Place lesson directly into this open slot
        placeLesson(lesson, d, p);
        unassigned.splice(u, 1);
        placed = true;
      }
    }
  }

  // 4. Inter-Day Compaction (Fill incomplete days up to target limits)
  for (let compIter = 0; compIter < 15; compIter++) {
    let movedAny = false;
    for (const cls of classes) {
      for (let dayTarget = 0; dayTarget < config.days; dayTarget++) {
        for (const isMorning of [true, false]) {
          const limitsTarget = getDailyPeriodsForClass(cls, dayTarget, config);
          const capTarget = isMorning ? limitsTarget.morning : limitsTarget.afternoon;
          if (capTarget <= 0) continue;

          const startP = isMorning ? 0 : config.morningLessons;
          const endP = isMorning ? config.morningLessons : totalPeriods;

          // Count lessons on target day
          let countTarget = 0;
          for (let p = startP; p < endP; p++) {
            if (classSchedule[cls.id][dayTarget]?.[p]) countTarget++;
          }

          if (countTarget < capTarget) {
            // Target day is under-filled. Look for a donor day that has lessons.
            for (let dayDonor = config.days - 1; dayDonor > dayTarget; dayDonor--) {
              let countDonor = 0;
              for (let p = startP; p < endP; p++) {
                if (classSchedule[cls.id][dayDonor]?.[p]) countDonor++;
              }

              if (countDonor > 0) {
                // Try moving a lesson from donor day to target day
                for (let pDonor = startP; pDonor < endP; pDonor++) {
                  const subId = classSchedule[cls.id][dayDonor]?.[pDonor];
                  if (!subId) continue;

                  const sDonor = slots.find(s => s.classId === cls.id && s.day === dayDonor && s.period === pDonor);
                  if (!sDonor || sDonor.isExam || sDonor.isFixed) continue;

                  // Check if target day already has this subject
                  if (classSubjectDays[cls.id][subId].has(dayTarget)) continue;

                  // Find an available slot on target day within capTarget
                  for (let pTarget = startP; pTarget < startP + capTarget; pTarget++) {
                    if (!classSchedule[cls.id][dayTarget]?.[pTarget]) {
                      const tId = sDonor.teacherId;
                      const canMove = !isSchoolOff(dayTarget, pTarget) &&
                                      (tId === 'none' || !isTeacherBusyForClass(tId, dayTarget, pTarget, cls.id, subId));

                      if (canMove) {
                        // Move lesson
                        delete classSchedule[cls.id][dayDonor][pDonor];
                        if (tId && tId !== 'none' && teacherSchedule[tId]) {
                          delete teacherSchedule[tId][dayDonor][pDonor];
                          teacherSchedule[tId][dayTarget][pTarget] = cls.id;
                        }
                        classSchedule[cls.id][dayTarget][pTarget] = subId;
                        sDonor.day = dayTarget;
                        sDonor.period = pTarget;

                        classSubjectDays[cls.id][subId].delete(dayDonor);
                        classSubjectDays[cls.id][subId].add(dayTarget);

                        countTarget++;
                        movedAny = true;
                        break;
                      }
                    }
                  }
                  if (movedAny) break;
                }
              }
              if (movedAny || countTarget >= capTarget) break;
            }
          }
        }
      }
    }
    if (!movedAny) break;
  }

  // 5. Intra-Day Left-Pack Pass (Strictly shift lessons up to Period 1, 2, 3...)
  for (let shiftIter = 0; shiftIter < 20; shiftIter++) {
    let shiftedAny = false;
    for (const cls of classes) {
      for (let day = 0; day < config.days; day++) {
        for (const isMorning of [true, false]) {
          const limits = getDailyPeriodsForClass(cls, day, config);
          const startP = isMorning ? 0 : config.morningLessons;
          const endP = isMorning 
            ? Math.min(config.morningLessons, limits.morning) 
            : config.morningLessons + Math.min(config.afternoonLessons, limits.afternoon);

          for (let p = startP; p < endP; p++) {
            if (!classSchedule[cls.id][day][p]) {
              for (let pNext = p + 1; pNext < endP; pNext++) {
                if (classSchedule[cls.id][day][pNext]) {
                  const s = slots.find(slot => slot.classId === cls.id && slot.day === day && slot.period === pNext);
                  if (!s || s.isExam || s.isFixed) break;

                  const subId = classSchedule[cls.id][day][pNext];
                  const tId = s.teacherId;

                  const isDouble = (pNext + 1 < endP && classSchedule[cls.id][day][pNext + 1] === subId) ||
                                   (pNext - 1 >= startP && classSchedule[cls.id][day][pNext - 1] === subId);

                  if (!isDouble) {
                    if (!isSchoolOff(day, p) &&
                        (tId === 'none' || !isTeacherBusyForClass(tId, day, p, cls.id, subId))) {
                      
                      if (teacherSchedule[tId] && teacherSchedule[tId][day] && teacherSchedule[tId][day][pNext] === cls.id) {
                        delete teacherSchedule[tId][day][pNext];
                      }
                      delete classSchedule[cls.id][day][pNext];
                      
                      if (tId && tId !== 'none' && teacherSchedule[tId] && teacherSchedule[tId][day]) {
                        teacherSchedule[tId][day][p] = cls.id;
                      }
                      classSchedule[cls.id][day][p] = subId;
                      s.period = p;

                      shiftedAny = true;
                      break;
                    }
                  } else {
                    const isStartOfDouble = pNext + 1 < endP && classSchedule[cls.id][day][pNext + 1] === subId;
                    if (isStartOfDouble) {
                      const s2 = slots.find(slot => slot.classId === cls.id && slot.day === day && slot.period === pNext + 1);
                      if (s2 && !s2.isExam && !s2.isFixed) {
                        if (p + 1 < endP && (!classSchedule[cls.id][day][p + 1] || p + 1 === pNext)) {
                          const t2Id = s2.teacherId;
                          const canMoveT1 = !isSchoolOff(day, p) && (tId === 'none' || !isTeacherBusyForClass(tId, day, p, cls.id, subId));
                          const canMoveT2 = !isSchoolOff(day, p + 1) && (t2Id === 'none' || !isTeacherBusyForClass(t2Id, day, p + 1, cls.id, subId));

                          if (canMoveT1 && canMoveT2) {
                            if (teacherSchedule[tId] && teacherSchedule[tId][day]) delete teacherSchedule[tId][day][pNext];
                            if (teacherSchedule[t2Id] && teacherSchedule[t2Id][day]) delete teacherSchedule[t2Id][day][pNext + 1];
                            delete classSchedule[cls.id][day][pNext];
                            delete classSchedule[cls.id][day][pNext + 1];

                            if (teacherSchedule[tId] && teacherSchedule[tId][day]) teacherSchedule[tId][day][p] = cls.id;
                            if (teacherSchedule[t2Id] && teacherSchedule[t2Id][day]) teacherSchedule[t2Id][day][p + 1] = cls.id;
                            classSchedule[cls.id][day][p] = subId;
                            classSchedule[cls.id][day][p + 1] = subId;

                            s.period = p;
                            s2.period = p + 1;

                            shiftedAny = true;
                            break;
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
    if (!shiftedAny) break;
  }

  return { slots, unassigned, autoAdjustedConfig };
}

