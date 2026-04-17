// Utilitaires — formatage dates, montants, numéros
import { format, parseISO, isValid, differenceInDays } from 'date-fns'
import { fr } from 'date-fns/locale'

// ── DATES ────────────────────────────────────────────────

export function formatDate(date) {
  if (!date) return '—'
  try {
    const d = typeof date === 'string' ? parseISO(date) : date
    if (!isValid(d)) return '—'
    return format(d, 'dd/MM/yyyy', { locale: fr })
  } catch {
    return '—'
  }
}

export function formatDateLong(date) {
  if (!date) return '—'
  try {
    const d = typeof date === 'string' ? parseISO(date) : date
    if (!isValid(d)) return '—'
    return format(d, 'd MMMM yyyy', { locale: fr })
  } catch {
    return '—'
  }
}

export function today() {
  return format(new Date(), 'yyyy-MM-dd')
}

export function addDays(dateStr, days) {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return format(d, 'yyyy-MM-dd')
}

export function joursDepuis(dateStr) {
  if (!dateStr) return 0
  return differenceInDays(new Date(), new Date(dateStr))
}

// ── MONTANTS ─────────────────────────────────────────────

export function formatMontant(val) {
  if (val === null || val === undefined || val === '') return '—'
  const n = parseFloat(val)
  if (isNaN(n)) return '—'
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n)
}

export function formatNumber(val, decimals = 2) {
  const n = parseFloat(val) || 0
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n)
}

// ── CALCULS DOCUMENT ─────────────────────────────────────

export function calculerTotaux(lignes = [], remise_type = null, remise_valeur = 0, acompte_type = null, acompte_valeur = 0) {
  // Sous-total HT par taux de TVA
  const tvaMap = {}
  let sous_total_ht = 0

  for (const ligne of lignes) {
    if (ligne.type === 'titre' || ligne.type === 'commentaire') continue
    const ht = (parseFloat(ligne.quantite) || 0) * (parseFloat(ligne.prix_ht) || 0)
    const tva = parseFloat(ligne.tva) || 0
    sous_total_ht += ht
    tvaMap[tva] = (tvaMap[tva] || 0) + ht
  }

  // Remise
  let montant_remise = 0
  if (remise_valeur > 0) {
    if (remise_type === 'pourcentage') {
      montant_remise = sous_total_ht * (remise_valeur / 100)
    } else {
      montant_remise = parseFloat(remise_valeur) || 0
    }
  }

  const ht_apres_remise = sous_total_ht - montant_remise

  // TVA ventilée (après remise proportionnelle)
  const ratio_remise = sous_total_ht > 0 ? ht_apres_remise / sous_total_ht : 1
  let total_tva = 0
  const tva_detail = {}
  for (const [taux, base] of Object.entries(tvaMap)) {
    const base_reduite = base * ratio_remise
    const montant_tva = base_reduite * (parseFloat(taux) / 100)
    total_tva += montant_tva
    tva_detail[taux] = { base: base_reduite, montant: montant_tva }
  }

  const total_ttc = ht_apres_remise + total_tva

  // Acompte
  let montant_acompte = 0
  if (acompte_valeur > 0) {
    if (acompte_type === 'pourcentage') {
      montant_acompte = total_ttc * (acompte_valeur / 100)
    } else {
      montant_acompte = parseFloat(acompte_valeur) || 0
    }
  }

  const net_a_regler = total_ttc - montant_acompte

  return {
    sous_total_ht,
    montant_remise,
    ht_apres_remise,
    tva_detail,
    total_tva,
    total_ttc,
    montant_acompte,
    net_a_regler,
  }
}

// ── STATUTS ──────────────────────────────────────────────

export const STATUTS_DEVIS = {
  brouillon: { label: 'Brouillon', color: '#475569', bg: 'bg-slate-600' },
  envoye: { label: 'Envoyé', color: '#3B82F6', bg: 'bg-blue-600' },
  accepte: { label: 'Accepté', color: '#10B981', bg: 'bg-emerald-600' },
  refuse: { label: 'Refusé', color: '#EF4444', bg: 'bg-red-600' },
  expire: { label: 'Expiré', color: '#F97316', bg: 'bg-orange-600' },
}

export const STATUTS_FACTURE = {
  brouillon: { label: 'Brouillon', color: '#475569', bg: 'bg-slate-600' },
  envoyee: { label: 'Envoyée', color: '#3B82F6', bg: 'bg-blue-600' },
  payee: { label: 'Payée', color: '#059669', bg: 'bg-emerald-700' },
  en_retard: { label: 'En retard', color: '#DC2626', bg: 'bg-red-700' },
}

export const STATUTS_CHANTIER = {
  preparation: { label: 'Préparation', color: '#3B82F6', bg: 'bg-blue-600' },
  en_cours: { label: 'En cours', color: '#F59E0B', bg: 'bg-amber-500' },
  termine: { label: 'Terminé', color: '#10B981', bg: 'bg-emerald-600' },
  pause: { label: 'En pause', color: '#F97316', bg: 'bg-orange-600' },
}

// ── NIVEAU DE RELANCE ────────────────────────────────────

export function getNiveauRelance(joursRetard) {
  if (joursRetard >= 60) return 'j60'
  if (joursRetard >= 30) return 'j30'
  if (joursRetard >= 15) return 'j15'
  if (joursRetard >= 7) return 'j7'
  return null
}
