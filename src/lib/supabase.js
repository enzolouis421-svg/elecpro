import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = SUPABASE_URL && SUPABASE_ANON_KEY
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null

export const isSupabaseConfigured = !!SUPABASE_URL && !!SUPABASE_ANON_KEY

// Helper : lance la requête uniquement si Supabase est configuré
function sb() {
  if (!supabase) throw new Error('Supabase non configuré')
  return supabase
}

// ── AUTHENTIFICATION ──────────────────────────────────────
export async function sbSignUp(email, password) {
  const { data, error } = await sb().auth.signUp({ email, password })
  if (error) throw error
  return data
}

export async function sbSignIn(email, password) {
  const { data, error } = await sb().auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

export async function sbSignOut() {
  const { error } = await sb().auth.signOut()
  if (error) throw error
}

export async function sbGetSession() {
  const { data } = await sb().auth.getSession()
  return data?.session || null
}

export async function sbGetUser() {
  const { data } = await sb().auth.getUser()
  return data?.user || null
}

export function sbOnAuthChange(callback) {
  if (!supabase) return () => {}
  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user || null)
  })
  return () => subscription.unsubscribe()
}

export async function sbResetPassword(email) {
  const { error } = await sb().auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  })
  if (error) throw error
}

// ── CLIENTS ──────────────────────────────────────────────
export async function sbGetClients() {
  const { data, error } = await sb().from('clients').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}
export async function sbInsertClient(client) {
  const { data, error } = await sb().from('clients').insert(client).select().single()
  if (error) throw error
  return data
}
export async function sbUpdateClient(id, updates) {
  const { data, error } = await sb().from('clients').update(updates).eq('id', id).select().single()
  if (error) throw error
  return data
}
export async function sbDeleteClient(id) {
  const { error } = await sb().from('clients').delete().eq('id', id)
  if (error) throw error
}

// ── CHANTIERS ────────────────────────────────────────────
export async function sbGetChantiers() {
  const { data, error } = await sb().from('chantiers').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}
export async function sbInsertChantier(chantier) {
  const { data, error } = await sb().from('chantiers').insert(chantier).select().single()
  if (error) throw error
  return data
}
export async function sbUpdateChantier(id, updates) {
  const { data, error } = await sb().from('chantiers').update(updates).eq('id', id).select().single()
  if (error) throw error
  return data
}
export async function sbDeleteChantier(id) {
  const { error } = await sb().from('chantiers').delete().eq('id', id)
  if (error) throw error
}

// ── DEVIS ────────────────────────────────────────────────
export async function sbGetDevis() {
  const { data, error } = await sb().from('devis').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}
export async function sbInsertDevis(devis) {
  const { data, error } = await sb().from('devis').insert(devis).select().single()
  if (error) throw error
  return data
}
export async function sbUpdateDevis(id, updates) {
  const { data, error } = await sb().from('devis').update(updates).eq('id', id).select().single()
  if (error) throw error
  return data
}
export async function sbDeleteDevis(id) {
  const { error } = await sb().from('devis').delete().eq('id', id)
  if (error) throw error
}

// ── FACTURES ─────────────────────────────────────────────
export async function sbGetFactures() {
  const { data, error } = await sb().from('factures').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}
export async function sbInsertFacture(facture) {
  const { data, error } = await sb().from('factures').insert(facture).select().single()
  if (error) throw error
  return data
}
export async function sbUpdateFacture(id, updates) {
  const { data, error } = await sb().from('factures').update(updates).eq('id', id).select().single()
  if (error) throw error
  return data
}
export async function sbDeleteFacture(id) {
  const { error } = await sb().from('factures').delete().eq('id', id)
  if (error) throw error
}

// ── PRESTATIONS ──────────────────────────────────────────
export async function sbGetPrestations() {
  const { data, error } = await sb().from('prestations').select('*').order('categorie').order('created_at')
  if (error) throw error
  return data || []
}
export async function sbInsertPrestation(p) {
  const { data, error } = await sb().from('prestations').insert(p).select().single()
  if (error) throw error
  return data
}
export async function sbInsertPrestationsBulk(list) {
  const { error } = await sb().from('prestations').insert(list)
  if (error) throw error
}
export async function sbUpdatePrestation(id, updates) {
  const { data, error } = await sb().from('prestations').update(updates).eq('id', id).select().single()
  if (error) throw error
  return data
}
export async function sbDeletePrestation(id) {
  const { error } = await sb().from('prestations').delete().eq('id', id)
  if (error) throw error
}

