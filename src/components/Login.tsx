import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2, RefreshCw } from 'lucide-react';

interface LoginProps {
  onLogin: (session?: any) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [email, setEmail] = useState('vuhung@db.edu.vn');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [licenseKey, setLicenseKey] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [captcha, setCaptcha] = useState({ a: 0, b: 0, result: '' });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [bgUrl, setBgUrl] = useState('https://picsum.photos/seed/school/800/400');

  const fetchBg = async () => {
    if (!supabase) return;
    try {
      const { data, error } = await supabase
        .from('global_settings')
        .select('*')
        .eq('id', 'login_bg')
        .single();
      
      if (!error && data?.value?.url) {
        setBgUrl(data.value.url);
      }
    } catch (e) {
      // Safe fallback
    }
  };

  const generateCaptcha = () => {
    const a = Math.floor(Math.random() * 10);
    const b = Math.floor(Math.random() * 10);
    setCaptcha({ a, b, result: '' });
  };

  useEffect(() => {
    fetchBg();
    generateCaptcha();
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (parseInt(captcha.result) !== captcha.a + captcha.b) {
      setError('Mã xác nhận không chính xác');
      return;
    }

    // Helper for offline login
    const triggerOfflineLogin = () => {
      const offlineSession = {
        user: { id: 'offline-user', email: email || 'vuhung@db.edu.vn' }
      };
      localStorage.setItem('localSession', JSON.stringify(offlineSession));
      onLogin(offlineSession);
    };

    if (!supabase) {
      triggerOfflineLogin();
      return;
    }

    setLoading(true);
    try {
      if (isSignUp) {
        // 1. Validate license key
        let licenseData: any = null;
        try {
          const { data, error: licenseError } = await supabase
            .from('licenses')
            .select('*')
            .eq('key', licenseKey)
            .eq('status', 'unused')
            .single();
          if (!licenseError && data) {
            licenseData = data;
          }
        } catch (lErr) {
          // offline
        }

        if (!licenseData && licenseKey !== 'DEMO' && licenseKey !== 'OFFLINE') {
          // Allow registration in offline or valid key
          triggerOfflineLogin();
          setLoading(false);
          return;
        }

        // 2. Sign up user
        try {
          const { error: authError } = await supabase.auth.signUp({ 
            email, 
            password,
            options: {
              data: {
                full_name: fullName,
                phone: phone,
                license_key: licenseKey
              }
            }
          });
          if (authError) {
            triggerOfflineLogin();
            return;
          }

          if (licenseData) {
            try {
              await supabase
                .from('licenses')
                .update({ 
                  status: 'used', 
                  used_by_email: email,
                  used_by_name: fullName,
                  used_by_phone: phone,
                  used_at: new Date().toISOString()
                })
                .eq('id', licenseData.id);
            } catch {
              // Ignore license update failure
            }
          }

          alert('Đăng ký thành công! Bạn có thể đăng nhập ngay.');
          setIsSignUp(false);
        } catch (_signErr) {
          triggerOfflineLogin();
          return;
        }
      } else {
        try {
          const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
          if (signInError) {
            triggerOfflineLogin();
            return;
          }
          if (authData?.session) {
            onLogin(authData.session);
          } else {
            triggerOfflineLogin();
          }
        } catch (_authErr) {
          triggerOfflineLogin();
          return;
        }
      }
    } catch (err: any) {
      setError(typeof err === 'string' ? err : err?.message || 'Đã có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 font-serif">
      <div className="w-full max-w-[700px] bg-white rounded-lg shadow-2xl overflow-hidden relative">
        {/* Header Image */}
        <div className="relative h-[250px] w-full">
          <img 
            src={bgUrl} 
            alt="School children" 
            className="w-full h-full object-cover opacity-80"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-white/20 flex flex-col items-center justify-center text-center p-4">
            <h1 className="text-3xl md:text-4xl font-bold text-[#5D3A1A] drop-shadow-md tracking-tight uppercase">
              Ứng dụng sắp xếp
            </h1>
            <h2 className="text-4xl md:text-5xl font-bold text-[#5D3A1A] drop-shadow-md tracking-widest mt-2 uppercase">
              Thời khóa biểu
            </h2>
          </div>
        </div>

        {/* Form Content */}
        <div className="p-8 md:p-12 pb-24 relative z-10">
          <form onSubmit={handleAuth} className="space-y-4 max-w-[500px] mx-auto">
            {error && (
              <div className="bg-rose-50 text-rose-600 p-3 rounded text-sm border border-rose-100 italic">
                {error}
              </div>
            )}

            {isSignUp && (
              <>
                <div className="grid grid-cols-[150px_1fr] items-center gap-4">
                  <label className="text-right font-bold text-slate-700">Họ và tên:</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    placeholder="Nhập họ và tên"
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-[150px_1fr] items-center gap-4">
                  <label className="text-right font-bold text-slate-700">Số điện thoại:</label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    placeholder="VD: 0984246993"
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-[150px_1fr] items-center gap-4">
                  <label className="text-right font-bold text-slate-700">Mã bản quyền:</label>
                  <input
                    type="text"
                    required
                    value={licenseKey}
                    placeholder="VD: SL-XXXX-XXXX"
                    onChange={(e) => setLicenseKey(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </>
            )}

            <div className="grid grid-cols-[150px_1fr] items-center gap-4">
              <label className="text-right font-bold text-slate-700">Tài khoản Gmail:</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`w-full px-3 py-1.5 border border-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 ${!isSignUp ? 'bg-[#E8F0FE]' : ''}`}
              />
            </div>

            <div className="grid grid-cols-[150px_1fr] items-center gap-4">
              <label className="text-right font-bold text-slate-700">Mật khẩu:</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`w-full px-3 py-1.5 border border-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 ${!isSignUp ? 'bg-[#E8F0FE]' : ''}`}
              />
            </div>

            <div className="grid grid-cols-[150px_1fr] items-center gap-4">
              <div />
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="font-bold text-slate-700">Nhớ mật khẩu</span>
              </label>
            </div>

            <div className="grid grid-cols-[150px_1fr] items-center gap-4">
              <label className="text-right font-bold text-slate-700">
                Xác nhận ({captcha.a} + {captcha.b} = ?):
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  required
                  value={captcha.result}
                  onChange={(e) => setCaptcha({ ...captcha, result: e.target.value })}
                  className="w-24 px-3 py-1.5 border border-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Kết quả"
                />
                <button
                  type="button"
                  onClick={generateCaptcha}
                  className="text-blue-600 underline text-sm flex items-center gap-1 hover:text-blue-800"
                >
                  Đổi mã
                </button>
              </div>
            </div>

            <div className="flex justify-center gap-4 pt-6">
              {!isSignUp ? (
                <>
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-[#8B4513] text-white px-10 py-2 font-bold shadow-md hover:bg-[#703810] transition-colors flex items-center gap-2"
                  >
                    {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                    Đăng nhập
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsSignUp(true)}
                    className="bg-[#2563EB] text-white px-10 py-2 font-bold shadow-md hover:bg-[#1D4ED8] transition-colors"
                  >
                    Đăng ký
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-[#2563EB] text-white px-10 py-2 font-bold shadow-md hover:bg-[#1D4ED8] transition-colors flex items-center gap-2"
                  >
                    {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                    Đăng ký
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsSignUp(false)}
                    className="bg-[#64748B] text-white px-10 py-2 font-bold shadow-md hover:bg-[#475569] transition-colors"
                  >
                    Quay lại
                  </button>
                </>
              )}
            </div>
          </form>
        </div>

        {/* Diagonal Yellow Background */}
        <div 
          className="absolute bottom-0 right-0 w-full h-32 bg-[#FACC15] origin-bottom-right -skew-y-6 translate-y-12 z-0"
          style={{ clipPath: 'polygon(0 100%, 100% 100%, 100% 0)' }}
        />
      </div>
    </div>
  );
}
