// Contexte global — données synchronisées avec Supabase (localStorage en fallback)
import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import {
  sbGetClients, sbInsertClient, sbUpdateClient, sbDeleteClient,
  sbGetChantiers, sbInsertChantier, sbUpdateChantier, sbDeleteChantier,
  sbGetDevis, sbInsertDevis, sbUpdateDevis, sbDeleteDevis,
  sbGetFactures, sbInsertFacture, sbUpdateFacture, sbDeleteFacture,
  sbGetPrestations, sbInsertPrestation, sbInsertPrestationsBulk, sbUpdatePrestation, sbDeletePrestation,
  sbGetSettings, sbSaveSettings,
  sbGetInterventions, sbInsertIntervention, sbUpdateIntervention, sbDeleteIntervention,
  sbGetTresorerie, sbSaveTresorerie,
  sbGetUser, isSupabaseConfigured,
} from '../lib/supabase'
import {
  getClients, saveClients,
  getChantiers, saveChantiers,
  getDevis, saveDevis,
  getFactures, saveFactures,
  getPrestations, savePrestations,
  getSettings, saveSettings,
  getInterventions, saveInterventions,
  getTresorerie, saveTresorerie,
  genId, genNumeroDevis, genNumeroFacture,
} from '../lib/storage'
import { PRESTATIONS as DEFAULT_PRESTATIONS } from '../data/prestations'
import { joursDepuis } from '../lib/utils'
import { today, addDays } from '../lib/utils'

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [clients, setClientsState] = useState([])
  const [chantiers, setChantiersState] = useState([])
  const [devis, setDevisState] = useState([])
  const [factures, setFacturesState] = useState([])
  const [prestations, setPrestationsState] = useState([])
  const [settings, setSettingsState] = useState(null)
  const [interventions, setInterventionsState] = useState([])
  const [tresorerie, setTresorerieState] = useState(null)
  const [loading, setLoading] = useState(true)
  const [syncError, setSyncError] = useState(null)

  // Chargement initial depuis Supabase (fallback localStorage)
  useEffect(() => {
    async function loadAll() {
      try {
        const [
          sbClients,
          sbChantiers,
          sbDevis,
          sbFactures,
          sbPrestations,
          sbSettings,
        ] = await Promise.all([
          sbGetClients(),
          sbGetChantiers(),
          sbGetDevis(),
          sbGetFactures(),
          sbGetPrestations(),
          sbGetSettings(),
        ])

        setClientsState(sbClients)
        setChantiersState(sbChantiers)
        setDevisState(sbDevis)
        setFacturesState(sbFactures)
        setSettingsState(sbSettings || getSettings())

        // Si aucune prestation → seeder avec les défauts
        if (sbPrestations.length === 0) {
          const defaults = DEFAULT_PRESTATIONS.map(p => ({
            id: genId(),
            categorie: p.categorie,
            description: p.description,
            unite: p.unite,
            prix_ht: p.prix_ht,
            tva: p.tva,
            actif: true,
            created_at: new Date().toISOString(),
          }))
          setPrestationsState(defaults)
          savePrestations(defaults)
          sbInsertPrestationsBulk(defaults).catch(() => {})
        } else {
          setPrestationsState(sbPrestations)
          savePrestations(sbPrestations)
        }

        saveClients(sbClients)
        saveChantiers(sbChantiers)
        saveDevis(sbDevis)
        saveFactures(sbFactures)
        if (sbSettings) saveSettings(sbSettings)
      } catch (err) {
        console.warn('Supabase inaccessible, fallback localStorage:', err.message)
        setSyncError(err.message)
        setClientsState(getClients())
        setChantiersState(getChantiers())
        setDevisState(getDevis())
        setFacturesState(getFactures())
        const localPrestations = getPrestations()
        if (localPrestations.length === 0) {
          const defaults = DEFAULT_PRESTATIONS.map(p => ({ ...p, id: genId(), actif: true, created_at: new Date().toISOString() }))
          setPrestationsState(defaults)
          savePrestations(defaults)
        } else {
          setPrestationsState(localPrestations)
        }
        setSettingsState(getSettings())
      } finally {
        // Interventions
        try {
          const sbIntvs = await sbGetInterventions()
          setInterventionsState(sbIntvs)
          saveInterventions(sbIntvs)
        } catch {
          setInterventionsState(getInterventions())
        }
        // Trésorerie
        try {
          const sbTreso = await sbGetTresorerie()
          if (sbTreso) {
            setTresorerieState(sbTreso)
            saveTresorerie(sbTreso)
          } else {
            setTresorerieState(getTresorerie())
          }
        } catch {
          setTresorerieState(getTresorerie())
        }
        setLoading(false)
      }
    }
    loadAll()
  }, [])

  // Vérification automatique des factures en retard
  useEffect(() => {
    if (!factures.length) return
    const mises_a_jour = factures.map(f => {
      if (f.statut === 'envoyee' && f.date_echeance) {
        const jours = joursDepuis(f.date_echeance)
        if (jours > 0) return { ...f, statut: 'en_retard' }
      }
      return f
    })
    const changed = mises_a_jour.some((f, i) => f.statut !== factures[i].statut)
    if (changed) {
      mises_a_jour.forEach(f => {
        const original = factures.find(o => o.id === f.id)
        if (original && original.statut !== f.statut) {
          sbUpdateFacture(f.id, { statut: f.statut }).catch(() => {})
        }
      })
      setFacturesState(mises_a_jour)
      saveFactures(mises_a_jour)
    }
  }, [factures.length]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── CLIENTS ──────────────────────────────────────────
  const addClient = useCallback(async (data) => {
    const client = { ...data, id: genId(), created_at: new Date().toISOString() }
    setClientsState(prev => {
      const next = [client, ...prev]
      saveClients(next)
      return next
    })
    try {
      await sbInsertClient(client)
    } catch (err) {
      console.warn('Supabase addClient:', err.message)
    }
    return client
  }, [])

  const updateClient = useCallback(async (id, data) => {
    setClientsState(prev => {
      const next = prev.map(c => c.id === id ? { ...c, ...data } : c)
      saveClients(next)
      return next
    })
    try {
      await sbUpdateClient(id, data)
    } catch (err) {
      console.warn('Supabase updateClient:', err.message)
    }
  }, [])

  const deleteClient = useCallback(async (id) => {
    setClientsState(prev => {
      const next = prev.filter(c => c.id !== id)
      saveClients(next)
      return next
    })
    try {
      await sbDeleteClient(id)
    } catch (err) {
      console.warn('Supabase deleteClient:', err.message)
    }
  }, [])

  // ── CHANTIERS ────────────────────────────────────────
  const addChantier = useCallback(async (data) => {
    const chantier = {
      ...data,
      id: genId(),
      etapes: data.etapes || [],
      notes: data.notes || [],
      photos: data.photos || [],
      created_at: new Date().toISOString(),
    }
    setChantiersState(prev => {
      const next = [chantier, ...prev]
      saveChantiers(next)
      return next
    })
    try {
      await sbInsertChantier(chantier)
    } catch (err) {
      console.warn('Supabase addChantier:', err.message)
    }
    return chantier
  }, [])

  const updateChantier = useCallback(async (id, data) => {
    setChantiersState(prev => {
      const next = prev.map(c => c.id === id ? { ...c, ...data } : c)
      saveChantiers(next)
      return next
    })
    try {
      await sbUpdateChantier(id, data)
    } catch (err) {
      console.warn('Supabase updateChantier:', err.message)
    }
  }, [])

  const deleteChantier = useCallback(async (id) => {
    setChantiersState(prev => {
      const next = prev.filter(c => c.id !== id)
      saveChantiers(next)
      return next
    })
    try {
      await sbDeleteChantier(id)
    } catch (err) {
      console.warn('Supabase deleteChantier:', err.message)
    }
  }, [])

  // ── DEVIS ────────────────────────────────────────────
  const addDevis = useCallback(async (data) => {
    const s = settings || getSettings()
    const numero = data.numero || genNumeroDevis(s)
    const d = {
      ...data,
      id: genId(),
      numero,
      statut: 'brouillon',
      lignes: data.lignes || [],
      created_at: new Date().toISOString(),
      date_emission: data.date_emission || today(),
      date_validite: data.date_validite || addDays(today(), s.facturation.validite_devis),
      client_id: data.client_id || null,
      chantier_id: data.chantier_id || null,
    }
    setDevisState(prev => {
      const next = [d, ...prev]
      saveDevis(next)
      return next
    })
    const newSettings = {
      ...s,
      facturation: { ...s.facturation, compteur_devis: s.facturation.compteur_devis + 1 },
    }
    setSettingsState(newSettings)
    saveSettings(newSettings)
    sbSaveSettings(newSettings).catch(() => {})
    try {
      await sbInsertDevis(d)
    } catch (err) {
      console.warn('Supabase addDevis:', err.message)
    }
    return d
  }, [settings])

  const updateDevis = useCallback(async (id, data) => {
    setDevisState(prev => {
      const next = prev.map(d => d.id === id ? { ...d, ...data } : d)
      saveDevis(next)
      return next
    })
    try {
      await sbUpdateDevis(id, data)
    } catch (err) {
      console.warn('Supabase updateDevis:', err.message)
    }
  }, [])

  const deleteDevis = useCallback(async (id) => {
    setDevisState(prev => {
      const next = prev.filter(d => d.id !== id)
      saveDevis(next)
      return next
    })
    try {
      await sbDeleteDevis(id)
    } catch (err) {
      console.warn('Supabase deleteDevis:', err.message)
    }
  }, [])

  // ── FACTURES ─────────────────────────────────────────
  const addFacture = useCallback(async (data) => {
    const s = settings || getSettings()
    const numero = data.numero || genNumeroFacture(s)
    const f = {
      ...data,
      id: genId(),
      numero,
      statut: 'brouillon',
      lignes: data.lignes || [],
      relances: data.relances || [],
      created_at: new Date().toISOString(),
      date_emission: data.date_emission || today(),
      date_echeance: data.date_echeance || addDays(today(), s.facturation.delai_paiement),
      client_id: data.client_id || null,
      chantier_id: data.chantier_id || null,
    }
    setFacturesState(prev => {
      const next = [f, ...prev]
      saveFactures(next)
      return next
    })
    const newSettings = {
      ...s,
      facturation: { ...s.facturation, compteur_facture: s.facturation.compteur_facture + 1 },
    }
    setSettingsState(newSettings)
    saveSettings(newSettings)
    sbSaveSettings(newSettings).catch(() => {})
    try {
      await sbInsertFacture(f)
    } catch (err) {
      console.warn('Supabase addFacture:', err.message)
    }
    return f
  }, [settings])

  const updateFacture = useCallback(async (id, data) => {
    setFacturesState(prev => {
      const next = prev.map(f => f.id === id ? { ...f, ...data } : f)
      saveFactures(next)
      return next
    })
    try {
      await sbUpdateFacture(id, data)
    } catch (err) {
      console.warn('Supabase updateFacture:', err.message)
    }
  }, [])

  const deleteFacture = useCallback(async (id) => {
    setFacturesState(prev => {
      const next = prev.filter(f => f.id !== id)
      saveFactures(next)
      return next
    })
    try {
      await sbDeleteFacture(id)
    } catch (err) {
      console.warn('Supabase deleteFacture:', err.message)
    }
  }, [])

  // Convertir devis en facture
  const devisToFacture = useCallback((devisId) => {
    const d = devis.find(x => x.id === devisId)
    if (!d) return null
    return addFacture({
      client_id: d.client_id,
      chantier_id: d.chantier_id,
      devis_id: devisId,
      objet: d.objet,
      lignes: d.lignes,
      remise_type: d.remise_type,
      remise_valeur: d.remise_valeur,
      acompte_verse: d.acompte_valeur ? d.acompte_valeur : 0,
    })
  }, [devis, addFacture])

  // ── PRESTATIONS ──────────────────────────────────────────
  const addPrestation = useCallback(async (data) => {
    const p = { ...data, id: genId(), actif: true, created_at: new Date().toISOString() }
    setPrestationsState(prev => {
      const next = [...prev, p]
      savePrestations(next)
      return next
    })
    try { await sbInsertPrestation(p) } catch (err) { console.warn('Supabase addPrestation:', err.message) }
    return p
  }, [])

  const updatePrestation = useCallback(async (id, data) => {
    setPrestationsState(prev => {
      const next = prev.map(p => p.id === id ? { ...p, ...data } : p)
      savePrestations(next)
      return next
    })
    try { await sbUpdatePrestation(id, data) } catch (err) { console.warn('Supabase updatePrestation:', err.message) }
  }, [])

  const deletePrestation = useCallback(async (id) => {
    setPrestationsState(prev => {
      const next = prev.filter(p => p.id !== id)
      savePrestations(next)
      return next
    })
    try { await sbDeletePrestation(id) } catch (err) { console.warn('Supabase deletePrestation:', err.message) }
  }, [])

  // ── INTERVENTIONS ─────────────────────────────────────
  const addIntervention = useCallback(async (data) => {
    const item = { ...data, id: genId(), created_at: new Date().toISOString() }
    setInterventionsState(prev => {
      const next = [item, ...prev]
      saveInterventions(next)
      return next
    })
    if (isSupabaseConfigured) {
      try {
        const user = await sbGetUser()
        if (user) await sbInsertIntervention({ ...item, user_id: user.id })
      } catch (err) { console.warn('Supabase addIntervention:', err.message) }
    }
    return item
  }, [])

  const updateIntervention = useCallback(async (id, data) => {
    setInterventionsState(prev => {
      const next = prev.map(i => i.id === id ? { ...i, ...data } : i)
      saveInterventions(next)
      return next
    })
    if (isSupabaseConfigured) {
      try { await sbUpdateIntervention(id, data) } catch (err) { console.warn('Supabase updateIntervention:', err.message) }
    }
  }, [])

  const deleteIntervention = useCallback(async (id) => {
    setInterventionsState(prev => {
      const next = prev.filter(i => i.id !== id)
      saveInterventions(next)
      return next
    })
    if (isSupabaseConfigured) {
      try { await sbDeleteIntervention(id) } catch (err) { console.warn('Supabase deleteIntervention:', err.message) }
    }
  }, [])

  // ── TRÉSORERIE ────────────────────────────────────────
  const updateTresorerie = useCallback(async (data) => {
    setTresorerieState(prev => {
      const next = { ...prev, ...data }
      saveTresorerie(next)
      if (isSupabaseConfigured) {
        sbSaveTresorerie(next).catch(err => console.warn('Supabase saveTresorerie:', err.message))
      }
      return next
    })
  }, [])

  // ── SETTINGS ─────────────────────────────────────────
  const updateSettings = useCallback(async (data) => {
    setSettingsState(prev => {
      const next = { ...prev, ...data }
      saveSettings(next)
      sbSaveSettings(next).catch(() => {})
      return next
    })
  }, [])

  // ── KPIs DASHBOARD ───────────────────────────────────
  const getKpis = useCallback(() => {
    const now = new Date()
    const debutMois = new Date(now.getFullYear(), now.getMonth(), 1)

    const ca_mois = factures
      .filter(f => f.statut === 'payee' && f.paiement?.date && new Date(f.paiement.date) >= debutMois)
      .reduce((sum, f) => {
        const { total_ttc } = calculerTotauxSimple(f.lignes, f.remise_type, f.remise_valeur)
        return sum + total_ttc
      }, 0)

    const devis_attente = devis.filter(d => d.statut === 'envoye')
    const montant_attente = devis_attente.reduce((sum, d) => {
      const { total_ttc } = calculerTotauxSimple(d.lignes, d.remise_type, d.remise_valeur)
      return sum + total_ttc
    }, 0)

    const factures_retard = factures.filter(f => f.statut === 'en_retard')
    const impayes = factures_retard.reduce((sum, f) => {
      const { total_ttc } = calculerTotauxSimple(f.lignes, f.remise_type, f.remise_valeur)
      return sum + total_ttc
    }, 0)

    const devis_envoyes = devis.filter(d => ['envoye', 'accepte', 'refuse', 'expire'].includes(d.statut))
    const devis_acceptes = devis.filter(d => d.statut === 'accepte')
    const taux_conversion = devis_envoyes.length > 0
      ? Math.round((devis_acceptes.length / devis_envoyes.length) * 100)
      : 0

    return { ca_mois, montant_attente, devis_attente: devis_attente.length, impayes, taux_conversion, factures_retard: factures_retard.length }
  }, [factures, devis])

  const value = {
    clients, chantiers, devis, factures, prestations, settings,
    interventions, tresorerie,
    loading, syncError,
    addClient, updateClient, deleteClient,
    addChantier, updateChantier, deleteChantier,
    addDevis, updateDevis, deleteDevis,
    addFacture, updateFacture, deleteFacture,
    devisToFacture,
    addPrestation, updatePrestation, deletePrestation,
    addIntervention, updateIntervention, deleteIntervention,
    updateTresorerie,
    updateSettings,
    getKpis,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp doit être utilisé dans AppProvider')
  return ctx
}

function calculerTotauxSimple(lignes = [], remise_type, remise_valeur) {
  let sous_total_ht = 0
  let total_tva = 0
  for (const l of lignes) {
    if (l.type === 'titre' || l.type === 'commentaire') continue
    const ht = (parseFloat(l.quantite) || 0) * (parseFloat(l.prix_ht) || 0)
    sous_total_ht += ht
    total_tva += ht * ((parseFloat(l.tva) || 0) / 100)
  }
  let remise = 0
  if (remise_valeur > 0) {
    remise = remise_type === 'pourcentage' ? sous_total_ht * (remise_valeur / 100) : parseFloat(remise_valeur) || 0
  }
  const total_ttc = (sous_total_ht - remise) + total_tva
  return { sous_total_ht, total_tva, total_ttc }
}
