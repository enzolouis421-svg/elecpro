// Helpers localStorage — source de données principale (Supabase en couche additionnelle plus tard)

const KEYS = {
  CLIENTS: 'elecpro_clients',
  CHANTIERS: 'elecpro_chantiers',
  DEVIS: 'elecpro_devis',
  FACTURES: 'elecpro_factures',
  SETTINGS: 'elecpro_settings',
  INTERVENTIONS: 'elecpro_interventions',
  TRESORERIE: 'elecpro_tresorerie',
}

// Lecture générique
function get(key) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

// Écriture générique
function set(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (e) {
    console.error('Erreur localStorage:', e)
  }
}

// ── CLIENTS ──────────────────────────────────────────────
export function getClients() {
  return get(KEYS.CLIENTS) || []
}
export function saveClients(clients) {
  set(KEYS.CLIENTS, clients)
}
export function getClient(id) {
  return getClients().find(c => c.id === id) || null
}

// ── CHANTIERS ────────────────────────────────────────────
export function getChantiers() {
  return get(KEYS.CHANTIERS) || []
}
export function saveChantiers(chantiers) {
  set(KEYS.CHANTIERS, chantiers)
}
export function getChantier(id) {
  return getChantiers().find(c => c.id === id) || null
}

// ── DEVIS ────────────────────────────────────────────────
export function getDevis() {
  return get(KEYS.DEVIS) || []
}
export function saveDevis(devis) {
  set(KEYS.DEVIS, devis)
}
export function getDevisById(id) {
  return getDevis().find(d => d.id === id) || null
}

// ── FACTURES ─────────────────────────────────────────────
export function getFactures() {
  return get(KEYS.FACTURES) || []
}
export function saveFactures(factures) {
  set(KEYS.FACTURES, factures)
}
export function getFacture(id) {
  return getFactures().find(f => f.id === id) || null
}

// ── SETTINGS ─────────────────────────────────────────────
const DEFAULT_SETTINGS = {
  entreprise: {
    nom: 'Mon Entreprise Électrique',
    forme_juridique: 'Auto-entrepreneur',
    adresse: '1 rue de la Paix',
    cp: '75001',
    ville: 'Paris',
    tel: '06 00 00 00 00',
    email: 'contact@monentreprise.fr',
    site: '',
    siret: '000 000 000 00000',
    tva_intra: 'FR00000000000',
    assurance: 'AXA Pro n°123456',
    logo_base64: '',
  },
  facturation: {
    prefixe_devis: 'DEV',
    compteur_devis: 1,
    prefixe_facture: 'FAC',
    compteur_facture: 1,
    tva_defaut: 10,
    validite_devis: 30,
    delai_paiement: 30,
    mentions_legales: 'TVA non applicable, art. 293 B du CGI. En cas de retard de paiement, une pénalité de 3 fois le taux d\'intérêt légal sera appliquée.',
    message_email_devis: 'Veuillez trouver ci-joint notre devis. N\'hésitez pas à nous contacter pour toute question.',
    message_email_facture: 'Veuillez trouver ci-joint notre facture. Merci de procéder au règlement dans les délais convenus.',
    couleur_document: '#F59E0B',
  },
  paiement: {
    iban: 'FR76 0000 0000 0000 0000 0000 000',
    bic: 'XXXXFRXX',
    banque: 'Ma Banque',
    moyens_acceptes: ['virement', 'cheque', 'especes'],
  },
  ia: {
    groq_key: '',
    modele: 'llama3-8b-8192',
    suggestions_auto: true,
  },
  compte: {
    nom: 'Électricien',
    email: 'admin@elecpro.fr',
  },
}

export function getSettings() {
  const saved = get(KEYS.SETTINGS)
  if (!saved) return DEFAULT_SETTINGS
  // Fusion profonde pour ne pas perdre les nouvelles clés par défaut
  return {
    entreprise: { ...DEFAULT_SETTINGS.entreprise, ...saved.entreprise },
    facturation: { ...DEFAULT_SETTINGS.facturation, ...saved.facturation },
    paiement: { ...DEFAULT_SETTINGS.paiement, ...saved.paiement },
    ia: { ...DEFAULT_SETTINGS.ia, ...saved.ia },
    compte: { ...DEFAULT_SETTINGS.compte, ...saved.compte },
  }
}
export function saveSettings(settings) {
  set(KEYS.SETTINGS, settings)
}

