// Export comptabilité — journal factures, TVA, CA, impayés
import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import * as XLSX from 'xlsx'
import {
  Download, FileSpreadsheet, FileText, TrendingUp,
  AlertCircle, Receipt, Filter, Calendar,
} from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { calculerTotaux, formatMontant, formatDate } from '../../lib/utils'
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear,
         startOfQuarter, endOfQuarter, parseISO, isWithinInterval } from 'date-fns'
import { fr } from 'date-fns/locale'
import PageTransition from '../../components/layout/PageTransition'
import Button from '../../components/ui/Button'

// ── HELPERS ──────────────────────────────────────────────

function getIntervalle(periode, annee, mois, trimestre) {
  const y = parseInt(annee)
  if (periode === 'mois') {
    const d = new Date(y, parseInt(mois) - 1, 1)
    return { start: startOfMonth(d), end: endOfMonth(d) }
  }
  if (periode === 'trimestre') {
    const d = new Date(y, (parseInt(trimestre) - 1) * 3, 1)
    return { start: startOfQuarter(d), end: endOfQuarter(d) }
  }
  if (periode === 'annee') {
    return { start: startOfYear(new Date(y, 0, 1)), end: endOfYear(new Date(y, 0, 1)) }
  }
  return null // tout
}

function dateInIntervalle(dateStr, intervalle) {
  if (!intervalle || !dateStr) return true
  try {
    return isWithinInterval(parseISO(dateStr), intervalle)
  } catch {
    return false
  }
}

