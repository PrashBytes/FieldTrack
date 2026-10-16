import { createBrowserClient } from '@supabase/ssr';
import {
  MOCK_ACCOUNTS,
  MOCK_ORGANIZATION,
  MOCK_EMPLOYEES,
  MOCK_DEVICES,
  MOCK_GEOFENCES,
  MOCK_ATTENDANCE_SESSIONS,
  MOCK_LOCATION_POINTS,
  MOCK_FRAUD_EVENTS,
  MOCK_AUDIT_LOGS,
} from './mock-data';

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const rawKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder';

export const isPlaceholderUrl =
  !rawUrl ||
  rawUrl.includes('placeholder') ||
  rawUrl.includes('your-project-id') ||
  rawUrl.includes('127.0.0.1') ||
  rawUrl.includes('localhost');

/**
 * Returns true if we should immediately short-circuit data fetching
 * and use mock data without making any network requests.
 */
export const shouldBypassNetwork = (): boolean => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  if (
    !url ||
    url.includes('placeholder') ||
    url.includes('your-project-id') ||
    url.includes('127.0.0.1') ||
    url.includes('localhost')
  ) {
    return true;
  }
  if (typeof window !== 'undefined') {
    if (localStorage.getItem('fieldtrack_dev_session')) return true;
    if (document.cookie.includes('sb-dev-auth-token')) return true;
  }
  return false;
};

// Create native browser client
const nativeClient = createBrowserClient(rawUrl, rawKey);

/**
 * Enhanced client wrapper with seamless offline/development fallback
 * when local or remote Supabase backend is unreachable.
 */
class DevFallbackClient {
  private baseClient = nativeClient;