// ── PRESTATIONS ──────────────────────────────────────────
export function getPrestations() {
  return get('elecpro_prestations') || []
}
export function savePrestations(list) {
  set('elecpro_prestations', list)
}

// ── INTERVENTIONS (planning) ─────────────────────────────
export function getInterventions() {
  return get(KEYS.INTERVENTIONS) || []
}
export function saveInterventions(list) {
  set(KEYS.INTERVENTIONS, list)
}

// ── TRÉSORERIE ───────────────────────────────────────────
const DEFAULT_TRESORERIE = {
  solde: 0,
  date_solde: '',
  charges: [], // [{id, nom, montant, frequence (mensuel|trimestriel|annuel), jour, actif}]
  depenses: [], // [{id, nom, montant, date, categorie, note}] — dépenses ponctuelles
  fiscal: {
    regime: 'micro_bic', // micro_bic | micro_bnc | reel_is | reel_ir
    versement_liberatoire: false,
    taux_ir: 11, // tranche IR personnalisée
  },
}
export function getTresorerie() {
  const saved = get(KEYS.TRESORERIE)
  if (!saved) return DEFAULT_TRESORERIE
  return {
    ...DEFAULT_TRESORERIE,
    ...saved,
    depenses: saved.depenses || [],
    fiscal: { ...DEFAULT_TRESORERIE.fiscal, ...(saved.fiscal || {}) },
  }
}
export function saveTresorerie(data) {
  set(KEYS.TRESORERIE, data)
}

// ── TOKENS SIGNATURE À DISTANCE ──────────────────────────
// Fallback localStorage (même appareil / dev local).
// En production avec Supabase, les tokens sont stockés en base.

function genToken() {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Array.from(array, b => b.toString(16).padStart(2, '0')).join('')
}

export function createLocalSignToken(devisId, devisData, settingsData) {
  const token = genToken()
  const record = {
    token,
    devis_id: devisId,
    devis_data: devisData,
    settings_data: settingsData,
    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    signature_data: null,
    signataire: null,
    signed_at: null,
    applied: false,
    created_at: new Date().toISOString(),
  }
  const all = get('elecpro_devis_tokens') || []
  const filtered = all.filter(t => t.devis_id !== devisId) // un seul token actif par devis
  filtered.push(record)
  set('elecpro_devis_tokens', filtered)
  return token
}

export function getLocalSignToken(token) {
  const all = get('elecpro_devis_tokens') || []
  return all.find(t => t.token === token) || null
}

export function getLocalSignTokenByDevisId(devisId) {
  const all = get('elecpro_devis_tokens') || []
  return all.find(t => t.devis_id === devisId && !t.applied) || null
}

export function applyLocalRemoteSignature(token, signatureData, signataire) {
  const all = get('elecpro_devis_tokens') || []
  const idx = all.findIndex(t => t.token === token)
  if (idx === -1) return false
  all[idx] = {
    ...all[idx],
    signature_data: signatureData,
    signataire,
    signed_at: new Date().toISOString(),
  }
  set('elecpro_devis_tokens', all)
  return true
}

export function markLocalTokenApplied(token) {
  const all = get('elecpro_devis_tokens') || []
  const idx = all.findIndex(t => t.token === token)
  if (idx !== -1) {
    all[idx].applied = true
    set('elecpro_devis_tokens', all)
  }
}

export function getPendingLocalSignature(devisId) {
  const all = get('elecpro_devis_tokens') || []
  return all.find(t => t.devis_id === devisId && t.signature_data && !t.applied) || null
}

// ── UTILITAIRES ──────────────────────────────────────────
export function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
}

export function genNumeroDevis(settings) {
  const { prefixe_devis, compteur_devis } = settings.facturation
  const annee = new Date().getFullYear()
  const num = String(compteur_devis).padStart(3, '0')
  return `${prefixe_devis}-${annee}-${num}`
}

export function genNumeroFacture(settings) {
  const { prefixe_facture, compteur_facture } = settings.facturation
  const annee = new Date().getFullYear()
  const num = String(compteur_facture).padStart(3, '0')
  return `${prefixe_facture}-${annee}-${num}`
}
