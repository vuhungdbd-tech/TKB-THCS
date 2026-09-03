import React, { useState } from 'react';
import { Class, Subject, Teacher, Config, getAssignmentDefaultLessons, getSubjectDefaultWeekType } from '../types';
import { SplitTeacherModal } from './SplitTeacherModal';
import { 
  BookOpen, 
  Users, 
  UserCheck, 
  Clock, 
  FileText, 
  Settings,
  Plus, 
  Trash2, 
  Check, 
  X,
  RotateCcw,
  Info,
  AlertCircle,
  GraduationCap,
  CalendarDays,
  ChevronRight,
  Layers,
  Pin
} from 'lucide-react';

interface Props {
  classes: Class[];
  setClasses: React.Dispatch<React.SetStateAction<Class[]>>;
  subjects: Subject[];
  setSubjects: React.Dispatch<React.SetStateAction<Subject[]>>;
  teachers: Teacher[];
  setTeachers: React.Dispatch<React.SetStateAction<Teacher[]>>;
  config: Config;
  setConfig: React.Dispatch<React.SetStateAction<Config>>;
}

export default function ConfigTab({ classes, setClasses, subjects, setSubjects, teachers, setTeachers, config, setConfig }: Props) {
  const [subTab, setSubTabState] = useState<'classes' | 'subjects' | 'teachers' | 'time' | 'exams'>(() => {
    const saved = localStorage.getItem('activeSubTab');
    return (['classes', 'subjects', 'teachers', 'time', 'exams'].includes(saved as any)) ? (saved as any) : 'classes';
  });

  const setSubTab = (tabId: 'classes' | 'subjects' | 'teachers' | 'time' | 'exams') => {
    setSubTabState(tabId);
    localStorage.setItem('activeSubTab', tabId);
  };

  const tabs = [
    { id: 'classes', label: 'Lớp học', icon: Users },
    { id: 'subjects', label: 'Môn học', icon: BookOpen },
    { id: 'teachers', label: 'Giáo viên', icon: UserCheck },
    { id: 'time', label: 'Thời gian', icon: Clock },
    { id: 'exams', label: 'Kiểm tra', icon: FileText },
  ] as const;

  return (
    <div className="flex flex-col lg:flex-row gap-8">
      {/* Sidebar Navigation */}
      <aside className="lg:w-64 flex-shrink-0 no-print">
        <nav className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSubTab(tab.id)}
              className={`flex items-center justify-between px-5 py-4 rounded-xl text-base font-bold transition-all whitespace-nowrap group ${
                subTab === tab.id
                  ? 'bg-brand-50 text-brand-700 shadow-sm ring-1 ring-brand-200'
                  : 'text-text-muted hover:bg-stone-100 hover:text-text-main'
              }`}
            >
              <div className="flex items-center gap-4">
                <tab.icon className={`w-6 h-6 ${subTab === tab.id ? 'text-brand-600' : 'text-stone-400 group-hover:text-text-muted'}`} />
                {tab.label}
              </div>
              {subTab === tab.id && <ChevronRight className="w-5 h-5 hidden lg:block" />}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main Content Area */}
      <div className="flex-grow">
        <div className="glass-card p-6 min-h-[600px] shadow-xl shadow-stone-200/50">
          {subTab === 'classes' && <ClassConfig classes={classes} setClasses={setClasses} config={config} setConfig={setConfig} />}
          {subTab === 'subjects' && <SubjectConfig subjects={subjects} setSubjects={setSubjects} />}
          {subTab === 'teachers' && <TeacherConfig teachers={teachers} setTeachers={setTeachers} subjects={subjects} classes={classes} config={config} />}
          {subTab === 'time' && <TimeConfig config={config} setConfig={setConfig} classes={classes} subjects={subjects} />}
          {subTab === 'exams' && <ExamConfigUI config={config} setConfig={setConfig} subjects={subjects} />}
        </div>
      </div>
    </div>
  );
}

