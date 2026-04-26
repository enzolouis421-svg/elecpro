// Trésorerie — solde actuel, CA mensuel, charges fixes, dépenses ponctuelles, prévisionnel 3 mois
import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, ReferenceLine, Cell,
} from 'recharts'
import {
  TrendingUp, TrendingDown, AlertCircle, Plus, Trash2,
  Save, Wallet, RefreshCw, ChevronUp, ChevronDown, ShoppingCart, Tag, BarChart2,
} from 'lucide-react'
import {
  addDays, format, parseISO, isWithinInterval,
  subMonths, startOfMonth, endOfMonth,
} from 'date-fns'
import { fr } from 'date-fns/locale'
import toast from 'react-hot-toast'
import { useApp } from '../../context/AppContext'
import { calculerTotaux, formatMontant } from '../../lib/utils'
import { genId } from '../../lib/storage'
import PageTransition from '../../components/layout/PageTransition'
import Button from '../../components/ui/Button'

const FREQ_LABELS = { mensuel: 'Mensuel', bimestriel: 'Bi-mensuel', trimestriel: 'Trimestriel', annuel: 'Annuel' }

// Tooltip recharts personnalisé
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const val = payload[0]?.value ?? 0
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 shadow-xl">
      <p className="text-slate-400 text-xs mb-1">{label}</p>
      <p className={`font-bold text-sm ${val >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
        {formatMontant(val)}
      </p>
      {payload[1] && (
        <p className="text-amber-400 text-xs mt-0.5">Entrées : {formatMontant(payload[1].value)}</p>
      )}
      {payload[2] && (
        <p className="text-red-400 text-xs">Sorties : {formatMontant(payload[2].value)}</p>
      )}
    </div>
  )
}

const CATEGORIES_DEPENSES = ['Matériel', 'Outillage', 'Carburant', 'Formation', 'Sous-traitance', 'Assurance', 'Autre']

function TooltipCA({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-slate-800 border border-slate-600 rounded-xl px-3 py-2 shadow-xl">
      <p className="text-slate-400 text-xs mb-0.5 capitalize">{label}</p>
      <p className="text-emerald-400 font-bold text-sm">{formatMontant(payload[0]?.value ?? 0)}</p>
    </div>
  )
}

export default function Tresorerie() {
  const { factures, tresorerie, updateTresorerie } = useApp()

  // Solde actuel
  const [editSolde, setEditSolde] = useState(false)
  const [soldeSaisi, setSoldeSaisi] = useState(tresorerie?.solde ?? 0)

  // Nouvelles charges
  const [showAddCharge, setShowAddCharge] = useState(false)
  const [newCharge, setNewCharge] = useState({
    nom: '', montant: '', frequence: 'mensuel', jour: 1, actif: true,
  })

  // Tableau prévisionnel rétractable
  const [tableauOuvert, setTableauOuvert] = useState(false)

  // Dépenses ponctuelles
  const [showAddDepense, setShowAddDepense] = useState(false)
  const [newDepense, setNewDepense] = useState({
    nom: '', montant: '', date: format(new Date(), 'yyyy-MM-dd'), categorie: 'Matériel', note: '',
  })

  // Sauvegarder le solde
  function handleSauvegarderSolde() {
    updateTresorerie({
      solde: parseFloat(soldeSaisi) || 0,
      date_solde: new Date().toISOString(),
    })
    setEditSolde(false)
    toast.success('Solde mis à jour')
  }

  // Ajouter charge
  function handleAjouterCharge() {
    if (!newCharge.nom.trim() || !newCharge.montant) {
      toast.error('Remplissez le nom et le montant')
      return
    }
    const charge = { ...newCharge, id: genId(), montant: parseFloat(newCharge.montant) }
    updateTresorerie({ charges: [...(tresorerie?.charges || []), charge] })
    setNewCharge({ nom: '', montant: '', frequence: 'mensuel', jour: 1, actif: true })
    setShowAddCharge(false)
    toast.success('Charge ajoutée')
  }

  // Supprimer / toggle charge
  function supprimerCharge(id) {
    updateTresorerie({ charges: tresorerie.charges.filter(c => c.id !== id) })
    toast.success('Charge supprimée')
  }
  function toggleCharge(id) {
    updateTresorerie({
      charges: tresorerie.charges.map(c => c.id === id ? { ...c, actif: !c.actif } : c),
    })
  }

  // Dépenses ponctuelles
  function handleAjouterDepense() {
    if (!newDepense.nom.trim() || !newDepense.montant) {
      toast.error('Remplissez le nom et le montant')
      return
    }
    const dep = { ...newDepense, id: genId(), montant: parseFloat(newDepense.montant) }
    updateTresorerie({ depenses: [...(tresorerie?.depenses || []), dep] })
    setNewDepense({ nom: '', montant: '', date: format(new Date(), 'yyyy-MM-dd'), categorie: 'Matériel', note: '' })
    setShowAddDepense(false)
    toast.success('Dépense ajoutée')
  }
  function supprimerDepense(id) {
    updateTresorerie({ depenses: (tresorerie?.depenses || []).filter(d => d.id !== id) })
    toast.success('Dépense supprimée')
  }

  // ── CALCUL PRÉVISIONNEL ──────────────────────────────
  const previsionnel = useMemo(() => {
    if (!tresorerie) return []

    const soldeDepart = parseFloat(tresorerie.solde) || 0
    const charges = (tresorerie.charges || []).filter(c => c.actif)
    const aujourd = new Date()
    const points = []

    // Calculer semaine par semaine sur 13 semaines (~3 mois)
    let soldeActuel = soldeDepart

    for (let semaine = 0; semaine < 13; semaine++) {
      const debutSem = addDays(aujourd, semaine * 7)
      const finSem = addDays(debutSem, 6)

      // Entrées : factures dont échéance tombe cette semaine
      let entrees = 0
      for (const f of factures) {
        if (f.statut === 'en_retard' || f.statut === 'envoyee') {
          const echeance = f.date_echeance ? new Date(f.date_echeance) : null
          if (echeance && echeance >= debutSem && echeance <= finSem) {
            const t = calculerTotaux(f.lignes, f.remise_type, f.remise_valeur)
            entrees += t.total_ttc - (f.acompte_verse || 0)
          }
        }
      }

      // Sorties : dépenses ponctuelles tombant cette semaine
      let sorties = 0
      for (const dep of (tresorerie.depenses || [])) {
        if (!dep.date) continue
        try {
          const d = parseISO(dep.date)
          if (d >= debutSem && d <= finSem) {
            sorties += parseFloat(dep.montant) || 0
          }
        } catch { /* ignore */ }
      }

      // Sorties : charges mensuelles/trimestrielles/annuelles
      for (const ch of charges) {
        const jourPrelevement = parseInt(ch.jour) || 1
        let montantSemaine = 0

        // Vérifier si le jour de prélèvement tombe dans cette semaine
        for (let d = new Date(debutSem); d <= finSem; d = addDays(d, 1)) {
          if (d.getDate() === jourPrelevement) {
            const moisD = d.getMonth()
            const ok = ch.frequence === 'mensuel' ||
              (ch.frequence === 'bimestriel' && moisD % 2 === 0) ||
              (ch.frequence === 'trimestriel' && moisD % 3 === 0) ||
              (ch.frequence === 'annuel' && moisD === 0)
            if (ok) montantSemaine += parseFloat(ch.montant) || 0
          }
        }
        sorties += montantSemaine
      }

      soldeActuel = soldeActuel + entrees - sorties

      points.push({
        semaine: `S${semaine + 1}`,
        label: `${format(debutSem, 'd MMM', { locale: fr })}`,
        solde: Math.round(soldeActuel),
        entrees: Math.round(entrees),
        sorties: Math.round(sorties),
        alerte: soldeActuel < 0,
        alerte_faible: soldeActuel > 0 && soldeActuel < 1000,
      })
    }

    return points
  }, [tresorerie, factures])

  // Alertes
  const alertes = useMemo(() => {
    const list = []
    const semAlerte = previsionnel.find(p => p.alerte)
    if (semAlerte) {
      list.push({ type: 'danger', msg: `Solde prévu négatif à partir de la ${semAlerte.semaine} (${semAlerte.label})` })
    }
    const semFaible = previsionnel.find(p => p.alerte_faible)
    if (semFaible && !semAlerte) {
      list.push({ type: 'warning', msg: `Solde prévu sous 1 000€ à partir de la ${semFaible.semaine} (${semFaible.label})` })
    }
    // Factures en retard
    const retards = factures.filter(f => f.statut === 'en_retard')
    if (retards.length > 0) {
      const total = retards.reduce((s, f) =>
        s + calculerTotaux(f.lignes, f.remise_type, f.remise_valeur).total_ttc, 0)
      list.push({ type: 'warning', msg: `${retards.length} facture${retards.length > 1 ? 's' : ''} impayée${retards.length > 1 ? 's' : ''} : ${formatMontant(total)} non encaissé${retards.length > 1 ? 's' : ''}` })
    }
    return list
  }, [previsionnel, factures])

  // Totaux charges mensuelles
  const totalChargesMensuelles = useMemo(() => {
    return (tresorerie?.charges || [])
      .filter(c => c.actif && c.frequence === 'mensuel')
      .reduce((s, c) => s + (parseFloat(c.montant) || 0), 0)
  }, [tresorerie])

  // Dépenses ponctuelles du mois en cours
  const depensesMoisCourant = useMemo(() => {
    const now = new Date()
    const debutMois = new Date(now.getFullYear(), now.getMonth(), 1)
    const finMois = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
    return (tresorerie?.depenses || [])
      .filter(d => {
        try { return isWithinInterval(parseISO(d.date), { start: debutMois, end: finMois }) }
        catch { return false }
      })
      .sort((a, b) => new Date(b.date) - new Date(a.date))
  }, [tresorerie])

  const totalDepensesMois = depensesMoisCourant.reduce((s, d) => s + (parseFloat(d.montant) || 0), 0)

  // Factures à encaisser prochainement
  const facturesAttente = useMemo(() => {
    return factures
      .filter(f => (f.statut === 'envoyee' || f.statut === 'en_retard') && f.date_echeance)
      .sort((a, b) => new Date(a.date_echeance) - new Date(b.date_echeance))
      .slice(0, 5)
  }, [factures])

  const totalAttente = useMemo(() =>
    facturesAttente.reduce((s, f) =>
      s + calculerTotaux(f.lignes, f.remise_type, f.remise_valeur).total_ttc, 0),
    [facturesAttente]
  )

  // CA mensuel sur les 6 derniers mois (factures payées)
  const caMensuel = useMemo(() => {
    const months = []
    for (let i = 5; i >= 0; i--) {
      const date = subMonths(new Date(), i)
      const debut = startOfMonth(date)
      const fin = endOfMonth(date)
      const ca = factures
        .filter(f => f.statut === 'payee' && f.date_paiement)
        .filter(f => {
          try { return isWithinInterval(parseISO(f.date_paiement), { start: debut, end: fin }) }
          catch { return false }
        })
        .reduce((s, f) => s + calculerTotaux(f.lignes, f.remise_type, f.remise_valeur).total_ttc, 0)
      months.push({ mois: format(date, 'MMM', { locale: fr }), ca, isCurrent: i === 0 })
    }
    return months
  }, [factures])

  const caTotalAnnee = useMemo(() => {
    const debut = startOfMonth(subMonths(new Date(), 11))
    return factures
      .filter(f => f.statut === 'payee' && f.date_paiement)
      .filter(f => {
        try { return new Date(f.date_paiement) >= debut } catch { return false }
      })
      .reduce((s, f) => s + calculerTotaux(f.lignes, f.remise_type, f.remise_valeur).total_ttc, 0)
  }, [factures])

  if (!tresorerie) return null

  const soldeDepart = parseFloat(tresorerie.solde) || 0
  const soldeFin3Mois = previsionnel[previsionnel.length - 1]?.solde ?? soldeDepart
  const diff3Mois = soldeFin3Mois - soldeDepart

  return (
    <PageTransition>
      <div className="p-4 md:p-6 max-w-5xl mx-auto pb-24 md:pb-6 space-y-6">

        {/* En-tête */}
        <div>
          <h1 className="text-2xl font-bold text-white">Trésorerie</h1>
          <p className="text-slate-400 text-sm mt-1">Suivi financier et prévisionnel sur 3 mois</p>
        </div>

        {/* Alertes */}
        <AnimatePresence>
          {alertes.map((a, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex items-center gap-3 p-3.5 rounded-2xl border text-sm ${
                a.type === 'danger'
                  ? 'bg-red-900/20 border-red-800 text-red-300'
                  : 'bg-amber-900/20 border-amber-800 text-amber-300'
              }`}
            >
              <AlertCircle size={15} className="flex-shrink-0" />
              <p>{a.msg}</p>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* ── LIGNE 1 : KPIs ─────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">

          {/* Solde actuel — éditable */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-slate-800 border border-slate-700 rounded-2xl p-4 col-span-2 md:col-span-1"
          >
            <div className="flex items-center justify-between mb-1">
              <p className="text-slate-400 text-xs uppercase tracking-wide">Solde actuel</p>
              <button onClick={() => setEditSolde(v => !v)} className="text-slate-500 hover:text-amber-400 transition-colors" title="Modifier">
                <RefreshCw size={12} />
              </button>
            </div>
            {editSolde ? (
              <div className="flex gap-2 items-center mt-1">
                <input
                  type="number"
                  value={soldeSaisi}
                  onChange={e => setSoldeSaisi(e.target.value)}
                  className="flex-1 bg-slate-900 border border-slate-600 rounded-lg text-white px-2 py-1 text-sm focus:border-amber-500 focus:outline-none"
                  autoFocus
                  onKeyDown={e => e.key === 'Enter' && handleSauvegarderSolde()}
                />
                <button onClick={handleSauvegarderSolde} className="text-emerald-400 hover:text-emerald-300">
                  <Save size={14} />
                </button>
              </div>
            ) : (
              <p className={`text-xl font-bold mt-1 ${soldeDepart >= 0 ? 'text-white' : 'text-red-400'}`}>
                {formatMontant(soldeDepart)}
              </p>
            )}
            {tresorerie.date_solde && (
              <p className="text-slate-600 text-xs mt-1">
                Mis à jour {format(new Date(tresorerie.date_solde), 'd MMM', { locale: fr })}
              </p>
            )}
          </motion.div>

          {/* Dans 3 mois */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.04 }}
            className="bg-slate-800 border border-slate-700 rounded-2xl p-4"
          >
            <p className="text-slate-400 text-xs uppercase tracking-wide mb-1">Dans 3 mois</p>
            <p className={`text-xl font-bold ${soldeFin3Mois >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {formatMontant(soldeFin3Mois)}
            </p>
            <p className={`text-xs mt-1 flex items-center gap-1 ${diff3Mois >= 0 ? 'text-emerald-500' : 'text-red-400'}`}>
              {diff3Mois >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
              {diff3Mois >= 0 ? '+' : ''}{formatMontant(diff3Mois)}
            </p>
          </motion.div>

          {/* À encaisser */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            className="bg-slate-800 border border-slate-700 rounded-2xl p-4"
          >
            <p className="text-slate-400 text-xs uppercase tracking-wide mb-1">À encaisser</p>
            <p className="text-xl font-bold text-amber-400">{formatMontant(totalAttente)}</p>
            <p className="text-slate-500 text-xs mt-1">
              {facturesAttente.length} facture{facturesAttente.length !== 1 ? 's' : ''}
            </p>
          </motion.div>

          {/* Charges/mois */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
            className="bg-slate-800 border border-slate-700 rounded-2xl p-4"
          >
            <p className="text-slate-400 text-xs uppercase tracking-wide mb-1">Charges/mois</p>
            <p className="text-xl font-bold text-red-400">{formatMontant(totalChargesMensuelles)}</p>
            <p className="text-slate-500 text-xs mt-1">
              {(tresorerie.charges || []).filter(c => c.actif).length} actives
            </p>
          </motion.div>

          {/* Dépenses ce mois */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.16 }}
            className="bg-slate-800 border border-slate-700 rounded-2xl p-4 col-span-2 md:col-span-1"
          >
            <p className="text-slate-400 text-xs uppercase tracking-wide mb-1">Dépenses ce mois</p>
            <p className="text-xl font-bold text-orange-400">{formatMontant(totalDepensesMois)}</p>
            <p className="text-slate-500 text-xs mt-1">
              {depensesMoisCourant.length} dépense{depensesMoisCourant.length !== 1 ? 's' : ''}
            </p>
          </motion.div>
        </div>

        {/* ── LIGNE 2 : Graphes ──────────────────────────────────── */}
        <div className="grid md:grid-cols-5 gap-6">

          {/* Graphe CA mensuel (3 colonnes) */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18 }}
            className="md:col-span-3 bg-slate-800 rounded-2xl border border-slate-700 p-5"
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-white font-semibold flex items-center gap-2">
                  <BarChart2 size={16} className="text-emerald-400" />
                  Chiffre d'affaires mensuel
                </h2>
                <p className="text-slate-500 text-xs mt-0.5">6 derniers mois — factures encaissées</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-500">12 mois</p>
                <p className="text-emerald-400 font-bold text-sm">{formatMontant(caTotalAnnee)}</p>
              </div>
            </div>
            {caMensuel.every(m => m.ca === 0) ? (
              <div className="flex flex-col items-center justify-center py-10 text-slate-500">
                <BarChart2 size={32} className="mb-2 opacity-30" />
                <p className="text-sm">Aucune facture encaissée enregistrée</p>
                <p className="text-xs mt-1">Les factures marquées "Payée" apparaîtront ici</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={caMensuel} margin={{ top: 4, right: 4, left: -12, bottom: 0 }} barSize={28}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                  <XAxis dataKey="mois" tick={{ fill: '#94A3B8', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fill: '#94A3B8', fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}
                  />
                  <Tooltip content={<TooltipCA />} cursor={{ fill: '#1E293B' }} />
                  <Bar dataKey="ca" radius={[6, 6, 0, 0]}>
                    {caMensuel.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.isCurrent ? '#10B981' : '#334155'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
            <div className="flex gap-3 mt-2 text-xs text-slate-500">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-emerald-500" /> Mois en cours</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-slate-600" /> Mois passés</span>
            </div>
          </motion.div>

          {/* Graphe prévisionnel solde (2 colonnes) */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.22 }}
            className="md:col-span-2 bg-slate-800 rounded-2xl border border-slate-700 p-5"
          >
            <h2 className="text-white font-semibold mb-1">Prévisionnel solde</h2>
            <p className="text-slate-500 text-xs mb-4">Évolution sur 3 mois</p>
            {previsionnel.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-slate-500">
                <TrendingUp size={28} className="mb-2 opacity-30" />
                <p className="text-sm text-center">Saisissez votre solde actuel pour voir le prévisionnel</p>
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={150}>
                  <AreaChart data={previsionnel} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorSolde2" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                    <XAxis dataKey="label" tick={{ fill: '#94A3B8', fontSize: 9 }} axisLine={false} tickLine={false} interval={2} />
                    <YAxis
                      tick={{ fill: '#94A3B8', fontSize: 9 }}
                      axisLine={false} tickLine={false}
                      tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#475569' }} />
                    <ReferenceLine y={0} stroke="#EF4444" strokeDasharray="3 3" />
                    <ReferenceLine y={1000} stroke="#F59E0B" strokeDasharray="2 2" strokeOpacity={0.4} />
                    <Area
                      type="monotone"
                      dataKey="solde"
                      stroke="#10B981"
                      strokeWidth={2}
                      fill="url(#colorSolde2)"
                      dot={(props) => {
                        const { cx, cy, payload } = props
                        if (payload.alerte) return <circle key={props.key} cx={cx} cy={cy} r={3} fill="#EF4444" />
                        if (payload.alerte_faible) return <circle key={props.key} cx={cx} cy={cy} r={2.5} fill="#F59E0B" />
                        return <circle key={props.key} cx={cx} cy={cy} r={2} fill="#10B981" />
                      }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
                <div className="flex gap-3 mt-2 text-xs text-slate-500">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Solde</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-red-500" /> 0€</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-amber-500" /> 1k€</span>
                </div>
              </>
            )}
          </motion.div>
        </div>

        {/* ── LIGNE 3 : Charges + Dépenses + Factures ───────────── */}
        <div className="grid md:grid-cols-3 gap-6">

          {/* Charges fixes */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="bg-slate-800 rounded-2xl border border-slate-700 p-5"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white font-semibold text-sm">Charges fixes</h2>
              <Button size="sm" variant="secondary" onClick={() => setShowAddCharge(v => !v)}>
                {showAddCharge ? <ChevronUp size={13} /> : <Plus size={13} />}
                {showAddCharge ? 'Fermer' : 'Ajouter'}
              </Button>
            </div>

            <AnimatePresence>
              {showAddCharge && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-4 space-y-2 bg-slate-700/50 rounded-xl p-3 overflow-hidden"
                >
                  <input
                    value={newCharge.nom}
                    onChange={e => setNewCharge(c => ({ ...c, nom: e.target.value }))}
                    placeholder="Loyer atelier, téléphone..."
                    className="w-full bg-slate-900 border border-slate-600 rounded-lg text-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none placeholder-slate-500"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      value={newCharge.montant}
                      onChange={e => setNewCharge(c => ({ ...c, montant: e.target.value }))}
                      placeholder="Montant €"
                      className="bg-slate-900 border border-slate-600 rounded-lg text-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none placeholder-slate-500"
                    />
                    <select
                      value={newCharge.frequence}
                      onChange={e => setNewCharge(c => ({ ...c, frequence: e.target.value }))}
                      className="bg-slate-900 border border-slate-600 rounded-lg text-white px-2 py-2 text-sm focus:border-amber-500 focus:outline-none"
                    >
                      <option value="mensuel">Mensuel</option>
                      <option value="bimestriel">Bi-mensuel</option>
                      <option value="trimestriel">Trimestriel</option>
                      <option value="annuel">Annuel</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 text-xs">Jour :</span>
                    <input
                      type="number" min="1" max="31"
                      value={newCharge.jour}
                      onChange={e => setNewCharge(c => ({ ...c, jour: parseInt(e.target.value) || 1 }))}
                      className="w-14 bg-slate-900 border border-slate-600 rounded-lg text-white px-2 py-1.5 text-sm focus:border-amber-500 focus:outline-none"
                    />
                    <span className="text-slate-500 text-xs">du mois</span>
                  </div>
                  <Button size="sm" onClick={handleAjouterCharge} className="w-full">
                    <Plus size={13} /> Ajouter
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>

            {(tresorerie.charges || []).length === 0 ? (
              <p className="text-slate-500 text-xs text-center py-6">Loyer, leasing, téléphone, mutuelle…</p>
            ) : (
              <div className="space-y-1.5">
                {(tresorerie.charges || []).map(ch => (
                  <div key={ch.id} className={`flex items-center gap-2.5 px-2.5 py-2 rounded-xl ${ch.actif ? '' : 'opacity-50'}`}>
                    <button onClick={() => toggleCharge(ch.id)}
                      className={`w-3.5 h-3.5 rounded border-2 flex-shrink-0 transition-colors ${ch.actif ? 'bg-amber-500 border-amber-500' : 'border-slate-500'}`}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-xs font-medium truncate">{ch.nom}</p>
                      <p className="text-slate-500 text-xs">{FREQ_LABELS[ch.frequence]}</p>
                    </div>
                    <span className="text-red-400 font-semibold text-xs flex-shrink-0">-{formatMontant(ch.montant)}</span>
                    <button onClick={() => supprimerCharge(ch.id)} className="text-slate-600 hover:text-red-400 transition-colors">
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
                <div className="flex justify-between pt-2 border-t border-slate-700/60 text-xs">
                  <span className="text-slate-500">Total mensuel</span>
                  <span className="text-red-400 font-semibold">-{formatMontant(totalChargesMensuelles)}</span>
                </div>
              </div>
            )}
          </motion.div>

          {/* Dépenses ponctuelles */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.28 }}
            className="bg-slate-800 rounded-2xl border border-slate-700 p-5"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white font-semibold text-sm flex items-center gap-1.5">
                <ShoppingCart size={14} className="text-orange-400" />
                Dépenses ponctuelles
              </h2>
              <Button size="sm" variant="secondary" onClick={() => setShowAddDepense(v => !v)}>
                {showAddDepense ? <ChevronUp size={13} /> : <Plus size={13} />}
                {showAddDepense ? 'Fermer' : 'Ajouter'}
              </Button>
            </div>

            <AnimatePresence>
              {showAddDepense && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-4 space-y-2 bg-slate-700/50 rounded-xl p-3 overflow-hidden"
                >
                  <input
                    value={newDepense.nom}
                    onChange={e => setNewDepense(d => ({ ...d, nom: e.target.value }))}
                    placeholder="Achat câble 2.5mm², outillage..."
                    className="w-full bg-slate-900 border border-slate-600 rounded-lg text-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none placeholder-slate-500"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      value={newDepense.montant}
                      onChange={e => setNewDepense(d => ({ ...d, montant: e.target.value }))}
                      placeholder="Montant €"
                      className="bg-slate-900 border border-slate-600 rounded-lg text-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none placeholder-slate-500"
                    />
                    <input
                      type="date"
                      value={newDepense.date}
                      onChange={e => setNewDepense(d => ({ ...d, date: e.target.value }))}
                      className="bg-slate-900 border border-slate-600 rounded-lg text-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                  <select
                    value={newDepense.categorie}
                    onChange={e => setNewDepense(d => ({ ...d, categorie: e.target.value }))}
                    className="w-full bg-slate-900 border border-slate-600 rounded-lg text-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none"
                  >
                    {CATEGORIES_DEPENSES.map(c => <option key={c}>{c}</option>)}
                  </select>
                  <Button size="sm" onClick={handleAjouterDepense} className="w-full">
                    <Plus size={13} /> Ajouter
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>

            {(tresorerie?.depenses || []).length === 0 ? (
              <p className="text-slate-500 text-xs text-center py-6">Matériel, carburant, outillage…</p>
            ) : (
              <div className="space-y-1.5 max-h-60 overflow-y-auto pr-0.5">
                {[...(tresorerie?.depenses || [])].sort((a, b) => new Date(b.date) - new Date(a.date)).map(dep => (
                  <div key={dep.id} className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-slate-700/30 group">
                    <span className="px-1.5 py-0.5 bg-orange-500/15 text-orange-400 text-xs rounded-md flex-shrink-0 flex items-center gap-1">
                      <Tag size={8} />{dep.categorie}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-xs truncate">{dep.nom}</p>
                      <p className="text-slate-500 text-xs">{format(parseISO(dep.date), 'd MMM yy', { locale: fr })}</p>
                    </div>
                    <span className="text-orange-400 font-semibold text-xs flex-shrink-0">-{formatMontant(dep.montant)}</span>
                    <button onClick={() => supprimerDepense(dep.id)} className="text-slate-700 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all">
                      <Trash2 size={11} />
                    </button>
                  </div>
                ))}
                <div className="flex justify-between pt-2 border-t border-slate-700/60 text-xs">
                  <span className="text-slate-500">{(tresorerie?.depenses || []).length} dépense{(tresorerie?.depenses || []).length > 1 ? 's' : ''}</span>
                  <span className="text-orange-400 font-semibold">
                    -{formatMontant((tresorerie?.depenses || []).reduce((s, d) => s + (parseFloat(d.montant) || 0), 0))}
                  </span>
                </div>
              </div>
            )}
          </motion.div>

          {/* Factures à encaisser */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-slate-800 rounded-2xl border border-slate-700 p-5"
          >
            <h2 className="text-white font-semibold text-sm mb-4 flex items-center gap-1.5">
              <Wallet size={14} className="text-amber-400" />
              Factures à encaisser
            </h2>
            {facturesAttente.length === 0 ? (
              <p className="text-slate-500 text-xs text-center py-6">Aucune facture en attente.</p>
            ) : (
              <div className="space-y-1.5">
                {facturesAttente.map(f => {
                  const t = calculerTotaux(f.lignes, f.remise_type, f.remise_valeur)
                  const jours = f.date_echeance
                    ? Math.floor((new Date(f.date_echeance) - new Date()) / 86400000)
                    : null
                  return (
                    <div key={f.id} className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl bg-slate-700/20">
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-xs font-medium">{f.numero}</p>
                        <p className="text-xs mt-0.5">
                          {jours !== null
                            ? jours < 0
                              ? <span className="text-red-400">{Math.abs(jours)}j retard</span>
                              : <span className="text-slate-500">Dans {jours}j</span>
                            : <span className="text-slate-500">—</span>
                          }
                        </p>
                      </div>
                      <span className={`font-bold text-xs flex-shrink-0 ${f.statut === 'en_retard' ? 'text-red-400' : 'text-amber-400'}`}>
                        +{formatMontant(t.total_ttc)}
                      </span>
                    </div>
                  )
                })}
                <div className="flex justify-between pt-2 border-t border-slate-700/60 text-xs">
                  <span className="text-slate-500">Total attendu</span>
                  <span className="text-amber-400 font-bold">{formatMontant(totalAttente)}</span>
                </div>
              </div>
            )}
          </motion.div>
        </div>

        {/* ── LIGNE 4 : Tableau prévisionnel rétractable ───────── */}
        {previsionnel.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden"
          >
            <button
              onClick={() => setTableauOuvert(v => !v)}
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-700/30 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <h2 className="text-white font-semibold text-sm">Détail semaine par semaine</h2>
                <span className="text-slate-500 text-xs">{previsionnel.length} semaines</span>
              </div>
              <motion.div
                animate={{ rotate: tableauOuvert ? 180 : 0 }}
                transition={{ duration: 0.2 }}
                className="text-slate-500 group-hover:text-slate-300"
              >
                <ChevronDown size={16} />
              </motion.div>
            </button>

            <AnimatePresence initial={false}>
              {tableauOuvert && (
                <motion.div
                  key="tableau"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: 'easeInOut' }}
                  className="overflow-hidden"
                >
                  <div className="overflow-x-auto border-t border-slate-700">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-700 bg-slate-800/80">
                          <th className="text-left px-4 py-3 text-slate-400 text-xs font-medium">Semaine</th>
                          <th className="text-right px-4 py-3 text-slate-400 text-xs font-medium">Entrées</th>
                          <th className="text-right px-4 py-3 text-slate-400 text-xs font-medium">Sorties</th>
                          <th className="text-right px-4 py-3 text-slate-400 text-xs font-medium">Solde prévu</th>
                        </tr>
                      </thead>
                      <tbody>
                        {previsionnel.map((row, i) => (
                          <tr
                            key={i}
                            className={`border-b border-slate-700/40 transition-colors ${row.alerte ? 'bg-red-900/10' : row.alerte_faible ? 'bg-amber-900/8' : 'hover:bg-slate-700/20'}`}
                          >
                            <td className="px-4 py-2.5 text-slate-300 text-xs">
                              <span className="font-medium">{row.semaine}</span>
                              <span className="text-slate-500 ml-1">· {row.label}</span>
                              {row.alerte && <span className="ml-2 text-red-400 text-xs">⚠ Déficit</span>}
                              {row.alerte_faible && <span className="ml-2 text-amber-400 text-xs">⚠ Faible</span>}
                            </td>
                            <td className="px-4 py-2.5 text-right text-emerald-400 font-medium text-xs">
                              {row.entrees > 0 ? `+${formatMontant(row.entrees)}` : <span className="text-slate-700">—</span>}
                            </td>
                            <td className="px-4 py-2.5 text-right text-red-400 font-medium text-xs">
                              {row.sorties > 0 ? `-${formatMontant(row.sorties)}` : <span className="text-slate-700">—</span>}
                            </td>
                            <td className={`px-4 py-2.5 text-right font-bold text-xs ${row.solde >= 0 ? 'text-white' : 'text-red-400'}`}>
                              {formatMontant(row.solde)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </PageTransition>
  )
}
