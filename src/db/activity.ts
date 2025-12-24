import { supabase } from '@/lib/supabaseClient';
import type { ActivityLog } from '@/lib/activityLogger';
import { getUserIPAndLocation } from '@/lib/activityLogger';

type DBTimestamp = {
  toDate: () => Date;
  toMillis: () => number;
};

const toTimestamp = (iso: string | null): DBTimestamp => {
  const d = iso ? new Date(iso) : new Date();
  return { toDate: () => d, toMillis: () => d.getTime() };
};

type ActivityRow = {
  id: number;
  user_id: string;
  action: string;
  metadata: any;
  created_at: string;
};

const rowToActivityLog = (row: ActivityRow): ActivityLog & { id?: string } => {
  const m = row.metadata || {};
  return {
    type: row.action as ActivityLog['type'],
    timestamp: toTimestamp(row.created_at),
    details: m,
    userAgent: m.userAgent || '',
    ip: m.ip || undefined,
    location: m.location || undefined,
    id: String(row.id)
  } as any;
};

let cachedTechInfo: { ip: string; location: string; ts: number } | null = null;
const LS_KEY = 'activity_tech_info_cache';
const TTL_MS = 6 * 60 * 60 * 1000;

async function getTechnicalInfo(): Promise<{
  userAgent: string;
  pageUrl: string;
  ip: string | null;
  location: string | null;
  ipLookupUrl: string | null;
}> {
  const now = Date.now();
  if (!cachedTechInfo) {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.ts && now - parsed.ts < TTL_MS) {
          cachedTechInfo = parsed;
        }
      }
    } catch {}
  }
  if (!cachedTechInfo || now - cachedTechInfo.ts >= TTL_MS) {
    try {
      const { ip, location } = await getUserIPAndLocation();
      cachedTechInfo = { ip, location, ts: now };
      try {
        localStorage.setItem(LS_KEY, JSON.stringify(cachedTechInfo));
      } catch {}
    } catch {
      cachedTechInfo = { ip: 'Unknown', location: 'Unknown', ts: now };
    }
  }
  const ip = cachedTechInfo.ip && cachedTechInfo.ip !== 'Unknown' ? cachedTechInfo.ip : null;
  const location = cachedTechInfo.location && cachedTechInfo.location !== 'Unknown' ? cachedTechInfo.location : null;
  const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const pageUrl = typeof window !== 'undefined' ? window.location.href : '';
  const ipLookupUrl = ip ? `https://ipinfo.io/${ip}` : null;
  return { userAgent, pageUrl, ip, location, ipLookupUrl };
}

async function isAdminUser(userId: string): Promise<boolean> {
  try {
    const { data } = await supabase.from('admin_users').select('user_id').eq('user_id', userId).maybeSingle();
    if (data) return true;
  } catch {}
  try {
    const { data: profile } = await supabase.from('profiles').select('email').eq('id', userId).maybeSingle();
    const email = profile?.email || '';
    const fallbackAdmins = ['ichrakchraibi5@gmail.com', 'mohamed.sultan.7744@gmail.com', 'toparabg@gmail.com'];
    return fallbackAdmins.includes(email);
  } catch {}
  return false;
}

export async function logActivity(action: string, metadata?: any): Promise<void> {
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth?.user?.id;
  if (!userId) return;
  if (await isAdminUser(userId)) return;
  const tech = await getTechnicalInfo();
  const payload = {
    user_id: userId,
    action,
    metadata: { ...(metadata || {}), ...tech }
  };
  await supabase.from('activity_logs').insert([payload]);
}

export async function listMyActivity(limit = 50): Promise<(ActivityLog & { id?: string })[]> {
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth?.user?.id;
  if (!userId) return [];
  const { data } = await supabase
    .from('activity_logs')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  return (data || []).map(rowToActivityLog);
}

export async function listAllActivity(limit = 200): Promise<(ActivityLog & { id?: string })[]> {
  const { data } = await supabase
    .from('activity_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  return (data || []).map(rowToActivityLog);
}

export async function listUserActivity(userId: string, limit = 100): Promise<(ActivityLog & { id?: string })[]> {
  const { data } = await supabase
    .from('activity_logs')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  return (data || []).map(rowToActivityLog);
}

export async function listAdminUserIds(): Promise<Set<string>> {
  const result = new Set<string>();
  try {
    const { data } = await supabase.from('admin_users').select('user_id');
    (data || []).forEach((r: any) => result.add(r.user_id));
    if (result.size > 0) return result;
  } catch {}
  try {
    const fallbackAdmins = ['ichrakchraibi5@gmail.com', 'mohamed.sultan.7744@gmail.com', 'toparabg@gmail.com'];
    const { data } = await supabase.from('profiles').select('id, email').in('email', fallbackAdmins);
    (data || []).forEach((r: any) => result.add(r.id));
  } catch {}
  return result;
}