  get auth() {
    return {
      getSession: async () => {
        if (typeof window !== 'undefined') {
          const devSession = localStorage.getItem('fieldtrack_dev_session');
          if (devSession) {
            try {
              const parsed = JSON.parse(devSession);
              return { data: { session: parsed }, error: null };
            } catch {
              // ignore
            }
          }
        }
        if (shouldBypassNetwork()) {
          const defaultAdmin = MOCK_ACCOUNTS[0];
          const mockSession = {
            access_token: `mock_jwt_${defaultAdmin.id}`,
            refresh_token: `mock_refresh_${defaultAdmin.id}`,
            expires_in: 86400,
            token_type: 'bearer',
            user: {
              id: defaultAdmin.id,
              email: defaultAdmin.email,
              role: 'authenticated',
              aud: 'authenticated',
              user_metadata: { full_name: defaultAdmin.full_name },
              app_metadata: { provider: 'email' },
              created_at: new Date().toISOString(),
            },
          };
          return { data: { session: mockSession }, error: null };
        }
        try {
          return await this.baseClient.auth.getSession();
        } catch {
          return { data: { session: null }, error: null };
        }
      },

      getUser: async () => {
        if (typeof window !== 'undefined') {
          const devSession = localStorage.getItem('fieldtrack_dev_session');
          if (devSession) {
            try {
              const parsed = JSON.parse(devSession);
              return { data: { user: parsed.user }, error: null };
            } catch {
              // ignore
            }
          }
        }
        if (shouldBypassNetwork()) {
          const defaultAdmin = MOCK_ACCOUNTS[0];
          return {
            data: {
              user: {
                id: defaultAdmin.id,
                email: defaultAdmin.email,
                role: 'authenticated',
                aud: 'authenticated',
                user_metadata: { full_name: defaultAdmin.full_name },
                app_metadata: { provider: 'email' },
                created_at: new Date().toISOString(),
              },
            },
            error: null,
          };
        }
        try {
          return await this.baseClient.auth.getUser();
        } catch {
          return { data: { user: null }, error: null };
        }
      },

      signInWithPassword: async ({ email, password }: { email: string; password: string }) => {
        // If local dev / placeholder / mock mode, bypass network completely
        if (shouldBypassNetwork()) {
          const matched =
            MOCK_ACCOUNTS.find((acc) => acc.email.toLowerCase() === email.toLowerCase()) ||
            MOCK_ACCOUNTS[0];

          const mockSession = {
            access_token: `mock_jwt_${matched.id}`,
            refresh_token: `mock_refresh_${matched.id}`,
            expires_in: 86400,
            token_type: 'bearer',
            user: {
              id: matched.id,
              email: matched.email,
              role: 'authenticated',
              aud: 'authenticated',
              user_metadata: { full_name: matched.full_name },
              app_metadata: { provider: 'email' },
              created_at: new Date().toISOString(),
            },
          };

          if (typeof window !== 'undefined') {
            localStorage.setItem('fieldtrack_dev_session', JSON.stringify(mockSession));
            document.cookie = `sb-dev-auth-token=${encodeURIComponent(
              JSON.stringify({ userId: matched.id, role: matched.role })
            )}; path=/; max-age=86400; SameSite=Lax`;
          }

          return { data: { user: mockSession.user, session: mockSession }, error: null };
        }

        try {
          const res = await this.baseClient.auth.signInWithPassword({ email, password });
          if (!res.error) return res;
        } catch {
          // Backend unreachable, fallback to dev mock
        }

        const matched = MOCK_ACCOUNTS.find(
          (acc) => acc.email.toLowerCase() === email.toLowerCase()
        );

        if (matched) {
          const mockSession = {
            access_token: `mock_jwt_${matched.id}`,
            refresh_token: `mock_refresh_${matched.id}`,
            expires_in: 86400,
            token_type: 'bearer',
            user: {
              id: matched.id,
              email: matched.email,
              role: 'authenticated',
              aud: 'authenticated',
              user_metadata: { full_name: matched.full_name },
              app_metadata: { provider: 'email' },
              created_at: new Date().toISOString(),
            },
          };

          if (typeof window !== 'undefined') {
            localStorage.setItem('fieldtrack_dev_session', JSON.stringify(mockSession));
            document.cookie = `sb-dev-auth-token=${encodeURIComponent(
              JSON.stringify({ userId: matched.id, role: matched.role })
            )}; path=/; max-age=86400; SameSite=Lax`;
          }

          return { data: { user: mockSession.user, session: mockSession }, error: null };
        }

        return { data: { user: null, session: null }, error: { message: 'User not found in demo seed data' } as any };
      },

      signUp: async ({ email, password }: { email: string; password: string }) => {
        try {
          return await this.baseClient.auth.signUp({ email, password });
        } catch {
          return { data: { user: null, session: null }, error: { message: 'Local backend not reachable' } as any };
        }
      },

      signOut: async () => {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('fieldtrack_dev_session');
          document.cookie = 'sb-dev-auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        }
        try {
          return await this.baseClient.auth.signOut();
        } catch {
          return { error: null };
        }
      },

      resetPasswordForEmail: async (email: string) => {
        try {
          return await this.baseClient.auth.resetPasswordForEmail(email);
        } catch {
          return { data: {}, error: null };
        }
      },

      updateUser: async (attrs: any) => {
        try {
          return await this.baseClient.auth.updateUser(attrs);
        } catch {
          return { data: { user: null }, error: null };
        }
      },

      onAuthStateChange: (callback: any) => {
        if (shouldBypassNetwork()) {
          const defaultAdmin = MOCK_ACCOUNTS[0];
          const mockSession = {
            access_token: `mock_jwt_${defaultAdmin.id}`,
            refresh_token: `mock_refresh_${defaultAdmin.id}`,
            expires_in: 86400,
            token_type: 'bearer',
            user: {
              id: defaultAdmin.id,
              email: defaultAdmin.email,
              role: 'authenticated',
              aud: 'authenticated',
              user_metadata: { full_name: defaultAdmin.full_name },
              app_metadata: { provider: 'email' },
              created_at: new Date().toISOString(),
            },
          };
          setTimeout(() => {
            try {
              callback('INITIAL_SESSION', mockSession);
            } catch {
              // ignore
            }
          }, 0);
          return { data: { subscription: { unsubscribe: () => {} } } };
        }
        try {
          return this.baseClient.auth.onAuthStateChange(callback);
        } catch {
          return { data: { subscription: { unsubscribe: () => {} } } };
        }
      },
    };
  }

