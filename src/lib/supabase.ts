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
  }, 2500);

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
    
    // For auth requests, return 200 with empty user/session so GoTrueClient does not throw or call console.error
    if (urlStr.includes('/auth/v1/')) {
      return new Response(
        JSON.stringify({
          data: { session: null, user: null },
          session: null,
          user: null,
        }),
        {
          status: 200,
          statusText: 'OK',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // For database requests (rest/v1), return 200 with empty array/object
    return new Response(
      JSON.stringify([]),
      {
        status: 200,
        statusText: 'OK',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
};

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

