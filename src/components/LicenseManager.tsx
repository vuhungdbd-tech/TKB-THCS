import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Key, Plus, Trash2, CheckCircle2, XCircle, Loader2, Copy, Clock, Calendar, Image as ImageIcon, Save } from 'lucide-react';

export default function LicenseManager() {
  const [keys, setKeys] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [loginBg, setLoginBg] = useState('');
  const [savingBg, setSavingBg] = useState(false);
  const [uploading, setUploading] = useState(false);

  const fetchKeys = async () => {
    if (!supabase) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('licenses')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (!error && data) setKeys(data);
    } catch (_e) {
      // Safe offline fallback
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !supabase) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `login-bg-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('images')
        .getPublicUrl(filePath);

      setLoginBg(publicUrl);
      alert('Tải ảnh lên thành công! Nhấn "Lưu ảnh" để áp dụng.');
    } catch (error: any) {
      alert('Lỗi khi tải ảnh: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const fetchSettings = async () => {
    if (!supabase) return;
    try {
      const { data, error } = await supabase
        .from('global_settings')
        .select('*')
        .eq('id', 'login_bg')
        .single();
      
      if (!error && data) {
        setLoginBg(data.value?.url || '');
      }
    } catch (_e) {
      // Safe offline fallback
    }
  };

  useEffect(() => {
    fetchKeys();
    fetchSettings();
  }, []);

  const handleSaveBg = async () => {
    if (!supabase) return;
    setSavingBg(true);
    const { error } = await supabase
      .from('global_settings')
      .upsert({ id: 'login_bg', value: { url: loginBg } });
    
    if (error) {
      alert('Lỗi khi lưu ảnh: ' + error.message);
    } else {
      alert('Đã cập nhật ảnh nền đăng nhập!');
    }
    setSavingBg(false);
  };

  const generateKey = async (type: 'trial' | 'full') => {
    if (!supabase) return;
    setGenerating(true);
    
    // Generate a random key format: SL-XXXX-XXXX
    const randomPart = () => Math.random().toString(36).substring(2, 6).toUpperCase();
    const newKey = `SL-${randomPart()}-${randomPart()}`;
    
    const { error } = await supabase
      .from('licenses')
      .insert({
        key: newKey,
        type: type,
        status: 'unused'
      });

    if (error) {
      alert('Lỗi khi tạo key: ' + error.message);
    } else {
      fetchKeys();
    }
    setGenerating(false);
  };

  const deleteKey = async (id: string) => {
    if (!supabase || !window.confirm('Xóa key này?')) return;
    const { error } = await supabase.from('licenses').delete().eq('id', id);
    if (!error) fetchKeys();
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Đã sao chép: ' + text);
  };

  return (
    <div className="space-y-6">
      {/* Login Background Config */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <ImageIcon className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">Cấu hình ảnh nền đăng nhập</h3>
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Thay đổi hình ảnh hiển thị tại màn hình đăng nhập</p>
            </div>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Đường dẫn ảnh (URL)</label>
              <input 
                type="text" 
                value={loginBg}
                onChange={(e) => setLoginBg(e.target.value)}
                placeholder="https://example.com/image.jpg"
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              />
            </div>
            <div className="mt-6">
              <label className={`flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-bold hover:bg-slate-200 transition-colors cursor-pointer border border-slate-300 ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
                {uploading ? 'Đang tải...' : 'Tải ảnh từ máy'}
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={handleFileUpload}
                  disabled={uploading}
                />
              </label>
            </div>
          </div>
          <div className="flex justify-end">
            <button 
              onClick={handleSaveBg}
              disabled={savingBg}
              className="flex items-center gap-2 px-6 py-2 bg-brand-600 text-white rounded-lg font-bold hover:bg-brand-700 transition-colors shadow-lg shadow-brand-500/20 disabled:opacity-50"
            >
              {savingBg ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Lưu ảnh
            </button>
          </div>
        </div>
      </div>

      {/* License Management */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
            <Key className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800">Quản lý bản quyền</h3>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Tạo và quản lý mã kích hoạt hệ thống</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => generateKey('trial')} 
            disabled={generating}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-lg text-sm font-bold hover:bg-emerald-100 transition-colors border border-emerald-200"
          >
            <Clock className="w-4 h-4" />
            Thử nghiệm (1 tháng)
          </button>
          <button 
            onClick={() => generateKey('full')} 
            disabled={generating}
            className="flex items-center gap-2 px-4 py-2 bg-brand-50 text-brand-700 rounded-lg text-sm font-bold hover:bg-brand-100 transition-colors border border-brand-200"
          >
            <Calendar className="w-4 h-4" />
            Bản quyền (1 năm)
          </button>
        </div>
      </div>

      <div className="p-0">
        {loading ? (
          <div className="p-12 text-center">
            <Loader2 className="w-8 h-8 text-brand-600 animate-spin mx-auto mb-2" />
            <p className="text-sm text-slate-500">Đang tải danh sách key...</p>
          </div>
        ) : keys.length === 0 ? (
          <div className="p-12 text-center text-slate-400 italic">
            Chưa có mã bản quyền nào được tạo.
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 text-[10px] uppercase tracking-widest font-bold text-slate-500 border-b border-slate-100">
                <th className="px-6 py-3">Mã bản quyền</th>
                <th className="px-6 py-3">Loại</th>
                <th className="px-6 py-3">Trạng thái</th>
                <th className="px-6 py-3">Người dùng</th>
                <th className="px-6 py-3">Liên hệ</th>
                <th className="px-6 py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {keys.map((k) => (
                <tr key={k.id} className="hover:bg-slate-50/30 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <code className="bg-slate-100 px-2 py-1 rounded text-brand-700 font-mono font-bold text-sm">
                        {k.key}
                      </code>
                      <button 
                        onClick={() => copyToClipboard(k.key)}
                        className="p-1 text-slate-400 hover:text-brand-600 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                      k.type === 'trial' 
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                        : 'bg-brand-50 text-brand-700 border-brand-100'
                    }`}>
                      {k.type === 'trial' ? '1 Tháng' : '1 Năm'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5">
                      {k.status === 'unused' ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          <span className="text-xs font-bold text-emerald-600">Sẵn dùng</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-4 h-4 text-slate-400" />
                          <span className="text-xs font-bold text-slate-500">Đã dùng</span>
                        </>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-slate-700">
                        {k.used_by_name || '—'}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">
                        {k.used_by_email || '—'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs text-slate-600 font-bold">
                      {k.used_by_phone || '—'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => deleteKey(k.id)}
                      className="p-2 text-slate-300 hover:text-rose-600 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  </div>
  );
}