  channel(name: string, opts?: any) {
    if (shouldBypassNetwork()) {
      return {
        on: () => ({ subscribe: () => ({ unsubscribe: () => {} }) }),
        subscribe: () => ({ unsubscribe: () => {} }),
      };
    }
    try {
      return this.baseClient.channel(name, opts);
    } catch {
      return {
        on: () => ({ subscribe: () => ({ unsubscribe: () => {} }) }),
        subscribe: () => ({ unsubscribe: () => {} }),
      };
    }
  }

  removeChannel(channel: any) {
    try {
      return this.baseClient.removeChannel(channel);
    } catch {
      return Promise.resolve('ok');
    }
  }

  getChannels() {
    try {
      return this.baseClient.getChannels();
    } catch {
      return [];
    }
  }

  from(table: string) {
    // If backend is configured to local/placeholder/mock mode, return instant mock query builder
    if (shouldBypassNetwork()) {
      return createMockQueryBuilder(table);
    }

    // Otherwise use native query builder with fallback on network error
    const realQueryBuilder = this.baseClient.from(table);

    return new Proxy(realQueryBuilder, {
      get: (target: any, prop: string) => {
        if (prop === 'select' || prop === 'insert' || prop === 'update' || prop === 'delete') {
          return (...args: any[]) => {
            const query = target[prop](...args);
            const originalThen = query.then.bind(query);

            query.then = (onfulfilled: any, onrejected: any) => {
              return originalThen((res: any) => {
                if (res?.error && res.error.message?.includes('fetch')) {
                  const fallback = getFallbackTableData(table, query);
                  return onfulfilled({ data: fallback.data, count: fallback.count, error: null });
                }
                return onfulfilled(res);
              }).catch(() => {
                const fallback = getFallbackTableData(table, query);
                return onfulfilled({ data: fallback.data, count: fallback.count, error: null });
              });
            };

            return query;
          };
        }
        return target[prop];
      },
    });
  }
}

/**
 * Instant Mock PostgREST Query Builder that resolves immediately
 * without waiting for network timeouts.
 */
