import React, { useState } from 'react';
import { Class, Subject, Teacher, Config, getAssignmentDefaultLessons, getSubjectDefaultWeekType } from '../types';
import { Layers, Plus, Trash2, X, Sparkles, Copy, Check, Info } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  classes: Class[];
  subjects: Subject[];
  teachers: Teacher[];
  setTeachers: React.Dispatch<React.SetStateAction<Teacher[]>>;
  config: Config;
}

export const SplitTeacherModal: React.FC<Props> = ({
  isOpen,
  onClose,
  classes,
  subjects,
  teachers,
  setTeachers,
  config,
}) => {
  if (!isOpen) return null;

  // Default to KHTN or LS&ĐL or first subject
  const defaultSub = subjects.find(s => s.name.toLowerCase().includes('khoa học') || s.name.toLowerCase().includes('khtn')) ||
                     subjects.find(s => s.name.toLowerCase().includes('lịch sử') || s.name.toLowerCase().includes('ls')) ||
                     subjects[0];

  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(defaultSub?.id || '');
  const [selectedGrade, setSelectedGrade] = useState<number>(6);
  const [copiedClassId, setCopiedClassId] = useState<string | null>(null);
  const [showToast, setShowToast] = useState<string | null>(null);

  const activeSubject = subjects.find(s => s.id === selectedSubjectId);

  // Filter classes by selected grade
  const gradeClasses = classes.filter(c => c.grade === selectedGrade);

  // Helper to get all teacher assignments for a specific class and subject
  const getClassTeachersInfo = (classId: string) => {
    const list: Array<{
      teacherId: string;
      teacherName: string;
      assignmentIndex: number;
      allocatedLessons: number;
      subTopic: string;
      weekType: 'all' | 'odd' | 'even';
    }> = [];

    teachers.forEach((t) => {
      t.assignments.forEach((a, aIdx) => {
        if (a.subjectId === selectedSubjectId && a.classIds.includes(classId)) {
          list.push({
            teacherId: t.id,
            teacherName: t.name,
            assignmentIndex: aIdx,
            allocatedLessons: a.classLessons?.[classId] ?? -1,
            subTopic: a.subTopics?.[classId] || '',
            weekType: a.weekTypes?.[classId] || 'all',
          });
        }
      });
    });

    return list;
  };

  // Assign or update a teacher for a class and subject
  const updateClassTeacherAssignment = (
    classId: string,
    teacherId: string,
    field: 'allocatedLessons' | 'subTopic' | 'weekType',
    value: any
  ) => {
    setTeachers(prevTeachers => {
      return prevTeachers.map(t => {
        if (t.id !== teacherId) return t;

        const newAssignments = t.assignments.map(a => {
          if (a.subjectId !== selectedSubjectId) return a;
          if (!a.classIds.includes(classId)) return a;

          const newClassLessons = { ...(a.classLessons || {}) };
          const newSubTopics = { ...(a.subTopics || {}) };
          const newWeekTypes = { ...(a.weekTypes || {}) };

          if (field === 'allocatedLessons') {
            newClassLessons[classId] = parseInt(value) || 0;
          } else if (field === 'subTopic') {
            newSubTopics[classId] = value;
          } else if (field === 'weekType') {
            newWeekTypes[classId] = value;
          }

          return {
            ...a,
            classLessons: newClassLessons,
            subTopics: newSubTopics,
            weekTypes: newWeekTypes,
          };
        });

        return { ...t, assignments: newAssignments };
      });
    });
  };

  // Add a new teacher assignment to a class
  const handleAddTeacherToClass = (classId: string, teacherId: string) => {
    if (!teacherId) return;

    setTeachers(prevTeachers => {
      return prevTeachers.map(t => {
        if (t.id !== teacherId) return t;

        // Check if teacher already has an assignment for this subject
        const existingIdx = t.assignments.findIndex(a => a.subjectId === selectedSubjectId);
        const cls = classes.find(c => c.id === classId);
        const defWeekType = cls && activeSubject ? getSubjectDefaultWeekType(activeSubject, cls.grade) : 'all';
        const defLessons = cls && activeSubject ? getAssignmentDefaultLessons(activeSubject, cls.grade, defWeekType, config) : 1;

        if (existingIdx >= 0) {
          const newAssignments = [...t.assignments];
          if (!newAssignments[existingIdx].classIds.includes(classId)) {
            newAssignments[existingIdx] = {
              ...newAssignments[existingIdx],
              classIds: [...newAssignments[existingIdx].classIds, classId]
            };
            
            if (!newAssignments[existingIdx].classLessons) {
              newAssignments[existingIdx].classLessons = {};
            }
            newAssignments[existingIdx].classLessons![classId] = defLessons;

            if (!newAssignments[existingIdx].weekTypes) {
              newAssignments[existingIdx].weekTypes = {};
            }
            newAssignments[existingIdx].weekTypes![classId] = defWeekType;
          }
          return { ...t, assignments: newAssignments };
        } else {
          return {
            ...t,
            assignments: [
              ...t.assignments,
              {
                subjectId: selectedSubjectId,
                classIds: [classId],
                classLessons: { [classId]: defLessons },
                subTopics: { [classId]: '' },
                weekTypes: { [classId]: defWeekType }
              }
            ]
          };
        }
      });
    });
  };

  // Remove a teacher assignment from a class
  const handleRemoveTeacherFromClass = (classId: string, teacherId: string) => {
    setTeachers(prevTeachers => {
      return prevTeachers.map(t => {
        if (t.id !== teacherId) return t;

        const newAssignments = t.assignments.map(a => {
          if (a.subjectId !== selectedSubjectId) return a;
          return {
            ...a,
            classIds: a.classIds.filter(id => id !== classId)
          };
        }).filter(a => a.classIds.length > 0);

        return { ...t, assignments: newAssignments };
      });
    });
  };

  // Preset: Auto-assign KHTN (Physics, Chemistry, Biology)
  const applyKHTNPreset = () => {
    if (!activeSubject) return;

    // Try to find subjects for Physics, Chemistry, Biology
    const phySub = subjects.find(s => s.name.toLowerCase().includes('lý') || s.name.toLowerCase().includes('vật lý'));
    const chemSub = subjects.find(s => s.name.toLowerCase().includes('hóa') || s.name.toLowerCase().includes('hóa học'));
    const bioSub = subjects.find(s => s.name.toLowerCase().includes('sinh') || s.name.toLowerCase().includes('sinh học'));

    // Try to find teachers specializing in Physics, Chemistry, Biology
    const phyTeacher = teachers.find(t => t.specialization?.toLowerCase().includes('lý') || t.name.toLowerCase().includes('lý')) || teachers[0];
    const chemTeacher = teachers.find(t => t.specialization?.toLowerCase().includes('hóa') || t.name.toLowerCase().includes('hóa')) || teachers[1] || teachers[0];
    const bioTeacher = teachers.find(t => t.specialization?.toLowerCase().includes('sinh') || t.name.toLowerCase().includes('sinh')) || teachers[2] || teachers[0];

    if (!phyTeacher || !chemTeacher || !bioTeacher) return;

    setTeachers(prev => {
      return prev.map(t => {
        let newAssignments = [...t.assignments];
        const isPhy = t.id === phyTeacher.id;
        const isChem = t.id === chemTeacher.id;
        const isBio = t.id === bioTeacher.id;

        if (isPhy || isChem || isBio) {
          let aIdx = newAssignments.findIndex(a => a.subjectId === selectedSubjectId);
          if (aIdx < 0) {
            newAssignments.push({
              subjectId: selectedSubjectId,
              classIds: [],
              classLessons: {},
              subTopics: {},
              weekTypes: {}
            });
            aIdx = newAssignments.length - 1;
          }

          const classIds = [...newAssignments[aIdx].classIds];
          const classLessons = { ...(newAssignments[aIdx].classLessons || {}) };
          const subTopics = { ...(newAssignments[aIdx].subTopics || {}) };
          const weekTypes = { ...(newAssignments[aIdx].weekTypes || {}) };

          classes.forEach(c => {
            if (!classIds.includes(c.id)) classIds.push(c.id);

            if (isPhy) {
              const defWeekType = phySub ? getSubjectDefaultWeekType(phySub, c.grade) : 'all';
              const defLessons = phySub ? getAssignmentDefaultLessons(phySub, c.grade, defWeekType, config) : 1;
              classLessons[c.id] = defLessons;
              weekTypes[c.id] = defWeekType;
              subTopics[c.id] = 'Vật lý';
            } else if (isChem) {
              const defWeekType = chemSub ? getSubjectDefaultWeekType(chemSub, c.grade) : 'all';
              const defLessons = chemSub ? getAssignmentDefaultLessons(chemSub, c.grade, defWeekType, config) : 1;
              classLessons[c.id] = defLessons;
              weekTypes[c.id] = defWeekType;
              subTopics[c.id] = 'Hóa học';
            } else if (isBio) {
              const defWeekType = bioSub ? getSubjectDefaultWeekType(bioSub, c.grade) : 'all';
              const defLessons = bioSub ? getAssignmentDefaultLessons(bioSub, c.grade, defWeekType, config) : 2;
              classLessons[c.id] = defLessons;
              weekTypes[c.id] = defWeekType;
              subTopics[c.id] = 'Sinh học';
            }
          });

          newAssignments[aIdx] = {
            subjectId: selectedSubjectId,
            classIds,
            classLessons,
            subTopics,
            weekTypes
          };
        }
        return { ...t, assignments: newAssignments };
      });
    });

    triggerToast('Đã tự động phân công 3 Giáo viên (Lý, Hóa, Sinh) đồng bộ theo cấu hình tuần lẻ/chẵn của từng khối lớp!');
  };

  // Preset: Auto-assign History & Geography
  const applyLSDLPreset = () => {
    if (!activeSubject) return;

    const hisSub = subjects.find(s => s.name.toLowerCase().includes('lịch sử') || s.name.toLowerCase().includes('sử'));
    const geoSub = subjects.find(s => s.name.toLowerCase().includes('địa lý') || s.name.toLowerCase().includes('địa'));

    const hisTeacher = teachers.find(t => t.specialization?.toLowerCase().includes('sử') || t.name.toLowerCase().includes('sử')) || teachers[0];
    const geoTeacher = teachers.find(t => t.specialization?.toLowerCase().includes('địa') || t.name.toLowerCase().includes('địa')) || teachers[1] || teachers[0];

    if (!hisTeacher || !geoTeacher) return;

    setTeachers(prev => {
      return prev.map(t => {
        let newAssignments = [...t.assignments];
        const isHis = t.id === hisTeacher.id;
        const isGeo = t.id === geoTeacher.id;

        if (isHis || isGeo) {
          let aIdx = newAssignments.findIndex(a => a.subjectId === selectedSubjectId);
          if (aIdx < 0) {
            newAssignments.push({
              subjectId: selectedSubjectId,
              classIds: [],
              classLessons: {},
              subTopics: {},
              weekTypes: {}
            });
            aIdx = newAssignments.length - 1;
          }

          const classIds = [...newAssignments[aIdx].classIds];
          const classLessons = { ...(newAssignments[aIdx].classLessons || {}) };
          const subTopics = { ...(newAssignments[aIdx].subTopics || {}) };
          const weekTypes = { ...(newAssignments[aIdx].weekTypes || {}) };

          classes.forEach(c => {
            if (!classIds.includes(c.id)) classIds.push(c.id);

            if (isHis) {
              const defWeekType = hisSub ? getSubjectDefaultWeekType(hisSub, c.grade) : 'all';
              const defLessons = hisSub ? getAssignmentDefaultLessons(hisSub, c.grade, defWeekType, config) : 2;
              classLessons[c.id] = defLessons;
              weekTypes[c.id] = defWeekType;
              subTopics[c.id] = 'Lịch sử';
            } else if (isGeo) {
              const defWeekType = geoSub ? getSubjectDefaultWeekType(geoSub, c.grade) : 'all';
              const defLessons = geoSub ? getAssignmentDefaultLessons(geoSub, c.grade, defWeekType, config) : 1;
              classLessons[c.id] = defLessons;
              weekTypes[c.id] = defWeekType;
              subTopics[c.id] = 'Địa lý';
            }
          });

          newAssignments[aIdx] = {
            subjectId: selectedSubjectId,
            classIds,
            classLessons,
            subTopics,
            weekTypes
          };
        }
        return { ...t, assignments: newAssignments };
      });
    });

    triggerToast('Đã tự động phân công 2 Giáo viên (Sử, Địa) đồng bộ theo cấu hình tuần lẻ/chẵn của từng khối lớp!');
  };

  // Copy assignment from one class to all classes in the same grade
  const copyClassAssignmentToGrade = (sourceClassId: string) => {
    const sourceInfo = getClassTeachersInfo(sourceClassId);
    if (sourceInfo.length === 0) return;

    const targetClasses = gradeClasses.filter(c => c.id !== sourceClassId);

    setTeachers(prevTeachers => {
      return prevTeachers.map(t => {
        let newAssignments = [...t.assignments];

        // Check if teacher is in sourceInfo
        const srcItem = sourceInfo.find(info => info.teacherId === t.id);

        let aIdx = newAssignments.findIndex(a => a.subjectId === selectedSubjectId);

        if (srcItem) {
          if (aIdx < 0) {
            newAssignments.push({
              subjectId: selectedSubjectId,
              classIds: [],
              classLessons: {},
              subTopics: {},
              weekTypes: {}
            });
            aIdx = newAssignments.length - 1;
          }

          const classIds = new Set(newAssignments[aIdx].classIds);
          const classLessons = { ...(newAssignments[aIdx].classLessons || {}) };
          const subTopics = { ...(newAssignments[aIdx].subTopics || {}) };
          const weekTypes = { ...(newAssignments[aIdx].weekTypes || {}) };

          targetClasses.forEach(tc => {
            classIds.add(tc.id);
            if (srcItem.allocatedLessons > 0) classLessons[tc.id] = srcItem.allocatedLessons;
            if (srcItem.subTopic) subTopics[tc.id] = srcItem.subTopic;
            if (srcItem.weekType) weekTypes[tc.id] = srcItem.weekType;
          });

          newAssignments[aIdx] = {
            subjectId: selectedSubjectId,
            classIds: Array.from(classIds),
            classLessons,
            subTopics,
            weekTypes
          };
        } else if (aIdx >= 0) {
          // Remove target classes if teacher is not in source
          const classIds = newAssignments[aIdx].classIds.filter(id => !targetClasses.some(tc => tc.id === id));
          if (classIds.length > 0) {
            newAssignments[aIdx] = {
              ...newAssignments[aIdx],
              classIds
            };
          } else {
            newAssignments.splice(aIdx, 1);
          }
        }

        return { ...t, assignments: newAssignments };
      });
    });

    const srcName = classes.find(c => c.id === sourceClassId)?.name;
    triggerToast(`Đã sao chép cấu hình từ lớp ${srcName} sang tất cả các lớp Khối ${selectedGrade}!`);
  };

  const triggerToast = (msg: string) => {
    setShowToast(msg);
    setTimeout(() => setShowToast(null), 3500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-slate-900 via-brand-950 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-500/20 rounded-xl flex items-center justify-center text-brand-400 border border-brand-400/30">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xl font-bold tracking-tight text-white">
                Phân công Giáo viên dạy theo Môn, Lớp & Tuần
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                Chia nhỏ số tiết cho nhiều GV dạy chung lớp (Đặc biệt cho môn KHTN, Sử - Địa, GDPT 2018)
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Controls Bar */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4 shrink-0">
          <div className="flex flex-wrap items-center gap-4">
            {/* Subject selector */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Chọn Môn Học</label>
              <select
                value={selectedSubjectId}
                onChange={e => setSelectedSubjectId(e.target.value)}
                className="bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm font-bold text-slate-800 shadow-sm focus:ring-2 focus:ring-brand-500 outline-none"
              >
                {subjects.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.lessonsPerWeek} tiết/tuần)
                  </option>
                ))}
              </select>
            </div>

            {/* Grade selector */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Chọn Khối</label>
              <div className="flex items-center gap-1 bg-white border border-slate-200 p-1 rounded-xl shadow-sm">
                {[6, 7, 8, 9].map(g => (
                  <button
                    key={g}
                    onClick={() => setSelectedGrade(g)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      selectedGrade === g
                        ? 'bg-brand-600 text-white shadow'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Khối {g}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Presets */}
          <div className="flex items-center gap-2">
            {activeSubject?.name.toLowerCase().includes('khoa học') || activeSubject?.name.toLowerCase().includes('khtn') ? (
              <button
                onClick={applyKHTNPreset}
                className="px-3 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" /> Auto KHTN (3 GV)
              </button>
            ) : activeSubject?.name.toLowerCase().includes('lịch sử') || activeSubject?.name.toLowerCase().includes('ls') ? (
              <button
                onClick={applyLSDLPreset}
                className="px-3 py-2 bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-600" /> Auto Sử - Địa (2 GV)
              </button>
            ) : null}
          </div>
        </div>

        {/* Notification Toast */}
        {showToast && (
          <div className="bg-emerald-600 text-white px-4 py-2 text-xs font-bold flex items-center gap-2 animate-fade-in shrink-0">
            <Check className="w-4 h-4" /> {showToast}
          </div>
        )}

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-grow">
          {gradeClasses.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              Chưa có lớp nào thuộc Khối {selectedGrade}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {gradeClasses.map(cls => {
                const assignedTeachers = getClassTeachersInfo(cls.id);
                const totalAssignedLessons = assignedTeachers.reduce(
                  (sum, t) => sum + (t.allocatedLessons > 0 ? t.allocatedLessons : 0),
                  0
                );
                const targetLessons = getAssignmentDefaultLessons(activeSubject, cls.grade, 'all', config);

                return (
                  <div
                    key={cls.id}
                    className="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm hover:border-brand-300 transition-all space-y-4"
                  >
                    {/* Class Header */}
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-brand-50 text-brand-700 font-black text-sm rounded-xl flex items-center justify-center">
                          {cls.name}
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-800 text-base">Lớp {cls.name}</h4>
                          <span className="text-[11px] font-semibold text-slate-400">
                            Định mức môn: <strong className="text-slate-700">{targetLessons} tiết/tuần</strong>
                          </span>
                        </div>
                      </div>

                      {/* Copy to grade button */}
                      <button
                        onClick={() => copyClassAssignmentToGrade(cls.id)}
                        disabled={assignedTeachers.length === 0}
                        title="Sao chép cấu hình phân công của lớp này cho tất cả lớp khác trong Khối"
                        className="px-2.5 py-1.5 bg-slate-100 hover:bg-brand-50 text-slate-600 hover:text-brand-600 disabled:opacity-40 rounded-lg text-xs font-bold flex items-center gap-1 transition-all"
                      >
                        <Copy className="w-3.5 h-3.5" /> Áp dụng cả khối
                      </button>
                    </div>

                    {/* Assigned Teachers List */}
                    <div className="space-y-3">
                      {assignedTeachers.length === 0 ? (
                        <div className="p-3 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center text-xs text-slate-400">
                          Chưa phân công giáo viên nào cho lớp này
                        </div>
                      ) : (
                        assignedTeachers.map((tInfo, idx) => (
                          <div
                            key={idx}
                            className="p-3 bg-slate-50/80 border border-slate-200 rounded-xl space-y-2 relative group"
                          >
                            <div className="flex items-center justify-between gap-2">
                              {/* Teacher Selector */}
                              <select
                                value={tInfo.teacherId}
                                onChange={e => {
                                  handleRemoveTeacherFromClass(cls.id, tInfo.teacherId);
                                  handleAddTeacherToClass(cls.id, e.target.value);
                                }}
                                className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-800 focus:ring-1 focus:ring-brand-500 outline-none flex-grow"
                              >
                                {teachers.map(t => (
                                  <option key={t.id} value={t.id}>
                                    {t.name} {t.specialization ? `(${t.specialization})` : ''}
                                  </option>
                                ))}
                              </select>

                              <button
                                onClick={() => handleRemoveTeacherFromClass(cls.id, tInfo.teacherId)}
                                className="p-1 text-slate-300 hover:text-rose-600 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>

                            <div className="grid grid-cols-3 gap-2 pt-1">
                              {/* Subtopic / Phân môn */}
                              <div>
                                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                                  Phân môn / Ghi chú
                                </label>
                                <input
                                  type="text"
                                  value={tInfo.subTopic}
                                  onChange={e =>
                                    updateClassTeacherAssignment(
                                      cls.id,
                                      tInfo.teacherId,
                                      'subTopic',
                                      e.target.value
                                    )
                                  }
                                  placeholder="Vật lý, Hóa, Sinh..."
                                  className="w-full bg-white border border-slate-200 rounded-md px-2 py-1 text-xs font-semibold text-slate-700 focus:ring-1 focus:ring-brand-500 outline-none"
                                />
                                {/* Quick tags */}
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {['Vật lý', 'Hóa học', 'Sinh học', 'Lịch sử', 'Địa lý'].map(tag => (
                                    <button
                                      key={tag}
                                      type="button"
                                      onClick={() =>
                                        updateClassTeacherAssignment(
                                          cls.id,
                                          tInfo.teacherId,
                                          'subTopic',
                                          tag
                                        )
                                      }
                                      className="text-[9px] px-1.5 py-0.5 bg-white hover:bg-brand-50 border border-slate-200 hover:border-brand-300 text-slate-500 hover:text-brand-600 rounded"
                                    >
                                      {tag.split(' ')[0]}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              {/* Allocated lessons */}
                              <div>
                                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                                  Số tiết / tuần
                                </label>
                                <input
                                  type="number"
                                  min={1}
                                  max={10}
                                  value={
                                    tInfo.allocatedLessons > 0 
                                      ? tInfo.allocatedLessons 
                                      : getAssignmentDefaultLessons(activeSubject, cls.grade, tInfo.weekType, config)
                                  }
                                  onChange={e =>
                                    updateClassTeacherAssignment(
                                      cls.id,
                                      tInfo.teacherId,
                                      'allocatedLessons',
                                      e.target.value
                                    )
                                  }
                                  className="w-full bg-white border border-slate-200 rounded-md px-2 py-1 text-xs font-mono font-bold text-slate-800 focus:ring-1 focus:ring-brand-500 outline-none"
                                />
                              </div>

                              {/* Week type */}
                              <div>
                                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                                  Tuần dạy
                                </label>
                                <select
                                  value={tInfo.weekType}
                                  onChange={e => {
                                    const newWeekType = e.target.value as 'all' | 'odd' | 'even';
                                    updateClassTeacherAssignment(
                                      cls.id,
                                      tInfo.teacherId,
                                      'weekType',
                                      newWeekType
                                    );
                                    // Automatically synchronize lessons to match the grade's specific week type config
                                    const defaultL = getAssignmentDefaultLessons(activeSubject, cls.grade, newWeekType, config);
                                    updateClassTeacherAssignment(
                                      cls.id,
                                      tInfo.teacherId,
                                      'allocatedLessons',
                                      defaultL
                                    );
                                  }}
                                  className="w-full bg-white border border-slate-200 rounded-md px-1.5 py-1 text-xs font-semibold text-slate-700 focus:ring-1 focus:ring-brand-500 outline-none"
                                >
                                  <option value="all">Tất cả các tuần</option>
                                  <option value="odd">Chỉ tuần Lẻ</option>
                                  <option value="even">Chỉ tuần Chẵn</option>
                                </select>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Add teacher selector */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                      <select
                        onChange={e => {
                          if (e.target.value) {
                            handleAddTeacherToClass(cls.id, e.target.value);
                            e.target.value = '';
                          }
                        }}
                        className="bg-slate-100 hover:bg-slate-200 border-0 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-brand-500 outline-none transition-all cursor-pointer"
                      >
                        <option value="">+ Thêm Giáo viên dạy {cls.name}...</option>
                        {teachers.map(t => (
                          <option key={t.id} value={t.id}>
                            {t.name} {t.specialization ? `(${t.specialization})` : ''}
                          </option>
                        ))}
                      </select>

                      <div className="text-[11px] font-bold text-slate-500">
                        Tổng: <span className={totalAssignedLessons === targetLessons ? 'text-emerald-600 font-extrabold' : 'text-amber-600 font-extrabold'}>{totalAssignedLessons} / {targetLessons} tiết</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <Info className="w-4 h-4 text-brand-500" />
            <span>Mỗi lớp có thể chọn nhiều Giáo viên. Số tiết của các GV sẽ tự động dồn đúng theo cấu hình buổi.</span>
          </div>
          <button onClick={onClose} className="btn-primary px-6 py-2">
            Đóng & Lưu Cấu hình
          </button>
        </div>

      </div>
    </div>
  );
};
