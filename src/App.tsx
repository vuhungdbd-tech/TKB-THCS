import React, { useState, useEffect, useCallback } from 'react';
import { initialClasses, initialSubjects, initialTeachers, initialConfig } from './data';
import { Class, Subject, Teacher, Config, TimetableSlot } from './types';
import { generateTimetable, autoOptimizeClassDailyPeriods, LessonToSchedule } from './algorithm';
import ConfigTab from './components/ConfigTab';
import ResultTab from './components/ResultTab';
import LicenseManager from './components/LicenseManager';
import Login from './components/Login';
import { Layout, Settings, Calendar, Save, RotateCcw, Play, School, Cloud, CloudOff, Loader2, LogOut, Key, Database, Copy, Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from './lib/supabase';

const SUPABASE_SQL_CODE = `-- ==============================================================================
-- SUPABASE DATABASE SCHEMA CHO ỨNG DỤNG SẮP XẾP THỜI KHÓA BIỂU
-- Chạy toàn bộ mã này trong Supabase: SQL Editor -> New Query -> Run
-- ==============================================================================

-- 1. BẢNG LƯU DỮ LIỆU CẤU HÌNH THỜI KHÓA BIỂU CỦA NGƯỜI DÙNG (app_data)
create table if not exists public.app_data (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Bật RLS và cấp quyền truy cập toàn quyền cho app_data
alter table public.app_data enable row level security;

drop policy if exists "Allow all operations on app_data" on public.app_data;
create policy "Allow all operations on app_data" 
on public.app_data 
for all 
using (true) 
with check (true);

grant all on table public.app_data to anon, authenticated, service_role;


-- 2. BẢNG QUẢN LÝ BẢN QUYỀN (licenses)
create table if not exists public.licenses (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  type text default 'full', -- 'trial' (1 tháng) hoặc 'full' (1 năm)
  status text default 'unused', -- 'unused' hoặc 'used'
  used_by_email text,
  used_by_name text,
  used_by_phone text,
  used_at timestamp with time zone,
  duration_days integer default 365,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Bật RLS và cấp quyền truy cập toàn quyền cho licenses
alter table public.licenses enable row level security;

drop policy if exists "Allow all operations on licenses" on public.licenses;
create policy "Allow all operations on licenses" 
on public.licenses 
for all 
using (true) 
with check (true);

grant all on table public.licenses to anon, authenticated, service_role;


-- 3. BẢNG CẤU HÌNH TOÀN CỤC (global_settings)
create table if not exists public.global_settings (
  id text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Bật RLS và cấp quyền truy cập toàn quyền cho global_settings
alter table public.global_settings enable row level security;

drop policy if exists "Allow all operations on global_settings" on public.global_settings;
create policy "Allow all operations on global_settings" 
on public.global_settings 
for all 
using (true) 
with check (true);

grant all on table public.global_settings to anon, authenticated, service_role;


-- 4. TẠO BUCKET STORAGE CHO ẢNH (images)
insert into storage.buckets (id, name, public)
values ('images', 'images', true)
on conflict (id) do update set public = true;

drop policy if exists "Allow public select on images" on storage.objects;
create policy "Allow public select on images" 
on storage.objects for select 
using (bucket_id = 'images');

drop policy if exists "Allow public insert on images" on storage.objects;
create policy "Allow public insert on images" 
on storage.objects for insert 
with check (bucket_id = 'images');

drop policy if exists "Allow public update on images" on storage.objects;
create policy "Allow public update on images" 
on storage.objects for update 
using (bucket_id = 'images');

drop policy if exists "Allow public delete on images" on storage.objects;
create policy "Allow public delete on images" 
on storage.objects for delete 
using (bucket_id = 'images');


-- 5. DỮ LIỆU MẪU SẴN DÙNG (SEED DATA)
insert into public.global_settings (id, value)
values (
  'login_bg', 
  jsonb_build_object('url', 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?auto=format&fit=crop&w=1920&q=80')
)
on conflict (id) do nothing;

insert into public.licenses (key, type, status, duration_days)
values 
  ('SL-DEMO-2026', 'full', 'unused', 365),
  ('SL-PRO1-2026', 'full', 'unused', 365),
  ('SL-TRIAL-01', 'trial', 'unused', 30)
on conflict (key) do nothing;`;

export default function App() {
  const [session, setSession] = useState<any>(() => {
    try {
      const saved = localStorage.getItem('localSession');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [activeTab, setActiveTabState] = useState<'config' | 'result' | 'license'>(() => {
    const saved = localStorage.getItem('activeTab');
    return (saved === 'config' || saved === 'result' || saved === 'license') ? saved : 'config';
  });

  const setActiveTab = (tab: 'config' | 'result' | 'license') => {
    setActiveTabState(tab);
    localStorage.setItem('activeTab', tab);
  };

  // Synchronously initialize all data from localStorage if available to prevent any delay/flicker
  const [classes, setClasses] = useState<Class[]>(() => {
    try {
      const saved = localStorage.getItem('timetableData');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.classes) && parsed.classes.length > 0) return parsed.classes;
      }
    } catch {}
    return initialClasses;
  });

  const [subjects, setSubjects] = useState<Subject[]>(() => {
    try {
      const saved = localStorage.getItem('timetableData');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.subjects) && parsed.subjects.length > 0) return parsed.subjects;
      }
    } catch {}
    return initialSubjects;
  });

  const [teachers, setTeachers] = useState<Teacher[]>(() => {
    try {
      const saved = localStorage.getItem('timetableData');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.teachers) && parsed.teachers.length > 0) return parsed.teachers;
      }
    } catch {}
    return initialTeachers;
  });

  const [config, setConfig] = useState<Config>(() => {
    try {
      const saved = localStorage.getItem('timetableData');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.config) return { ...initialConfig, ...parsed.config };
      }
    } catch {}
    return initialConfig;
  });
  
  const [currentWeek, setCurrentWeek] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('timetableData');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.currentWeek === 'number') return parsed.currentWeek;
      }
    } catch {}
    return 1;
  });

  const [weeklyTimetables, setWeeklyTimetables] = useState<Record<number, { timetable: TimetableSlot[], unassigned: any[] }>>(() => {
    try {
      const saved = localStorage.getItem('timetableData');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.weeklyTimetables) return parsed.weeklyTimetables;
        if (parsed.timetable) return { 1: { timetable: parsed.timetable, unassigned: parsed.unassigned || [] } };
      }
    } catch {}
    return {};
  });

  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'error' | 'offline'>('offline');
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [showSqlModal, setShowSqlModal] = useState<boolean>(false);
  const [sqlCopied, setSqlCopied] = useState<boolean>(false);

  const isInitialLoadDone = React.useRef<boolean>(false);
  const saveDebounceRef = React.useRef<any>(null);

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_CODE);
    setSqlCopied(true);
    setTimeout(() => setSqlCopied(false), 2500);
  };

  const handleDownloadSql = () => {
    const blob = new Blob([SUPABASE_SQL_CODE], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'supabase_schema.sql';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // If we already have local session or no supabase, don't show loading spinner
  const [isLoading, setIsLoading] = useState<boolean>(() => {
    const hasLocal = localStorage.getItem('localSession');
    return !hasLocal && !!supabase;
  });

  useEffect(() => {
    let isMounted = true;
    // Guaranteed safety timeout: never show "Đang tải dữ liệu..." for more than 1 second
    const safetyTimer = setTimeout(() => {
      if (isMounted) {
        setIsLoading(false);
      }
    }, 1000);

    if (!supabase) {
      setIsLoading(false);
      clearTimeout(safetyTimer);
      return;
    }

    supabase.auth.getSession().then(({ data: { session: fetchedSession } }) => {
      if (isMounted) {
        if (fetchedSession) {
          setSession(fetchedSession);
        }
        setIsLoading(false);
        clearTimeout(safetyTimer);
      }
    }).catch(() => {
      if (isMounted) {
        setIsLoading(false);
        clearTimeout(safetyTimer);
      }
    });

    let subscription: any = null;
    try {
      const authRes = supabase.auth.onAuthStateChange((_event: string, authSession: any) => {
        if (isMounted && authSession) {
          setSession(authSession);
        }
      });
      subscription = authRes?.data?.subscription;
    } catch (e) {
      // ignore
    }

    return () => {
      isMounted = false;
      clearTimeout(safetyTimer);
      if (subscription?.unsubscribe) {
        subscription.unsubscribe();
      }
    };
  }, []);

  const [licenseInfo, setLicenseInfo] = useState<any>(null);

  useEffect(() => {
    if (!supabase || !session) return;

    const fetchLicense = async () => {
      try {
        const { data, error } = await supabase
          .from('licenses')
          .select('*')
          .eq('used_by_email', session.user.email)
          .single();
        
        if (!error && data) {
          setLicenseInfo(data);
        }
      } catch (e) {
        // safe silent catch for network offline
      }
    };

    fetchLicense();
  }, [session]);

  const loadData = useCallback(async () => {
    if (!session) return;
    
    // Check localStorage fallback
    const savedData = localStorage.getItem('timetableData');
    let localParsed: any = null;
    if (savedData) {
      try {
        localParsed = JSON.parse(savedData);
        if (localParsed.classes) setClasses(localParsed.classes);
        if (localParsed.subjects) setSubjects(localParsed.subjects);
        if (localParsed.teachers) setTeachers(localParsed.teachers);
        if (localParsed.config) setConfig({ ...initialConfig, ...localParsed.config });
        if (localParsed.weeklyTimetables) {
          setWeeklyTimetables(localParsed.weeklyTimetables);
        } else if (localParsed.timetable) {
          setWeeklyTimetables({ 1: { timetable: localParsed.timetable, unassigned: localParsed.unassigned || [] } });
        }
        if (localParsed.currentWeek) setCurrentWeek(localParsed.currentWeek);
      } catch (e) {
        // ignore parse error
      }
    }

    if (!supabase) {
      setSyncStatus('offline');
      isInitialLoadDone.current = true;
      return;
    }

    setSyncStatus('syncing');

    try {
      const { data, error } = await supabase
        .from('app_data')
        .select('data, updated_at')
        .eq('id', session.user.id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No data found on remote DB yet: automatically push initial local data to Supabase!
          if (localParsed) {
            await supabase
              .from('app_data')
              .upsert({ 
                id: session.user.id, 
                data: localParsed,
                updated_at: new Date().toISOString()
              });
          }
          setSyncStatus('synced');
          setLastSyncTime(new Date().toLocaleTimeString('vi-VN'));
        } else {
          // Network fetch error or unreachable Supabase instance
          setSyncStatus('offline');
        }
      } else if (data?.data) {
        const parsed = data.data;
        if (parsed.classes) setClasses(parsed.classes);
        if (parsed.subjects) setSubjects(parsed.subjects);
        if (parsed.teachers) setTeachers(parsed.teachers);
        if (parsed.config) setConfig({ ...initialConfig, ...parsed.config });
        if (parsed.weeklyTimetables) {
          setWeeklyTimetables(parsed.weeklyTimetables);
        } else if (parsed.timetable) {
          setWeeklyTimetables({ 1: { timetable: parsed.timetable, unassigned: parsed.unassigned || [] } });
        }
        if (parsed.currentWeek) setCurrentWeek(parsed.currentWeek);
        setSyncStatus('synced');
        setLastSyncTime(new Date().toLocaleTimeString('vi-VN'));
      }
    } catch (e) {
      setSyncStatus('offline');
    } finally {
      isInitialLoadDone.current = true;
    }
  }, [session]);

  useEffect(() => {
    if (session) {
      loadData();
    }
  }, [session, loadData]);

  // Clean up debounce on unmount
  useEffect(() => {
    return () => {
      if (saveDebounceRef.current) {
        clearTimeout(saveDebounceRef.current);
      }
    };
  }, []);

  // Auto-save changes to localStorage immediately AND debounce sync to Supabase
  useEffect(() => {
    if (!isLoading && session) {
      const dataToSave = { classes, subjects, teachers, config, weeklyTimetables, currentWeek };
      // 1. Immediate local backup
      localStorage.setItem('timetableData', JSON.stringify(dataToSave));

      // 2. Debounced push to Supabase (after user pauses typing/editing for 1.2s)
      if (isInitialLoadDone.current && supabase) {
        setSyncStatus('syncing');
        if (saveDebounceRef.current) {
          clearTimeout(saveDebounceRef.current);
        }
        saveDebounceRef.current = setTimeout(async () => {
          try {
            const { error } = await supabase
              .from('app_data')
              .upsert({ 
                id: session.user.id, 
                data: dataToSave,
                updated_at: new Date().toISOString()
              });

            if (error) {
              setSyncStatus('offline');
            } else {
              setSyncStatus('synced');
              setLastSyncTime(new Date().toLocaleTimeString('vi-VN'));
            }
          } catch {
            setSyncStatus('offline');
          }
        }, 1200);
      }
    }
  }, [classes, subjects, teachers, config, weeklyTimetables, currentWeek, isLoading, session]);

  const handleSave = async () => {
    if (saveDebounceRef.current) {
      clearTimeout(saveDebounceRef.current);
    }
    const dataToSave = { classes, subjects, teachers, config, weeklyTimetables, currentWeek };
    
    // Save to localStorage as primary backup
    localStorage.setItem('timetableData', JSON.stringify(dataToSave));

    if (!supabase || !session) {
      setSyncStatus('offline');
      alert('Đã lưu an toàn vào máy của bạn (Chế độ lưu cục bộ).');
      return;
    }

    setSyncStatus('syncing');
    try {
      const { error } = await supabase
        .from('app_data')
        .upsert({ 
          id: session.user.id, 
          data: dataToSave,
          updated_at: new Date().toISOString()
        });

      if (error) {
        setSyncStatus('offline');
        alert('Đã lưu dữ liệu vào trình duyệt (Chưa thể đồng bộ lên Supabase. Vui lòng kiểm tra mã SQL tạo bảng trong nút "Mã SQL").');
      } else {
        setSyncStatus('synced');
        setLastSyncTime(new Date().toLocaleTimeString('vi-VN'));
        alert('✅ Đã lưu và đồng bộ toàn bộ dữ liệu thiết lập lên máy chủ Supabase thành công!');
      }
    } catch (e) {
      setSyncStatus('offline');
      alert('Đã lưu dữ liệu vào trình duyệt (Máy chủ ngoại tuyến).');
    }
  };

  const handleGenerate = (customConfig?: Config) => {
    const activeConfig = customConfig || config;
    const { slots, unassigned, autoAdjustedConfig } = generateTimetable(classes, subjects, teachers, activeConfig);
    const finalConfig = autoAdjustedConfig || activeConfig;

    if (autoAdjustedConfig) {
      setConfig(autoAdjustedConfig);
    }

    const updatedWeekly = {
      ...weeklyTimetables,
      [currentWeek]: { timetable: slots, unassigned }
    };
    setWeeklyTimetables(updatedWeekly);
    setActiveTab('result');

    // Trigger immediate sync to Supabase when new timetable is generated
    if (session && supabase) {
      const dataToSave = { classes, subjects, teachers, config: finalConfig, weeklyTimetables: updatedWeekly, currentWeek };
      supabase.from('app_data').upsert({
        id: session.user.id,
        data: dataToSave,
        updated_at: new Date().toISOString()
      }).then(({ error }) => {
        if (!error) {
          setSyncStatus('synced');
          setLastSyncTime(new Date().toLocaleTimeString('vi-VN'));
        }
      }).catch(() => {});
    }
  };

  const handleAutoBalanceAndGenerate = () => {
    const opt = autoOptimizeClassDailyPeriods(classes, subjects, teachers, config);
    setConfig(opt.newConfig);
    handleGenerate(opt.newConfig);
  };

  const handleReset = async () => {
    if (window.confirm('Bạn có chắc chắn muốn reset toàn bộ dữ liệu về mặc định?')) {
      setClasses(initialClasses);
      setSubjects(initialSubjects);
      setTeachers(initialTeachers);
      setConfig(initialConfig);
      setWeeklyTimetables({});
      setCurrentWeek(1);
      localStorage.removeItem('timetableData');
      
      if (!supabase || !session) {
        setSyncStatus('offline');
        return;
      }

      setSyncStatus('syncing');
      try {
        await supabase
          .from('app_data')
          .delete()
          .eq('id', session.user.id);
        setSyncStatus('synced');
        setLastSyncTime(new Date().toLocaleTimeString('vi-VN'));
      } catch (e) {
        setSyncStatus('offline');
      }
    }
  };

  const handleLogout = async () => {
    localStorage.removeItem('localSession');
    if (supabase) {
      try {
        await supabase.auth.signOut();
      } catch (e) {
        // ignore
      }
    }
    setSession(null);
  };

  const isAdmin = session?.user?.email === 'vuhung@db.edu.vn' || 
                  session?.user?.email === 'vuhungdbd@gmail.com' ||
                  session?.user?.email?.includes('admin') ||
                  session?.user?.id === 'offline-user';

  if (isLoading) {
    return (
      <div className="min-h-screen bg-page-bg flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <Loader2 className="w-12 h-12 text-brand-600 animate-spin mx-auto mb-4" />
          <p className="text-lg font-bold text-text-main mb-2">Đang tải dữ liệu...</p>
          <p className="text-sm text-text-muted mb-4">Đang chuẩn bị ứng dụng...</p>
          <button
            onClick={() => setIsLoading(false)}
            className="px-4 py-2 bg-white border border-border-soft rounded-lg text-xs font-semibold text-brand-600 hover:text-brand-700 shadow-xs cursor-pointer hover:bg-slate-50 transition-colors"
          >
            Bỏ qua để vào ngay
          </button>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <Login 
        onLogin={(newSession) => {
          if (newSession) {
            setSession(newSession);
          } else {
            const saved = localStorage.getItem('localSession');
            if (saved) {
              try { setSession(JSON.parse(saved)); } catch {}
            }
          }
        }} 
      />
    );
  }

  return (
    <div className="min-h-screen bg-page-bg text-text-main font-sans selection:bg-brand-100 selection:text-brand-900">
      {/* Header */}
      <header className="sticky top-0 z-30 w-full bg-white/80 backdrop-blur-md border-b border-border-soft no-print">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-brand-600 rounded-2xl flex items-center justify-center shadow-lg shadow-brand-500/20">
              <School className="w-7 h-7 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black tracking-tight text-text-main leading-none">{config.appName}</h1>
                {isAdmin ? (
                  <span className="bg-amber-100 text-amber-700 text-[10px] font-black px-2 py-0.5 rounded-full border border-amber-200 uppercase tracking-tighter">
                    Admin Tối Cao
                  </span>
                ) : licenseInfo && (
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border uppercase tracking-tighter ${
                      licenseInfo.type === 'trial' 
                        ? 'bg-emerald-100 text-emerald-700 border-emerald-200' 
                        : 'bg-brand-100 text-brand-700 border-brand-200'
                    }`}>
                      {licenseInfo.type === 'trial' ? 'Dùng thử (1 tháng)' : 'Bản quyền (1 năm)'}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400">
                      Hết hạn: {new Date(new Date(licenseInfo.used_at).setMonth(new Date(licenseInfo.used_at).getMonth() + (licenseInfo.type === 'trial' ? 1 : 12))).toLocaleDateString('vi-VN')}
                    </span>
                  </div>
                )}
                <Settings className="w-5 h-5 text-stone-300 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="flex items-center gap-2 mt-2">
                <p className="text-sm font-black text-text-muted uppercase tracking-[0.2em]">{config.appSubtitle}</p>
                <div className="w-1 h-1 bg-stone-300 rounded-full" />
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold text-brand-600 uppercase tracking-widest">
                    Chào, {session.user.user_metadata?.full_name || session.user.email}
                  </span>
                  <div className="w-1 h-1 bg-stone-300 rounded-full" />
                  {syncStatus === 'synced' && <Cloud className="w-3.5 h-3.5 text-emerald-500" />}
                  {syncStatus === 'syncing' && <Loader2 className="w-3.5 h-3.5 text-brand-500 animate-spin" />}
                  {syncStatus === 'offline' && <CloudOff className="w-3.5 h-3.5 text-amber-500" />}
                  {syncStatus === 'error' && <CloudOff className="w-3.5 h-3.5 text-rose-500" />}
                  <span className={`text-[10px] font-bold uppercase tracking-widest ${
                    syncStatus === 'synced' ? 'text-emerald-600' : 
                    syncStatus === 'syncing' ? 'text-brand-600' : 
                    syncStatus === 'offline' ? 'text-amber-600' : 'text-rose-600'
                  }`}>
                    {syncStatus === 'synced' ? `Đã lưu Supabase ${lastSyncTime ? `(${lastSyncTime})` : ''}` : 
                     syncStatus === 'syncing' ? 'Đang lưu Supabase...' : 
                     syncStatus === 'offline' ? 'Lưu cục bộ' : 'Lỗi đồng bộ'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-2 bg-slate-100 rounded-xl p-1 no-print">
              <span className="text-xs font-bold text-slate-500 pl-3">Tuần</span>
              <select 
                value={currentWeek}
                onChange={(e) => setCurrentWeek(parseInt(e.target.value))}
                className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-brand-700 outline-none"
              >
                {Array.from({ length: 52 }).map((_, i) => (
                  <option key={i+1} value={i+1}>Tuần {i+1}</option>
                ))}
              </select>
            </div>
            <button 
              onClick={() => setShowSqlModal(true)} 
              title="Xem và sao chép mã SQL Supabase để cấp lại quyền & bảng"
              className="btn-secondary flex items-center gap-2 py-3 px-4 text-brand-700 bg-brand-50 hover:bg-brand-100 border-brand-200 shadow-xs"
            >
              <Database className="w-5 h-5 text-brand-600" />
              <span className="hidden md:inline font-bold text-xs">Mã SQL Supabase</span>
            </button>
            <button onClick={handleSave} className="btn-secondary flex items-center gap-2 py-3 px-5 sm:px-6">
              <Save className="w-5 h-5 sm:w-6 sm:h-6" />
              <span className="hidden sm:inline">Lưu & Đồng bộ</span>
            </button>
            <button onClick={handleLogout} className="btn-secondary flex items-center gap-2 py-3 px-4 sm:px-6 text-text-muted border-transparent hover:text-rose-600 hover:bg-rose-50">
              <LogOut className="w-5 h-5 sm:w-6 sm:h-6" />
              <span className="hidden sm:inline">Đăng xuất</span>
            </button>
            <div className="w-px h-10 bg-stone-200 mx-1 sm:mx-2" />
            <button onClick={handleGenerate} className="btn-primary flex items-center gap-2 py-3 px-6 sm:px-8 shadow-brand-500/25">
              <Play className="w-5 h-5 sm:w-6 sm:h-6 fill-current" />
              <span>Tạo TKB</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 print:p-0">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 mb-8 p-1 bg-slate-200/50 rounded-xl w-fit no-print">
          <button
            onClick={() => setActiveTab('config')}
            className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'config' 
                ? 'bg-white text-brand-600 shadow-sm' 
                : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
            }`}
          >
            <Settings className={`w-4 h-4 ${activeTab === 'config' ? 'text-brand-600' : 'text-slate-400'}`} />
            Cấu hình hệ thống
          </button>
          <button
            onClick={() => setActiveTab('result')}
            className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'result' 
                ? 'bg-white text-brand-600 shadow-sm' 
                : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
            }`}
          >
            <Calendar className={`w-4 h-4 ${activeTab === 'result' ? 'text-brand-600' : 'text-slate-400'}`} />
            Kết quả xếp lịch
          </button>
          {isAdmin && (
            <button
              onClick={() => setActiveTab('license')}
              className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeTab === 'license' 
                  ? 'bg-white text-brand-600 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
              }`}
            >
              <Key className={`w-4 h-4 ${activeTab === 'license' ? 'text-brand-600' : 'text-slate-400'}`} />
              Quản lý bản quyền
            </button>
          )}
        </div>

        {/* Content Area */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            {activeTab === 'config' ? (
              <ConfigTab 
                classes={classes} 
                setClasses={setClasses} 
                subjects={subjects} 
                setSubjects={setSubjects} 
                teachers={teachers} 
                setTeachers={setTeachers} 
                config={config} 
                setConfig={setConfig} 
              />
            ) : activeTab === 'result' ? (
              <ResultTab 
                timetable={weeklyTimetables[currentWeek]?.timetable || []} 
                unassigned={weeklyTimetables[currentWeek]?.unassigned || []} 
                classes={classes} 
                subjects={subjects} 
                teachers={teachers} 
                config={config} 
                onAutoBalanceAndRegenerate={handleAutoBalanceAndGenerate}
              />
            ) : (
              <LicenseManager />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* SQL Modal */}
      {showSqlModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-brand-100 rounded-xl flex items-center justify-center">
                  <Database className="w-5 h-5 text-brand-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800">Mã SQL Cấp Cơ Sở Dữ Liệu Supabase</h3>
                  <p className="text-xs text-slate-500 font-medium">Bao gồm bảng app_data, licenses, global_settings & Storage images</p>
                </div>
              </div>
              <button 
                onClick={() => setShowSqlModal(false)}
                className="p-2 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 leading-relaxed space-y-1">
                <p className="font-bold text-sm text-blue-950 mb-1">Hướng dẫn cài đặt trên Supabase:</p>
                <p>1. Đăng nhập vào <strong>dashboard.supabase.com</strong> và chọn dự án của bạn.</p>
                <p>2. Chọn mục <strong>SQL Editor</strong> ở thanh menu bên trái.</p>
                <p>3. Bấm <strong>New Query</strong>, dán toàn bộ đoạn mã SQL bên dưới và nhấn <strong>Run</strong>.</p>
                <p>4. Sau khi chạy xong, toàn bộ dữ liệu thiết lập sẽ tự động lưu và đồng bộ hai chiều trực tuyến.</p>
              </div>

              <div className="relative">
                <div className="flex items-center justify-between pb-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Mã SQL hoàn chỉnh:</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCopySql}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 text-white rounded-lg text-xs font-bold hover:bg-brand-700 transition-colors shadow-sm cursor-pointer"
                    >
                      {sqlCopied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                      {sqlCopied ? 'Đã sao chép!' : 'Sao chép SQL'}
                    </button>
                    <button
                      onClick={handleDownloadSql}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-200 transition-colors border border-slate-200 cursor-pointer"
                    >
                      Tải file .sql
                    </button>
                  </div>
                </div>
                <pre className="p-4 bg-slate-900 text-slate-200 rounded-xl text-xs font-mono overflow-x-auto max-h-80 select-all leading-relaxed">
                  {SUPABASE_SQL_CODE}
                </pre>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                onClick={() => setShowSqlModal(false)}
                className="px-5 py-2 bg-slate-200 text-slate-700 rounded-lg text-sm font-bold hover:bg-slate-300 transition-colors cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="mt-12 py-8 border-t border-slate-200 text-center no-print">
        <p className="text-xs text-slate-400 font-medium uppercase tracking-widest">
          © 2026 SmartSchedule Pro • Giải pháp xếp thời khóa biểu thông minh
        </p>
      </footer>
    </div>
  );
}