function createMockQueryBuilder(table: string) {
  let isHeadCount = false;
  let isSingle = false;
  const filters: Array<{ col: string; op: string; val: any }> = [];
  let updateValues: any = null;

  const mockBuilder: any = {
    select: (columns?: string, options?: { count?: string; head?: boolean }) => {
      if (options?.head) {
        isHeadCount = true;
      }
      return mockBuilder;
    },
    insert: (values: any) => {
      if (table === 'fraud_events' && values) {
        const item = Array.isArray(values) ? values[0] : values;
        if (item) {
          MOCK_FRAUD_EVENTS.unshift({
            id: item.id || `dev-evt-${Date.now()}`,
            organization_id: item.organization_id || '00000000-0000-0000-0000-000000000001',
            employee_id: item.employee_id,
            session_id: item.session_id || null,
            event_type: item.event_type || 'SECURITY_INCIDENT',
            severity: (item.severity || 'MEDIUM').toUpperCase(),
            status: (item.status || 'PENDING').toUpperCase(),
            details: item.details || {},
            created_at: new Date().toISOString(),
          } as any);
        }
      }
      return mockBuilder;
    },
    update: (values: any) => {
      updateValues = values;
      return mockBuilder;
    },
    delete: () => mockBuilder,
    eq: (col: string, val: any) => {
      filters.push({ col, op: 'eq', val });
      if (updateValues && table === 'fraud_events' && col === 'id') {
        const target = MOCK_FRAUD_EVENTS.find((e: any) => e.id === val);
        if (target) {
          Object.assign(target, updateValues);
        }
      }
      return mockBuilder;
    },
    neq: (col: string, val: any) => {
      filters.push({ col, op: 'neq', val });
      return mockBuilder;
    },
    gt: (col: string, val: any) => mockBuilder,
    gte: (col: string, val: any) => mockBuilder,
    lt: (col: string, val: any) => mockBuilder,
    lte: (col: string, val: any) => mockBuilder,
    like: (col: string, val: any) => {
      filters.push({ col, op: 'ilike', val });
      return mockBuilder;
    },
    ilike: (col: string, val: any) => {
      filters.push({ col, op: 'ilike', val });
      return mockBuilder;
    },
    is: (col: string, val: any) => mockBuilder,
    in: (col: string, val: any) => {
      filters.push({ col, op: 'in', val });
      return mockBuilder;
    },
    contains: (col: string, val: any) => mockBuilder,
    or: (filtersStr: string) => mockBuilder,
    order: (col: string, opts?: any) => mockBuilder,
    range: (from: number, to: number) => mockBuilder,
    limit: (count: number) => mockBuilder,
    single: () => {
      isSingle = true;
      return mockBuilder;
    },
    maybeSingle: () => {
      isSingle = true;
      return mockBuilder;
    },
    then: (onfulfilled: any, onrejected?: any) => {
      const fallback = getFallbackTableData(table);
      let data: any = fallback.data;

      if (Array.isArray(data) && filters.length > 0) {
        data = data.filter((item: any) => {
          return filters.every((f) => {
            const itemVal = item[f.col];
            if (f.op === 'eq') {
              if (itemVal === undefined) return true;
              return String(itemVal).toLowerCase() === String(f.val).toLowerCase();
            }
            if (f.op === 'neq') {
              if (itemVal === undefined) return true;
              return String(itemVal).toLowerCase() !== String(f.val).toLowerCase();
            }
            if (f.op === 'ilike') {
              if (itemVal === undefined) return true;
              return String(itemVal).toLowerCase() === String(f.val).toLowerCase();
            }
            if (f.op === 'in') {
              if (!Array.isArray(f.val)) return true;
              return f.val.map((v: any) => String(v).toLowerCase()).includes(String(itemVal).toLowerCase());
            }
            return true;
          });
        });
      }

      const totalCount = Array.isArray(data) ? data.length : fallback.count;

      if (isHeadCount) {
        data = null;
      } else if (isSingle) {
        data = Array.isArray(data) ? data[0] || null : data;
      }

      const response = {
        data,
        count: totalCount,
        error: null,
      };
      return Promise.resolve(response).then(onfulfilled, onrejected);
    },
    catch: (onrejected: any) => {
      return Promise.resolve().catch(onrejected);
    },
  };

  return mockBuilder;
}

function getFallbackTableData(table: string, queryContext?: any): { data: any; count: number } {
  switch (table) {
    case 'organizations':
      return { data: [MOCK_ORGANIZATION], count: 1 };
    case 'profiles':
      return { data: MOCK_ACCOUNTS, count: MOCK_ACCOUNTS.length };
    case 'employees':
      return { data: MOCK_EMPLOYEES, count: MOCK_EMPLOYEES.length };
    case 'devices':
      return { data: MOCK_DEVICES, count: MOCK_DEVICES.length };
    case 'geofences':
      return { data: MOCK_GEOFENCES, count: MOCK_GEOFENCES.length };
    case 'attendance_sessions':
      return { data: MOCK_ATTENDANCE_SESSIONS, count: MOCK_ATTENDANCE_SESSIONS.length };
    case 'location_points':
      return { data: MOCK_LOCATION_POINTS, count: MOCK_LOCATION_POINTS.length };
    case 'fraud_events':
      return { data: MOCK_FRAUD_EVENTS, count: MOCK_FRAUD_EVENTS.length };
    case 'audit_logs':
      return { data: MOCK_AUDIT_LOGS, count: MOCK_AUDIT_LOGS.length };
    default:
      return { data: [], count: 0 };
  }
}

export const supabase = new DevFallbackClient() as unknown as typeof nativeClient;
