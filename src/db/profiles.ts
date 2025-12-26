import { supabase } from '@/lib/supabaseClient'

type ProfileRow = {
  id: string
  name: string | null
  email: string | null
  bio: string | null
  avatar_url: string | null
  membership_type: string | null
  subscription_date: string | null
  renew_interval_days: number | null
  disabled: boolean | null
  created_at: string | null
  updated_at: string | null
}

export type Profile = {
  id: string
  name: string | null
  email?: string | null
  bio: string | null
  avatarUrl: string | null
  membershipType: string | null
  subscriptionDate: string | null
  renewIntervalDays: number | null
  disabled: boolean | null
  createdAt: string | null
  updatedAt: string | null
}

const toProfile = (r: ProfileRow & { email?: string }): Profile => ({
  id: r.id,
  name: r.name,
  email: r.email,
  bio: r.bio,
  avatarUrl: r.avatar_url,
  membershipType: r.membership_type,
  subscriptionDate: r.subscription_date,
  renewIntervalDays: r.renew_interval_days,
  disabled: r.disabled ?? false,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
})

const fromProfilePartial = (p: Partial<Profile>): Partial<ProfileRow> => {
  const result: Partial<ProfileRow> = {}
  if (p.name !== undefined) result.name = p.name
  if (p.email !== undefined) result.email = p.email // Though usually read-only/from auth
  if (p.bio !== undefined) result.bio = p.bio
  if (p.avatarUrl !== undefined) result.avatar_url = p.avatarUrl
  if (p.membershipType !== undefined) result.membership_type = p.membershipType
  if (p.subscriptionDate !== undefined) result.subscription_date = p.subscriptionDate
  if (p.renewIntervalDays !== undefined) result.renew_interval_days = p.renewIntervalDays
  if (p.disabled !== undefined) result.disabled = p.disabled
  return result
}

export async function getMyProfile(): Promise<Profile | null> {
  const { data: auth } = await supabase.auth.getUser()
  const uid = auth?.user?.id
  if (!uid) return null
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', uid)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data ? toProfile(data as ProfileRow) : null
}

export async function getProfileById(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data ? toProfile(data as ProfileRow) : null
}

export async function upsertMyProfile(data: Partial<Profile>): Promise<void> {
  const { data: auth } = await supabase.auth.getUser()
  const uid = auth?.user?.id
  if (!uid) throw new Error('Not authenticated')
  const payload: Partial<ProfileRow> = {
    id: uid,
    ...fromProfilePartial(data),
  }
  const { error } = await supabase.from('profiles').upsert(payload, { onConflict: 'id' })
  if (error) throw new Error(error.message)
}

export async function ensureMyProfileExists(): Promise<void> {
  const { data: auth } = await supabase.auth.getUser()
  const user = auth?.user
  if (!user) return
  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) {
    const displayName =
      (user.user_metadata && (user.user_metadata.name || user.user_metadata.full_name)) ||
      (user.email ? user.email.split('@')[0] : null)
    const avatarUrl = user.user_metadata?.avatar_url ?? null
    const bio = user.user_metadata?.bio ?? null
    const membershipType = user.user_metadata?.membership_type ?? null
    const subscriptionDate = user.user_metadata?.subscription_date ?? null
    const renewIntervalDays = user.user_metadata?.renew_interval_days ?? null

    const { error: upsertError } = await supabase
      .from('profiles')
      .upsert({ 
        id: user.id, 
        email: user.email,
        name: displayName, 
        avatar_url: avatarUrl,
        bio: bio,
        membership_type: membershipType,
        subscription_date: subscriptionDate,
        renew_interval_days: renewIntervalDays
      }, { onConflict: 'id' })
    if (upsertError) throw new Error(upsertError.message)
  }
}

export async function listProfiles(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
  if (error) throw new Error(error.message)
  return (data ?? []).map(toProfile)
}

export async function updateProfileById(userId: string, data: Partial<Profile>): Promise<void> {
  const payload = fromProfilePartial(data)
  const { error } = await supabase
    .from('profiles')
    .update(payload)
    .eq('id', userId)
  if (error) throw new Error(error.message)
}

export async function disableUser(userId: string, disabled: boolean): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ disabled })
    .eq('id', userId)
  if (error) throw new Error(error.message)
}

