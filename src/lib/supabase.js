import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

export const isSupabaseConfigured = !!SUPABASE_URL && !!SUPABASE_ANON_KEY

// ── CLIENTS ──────────────────────────────────────────────
export async function sbGetClients() {
  const { data, error } = await supabase.from('clients').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}
export async function sbInsertClient(client) {
  const { data, error } = await supabase.from('clients').insert(client).select().single()
  if (error) throw error
  return data
}
export async function sbUpdateClient(id, updates) {
  const { data, error } = await supabase.from('clients').update(updates).eq('id', id).select().single()
  if (error) throw error
  return data
}
export async function sbDeleteClient(id) {
  const { error } = await supabase.from('clients').delete().eq('id', id)
  if (error) throw error
}

// ── CHANTIERS ────────────────────────────────────────────
export async function sbGetChantiers() {
  const { data, error } = await supabase.from('chantiers').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}
export async function sbInsertChantier(chantier) {
  const { data, error } = await supabase.from('chantiers').insert(chantier).select().single()
  if (error) throw error
  return data
}
export async function sbUpdateChantier(id, updates) {
  const { data, error } = await supabase.from('chantiers').update(updates).eq('id', id).select().single()
  if (error) throw error
  return data
}
export async function sbDeleteChantier(id) {
  const { error } = await supabase.from('chantiers').delete().eq('id', id)
  if (error) throw error
}

// ── DEVIS ────────────────────────────────────────────────
export async function sbGetDevis() {
  const { data, error } = await supabase.from('devis').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}
export async function sbInsertDevis(devis) {
  const { data, error } = await supabase.from('devis').insert(devis).select().single()
  if (error) throw error
  return data
}
export async function sbUpdateDevis(id, updates) {
  const { data, error } = await supabase.from('devis').update(updates).eq('id', id).select().single()
  if (error) throw error
  return data
}
export async function sbDeleteDevis(id) {
  const { error } = await supabase.from('devis').delete().eq('id', id)
  if (error) throw error
}

// ── FACTURES ─────────────────────────────────────────────
export async function sbGetFactures() {
  const { data, error } = await supabase.from('factures').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}
export async function sbInsertFacture(facture) {
  const { data, error } = await supabase.from('factures').insert(facture).select().single()
  if (error) throw error
  return data
}
export async function sbUpdateFacture(id, updates) {
  const { data, error } = await supabase.from('factures').update(updates).eq('id', id).select().single()
  if (error) throw error
  return data
}
export async function sbDeleteFacture(id) {
  const { error } = await supabase.from('factures').delete().eq('id', id)
  if (error) throw error
}

// ── PRESTATIONS ──────────────────────────────────────────
export async function sbGetPrestations() {
  const { data, error } = await supabase.from('prestations').select('*').order('categorie').order('created_at')
  if (error) throw error
  return data || []
}
export async function sbInsertPrestation(p) {
  const { data, error } = await supabase.from('prestations').insert(p).select().single()
  if (error) throw error
  return data
}
export async function sbInsertPrestationsBulk(list) {
  const { error } = await supabase.from('prestations').insert(list)
  if (error) throw error
}
export async function sbUpdatePrestation(id, updates) {
  const { data, error } = await supabase.from('prestations').update(updates).eq('id', id).select().single()
  if (error) throw error
  return data
}
export async function sbDeletePrestation(id) {
  const { error } = await supabase.from('prestations').delete().eq('id', id)
  if (error) throw error
}

// ── SETTINGS ─────────────────────────────────────────────
export async function sbGetSettings() {
  const { data, error } = await supabase.from('settings').select('data').eq('id', 'default').maybeSingle()
  if (error) throw error
  return data?.data || null
}
export async function sbSaveSettings(settingsData) {
  const { error } = await supabase
    .from('settings')
    .upsert({ id: 'default', data: settingsData }, { onConflict: 'id' })
  if (error) throw error
}
