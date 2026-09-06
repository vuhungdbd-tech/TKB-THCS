import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials missing. Local storage will be used as fallback.');
}

// Custom safe fetch that intercepts network failures & timeouts so they don't block the UI
const safeFetch: typeof fetch = async (input, init) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    try {
      controller.abort();
    } catch {}
  }, 12000);

  try {
    let signal = controller.signal;
    if (init?.signal) {
      if (init.signal.aborted) {
        controller.abort();
      } else {
        init.signal.addEventListener('abort', () => {
          try {
            controller.abort();
          } catch {}
        }, { once: true });
      }
    }

    const response = await fetch(input, {
      ...init,
      signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (_err) {
    clearTimeout(timeoutId);
    // Network error (offline, DNS lookup failed, host unreachable, timeout, etc.)
    const urlStr = typeof input === 'string' ? input : (input && 'url' in input ? (input as any).url : String(input));
    
    // For auth requests, return 400 error response so GoTrue does not treat null session as successful 200 and throw AuthSessionMissingError
    if (urlStr.includes('/auth/v1/')) {
      return new Response(
        JSON.stringify({
          error: 'network_unavailable',
          error_description: 'Network error or offline mode',
          message: 'Network error or offline mode',
        }),
        {
          status: 400,
          statusText: 'Bad Request',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // For database requests (rest/v1), return 503 error so Supabase client accurately knows network request failed
    return new Response(
      JSON.stringify({
        code: 'PGRST_OFFLINE',
        message: 'Không thể kết nối đến máy chủ Supabase (Ngoại tuyến hoặc mạng bị gián đoạn)',
        details: 'Network failure or connection timed out',
        hint: 'Dữ liệu được lưu trữ an toàn trong máy tính (localStorage).',
      }),
      {
        status: 503,
        statusText: 'Service Unavailable',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
};

// Clean up any corrupt or incomplete Supabase auth tokens in storage before initializing
try {
  if (typeof window !== 'undefined' && window.localStorage) {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
        const val = localStorage.getItem(key);
        if (val) {
          try {
            const parsed = JSON.parse(val);
            if (!parsed || !parsed.access_token) {
              localStorage.removeItem(key);
            }
          } catch {
            localStorage.removeItem(key);
          }
        }
      }
    }
  }
} catch {}

// Only create client if URL is present to avoid "supabaseUrl is required" error
export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: true,
        detectSessionInUrl: false,
        // Override lock to execute immediately, preventing navigator.locks conflicts and processLock timeout errors
        lock: async (_name: string, _acquireTimeout: number, fn: () => Promise<any>) => {
          try {
            return await fn();
          } catch (_e) {
            return null;
          }
        },
      },
      global: {
        fetch: safeFetch,
      },
    })
  : null as any;

// Safely patch Supabase auth methods so AuthSessionMissingError is never unhandled
if (supabase?.auth) {
  const origGetSession = supabase.auth.getSession.bind(supabase.auth);
  supabase.auth.getSession = async () => {
    try {
      const res = await origGetSession();
      return res || { data: { session: null }, error: null };
    } catch (_err: any) {
      // Clear potentially corrupt storage on session error
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
              localStorage.removeItem(key);
            }
          }
        }
      } catch {}
      return { data: { session: null }, error: null };
    }
  };

  const origGetUser = supabase.auth.getUser.bind(supabase.auth);
  supabase.auth.getUser = async (jwt?: string) => {
    try {
      const res = await origGetUser(jwt);
      return res || { data: { user: null }, error: null };
    } catch {
      return { data: { user: null }, error: null };
    }
  };

  const origSignOut = supabase.auth.signOut.bind(supabase.auth);
  supabase.auth.signOut = async (options?: any) => {
    try {
      const res = await origSignOut(options);
      return res || { error: null };
    } catch {
      return { error: null };
    }
  };

  const origRefreshSession = supabase.auth.refreshSession.bind(supabase.auth);
  supabase.auth.refreshSession = async (currentSession?: any) => {
    try {
      const res = await origRefreshSession(currentSession);
      return res || { data: { session: null, user: null }, error: null };
    } catch {
      return { data: { session: null, user: null }, error: null };
    }
  };
}