// Téléchargement CSV simple
function telechargerCSV(rows, colonnes, nom) {
  const header = colonnes.map(c => `"${c.label}"`).join(';')
  const lines = rows.map(row =>
    colonnes.map(c => {
      const val = row[c.key] ?? ''
      return typeof val === 'string' && val.includes(';') ? `"${val}"` : val
    }).join(';')
  )
  const csv = [header, ...lines].join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' }) // BOM pour Excel FR
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${nom}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// Téléchargement Excel
function telechargerXLSX(sheets, nom) {
  const wb = XLSX.utils.book_new()
  sheets.forEach(({ data, name }) => {
    const ws = XLSX.utils.json_to_sheet(data)
    // Largeurs colonnes auto
    const cols = Object.keys(data[0] || {}).map(k => ({ wch: Math.max(k.length, 14) }))
    ws['!cols'] = cols
    XLSX.utils.book_append_sheet(wb, ws, name)
  })
  XLSX.writeFile(wb, `${nom}.xlsx`)
}

// ── COMPOSANT ─────────────────────────────────────────────

export default function ExportCompta() {
  const { factures, devis, clients, settings } = useApp()
  const anneeActuelle = new Date().getFullYear()
  const moisActuel = new Date().getMonth() + 1

  const [periode, setPeriode] = useState('annee')
  const [annee, setAnnee] = useState(anneeActuelle)
  const [mois, setMois] = useState(moisActuel)
  const [trimestre, setTrimestre] = useState(Math.ceil(moisActuel / 3))

  const intervalle = useMemo(
    () => getIntervalle(periode, annee, mois, trimestre),
    [periode, annee, mois, trimestre]
  )

  // ── DONNÉES FILTRÉES ─────────────────────────────────────

  const facturesFiltrees = useMemo(() =>
    factures.filter(f => dateInIntervalle(f.date_emission, intervalle)),
    [factures, intervalle]
  )

  const facturespayees = useMemo(() =>
    factures.filter(f =>
      f.statut === 'payee' &&
      dateInIntervalle(f.paiement?.date || f.date_emission, intervalle)
    ),
    [factures, intervalle]
  )

  const devisFiltres = useMemo(() =>
    devis.filter(d => dateInIntervalle(d.date_emission, intervalle)),
    [devis, intervalle]
  )

  const impayes = useMemo(() =>
    factures.filter(f => f.statut === 'en_retard'),
    [factures]
  )

  // ── KPIs RÉSUMÉ ──────────────────────────────────────────

  const kpis = useMemo(() => {
    let ca_ht = 0, ca_ttc = 0, tva_collectee = {}

    for (const f of facturespayees) {
      const t = calculerTotaux(f.lignes, f.remise_type, f.remise_valeur)
      ca_ht += t.ht_apres_remise
      ca_ttc += t.total_ttc
      for (const [taux, d] of Object.entries(t.tva_detail)) {
        tva_collectee[taux] = (tva_collectee[taux] || 0) + d.montant
      }
    }

    const total_impayes = impayes.reduce((s, f) =>
      s + calculerTotaux(f.lignes, f.remise_type, f.remise_valeur).total_ttc, 0)

    return { ca_ht, ca_ttc, tva_collectee, total_impayes }
  }, [facturespayees, impayes])

  // ── BUILDERS DE DONNÉES D'EXPORT ─────────────────────────

  function buildJournalFactures() {
    return facturesFiltrees.map(f => {
      const client = clients.find(c => c.id === f.client_id)
      const t = calculerTotaux(f.lignes, f.remise_type, f.remise_valeur)
      const tva10 = t.tva_detail['10']?.montant || 0
      const tva20 = t.tva_detail['20']?.montant || 0
      const tva55 = t.tva_detail['5.5']?.montant || 0
      const tva0 = t.tva_detail['0']?.montant || 0
      return {
        'Numéro': f.numero,
        'Date émission': formatDate(f.date_emission),
        'Échéance': formatDate(f.date_echeance),
        'Client': client ? (client.societe || `${client.prenom} ${client.nom}`) : '—',
        'SIRET client': client?.siret || '',
        'Objet': f.objet || '',
        'HT': t.ht_apres_remise.toFixed(2),
        'Remise HT': t.montant_remise.toFixed(2),
        'TVA 0%': tva0.toFixed(2),
        'TVA 5,5%': tva55.toFixed(2),
        'TVA 10%': tva10.toFixed(2),
        'TVA 20%': tva20.toFixed(2),
        'Total TVA': t.total_tva.toFixed(2),
        'TTC': t.total_ttc.toFixed(2),
        'Statut': f.statut,
        'Date paiement': f.paiement?.date ? formatDate(f.paiement.date) : '',
        'Moyen paiement': f.paiement?.moyen || '',
        'Référence': f.paiement?.reference || '',
      }
    })
  }

  function buildTVA() {
    const lignes = []
    for (const f of facturespayees) {
      const t = calculerTotaux(f.lignes, f.remise_type, f.remise_valeur)
      const client = clients.find(c => c.id === f.client_id)
      for (const [taux, d] of Object.entries(t.tva_detail)) {
        if (d.montant > 0) {
          lignes.push({
            'Facture': f.numero,
            'Date paiement': f.paiement?.date ? formatDate(f.paiement.date) : formatDate(f.date_emission),
            'Client': client ? (client.societe || `${client.prenom} ${client.nom}`) : '—',
            'Base HT': d.base.toFixed(2),
            'Taux TVA': `${taux}%`,
            'Montant TVA': d.montant.toFixed(2),
          })
        }
      }
    }
    return lignes
  }

  function buildCA() {
    // CA mensuel sur 12 mois
    const data = []
    const y = parseInt(annee)
    for (let m = 1; m <= 12; m++) {
      const debut = new Date(y, m - 1, 1)
      const fin = endOfMonth(debut)
      let ht = 0, ttc = 0
      for (const f of factures) {
        if (f.statut !== 'payee') continue
        const d = f.paiement?.date || f.date_emission
        try {
          if (isWithinInterval(parseISO(d), { start: debut, end: fin })) {
            const t = calculerTotaux(f.lignes, f.remise_type, f.remise_valeur)
            ht += t.ht_apres_remise
            ttc += t.total_ttc
          }
        } catch { /* ignore */ }
      }
      data.push({
        'Mois': format(debut, 'MMMM yyyy', { locale: fr }),
        'CA HT': ht.toFixed(2),
        'CA TTC': ttc.toFixed(2),
      })
    }
    return data
  }

  function buildImpayes() {
    return impayes.map(f => {
      const client = clients.find(c => c.id === f.client_id)
      const t = calculerTotaux(f.lignes, f.remise_type, f.remise_valeur)
      const jours = f.date_echeance
        ? Math.max(0, Math.floor((new Date() - new Date(f.date_echeance)) / 86400000))
        : 0
      return {
        'Facture': f.numero,
        'Date émission': formatDate(f.date_emission),
        'Échéance': formatDate(f.date_echeance),
        'Jours retard': jours,
        'Client': client ? (client.societe || `${client.prenom} ${client.nom}`) : '—',
        'Email client': client?.email || '',
        'Téléphone': client?.telephone || '',
        'Montant TTC': t.total_ttc.toFixed(2),
        'Dernière relance': f.relances?.length
          ? formatDate(f.relances[f.relances.length - 1].date)
          : 'Aucune',
        'Niveau relance': f.relances?.length
          ? f.relances[f.relances.length - 1].type
          : '—',
      }
    })
  }

  function buildDevis() {
    return devisFiltres.map(d => {
      const client = clients.find(c => c.id === d.client_id)
      const t = calculerTotaux(d.lignes, d.remise_type, d.remise_valeur)
      return {
        'Numéro': d.numero,
        'Date émission': formatDate(d.date_emission),
        'Validité': formatDate(d.date_validite),
        'Client': client ? (client.societe || `${client.prenom} ${client.nom}`) : '—',
        'Objet': d.objet || '',
        'HT': t.ht_apres_remise.toFixed(2),
        'TTC': t.total_ttc.toFixed(2),
        'Statut': d.statut,
        'Date signature': d.date_signature ? formatDate(d.date_signature) : '',
      }
    })
  }

  // ── ACTIONS D'EXPORT ─────────────────────────────────────

  function exportFacturesCSV() {
    const data = buildJournalFactures()
    if (!data.length) return
    const cols = Object.keys(data[0]).map(k => ({ key: k, label: k }))
    telechargerCSV(data.map(r => {
      const o = {}
      cols.forEach(c => { o[c.key] = r[c.key] })
      return o
    }), cols, `journal-factures-${labelPeriode}`)
  }

  function exportCompletXLSX() {
    const journalF = buildJournalFactures()
    const tva = buildTVA()
    const ca = buildCA()
    const imp = buildImpayes()
    const dv = buildDevis()

    const sheets = []
    if (journalF.length) sheets.push({ data: journalF, name: 'Journal Factures' })
    if (tva.length) sheets.push({ data: tva, name: 'TVA Collectée' })
    if (ca.length) sheets.push({ data: ca, name: `CA ${annee}` })
    if (imp.length) sheets.push({ data: imp, name: 'Impayés' })
    if (dv.length) sheets.push({ data: dv, name: 'Journal Devis' })

    if (!sheets.length) { alert('Aucune donnée à exporter'); return }

    telechargerXLSX(sheets, `export-compta-${labelPeriode}`)
  }

  function exportTVACSV() {
    const data = buildTVA()
    if (!data.length) return
    const cols = Object.keys(data[0]).map(k => ({ key: k, label: k }))
    telechargerCSV(data.map(r => { const o = {}; cols.forEach(c => { o[c.key] = r[c.key] }); return o }), cols, `tva-${labelPeriode}`)
  }

  function exportImpayesCSV() {
    const data = buildImpayes()
    if (!data.length) return
    const cols = Object.keys(data[0]).map(k => ({ key: k, label: k }))
    telechargerCSV(data.map(r => { const o = {}; cols.forEach(c => { o[c.key] = r[c.key] }); return o }), cols, `impayes-${new Date().toISOString().slice(0,10)}`)
  }

  // ── LABEL PÉRIODE ────────────────────────────────────────

  const labelPeriode = useMemo(() => {
    if (periode === 'mois') return `${String(mois).padStart(2,'0')}-${annee}`
    if (periode === 'trimestre') return `T${trimestre}-${annee}`
    if (periode === 'annee') return `${annee}`
    return 'tout'
  }, [periode, annee, mois, trimestre])

  const MOIS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']
  const ANNEES = Array.from({ length: 5 }, (_, i) => anneeActuelle - i)

  // ── RENDU ────────────────────────────────────────────────

  return (
    <PageTransition>
      <div className="p-4 md:p-6 max-w-5xl mx-auto pb-24 md:pb-6">
        {/* En-tête */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">Export Comptabilité</h1>
          <p className="text-slate-400 text-sm mt-1">Exportez vos données pour votre expert-comptable ou votre logiciel comptable</p>
        </div>

        {/* Sélecteur de période */}
        <div className="bg-slate-800 rounded-2xl border border-slate-700 p-5 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter size={16} className="text-amber-400" />
            <h2 className="text-white font-semibold">Période</h2>
          </div>
          <div className="flex flex-wrap gap-3 items-end">
            {/* Type période */}
            <div className="flex gap-1 bg-slate-900 rounded-xl p-1">
              {[
                { id: 'mois', label: 'Mois' },
                { id: 'trimestre', label: 'Trimestre' },
                { id: 'annee', label: 'Année' },
                { id: 'tout', label: 'Tout' },
              ].map(p => (
                <button
                  key={p.id}
                  onClick={() => setPeriode(p.id)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    periode === p.id ? 'bg-amber-500 text-black' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Année */}
            {periode !== 'tout' && (
              <div>
                <label className="text-xs text-slate-400 block mb-1">Année</label>
                <select value={annee} onChange={e => setAnnee(e.target.value)}
                  className="bg-slate-900 border border-slate-600 rounded-xl text-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none">
                  {ANNEES.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            )}

            {/* Mois */}
            {periode === 'mois' && (
              <div>
                <label className="text-xs text-slate-400 block mb-1">Mois</label>
                <select value={mois} onChange={e => setMois(e.target.value)}
                  className="bg-slate-900 border border-slate-600 rounded-xl text-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none">
                  {MOIS.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
                </select>
              </div>
            )}

            {/* Trimestre */}
            {periode === 'trimestre' && (
              <div>
                <label className="text-xs text-slate-400 block mb-1">Trimestre</label>
                <select value={trimestre} onChange={e => setTrimestre(e.target.value)}
                  className="bg-slate-900 border border-slate-600 rounded-xl text-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none">
                  <option value={1}>T1 (Jan–Mar)</option>
                  <option value={2}>T2 (Avr–Jun)</option>
                  <option value={3}>T3 (Jul–Sep)</option>
                  <option value={4}>T4 (Oct–Déc)</option>
                </select>
              </div>
            )}

            <div className="text-amber-400 text-sm font-medium px-2 py-2">
              📅 {periode === 'tout' ? 'Toutes les données' : `Période : ${labelPeriode}`}
            </div>
          </div>
        </div>

        {/* KPIs résumé période */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6"
        >
          {[
            {
              label: 'CA HT encaissé',
              value: formatMontant(kpis.ca_ht),
              icon: TrendingUp,
              color: 'text-amber-400',
              bg: 'bg-amber-500/10 border-amber-500/20',
            },
            {
              label: 'CA TTC encaissé',
              value: formatMontant(kpis.ca_ttc),
              icon: Receipt,
              color: 'text-emerald-400',
              bg: 'bg-emerald-500/10 border-emerald-500/20',
            },
            {
              label: 'TVA collectée',
              value: formatMontant(Object.values(kpis.tva_collectee).reduce((a, b) => a + b, 0)),
              icon: FileSpreadsheet,
              color: 'text-blue-400',
              bg: 'bg-blue-500/10 border-blue-500/20',
            },
            {
              label: 'Impayés (total)',
              value: formatMontant(kpis.total_impayes),
              icon: AlertCircle,
              color: 'text-red-400',
              bg: 'bg-red-500/10 border-red-500/20',
            },
          ].map((k, i) => (
            <motion.div
              key={k.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`border rounded-2xl p-4 ${k.bg}`}
            >
              <div className="flex items-center gap-2 mb-2">
                <k.icon size={15} className={k.color} />
                <p className="text-slate-400 text-xs">{k.label}</p>
              </div>
              <p className={`text-lg font-bold ${k.color}`}>{k.value}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* TVA ventilée */}
        {Object.keys(kpis.tva_collectee).length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-slate-800 rounded-2xl border border-slate-700 p-5 mb-6"
          >
            <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
              <Calendar size={16} className="text-blue-400" />
              TVA collectée ventilée — déclaration
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[0, 5.5, 10, 20].map(taux => (
                <div key={taux} className="bg-slate-900 rounded-xl p-3 text-center">
                  <p className="text-slate-400 text-xs mb-1">TVA {taux}%</p>
                  <p className="text-white font-semibold">
                    {formatMontant(kpis.tva_collectee[String(taux)] || 0)}
                  </p>
                  <p className="text-slate-500 text-xs mt-0.5">
                    Base : {formatMontant(
                      facturespayees.reduce((s, f) => {
                        const t = calculerTotaux(f.lignes, f.remise_type, f.remise_valeur)
                        return s + (t.tva_detail[String(taux)]?.base || 0)
                      }, 0)
                    )}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Exports disponibles */}
        <div className="grid md:grid-cols-2 gap-4">
          {/* Export complet Excel */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="bg-slate-800 rounded-2xl border border-amber-500/30 p-5 flex flex-col"
          >
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 bg-amber-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <FileSpreadsheet size={20} className="text-amber-400" />
              </div>
              <div>
                <p className="text-white font-semibold">Export complet Excel</p>
                <p className="text-slate-400 text-xs mt-0.5">Fichier .xlsx multi-onglets pour comptable</p>
              </div>
            </div>
            <div className="text-xs text-slate-400 space-y-1 mb-4 flex-1">
              <p>✓ Journal des factures (HT, TVA, TTC)</p>
              <p>✓ TVA collectée par taux</p>
              <p>✓ CA mensuel sur {annee}</p>
              <p>✓ Journal des devis</p>
              {impayes.length > 0 && <p>✓ Liste des impayés ({impayes.length})</p>}
            </div>
            <Button onClick={exportCompletXLSX} className="w-full">
              <Download size={15} /> Télécharger Excel (.xlsx)
            </Button>
          </motion.div>

          {/* Journal factures CSV */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-slate-800 rounded-2xl border border-slate-700 p-5 flex flex-col"
          >
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <FileText size={20} className="text-blue-400" />
              </div>
              <div>
                <p className="text-white font-semibold">Journal des factures CSV</p>
                <p className="text-slate-400 text-xs mt-0.5">Compatible tous logiciels comptables</p>
              </div>
            </div>
            <div className="text-xs text-slate-400 space-y-1 mb-4 flex-1">
              <p>• {facturesFiltrees.length} facture{facturesFiltrees.length > 1 ? 's' : ''} sur la période</p>
              <p>• Numéro, dates, client, HT, TVA ventilée, TTC</p>
              <p>• Statut + date + moyen de paiement</p>
              <p>• Encodage UTF-8 BOM (ouverture Excel directe)</p>
            </div>
            <Button variant="secondary" onClick={exportFacturesCSV} className="w-full" disabled={!facturesFiltrees.length}>
              <Download size={15} /> Télécharger CSV
            </Button>
          </motion.div>

          {/* TVA CSV */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="bg-slate-800 rounded-2xl border border-slate-700 p-5 flex flex-col"
          >
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <Receipt size={20} className="text-emerald-400" />
              </div>
              <div>
                <p className="text-white font-semibold">Déclaration TVA</p>
                <p className="text-slate-400 text-xs mt-0.5">Base et montant par taux pour la TVA CA3</p>
              </div>
            </div>
            <div className="text-xs text-slate-400 space-y-1 mb-4 flex-1">
              <p>• Sur factures encaissées uniquement</p>
              <p>• Détail ligne par ligne : facture, date, client</p>
              <p>• Base HT + taux + montant TVA</p>
              <p>• Prêt pour déclaration mensuelle/trimestrielle</p>
            </div>
            <Button variant="secondary" onClick={exportTVACSV} className="w-full" disabled={!facturespayees.length}>
              <Download size={15} /> Télécharger TVA CSV
            </Button>
          </motion.div>

          {/* Impayés CSV */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-slate-800 rounded-2xl border border-red-800/40 p-5 flex flex-col"
          >
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 bg-red-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <AlertCircle size={20} className="text-red-400" />
              </div>
              <div>
                <p className="text-white font-semibold">Liste des impayés</p>
                <p className="text-slate-400 text-xs mt-0.5">Pour recouvrement ou avocat</p>
              </div>
            </div>
            <div className="text-xs text-slate-400 space-y-1 mb-4 flex-1">
              {impayes.length === 0 ? (
                <>
                  <p className="text-emerald-400">✓ Aucun impayé en cours</p>
                  <p className="invisible">—</p>
                  <p className="invisible">—</p>
                  <p className="invisible">—</p>
                </>
              ) : (
                <>
                  <p>• {impayes.length} facture{impayes.length > 1 ? 's' : ''} impayée{impayes.length > 1 ? 's' : ''}</p>
                  <p>• Total : {formatMontant(kpis.total_impayes)}</p>
                  <p>• Jours de retard + historique relances</p>
                  <p>• Coordonnées client incluses</p>
                </>
              )}
            </div>
            <Button variant="secondary" onClick={exportImpayesCSV} className="w-full" disabled={!impayes.length}>
              <Download size={15} /> {impayes.length === 0 ? 'Aucun impayé' : 'Télécharger impayés CSV'}
            </Button>
          </motion.div>
        </div>

        {/* Note d'information */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-6 bg-slate-800/50 border border-slate-700 rounded-2xl p-4 text-xs text-slate-400 leading-relaxed"
        >
          <p className="font-medium text-slate-300 mb-1">ℹ️ Pour votre expert-comptable</p>
          <p>
            Le fichier Excel complet contient tous les journaux dans des onglets séparés.
            Les montants sont en euros avec 2 décimales, séparateur point (norme comptable).
            Les CSV utilisent le séparateur point-virgule avec encodage UTF-8 BOM pour une ouverture correcte dans Excel français.
          </p>
        </motion.div>
      </div>
    </PageTransition>
  )
}
