import { supabase } from '@/lib/supabaseClient'

type ProfitRow = {
  id: number
  amount: number
  currency: string | null
  description: string | null
  created_at: string
  metadata?: any | null
}

export type Profit = {
  id: number
  amount: number
  currency: string
  description: string
  createdAt: string
  metadata?: any
}

const toProfit = (r: ProfitRow): Profit => ({
  id: r.id,
  amount: Number(r.amount || 0),
  currency: r.currency || 'USD',
  description: r.description || '',
  createdAt: r.created_at,
  metadata: r.metadata || null,
})

export async function listProfits(limit = 200): Promise<Profit[]> {
  const { data, error } = await supabase
    .from('profit_tracking')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw new Error(error.message)
  return (data ?? []).map(toProfit)
}

export async function addProfit(input: { amount: number; currency?: string; description?: string; metadata?: any }): Promise<number> {
  const payload = {
    amount: input.amount,
    currency: input.currency || 'USD',
    description: input.description || '',
    metadata: input.metadata || null,
  }
  const { data, error } = await supabase
    .from('profit_tracking')
    .insert([payload])
    .select('id')
    .single()
  if (error) throw new Error(error.message)
  return data.id as number
}

export async function updateProfit(id: number, data: { amount?: number; currency?: string; description?: string; metadata?: any }): Promise<void> {
  const payload: Partial<ProfitRow> = {}
  if (data.amount !== undefined) payload.amount = data.amount
  if (data.currency !== undefined) payload.currency = data.currency
  if (data.description !== undefined) payload.description = data.description
  if (data.metadata !== undefined) (payload as any).metadata = data.metadata
  const { error } = await supabase
    .from('profit_tracking')
    .update(payload)
    .eq('id', id)
  if (error) throw new Error(error.message)
}

export async function deleteProfit(id: number): Promise<void> {
  const { error } = await supabase
    .from('profit_tracking')
    .delete()
    .eq('id', id)
  if (error) throw new Error(error.message)
}

export async function getProfit(id: number): Promise<Profit | null> {
  const { data, error } = await supabase
    .from('profit_tracking')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data ? toProfit(data as ProfitRow) : null
}
