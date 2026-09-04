import React, { useState } from 'react';
import { Class, Subject, Teacher, Config, TimetableSlot } from '../types';
import { LessonToSchedule, getDailyPeriodsForClass } from '../algorithm';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { 
  Download, 
  Printer, 
  AlertTriangle, 
  LayoutGrid, 
  User, 
  Users, 
  Sun, 
  Moon,
  ChevronDown,
  Search,
  FileSpreadsheet
} from 'lucide-react';

interface Props {
  timetable: TimetableSlot[];
  unassigned: LessonToSchedule[];
  classes: Class[];
  subjects: Subject[];
  teachers: Teacher[];
  config: Config;
}

export default function ResultTab({ timetable, unassigned, classes, subjects, teachers, config }: Props) {
  const [viewMode, setViewModeState] = useState<'class' | 'teacher' | 'master_morning' | 'master_afternoon'>(() => {
    const saved = localStorage.getItem('resultViewMode');
    return (['class', 'teacher', 'master_morning', 'master_afternoon'].includes(saved as any)) ? (saved as any) : 'master_morning';
  });

  const [selectedId, setSelectedIdState] = useState<string>(() => {
    const saved = localStorage.getItem('resultSelectedId');
    return saved || classes[0]?.id || '';
  });

  const setViewMode = (mode: 'class' | 'teacher' | 'master_morning' | 'master_afternoon') => {
    setViewModeState(mode);
    localStorage.setItem('resultViewMode', mode);
  };

  const setSelectedId = (id: string) => {
    setSelectedIdState(id);
    localStorage.setItem('resultSelectedId', id);
  };

  const totalPeriods = config.morningLessons + config.afternoonLessons;
  const days = Array.from({ length: config.days }, (_, i) => i);
  const periods = Array.from({ length: totalPeriods }, (_, i) => i);

  const getSlot = (day: number, period: number) => {
    if (viewMode === 'class') {
      return timetable.find(s => s.classId === selectedId && s.day === day && s.period === period);
    } else {
      return timetable.find(s => s.teacherId === selectedId && s.day === day && s.period === period);
    }
  };

  const exportToExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const fontName = 'Times New Roman';
    const borderStyle: Partial<ExcelJS.Borders> = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };

    const createMasterSheet = (isMorning: boolean) => {
      const sheetName = isMorning ? "TKB Sáng" : "TKB Chiều";
      const worksheet = workbook.addWorksheet(sheetName);
      const periodsCount = isMorning ? config.morningLessons : config.afternoonLessons;
      const startPeriod = isMorning ? 0 : config.morningLessons;
      
      worksheet.pageSetup = {
        orientation: 'landscape',
        paperSize: 9,
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 1,
        margins: { left: 0.2, right: 0.2, top: 0.3, bottom: 0.3, header: 0.1, footer: 0.1 },
        horizontalCentered: true,
        verticalCentered: true
      };

      const titleRow = worksheet.addRow([`THỜI KHÓA BIỂU TOÀN TRƯỜNG - BUỔI ${isMorning ? 'SÁNG' : 'CHIỀU'}`]);
      titleRow.font = { name: fontName, size: 22, bold: true };
      titleRow.alignment = { horizontal: 'center', vertical: 'middle' };
      titleRow.height = 45;
      worksheet.mergeCells(1, 1, 1, classes.length + 2);

      const schoolRow = worksheet.addRow([config.schoolName]);
      schoolRow.font = { name: fontName, size: 14, bold: true };
      
      const yearRow = worksheet.addRow([`Năm học: ${config.schoolYear}`]);
      yearRow.font = { name: fontName, size: 14, italic: true };
      
      const dateRow = worksheet.addRow([`Ngày thực hiện: ${config.executionDate}`]);
      dateRow.font = { name: fontName, size: 12 };
      
      worksheet.addRow([]);

      const headerRow = worksheet.addRow(['Thứ', 'Tiết', ...classes.map(c => c.name)]);
      headerRow.height = 35;
      headerRow.eachCell((cell) => {
        cell.font = { name: fontName, size: 13, bold: true };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = borderStyle;
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
      });

      days.forEach((dayIndex) => {
        const startRow = worksheet.rowCount + 1;
        for (let p = 0; p < periodsCount; p++) {
          const actualPeriod = startPeriod + p;
          const rowData = [
            p === 0 ? `Thứ ${dayIndex + 2}` : '',
            p + 1,
            ...classes.map(c => {
              const limits = getDailyPeriodsForClass(c, dayIndex, config);
              const isClassOff = isMorning ? p >= limits.morning : p >= limits.afternoon;
              if (isClassOff) return 'Nghỉ';
              const slot = timetable.find(s => s.classId === c.id && s.day === dayIndex && s.period === actualPeriod);
              if (!slot) return '';
              const rawSub = subjects.find(s => s.id === slot.subjectId)?.name || '';
              const sub = slot.subTopic ? `${rawSub} (${slot.subTopic})` : rawSub;
              const tea = teachers.find(t => t.id === slot.teacherId)?.name || '';
              return {
                text: slot.isExam ? `[KT] ${sub}\n(${tea})` : `${sub}\n(${tea})`,
                isExam: slot.isExam
              };
            })
          ];
          const row = worksheet.addRow(rowData.map(d => typeof d === 'object' ? d.text : d));
          row.height = 55; // Increased height for better legibility
          row.eachCell((cell, colNumber) => {
            cell.font = { name: fontName, size: 12 }; // Increased font size
            if (colNumber > 2) {
              const cellData = rowData[colNumber - 1];
              if (typeof cellData === 'object' && cellData.isExam) {
                cell.font = { name: fontName, size: 12, bold: true, color: { argb: 'FFFF0000' } };
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };
              }
            }
            cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
            cell.border = borderStyle;
          });
        }
        worksheet.mergeCells(startRow, 1, startRow + periodsCount - 1, 1);
      });

      worksheet.getColumn(1).width = 10;
      worksheet.getColumn(2).width = 6;
      // Calculate dynamic width to fill the page better
      const classColWidth = Math.max(18, Math.floor(200 / (classes.length || 1)));
      for (let i = 0; i < classes.length; i++) {
        worksheet.getColumn(i + 3).width = classColWidth;
      }
    };

    createMasterSheet(true);
    createMasterSheet(false);

    const rawSheet = workbook.addWorksheet('Dữ liệu chi tiết');
    rawSheet.columns = [
      { header: 'Lớp', key: 'class', width: 10 },
      { header: 'Thứ', key: 'day', width: 10 },
      { header: 'Tiết', key: 'period', width: 10 },
      { header: 'Buổi', key: 'session', width: 10 },
      { header: 'Môn học', key: 'subject', width: 20 },
      { header: 'Giáo viên', key: 'teacher', width: 20 },
    ];

    timetable.forEach(slot => {
      rawSheet.addRow({
        class: classes.find(c => c.id === slot.classId)?.name,
        day: `Thứ ${slot.day + 2}`,
        period: slot.period + 1,
        session: slot.period < config.morningLessons ? 'Sáng' : 'Chiều',
        subject: subjects.find(s => s.id === slot.subjectId)?.name,
        teacher: teachers.find(t => t.id === slot.teacherId)?.name || ''
      }).eachCell(cell => {
        cell.font = { name: fontName };
        cell.border = borderStyle;
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `TKB_${config.schoolName.replace(/\s+/g, '_')}.xlsx`);
  };

  const renderMasterTable = (isMorning: boolean) => {
    const periodsCount = isMorning ? config.morningLessons : config.afternoonLessons;
    const startPeriod = isMorning ? 0 : config.morningLessons;
    
    return (
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 overflow-x-auto">
        <div className="flex justify-between items-start mb-10 no-print">
          <div className="space-y-2">
            <h3 className="font-black text-text-main text-xl">{config.schoolName}</h3>
            <p className="text-base text-text-muted font-black uppercase tracking-[0.2em]">Năm học: {config.schoolYear}</p>
          </div>
          <div className="text-right">
            <p className="text-base text-stone-400 font-black uppercase tracking-widest">Ngày thực hiện: {config.executionDate}</p>
          </div>
        </div>

        <div className="text-center mb-10">
          <h2 className="text-4xl font-black text-text-main uppercase tracking-tight">
            Thời khoá biểu toàn trường
            <span className="block text-base font-bold text-brand-600 mt-3 tracking-[0.3em]">
              Buổi {isMorning ? 'Sáng' : 'Chiều'}
            </span>
          </h2>
        </div>

        <table className="w-full border-collapse border-2 border-stone-900">
          <thead>
            <tr className="bg-stone-900 text-white">
              <th className="border border-stone-700 px-3 py-5 w-16 text-sm font-black uppercase tracking-widest">Thứ</th>
              <th className="border border-stone-700 px-3 py-5 w-12 text-sm font-black uppercase tracking-widest">Tiết</th>
              {classes.map(c => (
                <th key={c.id} className="border border-stone-700 px-4 py-5 text-sm font-black uppercase tracking-widest min-w-[140px]">
                  {c.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {days.map(dayIndex => (
              <React.Fragment key={dayIndex}>
                {Array.from({ length: periodsCount }).map((_, pIndex) => {
                  const actualPeriod = startPeriod + pIndex;
                  return (
                    <tr key={`${dayIndex}-${pIndex}`} className="group hover:bg-stone-50 transition-colors">
                      {pIndex === 0 && (
                        <td 
                          rowSpan={periodsCount} 
                          className="border-2 border-stone-900 px-3 py-4 text-center font-black text-3xl text-text-main bg-stone-50/50"
                        >
                          {dayIndex + 2}
                        </td>
                      )}
                      <td className="border border-border-soft px-3 py-4 text-center font-mono font-bold text-text-muted/60 text-base">
                        {pIndex + 1}
                      </td>
                      {classes.map(c => {
                        const limits = getDailyPeriodsForClass(c, dayIndex, config);
                        const isClassOff = isMorning ? pIndex >= limits.morning : pIndex >= limits.afternoon;
                        const slot = timetable.find(s => s.classId === c.id && s.day === dayIndex && s.period === actualPeriod);
                        const sub = slot ? subjects.find(s => s.id === slot.subjectId) : null;
                        const teacher = slot ? teachers.find(t => t.id === slot.teacherId) : null;
                        
                        const isSchoolOff = config.timeOff?.some(off => off.day === dayIndex && (off.session === 'all' || off.session === (isMorning ? 'morning' : 'afternoon')));

                        let cellStyle = "bg-white";
                        if (isClassOff || isSchoolOff) cellStyle = "bg-stone-100/60";
                        else if (slot?.isExam) cellStyle = "bg-amber-50 border-amber-200";
                        else if (sub?.type === 'main') cellStyle = "bg-brand-50/30";

                        return (
                          <td key={c.id} className={`border border-border-soft px-3 py-3 text-center h-24 transition-all ${cellStyle}`}>
                            {slot ? (
                              <div className="flex flex-col items-center justify-center gap-1.5">
                                <span className={`text-[15px] font-bold leading-tight ${slot.isExam ? 'text-rose-600' : 'text-text-main'}`}>
                                  {slot.isExam ? `[KT] ${sub?.name}` : (slot.subTopic ? `${sub?.name} (${slot.subTopic})` : sub?.name)}
                                </span>
                                <span className="text-[12px] font-bold text-text-muted uppercase tracking-wider">
                                  {teacher?.name.split(' ').pop()}
                                </span>
                              </div>
                            ) : (isClassOff || isSchoolOff) ? (
                               <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Nghỉ</span>
                            ) : (
                              <div className="w-1.5 h-1.5 bg-stone-200 rounded-full mx-auto"></div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {/* Controls Bar */}
      <div className="glass-card p-4 flex flex-col md:flex-row items-center justify-between gap-4 no-print">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-grow md:flex-grow-0">
            <select 
              value={viewMode} 
              onChange={(e) => {
                setViewMode(e.target.value as any);
                if (e.target.value === 'class') setSelectedId(classes[0]?.id || '');
                if (e.target.value === 'teacher') setSelectedId(teachers[0]?.id || '');
              }}
              className="input-field pl-10 pr-10 appearance-none font-semibold text-slate-700 min-w-[220px]"
            >
              <option value="master_morning">Toàn trường (Sáng)</option>
              <option value="master_afternoon">Toàn trường (Chiều)</option>
              <option value="class">Xem theo lớp</option>
              <option value="teacher">Xem theo giáo viên</option>
            </select>
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
              {viewMode.startsWith('master') ? <LayoutGrid className="w-4 h-4" /> : viewMode === 'class' ? <Users className="w-4 h-4" /> : <User className="w-4 h-4" />}
            </div>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
          
          {(viewMode === 'class' || viewMode === 'teacher') && (
            <div className="relative flex-grow md:flex-grow-0">
              <select 
                value={selectedId} 
                onChange={(e) => setSelectedId(e.target.value)}
                className="input-field pl-10 pr-10 appearance-none font-semibold text-slate-700 min-w-[200px]"
              >
                {viewMode === 'class' 
                  ? classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)
                  : teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)
                }
              </select>
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2 w-full md:w-auto">
          <button onClick={() => window.print()} className="btn-secondary flex-grow md:flex-grow-0 flex items-center justify-center gap-2">
            <Printer className="w-4 h-4" />
            In TKB
          </button>
          <button onClick={exportToExcel} className="btn-primary flex-grow md:flex-grow-0 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20">
            <FileSpreadsheet className="w-4 h-4" />
            Xuất Excel
          </button>
        </div>
      </div>

      {/* Empty Slots & Diagnostic Analysis */}
      <div className="space-y-4 no-print">
        {/* Cause & Fix Guide Banner */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 text-amber-700 rounded-xl flex items-center justify-center font-bold shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Phân tích nguyên nhân & Khắc phục tiết trống trên Thời khóa biểu</h3>
                <p className="text-xs text-slate-500 mt-0.5">Tìm hiểu lý do vì sao một số tiết vẫn còn để trống và cách xử lý nhanh</p>
              </div>
            </div>
            {unassigned.length > 0 ? (
              <span className="px-3 py-1 bg-rose-100 text-rose-700 font-bold text-xs rounded-full border border-rose-200 shrink-0">
                {unassigned.length} tiết chưa xếp được
              </span>
            ) : (
              <span className="px-3 py-1 bg-emerald-100 text-emerald-800 font-bold text-xs rounded-full border border-emerald-200 shrink-0">
                Đã xếp thành công 100% tiết phân công
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-3.5 bg-amber-50/60 border border-amber-200/80 rounded-xl space-y-1.5">
              <span className="font-extrabold text-amber-900 block text-xs">1. Thiếu tiết phân công so với thời gian mở</span>
              <p className="text-amber-800 leading-relaxed">
                Nếu cấu hình mở 30 tiết/tuần (5 tiết/buổi x 6 ngày) nhưng tổng tiết các môn phân công cho lớp chỉ có 26 tiết, lớp sẽ tự động có <strong>4 tiết trống</strong>.
              </p>
              <div className="text-[11px] font-bold text-amber-900 pt-1">👉 Cách khắc phục: Giảm bớt số tiết học/ngày trong phần <em>Cấu hình -&gt; Thời gian</em> hoặc tăng số tiết phân công.</div>
            </div>

            <div className="p-3.5 bg-sky-50/60 border border-sky-200/80 rounded-xl space-y-1.5">
              <span className="font-extrabold text-sky-900 block text-xs">2. Giáo viên vướng lịch trùng hoặc xin nghỉ</span>
              <p className="text-sky-800 leading-relaxed">
                Giáo viên dạy nhiều lớp bị cấm nghỉ trùng giờ, hoặc vượt giới hạn <em>Max tiết/buổi</em> làm tiết đó không chèn vào được và bị đẩy ra danh sách chưa xếp.
              </p>
              <div className="text-[11px] font-bold text-sky-900 pt-1">👉 Cách khắc phục: Nới lỏng định mức <em>Max tiết/buổi</em> hoặc giảm bớt lịch xin nghỉ của GV.</div>
            </div>

            <div className="p-3.5 bg-emerald-50/60 border border-emerald-200/80 rounded-xl space-y-1.5">
              <span className="font-extrabold text-emerald-900 block text-xs">3. Tiết dạy online / Trùng khối</span>
              <p className="text-emerald-800 leading-relaxed">
                Với môn Tiếng Anh &amp; Thể dục, hệ thống đã hỗ trợ xếp song song trùng khối để GV dạy online hoặc học chung toàn khối.
              </p>
              <div className="text-[11px] font-bold text-emerald-900 pt-1">👉 Môn học đã được bật tùy chọn <em>"Trùng khối"</em> giúp giải phóng số tiết trống.</div>
            </div>
          </div>

          {/* Class-by-Class Slot Capacity Audit */}
          <div className="pt-2">
            <details className="group border border-slate-200 rounded-xl bg-slate-50 overflow-hidden">
              <summary className="px-4 py-2.5 text-xs font-bold text-slate-700 cursor-pointer flex items-center justify-between hover:bg-slate-100 transition-colors">
                <span>📊 Kiểm tra chi tiết định mức tiết từng lớp (Xác định lớp bị dư slot trống)</span>
                <span className="text-[10px] text-brand-600 group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <div className="p-4 bg-white border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                {classes.map(cls => {
                  let totalAvailableSlots = 0;
                  for (let d = 0; d < config.days; d++) {
                    const limits = getDailyPeriodsForClass(cls, d, config);
                    totalAvailableSlots += (limits.morning + limits.afternoon);
                  }
                  const placedCount = timetable.filter(s => s.classId === cls.id).length;
                  const diff = totalAvailableSlots - placedCount;

                  return (
                    <div key={cls.id} className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                      <div className="flex items-center justify-between font-bold text-slate-800">
                        <span>Lớp {cls.name}</span>
                        <span className={diff > 0 ? 'text-amber-600 font-extrabold' : 'text-emerald-600'}>
                          {placedCount} / {totalAvailableSlots} tiết
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500 mt-1">
                        {diff > 0 ? (
                          <span className="text-amber-700 font-medium">Lớp thừa {diff} tiết trống do thiếu môn học</span>
                        ) : (
                          <span className="text-emerald-600 font-medium">Đã lấp đầy 100% tiết</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </details>
          </div>
        </div>

        {/* Unassigned List Table */}
        {unassigned.length > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-2xl p-5 mb-4 shadow-sm">
            <h3 className="font-bold text-orange-900 text-sm flex items-center gap-2 mb-3">
              <span className="bg-orange-200 text-orange-800 px-2 py-0.5 rounded-md text-xs">💡 AI</span>
              Gợi ý Khắc phục Lỗi Tự động
            </h3>
            <ul className="space-y-3 text-sm text-orange-800">
              {unassigned.some(u => (u.reason || '').includes('kín tiết trong các buổi mở')) && (
                <li className="flex gap-2">
                  <span className="font-bold shrink-0 mt-0.5">&bull;</span>
                  <span><strong>Lỗi "Lớp đã kín tiết":</strong> Lớp học đang được phân công tổng số môn nhiều hơn sức chứa của các buổi học đang mở. <strong>Cách sửa:</strong> Vào tab <em>Thời gian</em>, hãy tăng <em>Max tiết/buổi sáng</em> lên (ví dụ từ 4 lên 5), hoặc mở thêm 1-2 tiết học vào buổi chiều cho khối lớp đó để có không gian xếp lịch.</span>
                </li>
              )}
              {unassigned.some(u => (u.reason || '').includes('Giáo viên') && (u.reason || '').includes('trùng lịch')) && (
                <li className="flex gap-2">
                  <span className="font-bold shrink-0 mt-0.5">&bull;</span>
                  <span><strong>Lỗi "Giáo viên trùng lịch":</strong> Giáo viên bị kẹt do dạy quá nhiều lớp hoặc không tìm được điểm giao nhau của thời gian rảnh. <strong>Cách sửa:</strong> Hãy tích chọn ô <strong>"Nới lỏng ràng buộc"</strong> trước khi bấm Xếp lịch, hoặc nới rộng <em>Max tiết/buổi</em> của giáo viên này trong tab <em>Giáo viên</em>.</span>
                </li>
              )}
              {unassigned.some(u => (u.reason || '').includes('Vượt định mức tiết')) && (
                <li className="flex gap-2">
                  <span className="font-bold shrink-0 mt-0.5">&bull;</span>
                  <span><strong>Lỗi "Vượt định mức tiết/buổi":</strong> Thuật toán bị nghẽn do giới hạn số tiết dạy tối đa trong 1 buổi của giáo viên quá thấp. <strong>Cách sửa:</strong> Vào tab <em>Giáo viên</em>, tăng ô <em>Max tiết/buổi</em> của giáo viên này lên (ví dụ từ 3 lên 4 hoặc 5).</span>
                </li>
              )}
              {unassigned.some(u => (u.reason || '').includes('Chưa phân công') || (u.reason || '').includes('định mức')) && (
                <li className="flex gap-2">
                  <span className="font-bold shrink-0 mt-0.5">&bull;</span>
                  <span><strong>Lỗi "Chưa phân công đủ tiết":</strong> Số tiết của môn học được cấu hình cao hơn số tiết mà giáo viên đang được giao dạy thực tế. <strong>Cách sửa:</strong> Vào tab <em>Giáo viên</em>, kiểm tra lại số ô phân công của môn học này xem đã điền đủ số chưa.</span>
                </li>
              )}
            </ul>
          </div>
        )}

        {unassigned.length > 0 && (
          <div className="bg-white border border-rose-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="px-6 py-4 bg-rose-50/50 border-b border-rose-200 flex items-center justify-between">
              <h3 className="font-bold text-rose-900 text-sm flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                Danh sách {unassigned.length} tiết chưa thể xếp lịch
              </h3>
            </div>
            <div className="max-h-[250px] overflow-y-auto">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-slate-50 shadow-sm text-xs">
                  <tr>
                    <th className="px-6 py-3 font-bold text-slate-500 border-b border-slate-200">Lớp</th>
                    <th className="px-6 py-3 font-bold text-slate-500 border-b border-slate-200">Môn học</th>
                    <th className="px-6 py-3 font-bold text-slate-500 border-b border-slate-200">Giáo viên</th>
                    <th className="px-6 py-3 font-bold text-slate-500 border-b border-slate-200">Lý do không xếp được</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {unassigned.map((item, idx) => {
                    const cls = classes.find(c => c.id === item.classId);
                    const sub = subjects.find(s => s.id === item.subjectId);
                    const teacher = teachers.find(t => t.id === item.teacherId);
                    return (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-3 font-bold text-slate-900">{cls?.name}</td>
                        <td className="px-6 py-3 font-medium text-slate-700">{sub?.name}</td>
                        <td className="px-6 py-3 text-slate-600">{teacher?.name || 'Chưa phân công'}</td>
                        <td className="px-6 py-3">
                          <span className="px-2.5 py-1 bg-rose-50 text-rose-700 text-[11px] font-bold rounded-md border border-rose-100 inline-block">
                            {item.reason || 'Không tìm thấy tiết trống phù hợp'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Timetable Content */}
      <div className="print:m-0">
        {viewMode === 'master_morning' && renderMasterTable(true)}
        {viewMode === 'master_afternoon' && renderMasterTable(false)}

        {(viewMode === 'class' || viewMode === 'teacher') && (
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-border-soft overflow-x-auto">
            <div className="text-center mb-10">
              <h2 className="text-4xl font-black text-text-main uppercase tracking-tight">
                Thời khoá biểu cá nhân
                <span className="block text-base font-bold text-brand-600 mt-3 tracking-[0.3em]">
                  {viewMode === 'class' ? `Lớp: ${classes.find(c => c.id === selectedId)?.name}` : `Giáo viên: ${teachers.find(t => t.id === selectedId)?.name}`}
                </span>
              </h2>
            </div>

            <table className="w-full border-collapse border-2 border-stone-900">
              <thead>
                <tr className="bg-stone-900 text-white">
                  <th className="border border-stone-700 px-4 py-5 w-36 text-sm font-black uppercase tracking-widest">Tiết \ Thứ</th>
                  {days.map(d => (
                    <th key={d} className="border border-stone-700 px-4 py-5 text-sm font-black uppercase tracking-widest">Thứ {d + 2}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {periods.map(p => {
                  const isMorning = p < config.morningLessons;
                  const periodInSession = isMorning ? p + 1 : p - config.morningLessons + 1;
                  
                  return (
                    <tr key={p} className={`group ${p === config.morningLessons ? "border-t-4 border-stone-900" : ""}`}>
                      <td className="border border-border-soft px-4 py-5 bg-stone-50/50">
                        <div className="flex items-center gap-2">
                          {isMorning ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-indigo-400" />}
                          <span className="text-sm font-black text-text-main uppercase tracking-wider">Tiết {periodInSession}</span>
                        </div>
                      </td>
                      {days.map(d => {
                        const slot = getSlot(d, p);
                        const sub = slot ? subjects.find(s => s.id === slot.subjectId) : null;
                        const teacher = slot ? teachers.find(t => t.id === slot.teacherId) : null;
                        const cls = slot ? classes.find(c => c.id === slot.classId) : null;
                        
                        let isClassOff = false;
                        if (viewMode === 'class') {
                          const targetClass = classes.find(c => c.id === selectedId);
                          if (targetClass) {
                            const limits = getDailyPeriodsForClass(targetClass, d, config);
                            const periodInS = isMorning ? p : p - config.morningLessons;
                            isClassOff = isMorning ? periodInS >= limits.morning : periodInS >= limits.afternoon;
                          }
                        }

                        let cellStyle = "bg-white";
                        if (isClassOff) cellStyle = "bg-stone-100/60";
                        else if (slot?.isExam) cellStyle = "bg-amber-50 border-amber-200";
                        else if (sub?.type === 'main') cellStyle = "bg-brand-50/30";

                        return (
                          <td key={d} className={`border border-border-soft px-4 py-5 text-center h-28 transition-all group-hover:bg-stone-50/30 ${cellStyle}`}>
                            {slot ? (
                              <div className="flex flex-col items-center justify-center gap-2">
                                <span className={`text-base font-bold leading-tight ${slot.isExam ? 'text-rose-600 underline decoration-2 underline-offset-4' : 'text-text-main'}`}>
                                  {slot.isExam ? `[KT] ${sub?.name}` : (slot.subTopic ? `${sub?.name} (${slot.subTopic})` : sub?.name)}
                                </span>
                                <span className="px-3 py-1 bg-stone-100 text-text-muted rounded-md text-[12px] font-black uppercase tracking-widest">
                                  {viewMode === 'class' ? teacher?.name : cls?.name}
                                </span>
                              </div>
                            ) : isClassOff ? (
                              <span className="text-[11px] font-bold text-stone-400 uppercase tracking-widest">Nghỉ</span>
                            ) : (
                              <div className="w-2 h-2 bg-stone-100 rounded-full mx-auto"></div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