// ── SETTINGS ─────────────────────────────────────────────
export async function sbGetSettings(userId) {
  const id = userId || 'default'
  const { data, error } = await sb().from('settings').select('data').eq('id', id).maybeSingle()
  if (error) throw error
  return data?.data || null
}
export async function sbSaveSettings(settingsData, userId) {
  const id = userId || 'default'
  const { error } = await sb()
    .from('settings')
    .upsert({ id, data: settingsData }, { onConflict: 'id' })
  if (error) throw error
}

// ── INTERVENTIONS ─────────────────────────────────────────
export async function sbGetInterventions() {
  const { data, error } = await sb().from('interventions').select('*').order('date_debut')
  if (error) throw error
  return data || []
}
export async function sbInsertIntervention(item) {
  const { data, error } = await sb().from('interventions').insert(item).select().single()
  if (error) throw error
  return data
}
export async function sbUpdateIntervention(id, updates) {
  const { data, error } = await sb().from('interventions').update(updates).eq('id', id).select().single()
  if (error) throw error
  return data
}
export async function sbDeleteIntervention(id) {
  const { error } = await sb().from('interventions').delete().eq('id', id)
  if (error) throw error
}

// ── TRÉSORERIE ────────────────────────────────────────────
// Une seule ligne par utilisateur (upsert sur user_id)
export async function sbGetTresorerie() {
  const { data, error } = await sb().from('tresorerie').select('*').maybeSingle()
  if (error) throw error
  return data ? { solde: data.solde, date_solde: data.date_solde, charges: data.charges || [], fiscal: data.fiscal || {} } : null
}
export async function sbSaveTresorerie(treso) {
  const user = await sbGetUser()
  if (!user) return
  const { error } = await sb()
    .from('tresorerie')
    .upsert({ user_id: user.id, ...treso, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
  if (error) throw error
}

// ── TOKENS SIGNATURE À DISTANCE ───────────────────────────
// Stockage en base pour fonctionner sur tous les appareils

function genToken() {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Array.from(array, b => b.toString(16).padStart(2, '0')).join('')
}

export async function sbCreateSignToken({ devisId, userId, devisData, settingsData }) {
  const token = genToken()
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

  // Invalider les anciens tokens pour ce devis
  await sb().from('devis_tokens').delete().eq('devis_id', devisId).eq('applied', false)

  const { error } = await sb().from('devis_tokens').insert({
    token,
    devis_id: devisId,
    user_id: userId,
    devis_data: devisData,
    settings_data: settingsData,
    expires_at: expiresAt,
    applied: false,
    signature_data: null,
    signataire: null,
    signed_at: null,
  })
  if (error) throw error
  return token
}

// Lecture publique — pas besoin d'être authentifié (RLS policy par token)
export async function sbGetSignToken(token) {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('devis_tokens')
    .select('*')
    .eq('token', token)
    .eq('applied', false)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle()
  if (error) return null
  return data
}

// Signature publique — appelée depuis la page /signer/:token
export async function sbApplyRemoteSignature(token, signatureData, signataire) {
  if (!supabase) throw new Error('Supabase non configuré')
  const { error } = await supabase
    .from('devis_tokens')
    .update({
      signature_data: signatureData,
      signataire,
      signed_at: new Date().toISOString(),
    })
    .eq('token', token)
    .eq('applied', false)
  if (error) throw error
}

// Vérifie si une signature distante est en attente pour ce devis
export async function sbGetPendingSignature(devisId) {
  if (!supabase) return null
  const { data } = await supabase
    .from('devis_tokens')
    .select('*')
    .eq('devis_id', devisId)
    .eq('applied', false)
    .not('signed_at', 'is', null)
    .order('signed_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return data || null
}

// Marque le token comme appliqué (appelé par DevisDetail après avoir appliqué la signature)
export async function sbMarkTokenApplied(token) {
  if (!supabase) return
  await supabase.from('devis_tokens').update({ applied: true }).eq('token', token)
}