function SubjectConfig({ subjects, setSubjects }: { subjects: Subject[], setSubjects: any }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleAddSubject = () => {
    const newId = `s${Date.now()}`;
    setSubjects([...subjects, {
      id: newId,
      name: 'Môn mới',
      lessonsPerWeek: 1,
      type: 'sub',
      allowDouble: false,
      session: 'all',
      hasExam: false
    }]);
  };

  const handleDeleteSubject = (id: string) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa môn học này?')) {
      setSubjects(subjects.filter((s: Subject) => s.id !== id));
    }
  };

  const updateSubject = (idx: number, field: keyof Subject, value: any) => {
    const newSubs = [...subjects];
    (newSubs[idx] as any)[field] = value;
    setSubjects(newSubs);
  };

  const updateGradeConfig = (subIdx: number, grade: number, term: 'term1' | 'term2' | 'customWeek' | 'oddWeek' | 'evenWeek', value: string) => {
    const newSubs = [...subjects];
    const val = value === '' ? undefined : parseInt(value);
    
    if (!newSubs[subIdx].gradeConfigs) {
      newSubs[subIdx].gradeConfigs = {};
    }
    if (!newSubs[subIdx].gradeConfigs![grade]) {
      newSubs[subIdx].gradeConfigs![grade] = {};
    }
    
    newSubs[subIdx].gradeConfigs![grade][term] = val;
    setSubjects(newSubs);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-text-main">Danh mục môn học</h2>
          <p className="text-base text-text-muted mt-1.5">Quản lý danh sách môn học và định mức tiết dạy</p>
        </div>
        <button onClick={handleAddSubject} className="btn-primary flex items-center gap-2 shrink-0">
          <Plus className="w-4 h-4" /> Thêm môn học
        </button>
      </div>

      <div className="p-3 bg-brand-50/70 border border-brand-200 rounded-xl text-xs text-brand-900 font-medium flex items-center gap-2">
        <AlertCircle className="w-4 h-4 text-brand-600 shrink-0" />
        <span>
          <strong>Lưu ý về Trùng tiết khối:</strong> Các môn như <strong>Tiếng Anh, Thể dục</strong>... đã được bật tùy chọn <em>"Trùng khối"</em> để hệ thống cho phép (và ưu tiên) sắp xếp song song cho các lớp trong cùng 1 khối khi khác GV dạy.
        </span>
      </div>

      <div className="overflow-hidden border border-slate-200 rounded-xl">
        <table className="data-table">
          <thead>
            <tr>
              <th className="w-8"></th>
              <th>Tên môn</th>
              <th>Số tiết/tuần</th>
              <th>Loại môn</th>
              <th>Tiết đôi</th>
              <th>Buổi học</th>
              <th title="Cho phép các lớp cùng khối học môn này ở cùng một tiết (nếu khác giáo viên)">Trùng khối</th>
              <th>Kiểm tra</th>
              <th>Số tiết KT</th>
              <th className="text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {subjects.map((sub, idx) => (
              <React.Fragment key={sub.id}>
                <tr className={expandedId === sub.id ? 'bg-slate-50/50' : ''}>
                  <td>
                    <button 
                      onClick={() => setExpandedId(expandedId === sub.id ? null : sub.id)}
                      className="p-1 text-slate-400 hover:text-brand-600 rounded"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: expandedId === sub.id ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                        <path d="m9 18 6-6-6-6"/>
                      </svg>
                    </button>
                  </td>
                  <td>
                    <input 
                      value={sub.name || ''} 
                      onChange={(e) => updateSubject(idx, 'name', e.target.value)} 
                      className="bg-transparent font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20 rounded px-1 -ml-1 w-full" 
                    />
                  </td>
                  <td>
                    <input 
                      type="number" 
                      min="0" 
                      value={sub.lessonsPerWeek ?? 0} 
                      onChange={(e) => updateSubject(idx, 'lessonsPerWeek', parseInt(e.target.value) || 0)} 
                      className="w-16 bg-slate-50 border border-slate-200 rounded px-2 py-1 text-center font-mono text-sm" 
                      title={sub.type !== 'main' ? "Số tiết mặc định / tuần (nếu không tùy chỉnh theo lớp)" : "Số tiết / tuần"}
                    />
                  </td>
                  <td>
                    <select 
                      value={sub.type || 'sub'} 
                      onChange={(e) => updateSubject(idx, 'type', e.target.value)} 
                      className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs font-semibold"
                    >
                      <option value="main">Môn chính</option>
                      <option value="integrated">Tích hợp</option>
                      <option value="sub">Môn phụ</option>
                    </select>
                  </td>
                  <td>
                    <input 
                      type="checkbox" 
                      checked={sub.allowDouble || false} 
                      onChange={(e) => updateSubject(idx, 'allowDouble', e.target.checked)} 
                      className="w-4 h-4 text-brand-600 rounded border-slate-300 focus:ring-brand-500 cursor-pointer" 
                    />
                  </td>
                  <td>
                    <select 
                      value={sub.session || 'all'} 
                      onChange={(e) => updateSubject(idx, 'session', e.target.value)} 
                      className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs"
                    >
                      <option value="all">Cả ngày</option>
                      <option value="morning">Sáng</option>
                      <option value="afternoon">Chiều</option>
                    </select>
                  </td>
                  <td className="text-center">
                    <input 
                      type="checkbox" 
                      checked={sub.allowGradeOverlap !== false} 
                      onChange={(e) => updateSubject(idx, 'allowGradeOverlap', e.target.checked)} 
                      className="w-4 h-4 text-brand-600 rounded border-slate-300 focus:ring-brand-500 cursor-pointer" 
                      title="Cho phép trùng tiết song song các lớp cùng khối"
                    />
                  </td>
                  <td>
                    <input 
                      type="checkbox" 
                      checked={sub.hasExam || false} 
                      onChange={(e) => {
                        const newSubs = [...subjects];
                        newSubs[idx].hasExam = e.target.checked;
                        if (e.target.checked) newSubs[idx].examDuration = newSubs[idx].examDuration || 1;
                        setSubjects(newSubs);
                      }} 
                      className="w-4 h-4 text-brand-600 rounded border-slate-300 focus:ring-brand-500 cursor-pointer" 
                    />
                  </td>
                  <td>
                    <select 
                      value={sub.examDuration || 1} 
                      disabled={!sub.hasExam}
                      onChange={(e) => updateSubject(idx, 'examDuration', parseInt(e.target.value))} 
                      className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs disabled:opacity-30"
                    >
                      <option value={1}>1 tiết</option>
                      <option value={2}>2 tiết</option>
                    </select>
                  </td>
                  <td className="text-right">
                    <button onClick={() => handleDeleteSubject(sub.id)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
                {expandedId === sub.id && (
                  <tr className="bg-slate-50/50">
                    <td></td>
                    <td colSpan={9} className="p-4 border-t border-slate-100">
                      <div className="bg-white rounded-lg border border-slate-200 p-4">
                        <h4 className="text-sm font-bold text-slate-700 mb-3">Tùy chỉnh số tiết theo lớp / học kì</h4>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                          {[6, 7, 8, 9].map(grade => (
                            <div key={grade} className="space-y-2">
                              <div className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded">Lớp {grade}</div>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-slate-400 w-8">Kì I</span>
                                <input 
                                  type="number"
                                  min="0"
                                  placeholder={(sub.lessonsPerWeek ?? 0).toString()}
                                  value={sub.gradeConfigs?.[grade]?.term1 ?? ''}
                                  onChange={(e) => updateGradeConfig(idx, grade, 'term1', e.target.value)}
                                  className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-sm"
                                />
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-slate-400 w-8">Kì II</span>
                                <input 
                                  type="number"
                                  min="0"
                                  placeholder={(sub.lessonsPerWeek ?? 0).toString()}
                                  value={sub.gradeConfigs?.[grade]?.term2 ?? ''}
                                  onChange={(e) => updateGradeConfig(idx, grade, 'term2', e.target.value)}
                                  className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-sm"
                                />
                              </div>
                              <div className="flex flex-col gap-2 mt-2 pt-2 border-t border-slate-100">
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-medium text-blue-600 w-16">Tuần lẻ</span>
                                  <input 
                                    type="number"
                                    min="0"
                                    placeholder="Không"
                                    value={sub.gradeConfigs?.[grade]?.oddWeek ?? ''}
                                    onChange={(e) => updateGradeConfig(idx, grade, 'oddWeek', e.target.value)}
                                    className="w-full bg-blue-50/50 border border-blue-200 rounded px-2 py-1 text-sm text-blue-700 placeholder-blue-300 focus:ring-blue-500 focus:border-blue-500"
                                  />
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-medium text-purple-600 w-16">Tuần chẵn</span>
                                  <input 
                                    type="number"
                                    min="0"
                                    placeholder="Không"
                                    value={sub.gradeConfigs?.[grade]?.evenWeek ?? ''}
                                    onChange={(e) => updateGradeConfig(idx, grade, 'evenWeek', e.target.value)}
                                    className="w-full bg-purple-50/50 border border-purple-200 rounded px-2 py-1 text-sm text-purple-700 placeholder-purple-300 focus:ring-purple-500 focus:border-purple-500"
                                  />
                                </div>
                                <div className="flex items-center gap-2 pt-1">
                                  <span className="text-[10px] font-medium text-emerald-600 w-16">Tuần bổ sung</span>
                                  <input 
                                    type="number"
                                    min="0"
                                    placeholder="Không"
                                    value={sub.gradeConfigs?.[grade]?.customWeek ?? ''}
                                    onChange={(e) => updateGradeConfig(idx, grade, 'customWeek', e.target.value)}
                                    className="w-full bg-emerald-50/50 border border-emerald-200 rounded px-2 py-1 text-sm text-emerald-700 placeholder-emerald-300 focus:ring-emerald-500 focus:border-emerald-500"
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TeacherConfig({ teachers, setTeachers, subjects, classes, config }: { teachers: Teacher[], setTeachers: any, subjects: Subject[], classes: Class[], config: Config }) {
  const handleAddTeacher = () => {
    const newId = `t${Date.now()}`;
    setTeachers([...teachers, {
      id: newId,
      name: 'Giáo viên mới',
      specialization: '',
      assignments: [{ subjectId: subjects[0] ? subjects[0].id : '', classIds: [] }],
      maxLessonsPerWeek: 20,
      maxLessonsPerSession: 4,
      maxConsecutive: 3,
      normalLessons: 18,
      extraLessons: 0
    }]);
  };

  const handleDeleteTeacher = (id: string) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa giáo viên này?')) {
      setTeachers(teachers.filter((t: Teacher) => t.id !== id));
    }
  };

  const updateTeacher = (idx: number, field: keyof Teacher, value: any) => {
    const newT = [...teachers];
    (newT[idx] as any)[field] = value;
    setTeachers(newT);
  };

  const [isSplitModalOpen, setIsSplitModalOpen] = useState(false);

  // Helper to compute assigned normal & extra lessons from teacher assignments
  const getTeacherAssignedLessons = (teacher: Teacher) => {
    let computedNormal = 0;
    let computedExtra = 0;
    teacher.assignments.forEach(a => {
      const sub = subjects.find(s => s.id === a.subjectId);
      a.classIds.forEach(cId => {
        const cls = classes.find(c => c.id === cId);
        if (!cls) return;
        const explicitLessons = a.classLessons?.[cId];
        const weekType = a.weekTypes?.[cId] || getSubjectDefaultWeekType(sub, cls.grade);
        const lessonCount = explicitLessons !== undefined && explicitLessons >= 0 
          ? explicitLessons 
          : getAssignmentDefaultLessons(sub, cls.grade, weekType, config);
        if (weekType === 'all') {
          computedNormal += lessonCount;
        } else {
          computedExtra += lessonCount;
        }
      });
    });
    return { computedNormal, computedExtra, totalComputed: computedNormal + computedExtra };
  };

  // Overall school-wide teacher stats
  const totalSchoolStats = teachers.reduce((acc, t) => {
    const { computedNormal, computedExtra } = getTeacherAssignedLessons(t);
    const norm = t.normalLessons !== undefined ? t.normalLessons : computedNormal;
    const ext = t.extraLessons !== undefined ? t.extraLessons : computedExtra;
    return {
      normal: acc.normal + norm,
      extra: acc.extra + ext,
      total: acc.total + norm + ext
    };
  }, { normal: 0, extra: 0, total: 0 });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-text-main">Đội ngũ giáo viên</h2>
          <p className="text-base text-text-muted mt-1.5">Quản lý định mức tiết bình thường, tiết bổ sung và phân công giảng dạy</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button 
            onClick={() => setIsSplitModalOpen(true)} 
            className="px-4 py-2.5 bg-brand-50 hover:bg-brand-100 text-brand-700 border border-brand-200 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-sm"
          >
            <Layers className="w-4 h-4 text-brand-600" />
            Phân công KHTN / Sử-Địa / Chia tiết
          </button>
          <button onClick={handleAddTeacher} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> Thêm giáo viên
          </button>
        </div>
      </div>

      {/* Stats Summary Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gradient-to-r from-brand-900 via-slate-900 to-brand-950 text-white rounded-2xl shadow-md">
        <div className="p-3 bg-white/10 rounded-xl border border-white/10">
          <p className="text-[10px] font-bold text-brand-300 uppercase tracking-wider mb-1">Tổng số Giáo viên</p>
          <p className="text-xl font-black text-white">{teachers.length} <span className="text-xs font-normal text-slate-300">người</span></p>
        </div>
        <div className="p-3 bg-white/10 rounded-xl border border-white/10">
          <p className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider mb-1">Tiết Bình thường (Chính khóa)</p>
          <p className="text-xl font-black text-emerald-400">{totalSchoolStats.normal} <span className="text-xs font-normal text-slate-300">tiết/tuần</span></p>
        </div>
        <div className="p-3 bg-white/10 rounded-xl border border-white/10">
          <p className="text-[10px] font-bold text-amber-300 uppercase tracking-wider mb-1">Tiết Bổ sung (Tăng cường/Lẻ-Chẵn)</p>
          <p className="text-xl font-black text-amber-300">{totalSchoolStats.extra} <span className="text-xs font-normal text-slate-300">tiết/tuần</span></p>
        </div>
        <div className="p-3 bg-white/10 rounded-xl border border-white/10">
          <p className="text-[10px] font-bold text-brand-200 uppercase tracking-wider mb-1">Tổng tải dạy toàn trường</p>
          <p className="text-xl font-black text-brand-300">{totalSchoolStats.total} <span className="text-xs font-normal text-slate-300">tiết/tuần</span></p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {teachers.map((t, idx) => {
          const { computedNormal, computedExtra, totalComputed } = getTeacherAssignedLessons(t);
          const activeNormal = t.normalLessons !== undefined ? t.normalLessons : computedNormal;
          const activeExtra = t.extraLessons !== undefined ? t.extraLessons : computedExtra;

          return (
            <div key={t.id} className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm hover:border-brand-300 transition-all group">
              <div className="flex flex-col xl:flex-row gap-6">
                {/* Basic Info & Workload Limits */}
                <div className="xl:w-1/3 space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-brand-50 text-brand-600 rounded-2xl flex items-center justify-center font-bold text-lg">
                        {t.name.split(' ').pop()?.charAt(0)}
                      </div>
                      <div className="flex-grow">
                        <input 
                          value={t.name || ''} 
                          onChange={(e) => updateTeacher(idx, 'name', e.target.value)} 
                          className="block w-full font-bold text-slate-900 bg-transparent focus:outline-none focus:ring-2 focus:ring-brand-500/20 rounded px-1 -ml-1" 
                        />
                        <input 
                          value={t.specialization || ''} 
                          onChange={(e) => updateTeacher(idx, 'specialization', e.target.value)} 
                          placeholder="Chuyên môn..." 
                          className="block w-full text-xs font-bold text-slate-400 uppercase tracking-widest bg-transparent focus:outline-none focus:ring-2 focus:ring-brand-500/20 rounded px-1 -ml-1 mt-1" 
                        />
                      </div>
                    </div>
                    <button onClick={() => handleDeleteTeacher(t.id)} className="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Workload breakdown: Normal vs Supplementary/Extra */}
                  <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200/80 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700">Tải dạy hiện tại:</span>
                      <span className="px-2.5 py-0.5 bg-brand-100 text-brand-800 rounded-full text-xs font-black">
                        {totalComputed} tiết phân công
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      {/* Normal Lessons */}
                      <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Tiết bình thường</label>
                          <span className="text-[10px] font-bold text-slate-400" title="Số tiết phân công thực tế từ các lớp">(Thực dạy: {computedNormal})</span>
                        </div>
                        <input 
                          type="number" 
                          min={0}
                          value={activeNormal} 
                          onChange={(e) => updateTeacher(idx, 'normalLessons', parseInt(e.target.value) || 0)} 
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 font-mono font-extrabold text-sm text-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-500" 
                          placeholder="Bình thường"
                        />
                      </div>

                      {/* Extra / Supplementary Lessons */}
                      <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">Tiết bổ sung</label>
                          <span className="text-[10px] font-bold text-slate-400" title="Số tiết dạy tuần lẻ/chẵn/tăng cường">(Thực dạy: {computedExtra})</span>
                        </div>
                        <input 
                          type="number" 
                          min={0}
                          value={activeExtra} 
                          onChange={(e) => updateTeacher(idx, 'extraLessons', parseInt(e.target.value) || 0)} 
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 font-mono font-extrabold text-sm text-amber-800 focus:outline-none focus:ring-2 focus:ring-amber-500" 
                          placeholder="Bổ sung"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Max Limits */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Max tiết/tuần</label>
                      <input 
                        type="number" 
                        value={t.maxLessonsPerWeek} 
                        onChange={(e) => updateTeacher(idx, 'maxLessonsPerWeek', parseInt(e.target.value) || 0)} 
                        className="w-full bg-transparent font-mono font-bold text-slate-700 focus:outline-none" 
                      />
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Max tiết/buổi</label>
                      <input 
                        type="number" 
                        value={t.maxLessonsPerSession} 
                        onChange={(e) => updateTeacher(idx, 'maxLessonsPerSession', parseInt(e.target.value) || 0)} 
                        className="w-full bg-transparent font-mono font-bold text-slate-700 focus:outline-none" 
                      />
                    </div>
                  </div>
                </div>

                {/* Assignments */}
                <div className="xl:flex-grow">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                      <GraduationCap className="w-4 h-4 text-brand-500" />
                      Phân công giảng dạy
                    </h4>
                    <button 
                      onClick={() => {
                        const newT = [...teachers];
                        newT[idx].assignments.push({ subjectId: subjects[0]?.id || '', classIds: [] });
                        setTeachers(newT);
                      }}
                      className="text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> Thêm môn
                    </button>
                  </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {t.assignments.map((assignment, aIdx) => (
                    <div key={aIdx} className="p-4 bg-slate-50/50 border border-slate-100 rounded-2xl relative group/item">
                      <button 
                        onClick={() => {
                          const newT = [...teachers];
                          newT[idx].assignments.splice(aIdx, 1);
                          setTeachers(newT);
                        }}
                        className="absolute top-2 right-2 text-slate-300 hover:text-rose-600 opacity-0 group-hover/item:opacity-100 transition-all"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      
                      <div className="mb-3">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Môn học</label>
                        <select 
                          value={assignment.subjectId || ''}
                          onChange={(e) => {
                            const newSubjectId = e.target.value;
                            const newT = [...teachers];
                            newT[idx].assignments[aIdx].subjectId = newSubjectId;
                            setTeachers(newT);
                          }}
                          className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-brand-500/20 outline-none"
                        >
                          {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Lớp phụ trách</label>
                          <button
                            type="button"
                            onClick={() => setIsSplitModalOpen(true)}
                            className="text-[10px] text-brand-600 hover:text-brand-700 font-bold flex items-center gap-1"
                          >
                            <Layers className="w-3 h-3" /> Chi tiết tiết/phân môn
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {classes.map(c => {
                            const isSelected = assignment.classIds.includes(c.id);
                            return (
                              <button
                                key={c.id}
                                onClick={() => {
                                  const newT = [...teachers];
                                  if (isSelected) {
                                    newT[idx].assignments[aIdx].classIds = newT[idx].assignments[aIdx].classIds.filter(id => id !== c.id);
                                    if (newT[idx].assignments[aIdx].classLessons) {
                                      delete newT[idx].assignments[aIdx].classLessons![c.id];
                                    }
                                    if (newT[idx].assignments[aIdx].weekTypes) {
                                      delete newT[idx].assignments[aIdx].weekTypes![c.id];
                                    }
                                  } else {
                                    newT[idx].assignments[aIdx].classIds.push(c.id);
                                    const sub = subjects.find(s => s.id === assignment.subjectId);
                                    if (sub) {
                                      const defWeekType = getSubjectDefaultWeekType(sub, c.grade);
                                      const defLessons = getAssignmentDefaultLessons(sub, c.grade, defWeekType, config);
                                      
                                      if (!newT[idx].assignments[aIdx].classLessons) {
                                        newT[idx].assignments[aIdx].classLessons = {};
                                      }
                                      newT[idx].assignments[aIdx].classLessons![c.id] = defLessons;
                                      
                                      if (!newT[idx].assignments[aIdx].weekTypes) {
                                        newT[idx].assignments[aIdx].weekTypes = {};
                                      }
                                      newT[idx].assignments[aIdx].weekTypes![c.id] = defWeekType;
                                    }
                                  }
                                  setTeachers(newT);
                                }}
                                className={`px-2 py-1 rounded-md text-[10px] font-bold transition-all border ${
                                  isSelected 
                                    ? 'bg-brand-600 border-brand-600 text-white shadow-sm' 
                                    : 'bg-white border-slate-200 text-slate-500 hover:border-brand-300 hover:text-brand-600'
                                }`}
                              >
                                {c.name}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Time Off Config */}
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                      <Clock className="w-4 h-4 text-brand-500" />
                      Lịch xin nghỉ
                    </h4>
                    <button 
                      onClick={() => {
                        const newT = [...teachers];
                        if (!newT[idx].timeOff) newT[idx].timeOff = [];
                        newT[idx].timeOff!.push({ day: 0, session: 'all' });
                        setTeachers(newT);
                      }}
                      className="text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> Thêm lịch nghỉ
                    </button>
                  </div>
                  
                  {t.timeOff && t.timeOff.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {t.timeOff.map((off, oIdx) => (
                        <div key={oIdx} className="flex items-center gap-2 bg-slate-50 p-2 rounded-lg border border-slate-200">
                          <select 
                            value={off.day}
                            onChange={(e) => {
                              const newT = [...teachers];
                              newT[idx].timeOff![oIdx].day = parseInt(e.target.value);
                              setTeachers(newT);
                            }}
                            className="bg-white border border-slate-200 rounded px-2 py-1 text-xs font-bold text-slate-700 outline-none flex-grow"
                          >
                            <option value={0}>Thứ 2</option>
                            <option value={1}>Thứ 3</option>
                            <option value={2}>Thứ 4</option>
                            <option value={3}>Thứ 5</option>
                            <option value={4}>Thứ 6</option>
                            <option value={5}>Thứ 7</option>
                          </select>
                          <select 
                            value={off.session}
                            onChange={(e) => {
                              const newT = [...teachers];
                              newT[idx].timeOff![oIdx].session = e.target.value as any;
                              setTeachers(newT);
                            }}
                            className="bg-white border border-slate-200 rounded px-2 py-1 text-xs font-bold text-slate-700 outline-none"
                          >
                            <option value="all">Cả ngày</option>
                            <option value="morning">Sáng</option>
                            <option value="afternoon">Chiều</option>
                          </select>
                          <button 
                            onClick={() => {
                              const newT = [...teachers];
                              newT[idx].timeOff!.splice(oIdx, 1);
                              setTeachers(newT);
                            }}
                            className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[10px] text-slate-400 italic">Không có lịch nghỉ</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
      </div>

      <SplitTeacherModal
        isOpen={isSplitModalOpen}
        onClose={() => setIsSplitModalOpen(false)}
        classes={classes}
        subjects={subjects}
        teachers={teachers}
        setTeachers={setTeachers}
        config={config}
      />
    </div>
  );
}

function ClassConfig({ classes, setClasses, config, setConfig }: { classes: Class[], setClasses: any, config: Config, setConfig: any }) {
  const gradeCounts = config.gradeCounts || { 6: 2, 7: 2, 8: 2, 9: 2 };
  const gradePrefixes = config.gradePrefixes || { 6: 'A', 7: 'B', 8: 'C', 9: 'D' };

  const generateClasses = () => {
    const newClasses: Class[] = [];
    let idCounter = 1;
    [6, 7, 8, 9].forEach(grade => {
      const count = gradeCounts[grade as keyof typeof gradeCounts] || 0;
      const letter = gradePrefixes[grade as keyof typeof gradePrefixes] || '';
      for (let i = 1; i <= count; i++) {
        newClasses.push({ id: `c${idCounter++}`, name: `${grade}${letter}${i}`, grade });
      }
    });
    setClasses(newClasses);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-text-main">Cấu trúc lớp học</h2>
          <p className="text-base text-text-muted mt-1.5">Thiết lập số lượng lớp và quy tắc đặt tên</p>
        </div>
        <button onClick={generateClasses} className="btn-primary flex items-center gap-2">
          <RotateCcw className="w-4 h-4" /> Sinh danh sách lớp
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[6, 7, 8, 9].map(grade => (
          <div key={grade} className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center justify-between mb-6">
              <div className="w-12 h-12 bg-brand-50 text-brand-600 rounded-2xl flex items-center justify-center font-bold text-xl">
                {grade}
              </div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Khối lớp</span>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Tiền tố tên lớp</label>
                <input
                  type="text"
                  className="input-field font-bold text-center"
                  value={gradePrefixes[grade as keyof typeof gradePrefixes] || ''}
                  onChange={(e) => setConfig({...config, gradePrefixes: {...gradePrefixes, [grade]: e.target.value}})}
                  placeholder="VD: A, B..."
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Số lượng lớp</label>
                <div className="flex items-center justify-between bg-slate-50 rounded-xl p-1 border border-slate-100">
                  <button 
                    onClick={() => setConfig({...config, gradeCounts: {...gradeCounts, [grade]: Math.max(0, (gradeCounts[grade as keyof typeof gradeCounts] || 0) - 1)}})}
                    className="w-8 h-8 flex items-center justify-center bg-white border border-slate-200 rounded-lg text-slate-600 hover:text-rose-600 transition-colors shadow-sm"
                  >-</button>
                  <span className="text-lg font-bold text-slate-700">{gradeCounts[grade as keyof typeof gradeCounts] || 0}</span>
                  <button 
                    onClick={() => setConfig({...config, gradeCounts: {...gradeCounts, [grade]: (gradeCounts[grade as keyof typeof gradeCounts] || 0) + 1}})}
                    className="w-8 h-8 flex items-center justify-center bg-white border border-slate-200 rounded-lg text-slate-600 hover:text-brand-600 transition-colors shadow-sm"
                  >+</button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200">
        <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-brand-600" />
          Danh sách lớp hiện tại ({classes.length})
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
          {classes.map((cls, idx) => (
            <div key={cls.id} className="relative group">
              <input
                value={cls.name || ''}
                onChange={(e) => {
                  const newClasses = [...classes];
                  newClasses[idx].name = e.target.value;
                  setClasses(newClasses);
                }}
                className="w-full bg-white border border-slate-200 rounded-lg py-2 text-center text-sm font-bold text-slate-700 shadow-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
              />
              <div className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-slate-400 text-white text-[8px] font-bold rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                {idx + 1}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DailyPeriodsConfigUI({ config, setConfig, classes }: { config: Config; setConfig: any; classes: Class[] }) {
  const [activeTab, setActiveTab] = useState<'grade' | 'class'>('grade');
  const [selectedClassId, setSelectedClassId] = useState<string>(classes[0]?.id || '');

  const numDays = config.days || 6;
  const daysList = Array.from({ length: numDays }, (_, i) => i);
  const grades = [6, 7, 8, 9];

  const getGradeLimit = (grade: number, day: number) => {
    const list = config.gradeDailyPeriods?.[grade];
    if (list && list[day]) {
      return {
        morning: list[day].morning ?? config.morningLessons ?? 5,
        afternoon: list[day].afternoon ?? config.afternoonLessons ?? 0,
      };
    }
    return {
      morning: config.morningLessons ?? 5,
      afternoon: config.afternoonLessons ?? 0,
    };
  };

  const updateGradeLimit = (grade: number, day: number, session: 'morning' | 'afternoon', value: number) => {
    const currentGrades = { ...(config.gradeDailyPeriods || {}) };
    if (!currentGrades[grade]) {
      currentGrades[grade] = daysList.map(() => ({
        morning: config.morningLessons ?? 5,
        afternoon: config.afternoonLessons ?? 0,
      }));
    } else {
      currentGrades[grade] = [...currentGrades[grade]];
      for (let d = 0; d < numDays; d++) {
        if (!currentGrades[grade][d]) {
          currentGrades[grade][d] = {
            morning: config.morningLessons ?? 5,
            afternoon: config.afternoonLessons ?? 0,
          };
        }
      }
    }

    currentGrades[grade][day] = {
      ...currentGrades[grade][day],
      [session]: Math.max(0, Math.min(6, value)),
    };

    setConfig({ ...config, gradeDailyPeriods: currentGrades });
  };

  const applyPresetForGrade = (grade: number, preset: 'standard' | 'morning_only' | 'full' | 'school_29_lessons') => {
    const currentGrades = { ...(config.gradeDailyPeriods || {}) };
    currentGrades[grade] = daysList.map(d => {
      if (preset === 'morning_only') return { morning: 4, afternoon: 0 };
      if (preset === 'full') return { morning: 4, afternoon: d === 5 ? 0 : 3 };
      if (preset === 'school_29_lessons') {
        // d=0 (Thứ 2), d=1 (Thứ 3), d=2 (Thứ 4), d=3 (Thứ 5), d=4 (Thứ 6), d=5 (Thứ 7)
        if (d === 0 || d === 1) return { morning: 4, afternoon: 0 }; // T2 chiều Họp, T3 chiều Ôn HSG
        if (d >= 2 && d <= 4) return { morning: 4, afternoon: 3 }; // T4, T5, T6: Sáng 4, Chiều 3
        return { morning: 0, afternoon: 0 }; // Thứ 7 nghỉ
      }
      return { morning: 4, afternoon: (d === 0 || d === 2 || d === 4) ? 3 : 0 };
    });
    setConfig({ ...config, gradeDailyPeriods: currentGrades });
  };

  const applyPresetForAllGrades = (preset: 'school_29_lessons' | 'morning_only' | 'standard') => {
    const currentGrades = { ...(config.gradeDailyPeriods || {}) };
    grades.forEach(g => {
      currentGrades[g] = daysList.map(d => {
        if (preset === 'school_29_lessons') {
          if (d === 0 || d === 1) return { morning: 4, afternoon: 0 };
          if (d >= 2 && d <= 4) return { morning: 4, afternoon: 3 };
          return { morning: 0, afternoon: 0 };
        }
        if (preset === 'morning_only') return { morning: 4, afternoon: 0 };
        return { morning: 4, afternoon: (d === 0 || d === 2 || d === 4) ? 3 : 0 };
      });
    });
    setConfig({ ...config, gradeDailyPeriods: currentGrades, morningLessons: 4, afternoonLessons: 3 });
  };

  const hasClassOverride = (classId: string) => {
    return !!(config.classDailyPeriods && config.classDailyPeriods[classId]);
  };

  const getClassLimit = (classId: string, day: number) => {
    const cls = classes.find(c => c.id === classId);
    if (!cls) return { morning: config.morningLessons ?? 5, afternoon: config.afternoonLessons ?? 0 };
    if (config.classDailyPeriods && config.classDailyPeriods[classId] && config.classDailyPeriods[classId][day]) {
      const lim = config.classDailyPeriods[classId][day];
      return {
        morning: lim.morning ?? config.morningLessons ?? 5,
        afternoon: lim.afternoon ?? config.afternoonLessons ?? 0,
      };
    }
    return getGradeLimit(cls.grade, day);
  };

  const enableClassOverride = (classId: string) => {
    const cls = classes.find(c => c.id === classId);
    if (!cls) return;
    const currentClasses = { ...(config.classDailyPeriods || {}) };
    currentClasses[classId] = daysList.map(d => getGradeLimit(cls.grade, d));
    setConfig({ ...config, classDailyPeriods: currentClasses });
  };

  const removeClassOverride = (classId: string) => {
    const currentClasses = { ...(config.classDailyPeriods || {}) };
    delete currentClasses[classId];
    setConfig({ ...config, classDailyPeriods: currentClasses });
  };

  const updateClassLimit = (classId: string, day: number, session: 'morning' | 'afternoon', value: number) => {
    const cls = classes.find(c => c.id === classId);
    if (!cls) return;
    const currentClasses = { ...(config.classDailyPeriods || {}) };
    if (!currentClasses[classId]) {
      currentClasses[classId] = daysList.map(d => getGradeLimit(cls.grade, d));
    } else {
      currentClasses[classId] = [...currentClasses[classId]];
    }

    currentClasses[classId][day] = {
      ...currentClasses[classId][day],
      [session]: Math.max(0, Math.min(6, value)),
    };

    setConfig({ ...config, classDailyPeriods: currentClasses });
  };

  const selectedClass = classes.find(c => c.id === selectedClassId) || classes[0];

  return (
    <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-brand-600" />
            Cấu hình số tiết từng ngày (Theo Khối & Lớp)
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Thiết lập số tiết sáng và tiết chiều thực tế cho mỗi thứ trong tuần (Thứ 2 - Thứ {numDays + 1}).
          </p>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-xl self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('grade')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'grade'
                ? 'bg-white text-brand-700 shadow-sm'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Theo Khối
          </button>
          <button
            onClick={() => setActiveTab('class')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'class'
                ? 'bg-white text-brand-700 shadow-sm'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Theo Lớp ({Object.keys(config.classDailyPeriods || {}).length} lớp ghi đè)
          </button>
        </div>
      </div>

      {activeTab === 'grade' && (
        <div className="space-y-6">
          {/* Global Quick Action Bar */}
          <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs">
            <div>
              <span className="font-extrabold text-amber-900 block">⚡ Áp dụng mẫu nhanh toàn trường (Khối 6, 7, 8, 9):</span>
              <p className="text-amber-800 text-[11px] mt-0.5">Tự động cấu hình số tiết Sáng &amp; Chiều chuẩn 29 tiết/tuần theo đúng thời khóa biểu trường của bạn.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => applyPresetForAllGrades('school_29_lessons')}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-extrabold rounded-lg shadow-xs transition-colors"
              >
                Mẫu chuẩn 29 tiết (Sáng 4, Chiều T4-T6)
              </button>
              <button
                onClick={() => applyPresetForAllGrades('morning_only')}
                className="px-2.5 py-1.5 bg-white border border-amber-300 text-amber-900 font-bold rounded-lg hover:bg-amber-100 transition-colors"
              >
                Chỉ học sáng (20 tiết)
              </button>
            </div>
          </div>

          {grades.map(grade => {
            return (
              <div key={grade} className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-lg bg-brand-600 text-white font-bold flex items-center justify-center text-sm shadow-sm">
                      {grade}
                    </span>
                    <h4 className="font-bold text-slate-900 text-sm">Khối {grade}</h4>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px]">
                    <span className="text-slate-400 font-medium mr-1">Mẫu nhanh:</span>
                    <button
                      onClick={() => applyPresetForGrade(grade, 'school_29_lessons')}
                      className="px-2 py-1 bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200 rounded font-bold transition-colors"
                    >
                      Mẫu 29 tiết (Sáng 4, Chiều T4-T6)
                    </button>
                    <button
                      onClick={() => applyPresetForGrade(grade, 'morning_only')}
                      className="px-2 py-1 bg-white border border-slate-200 hover:border-brand-300 rounded text-slate-700 hover:text-brand-600 font-medium transition-colors"
                    >
                      Chỉ học sáng
                    </button>
                    <button
                      onClick={() => applyPresetForGrade(grade, 'standard')}
                      className="px-2 py-1 bg-white border border-slate-200 hover:border-brand-300 rounded text-slate-700 hover:text-brand-600 font-medium transition-colors"
                    >
                      Chiều T2,T4,T6
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                  {daysList.map(d => {
                    const lim = getGradeLimit(grade, d);
                    return (
                      <div key={d} className="bg-white border border-slate-200 rounded-lg p-2 text-center space-y-1.5 shadow-2xs">
                        <span className="block text-[11px] font-bold text-slate-600 uppercase">Thứ {d + 2}</span>
                        <div className="grid grid-cols-2 gap-1 items-center">
                          <div className="space-y-0.5">
                            <span className="text-[9px] font-bold text-amber-600 block uppercase">Sáng</span>
                            <input
                              type="number"
                              min="0"
                              max="6"
                              value={lim.morning}
                              onChange={(e) => updateGradeLimit(grade, d, 'morning', parseInt(e.target.value) || 0)}
                              className="w-full bg-slate-50 border border-slate-200 rounded text-center py-0.5 text-xs font-bold font-mono"
                            />
                          </div>
                          <div className="space-y-0.5">
                            <span className="text-[9px] font-bold text-indigo-600 block uppercase">Chiều</span>
                            <input
                              type="number"
                              min="0"
                              max="6"
                              value={lim.afternoon}
                              onChange={(e) => updateGradeLimit(grade, d, 'afternoon', parseInt(e.target.value) || 0)}
                              className="w-full bg-slate-50 border border-slate-200 rounded text-center py-0.5 text-xs font-bold font-mono"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {activeTab === 'class' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Chọn lớp:</label>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="input-field font-bold py-1.5 px-3 text-sm min-w-[150px]"
              >
                {classes.map(c => (
                  <option key={c.id} value={c.id}>
                    Lớp {c.name} {hasClassOverride(c.id) ? ' (Ghi đè)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {selectedClass && (
              <div className="flex items-center gap-2">
                {hasClassOverride(selectedClass.id) ? (
                  <button
                    onClick={() => removeClassOverride(selectedClass.id)}
                    className="px-3 py-1.5 bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5"
                  >
                    <X className="w-3.5 h-3.5" /> Hủy ghi đè (Dùng cấu hình Khối {selectedClass.grade})
                  </button>
                ) : (
                  <button
                    onClick={() => enableClassOverride(selectedClass.id)}
                    className="px-3 py-1.5 bg-brand-50 text-brand-700 border border-brand-200 hover:bg-brand-100 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" /> Tạo cấu hình riêng cho lớp {selectedClass.name}
                  </button>
                )}
              </div>
            )}
          </div>

          {selectedClass && (
            <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-slate-900 text-sm">
                  Cấu hình tiết học riêng cho lớp <span className="text-brand-600">{selectedClass.name}</span>
                </h4>
                <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full ${
                  hasClassOverride(selectedClass.id)
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-slate-100 text-slate-500'
                }`}>
                  {hasClassOverride(selectedClass.id) ? 'Đang dùng cấu hình riêng' : `Đang kế thừa từ Khối ${selectedClass.grade}`}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                {daysList.map(d => {
                  const lim = getClassLimit(selectedClass.id, d);
                  const isOverride = hasClassOverride(selectedClass.id);

                  return (
                    <div key={d} className={`border rounded-lg p-2 text-center space-y-1.5 shadow-2xs ${
                      isOverride ? 'bg-amber-50/20 border-amber-200' : 'bg-slate-50 border-slate-200 opacity-70'
                    }`}>
                      <span className="block text-[11px] font-bold text-slate-600 uppercase">Thứ {d + 2}</span>
                      <div className="grid grid-cols-2 gap-1 items-center">
                        <div className="space-y-0.5">
                          <span className="text-[9px] font-bold text-amber-600 block uppercase">Sáng</span>
                          <input
                            type="number"
                            min="0"
                            max="6"
                            disabled={!isOverride}
                            value={lim.morning}
                            onChange={(e) => updateClassLimit(selectedClass.id, d, 'morning', parseInt(e.target.value) || 0)}
                            className="w-full bg-white border border-slate-200 rounded text-center py-0.5 text-xs font-bold font-mono disabled:bg-slate-100"
                          />
                        </div>
                        <div className="space-y-0.5">
                          <span className="text-[9px] font-bold text-indigo-600 block uppercase">Chiều</span>
                          <input
                            type="number"
                            min="0"
                            max="6"
                            disabled={!isOverride}
                            value={lim.afternoon}
                            onChange={(e) => updateClassLimit(selectedClass.id, d, 'afternoon', parseInt(e.target.value) || 0)}
                            className="w-full bg-white border border-slate-200 rounded text-center py-0.5 text-xs font-bold font-mono disabled:bg-slate-100"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TimeConfig({ config, setConfig, classes, subjects }: { config: Config; setConfig: any; classes: Class[]; subjects: Subject[] }) {
  const fixedPeriods = config.fixedPeriods || [];

  const addFixedPeriod = () => {
    const newFp = {
      id: Math.random().toString(36).substr(2, 9),
      day: 0, // Thứ 2
      period: 0, // Tiết 1
      subjectId: subjects[0]?.id || '',
    };
    setConfig({
      ...config,
      fixedPeriods: [...fixedPeriods, newFp]
    });
  };

  const removeFixedPeriod = (id: string) => {
    setConfig({
      ...config,
      fixedPeriods: fixedPeriods.filter(fp => fp.id !== id)
    });
  };

  const updateFixedPeriod = (id: string, field: string, value: any) => {
    setConfig({
      ...config,
      fixedPeriods: fixedPeriods.map(fp => {
        if (fp.id === id) {
          return { ...fp, [field]: value };
        }
        return fp;
      })
    });
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-text-main">Cấu hình thời gian & Tiết học</h2>
        <p className="text-base text-text-muted mt-1.5">Thiết lập khung giờ học, quy định số tiết hàng ngày cho từng khối/lớp</p>
      </div>

      <DailyPeriodsConfigUI config={config} setConfig={setConfig} classes={classes} />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm">
            <h3 className="font-bold text-slate-900 mb-6 flex items-center gap-2">
              <Settings className="w-5 h-5 text-brand-600" />
              Cấu hình ứng dụng
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Tên ứng dụng (Header)</label>
                <input 
                  type="text" 
                  value={config.appName || ''} 
                  onChange={(e) => setConfig({...config, appName: e.target.value})} 
                  className="input-field font-bold" 
                  placeholder="VD: SmartSchedule"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Mô tả ứng dụng (Header)</label>
                <input 
                  type="text" 
                  value={config.appSubtitle || ''} 
                  onChange={(e) => setConfig({...config, appSubtitle: e.target.value})} 
                  className="input-field" 
                  placeholder="VD: HỆ THỐNG XẾP TKB THCS"
                />
              </div>
            </div>
          </div>

          <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm">
            <h3 className="font-bold text-slate-900 mb-6 flex items-center gap-2">
              <School className="w-5 h-5 text-brand-600" />
              Thông tin trường học
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Tên trường</label>
                <input 
                  type="text" 
                  value={config.schoolName || ''} 
                  onChange={(e) => setConfig({...config, schoolName: e.target.value})} 
                  className="input-field" 
                  placeholder="VD: Trường THCS Suối Lư"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Năm học</label>
                  <input 
                    type="text" 
                    value={config.schoolYear || ''} 
                    onChange={(e) => setConfig({...config, schoolYear: e.target.value})} 
                    className="input-field" 
                    placeholder="VD: 2025 - 2026"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Học kì áp dụng</label>
                  <select 
                    value={config.currentTerm || 'I'} 
                    onChange={(e) => setConfig({...config, currentTerm: e.target.value as any})} 
                    className="input-field"
                  >
                    <option value="I">Học kì I</option>
                    <option value="II">Học kì II</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Loại tuần</label>
                  <select 
                    value={config.currentWeekType || 'all'} 
                    onChange={(e) => setConfig({...config, currentWeekType: e.target.value as any})} 
                    className="input-field"
                  >
                    <option value="all">Bình thường (Kì I/II)</option>
                    <option value="odd">Tuần lẻ</option>
                    <option value="even">Tuần chẵn</option>
                    <option value="custom">Tuần bổ sung</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Ngày thực hiện</label>
                  <input 
                    type="text" 
                    value={config.executionDate || ''} 
                    onChange={(e) => setConfig({...config, executionDate: e.target.value})} 
                    className="input-field" 
                    placeholder="VD: 23/03/2026"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm">
            <h3 className="font-bold text-slate-900 mb-6 flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-brand-600" />
              Cấu hình tiết học
            </h3>
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Số ngày học trong tuần</label>
                <div className="flex gap-2">
                  {[5, 6].map(d => (
                    <button
                      key={d}
                      onClick={() => setConfig({...config, days: d})}
                      className={`flex-grow py-2 rounded-xl text-sm font-bold transition-all border ${
                        config.days === d 
                          ? 'bg-brand-50 border-brand-200 text-brand-700 shadow-sm' 
                          : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      {d} ngày (Thứ 2 - Thứ {d + 1})
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Số tiết sáng (Max 6)</label>
                  <input 
                    type="number" 
                    min="1" 
                    max="6" 
                    value={config.morningLessons || 0} 
                    onChange={(e) => setConfig({...config, morningLessons: parseInt(e.target.value) || 5})} 
                    className="input-field font-mono font-bold" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Số tiết chiều (Max 6)</label>
                  <input 
                    type="number" 
                    min="0" 
                    max="6" 
                    value={config.afternoonLessons || 0} 
                    onChange={(e) => setConfig({...config, afternoonLessons: parseInt(e.target.value) || 0})} 
                    className="input-field font-mono font-bold" 
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 mt-2">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                    <Clock className="w-4 h-4 text-brand-500" />
                    Lịch nghỉ của trường (Dành cho HĐ khác)
                  </h4>
                  <button 
                    onClick={() => {
                      const newTimeOff = [...(config.timeOff || [])];
                      newTimeOff.push({ day: 0, session: 'all' });
                      setConfig({ ...config, timeOff: newTimeOff });
                    }}
                    className="text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Thêm lịch nghỉ
                  </button>
                </div>
                
                {config.timeOff && config.timeOff.length > 0 ? (
                  <div className="space-y-2">
                    {config.timeOff.map((off, oIdx) => (
                      <div key={oIdx} className="flex items-center gap-2 bg-slate-50 p-2 rounded-lg border border-slate-200">
                        <select 
                          value={off.day}
                          onChange={(e) => {
                            const newTimeOff = [...config.timeOff!];
                            newTimeOff[oIdx].day = parseInt(e.target.value);
                            setConfig({ ...config, timeOff: newTimeOff });
                          }}
                          className="bg-white border border-slate-200 rounded px-2 py-1.5 text-xs font-bold text-slate-700 outline-none flex-grow"
                        >
                          <option value={0}>Thứ 2</option>
                          <option value={1}>Thứ 3</option>
                          <option value={2}>Thứ 4</option>
                          <option value={3}>Thứ 5</option>
                          <option value={4}>Thứ 6</option>
                          <option value={5}>Thứ 7</option>
                        </select>
                        <select 
                          value={off.session}
                          onChange={(e) => {
                            const newTimeOff = [...config.timeOff!];
                            newTimeOff[oIdx].session = e.target.value as any;
                            setConfig({ ...config, timeOff: newTimeOff });
                          }}
                          className="bg-white border border-slate-200 rounded px-2 py-1.5 text-xs font-bold text-slate-700 outline-none"
                        >
                          <option value="all">Cả ngày</option>
                          <option value="morning">Sáng</option>
                          <option value="afternoon">Chiều</option>
                        </select>
                        <button 
                          onClick={() => {
                            const newTimeOff = [...config.timeOff!];
                            newTimeOff.splice(oIdx, 1);
                            setConfig({ ...config, timeOff: newTimeOff });
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[10px] text-slate-400 italic">Không có lịch nghỉ toàn trường</p>
                )}
              </div>
            </div>
          </div>

          <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <Pin className="w-5 h-5 text-brand-600 rotate-45" />
                Cấu hình tiết cố định (Chào cờ, HĐTN...)
              </h3>
              <button 
                onClick={addFixedPeriod}
                className="text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Thêm tiết cố định
              </button>
            </div>

            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              Thiết lập các tiết học đặc thù được xếp cố định cho <strong>tất cả các lớp / khối</strong> (ví dụ: Chào cờ hoặc Hoạt động trải nghiệm ở Tiết 1 Thứ Hai). Tiết này vẫn tự động phân công cho giáo viên giảng dạy môn học đó và tính vào tổng định mức giờ dạy.
            </p>

            {fixedPeriods.length > 0 ? (
              <div className="space-y-3">
                {fixedPeriods.map((fp, idx) => {
                  const totalPeriods = (config.morningLessons || 0) + (config.afternoonLessons || 0);
                  return (
                    <div key={fp.id || idx} className="flex flex-wrap items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                      {/* Day selection */}
                      <div className="flex-1 min-w-[120px]">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Thứ</label>
                        <select 
                          value={fp.day}
                          onChange={(e) => updateFixedPeriod(fp.id, 'day', parseInt(e.target.value))}
                          className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-700 outline-none focus:border-brand-500"
                        >
                          {Array.from({ length: config.days || 6 }).map((_, dIdx) => (
                            <option key={dIdx} value={dIdx}>Thứ {dIdx + 2}</option>
                          ))}
                        </select>
                      </div>

                      {/* Period selection */}
                      <div className="flex-1 min-w-[120px]">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Tiết học</label>
                        <select 
                          value={fp.period}
                          onChange={(e) => updateFixedPeriod(fp.id, 'period', parseInt(e.target.value))}
                          className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-700 outline-none focus:border-brand-500"
                        >
                          {Array.from({ length: totalPeriods }).map((_, pIdx) => {
                            const isMorning = pIdx < (config.morningLessons || 5);
                            const num = isMorning ? pIdx + 1 : pIdx - (config.morningLessons || 5) + 1;
                            return (
                              <option key={pIdx} value={pIdx}>
                                {isMorning ? `Sáng - Tiết ${num}` : `Chiều - Tiết ${num}`}
                              </option>
                            );
                          })}
                        </select>
                      </div>

                      {/* Subject selection */}
                      <div className="flex-grow min-w-[180px]">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Môn học áp dụng</label>
                        <select 
                          value={fp.subjectId}
                          onChange={(e) => updateFixedPeriod(fp.id, 'subjectId', e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-700 outline-none focus:border-brand-500"
                        >
                          <option value="">-- Chọn môn học --</option>
                          {subjects.map(s => (
                            <option key={s.id} value={s.id}>{s.name} ({s.lessonsPerWeek} tiết/tuần)</option>
                          ))}
                        </select>
                      </div>

                      {/* Delete button */}
                      <div className="self-end pb-1">
                        <button 
                          onClick={() => removeFixedPeriod(fp.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Xóa tiết cố định"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-6 border border-dashed border-slate-200 rounded-xl bg-slate-50">
                <Pin className="w-8 h-8 text-slate-300 mx-auto mb-2 rotate-45" />
                <p className="text-xs text-slate-400">Chưa có tiết học cố định nào được thiết lập</p>
                <button
                  onClick={addFixedPeriod}
                  className="mt-2 text-xs font-bold text-brand-600 hover:text-brand-700"
                >
                  Thêm tiết đầu tiên
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="p-8 bg-brand-950 rounded-3xl text-white relative overflow-hidden flex flex-col justify-between">
          <div className="relative z-10">
            <div className="w-12 h-12 bg-brand-800 rounded-2xl flex items-center justify-center mb-6">
              <Info className="w-6 h-6 text-brand-300" />
            </div>
            <h3 className="text-2xl font-bold mb-4 tracking-tight">Hướng dẫn cấu hình</h3>
            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="w-6 h-6 rounded-full bg-brand-800 flex-shrink-0 flex items-center justify-center text-[10px] font-bold border border-brand-700">1</div>
                <p className="text-sm text-brand-200 leading-relaxed">Đảm bảo tổng số tiết của các môn học không vượt quá tổng số tiết trống trong tuần.</p>
              </div>
              <div className="flex gap-4">
                <div className="w-6 h-6 rounded-full bg-brand-800 flex-shrink-0 flex items-center justify-center text-[10px] font-bold border border-brand-700">2</div>
                <p className="text-sm text-brand-200 leading-relaxed">Môn học "Chỉ sáng" hoặc "Chỉ chiều" sẽ được hệ thống ưu tiên xếp đúng buổi.</p>
              </div>
              <div className="flex gap-4">
                <div className="w-6 h-6 rounded-full bg-brand-800 flex-shrink-0 flex items-center justify-center text-[10px] font-bold border border-brand-700">3</div>
                <p className="text-sm text-brand-200 leading-relaxed">Cấu hình "Tiết đôi" giúp các môn học quan trọng có thời gian giảng dạy liên tục.</p>
              </div>
            </div>
          </div>
          
          <div className="mt-12 p-4 bg-brand-900/50 rounded-2xl border border-brand-800/50 relative z-10">
            <p className="text-[10px] font-bold text-brand-400 uppercase tracking-[0.2em] mb-1">Trạng thái hệ thống</p>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
              <span className="text-xs font-medium text-brand-100">Sẵn sàng tạo thời khóa biểu</span>
            </div>
          </div>

          {/* Decorative Elements */}
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-brand-800/20 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-brand-500/10 rounded-full blur-3xl"></div>
        </div>
      </div>
    </div>
  );
}

function ExamConfigUI({ config, setConfig, subjects }: { config: Config, setConfig: any, subjects: Subject[] }) {
  const updateExam = (grade: number, field: string, value: any) => {
    const newExams = (config.exams || []).map(e => {
      if (e.grade === grade) {
        return { ...e, [field]: value };
      }
      return e;
    });
    setConfig({ ...config, exams: newExams });
  };

  const examSubjects = subjects.filter(s => s.hasExam);

  const renderSubjectSelector = (grade: number, exam: any, term: string) => {
    const field = `${term}Subjects`;
    const selectedIds = (exam[field] as string[]) || [];
    const totalPeriods = subjects
      .filter(s => selectedIds.includes(s.id))
      .reduce((acc, s) => acc + (s.examDuration || 1), 0);

    return (
      <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm hover:border-brand-300 transition-all">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            {term === 'midTerm1' ? 'Giữa kì I' : term === 'finalTerm1' ? 'Cuối kì I' : term === 'midTerm2' ? 'Giữa kì II' : 'Cuối kì II'}
          </span>
          <span className="px-2 py-0.5 bg-brand-50 text-brand-700 rounded text-[10px] font-bold">
            {totalPeriods} tiết
          </span>
        </div>
        <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-200">
          {examSubjects.length === 0 ? (
            <div className="py-4 text-center">
              <p className="text-[10px] text-slate-400 italic">Chưa cấu hình môn KT</p>
            </div>
          ) : (
            examSubjects.map(sub => {
              const isSelected = selectedIds.includes(sub.id);
              return (
                <button 
                  key={sub.id}
                  onClick={() => {
                    const next = isSelected 
                      ? selectedIds.filter(id => id !== sub.id) 
                      : [...selectedIds, sub.id];
                    updateExam(grade, field, next);
                  }}
                  className={`w-full flex items-center gap-2 p-2 rounded-lg text-xs font-medium transition-all ${
                    isSelected 
                      ? 'bg-brand-50 text-brand-700' 
                      : 'text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  <div className={`w-4 h-4 rounded flex items-center justify-center border transition-all ${
                    isSelected ? 'bg-brand-600 border-brand-600 text-white' : 'bg-white border-slate-300'
                  }`}>
                    {isSelected && <Check className="w-3 h-3" />}
                  </div>
                  <span className="truncate">{sub.name}</span>
                </button>
              );
            })
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl font-bold text-text-main">Kiểm tra tập trung</h2>
          <p className="text-base text-text-muted mt-1.5">Cấu hình lịch thi đồng loạt cho toàn khối</p>
        </div>
        <div className="p-4 bg-brand-50 border border-brand-200 rounded-2xl flex items-center gap-4 min-w-[320px]">
          <div className="w-10 h-10 bg-brand-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-brand-500/20">
            <CalendarDays className="w-5 h-5" />
          </div>
          <div className="flex-grow">
            <label className="block text-[10px] font-bold text-brand-600 uppercase tracking-widest mb-1">Kỳ kiểm tra hiện tại</label>
            <select 
              value={config.currentExamTerm || 'none'} 
              onChange={(e) => setConfig({...config, currentExamTerm: e.target.value as any})}
              className="w-full bg-transparent font-bold text-slate-900 focus:outline-none text-sm"
            >
              <option value="none">Không có kiểm tra</option>
              <option value="midTerm1">Giữa học kỳ I</option>
              <option value="finalTerm1">Cuối học kỳ I</option>
              <option value="midTerm2">Giữa học kỳ II</option>
              <option value="finalTerm2">Cuối học kỳ II</option>
            </select>
          </div>
        </div>
      </div>

      <div className="space-y-12">
        {[6, 7, 8, 9].map(grade => {
          const exam = (config.exams || []).find(e => e.grade === grade) || { grade };
          return (
            <div key={grade} className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center font-bold text-lg shadow-lg">
                  {grade}
                </div>
                <h3 className="text-lg font-bold text-slate-900">Khối lớp {grade}</h3>
                <div className="h-px bg-slate-200 flex-grow"></div>
                
                <div className="flex gap-2">
                  <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Thứ:</span>
                    <select 
                      value={exam.preferredDay ?? ''} 
                      onChange={(e) => updateExam(grade, 'preferredDay', e.target.value === '' ? undefined : parseInt(e.target.value))}
                      className="bg-transparent text-xs font-bold text-slate-700 focus:outline-none"
                    >
                      <option value="">Tự động</option>
                      {Array.from({ length: config.days || 6 }).map((_, i) => (
                        <option key={i} value={i}>Thứ {i + 2}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tiết:</span>
                    <select 
                      value={exam.preferredPeriod ?? ''} 
                      onChange={(e) => updateExam(grade, 'preferredPeriod', e.target.value === '' ? undefined : parseInt(e.target.value))}
                      className="bg-transparent text-xs font-bold text-slate-700 focus:outline-none"
                    >
                      <option value="">Tự động</option>
                      {Array.from({ length: (config.morningLessons || 5) + (config.afternoonLessons || 0) }).map((_, i) => (
                        <option key={i} value={i}>Tiết {i + 1}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {renderSubjectSelector(grade, exam, 'midTerm1')}
                {renderSubjectSelector(grade, exam, 'finalTerm1')}
                {renderSubjectSelector(grade, exam, 'midTerm2')}
                {renderSubjectSelector(grade, exam, 'finalTerm2')}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const School = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="m12 3 10 4.5V19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7.5L12 3Z"/><path d="M12 7v14"/><path d="M8 21v-8a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v8"/></svg>
);
