import { supabase } from '@/lib/supabaseClient';

export interface DailyDrop {
  id: string;
  text: string;
  image?: string;
  createdAt: string; // ISO string from Supabase
  updatedAt?: string;
  // Mapped fields for UI compatibility
  customDate?: string; 
  createdBy?: string;
  createdByName?: string;
  createdByAvatar?: string;
}

export async function listDailyDrops(): Promise<DailyDrop[]> {
  const { data, error } = await supabase
    .from('daily_drops')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data || []).map((row: any) => ({
    id: row.id,
    text: row.text,
    image: row.image,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    // Map created_at to customDate as fallback since the column might not exist
    customDate: row.created_at, 
    // Defaults for missing columns
    createdBy: 'admin',
    createdByName: 'Elitez Club',
    createdByAvatar: '/favicon.png'
  }));
}

export async function addDailyDrop(drop: { text: string; image?: string | null; customDate?: Date }): Promise<void> {
  // We'll use the provided date as created_at if possible, or just let Supabase handle it.
  // The user prompt said: addDailyDrop({ id, text, image })
  // But usually ID is auto-gen or UUID. I'll omit ID to let DB generate it, or generate one.
  // The prompt mentioned "id text", maybe I should generate it? 
  // Firestore auto-generates. Supabase usually has a default gen_random_uuid().
  // I will assume auto-gen.
  
  // Note: The user prompt asked to replace Firestore. Firestore `addDoc` generates ID.
  // I will assume Supabase `id` is auto-generated or I shouldn't worry about it.
  // However, I need to handle `customDate`. If the table only has `created_at`, I can override it?
  // Or I just ignore `customDate` input if the schema doesn't support it?
  // The prompt said "Supabase table exists: daily_drops (id text, text, image, created_at, updated_at)".
  // So `customDate` is NOT in the table. I will map the input date to `created_at` if I can insert it.
  
  const payload: any = {
    text: drop.text,
    image: drop.image || null,
  };
  
  if (drop.customDate) {
    payload.created_at = drop.customDate.toISOString();
  }

  const { error } = await supabase
    .from('daily_drops')
    .insert([payload]);

  if (error) {
    throw new Error(error.message);
  }
}

export async function updateDailyDrop(id: string, data: { text: string; image?: string | null; customDate?: Date }): Promise<void> {
  const payload: any = {
    text: data.text,
    image: data.image || null,
    updated_at: new Date().toISOString(),
  };

  if (data.customDate) {
    payload.created_at = data.customDate.toISOString();
  }

  const { error } = await supabase
    .from('daily_drops')
    .update(payload)
    .eq('id', id);

  if (error) {
    throw new Error(error.message);
  }
}

export async function deleteDailyDrop(id: string): Promise<void> {
  const { error } = await supabase
    .from('daily_drops')
    .delete()
    .eq('id', id);

  if (error) {
    throw new Error(error.message);
  }
}
