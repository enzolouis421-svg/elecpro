// Prévisionnel Fiscal — régime, URSSAF, TVA, IS, seuils, alertes, simulation
import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell,
} from 'recharts'
import { AlertCircle, Info, Calculator, Bell, Sliders } from 'lucide-react'
import { format, startOfYear, endOfYear, parseISO, isWithinInterval, differenceInDays } from 'date-fns'
import { fr } from 'date-fns/locale'
import { useApp } from '../../context/AppContext'
import { calculerTotaux, formatMontant } from '../../lib/utils'
import PageTransition from '../../components/layout/PageTransition'

// ── TAUX LÉGAUX 2025 ─────────────────────────────────────
const TAUX = {
  // Micro-entrepreneur BIC prestations de services
  micro_bic: {
    label: 'Micro-entrepreneur (BIC)',
    urssaf: 0.22,         // cotisations sociales
    versement_lib: 0.017, // versement libératoire IR
    abattement: 0.50,     // abattement forfaitaire charges
    seuil_ca: 77700,      // seuil CA micro BIC (2025)
    seuil_tva: 36800,     // seuil franchise TVA
    info: 'Taux URSSAF 22% sur CA. Abattement forfaitaire 50% pour l\'IR.',
  },
  // Micro-entrepreneur BNC (profession libérale)
  micro_bnc: {
    label: 'Micro-entrepreneur (BNC)',
    urssaf: 0.226,
    versement_lib: 0.022,
    abattement: 0.34,
    seuil_ca: 77700,
    seuil_tva: 36800,
    info: 'Taux URSSAF 22,6% sur CA. Abattement forfaitaire 34% pour l\'IR.',
  },
  // Entreprise individuelle au réel (IR)
  reel_ir: {
    label: 'Réel simplifié (IR)',
    urssaf: 0.45,       // TNS : ~45% du bénéfice
    abattement: 0,
    seuil_tva: null,
    info: 'Cotisations TNS ~45% du bénéfice net. IR selon tranches. Déduction réelle des charges.',
  },
  // SASU / EURL à l\'IS
  reel_is: {
    label: 'SASU / EURL (IS)',
    urssaf: 0, // Dépend rémunération gérant
    is_taux_reduit: 0.15, // 15% jusqu'à 42 500€
    is_taux_normal: 0.25, // 25% au-delà
    seuil_is: 42500,
    seuil_tva: null,
    info: 'IS 15% jusqu\'à 42 500€ de bénéfice, 25% au-delà. Cotisations sur rémunération du gérant.',
  },
}

// Tranches IR 2025 (simplifiées)
const TRANCHES_IR = [
  { min: 0, max: 11294, taux: 0 },
  { min: 11294, max: 28797, taux: 0.11 },
  { min: 28797, max: 82341, taux: 0.30 },
  { min: 82341, max: 177106, taux: 0.41 },
  { min: 177106, max: Infinity, taux: 0.45 },
]

function calculerIR(revenuImposable) {
  let impot = 0
  for (const t of TRANCHES_IR) {
    if (revenuImposable > t.min) {
      const base = Math.min(revenuImposable, t.max) - t.min
      impot += base * t.taux
    }
  }
  return impot
}

export default function Fiscal() {
  const { factures, tresorerie, updateTresorerie } = useApp()

  const regime = tresorerie?.fiscal?.regime || 'micro_bic'
  const versement_lib = tresorerie?.fiscal?.versement_liberatoire || false
  const remuneration_gerant = tresorerie?.fiscal?.remuneration_gerant || 0

  // Simulation "et si" — CA supplémentaire
  const [showSimulation, setShowSimulation] = useState(false)
  const [caSupplementaire, setCaSupplementaire] = useState(5000)

  function setFiscal(key, val) {
    updateTresorerie({
      fiscal: { ...(tresorerie?.fiscal || {}), [key]: val },
    })
  }

  const annee = new Date().getFullYear()

  // ── CA RÉEL DE L'ANNÉE ───────────────────────────────
  const caAnnee = useMemo(() => {
    const debut = startOfYear(new Date(annee, 0, 1))
    const fin = endOfYear(new Date(annee, 0, 1))
    return factures
      .filter(f => {
        if (f.statut !== 'payee') return false
        const d = f.paiement?.date || f.date_emission
        try { return isWithinInterval(parseISO(d), { start: debut, end: fin }) }
        catch { return false }
      })
      .reduce((s, f) => s + calculerTotaux(f.lignes, f.remise_type, f.remise_valeur).ht_apres_remise, 0)
  }, [factures, annee])

  // CA total toutes années confondues (pour le cumul)
  const caTotal = useMemo(() =>
    factures
      .filter(f => f.statut === 'payee')
      .reduce((s, f) => s + calculerTotaux(f.lignes, f.remise_type, f.remise_valeur).ht_apres_remise, 0),
    [factures]
  )

  // CA mensuel pour le graphique
  const caMensuel = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const debut = new Date(annee, i, 1)
      const fin = new Date(annee, i + 1, 0, 23, 59, 59)
      const ca = factures
        .filter(f => {
          if (f.statut !== 'payee') return false
          const d = f.paiement?.date || f.date_emission
          try { return isWithinInterval(parseISO(d), { start: debut, end: fin }) }
          catch { return false }
        })
        .reduce((s, f) => s + calculerTotaux(f.lignes, f.remise_type, f.remise_valeur).ht_apres_remise, 0)
      return {
        mois: format(debut, 'MMM', { locale: fr }),
        ca: Math.round(ca),
        current: i === new Date().getMonth(),
      }
    })
  }, [factures, annee])

  // ── CALCULS FISCAUX ──────────────────────────────────
  const calcul = useMemo(() => {
    const t = TAUX[regime]
    if (!t) return {}

    if (regime === 'micro_bic' || regime === 'micro_bnc') {
      const urssaf = caAnnee * t.urssaf
      const revenu_imposable = caAnnee * (1 - t.abattement)
      let ir = 0
      if (versement_lib) {
        ir = caAnnee * t.versement_lib
      } else {
        ir = calculerIR(revenu_imposable)
      }
      const total_prelevements = urssaf + ir
      const net_estime = caAnnee - urssaf - ir
      // Charges trimestrielles URSSAF (déclaration tous les 3 mois)
      const urssaf_trim = urssaf / 4
      return { urssaf, ir, total_prelevements, net_estime, revenu_imposable, urssaf_trim }
    }

    if (regime === 'reel_ir') {
      // Estimation simplifiée — bénéfice = CA × 30% (à affiner selon charges réelles)
      const benefice_estime = caAnnee * 0.30
      const urssaf = benefice_estime * t.urssaf
      const revenu_imposable = benefice_estime - urssaf * 0.75 // déduction partielle URSSAF
      const ir = calculerIR(revenu_imposable)
      const net_estime = benefice_estime - urssaf - ir
      return { urssaf, ir, benefice_estime, revenu_imposable, net_estime }
    }

    if (regime === 'reel_is') {
      const remuneration = parseFloat(remuneration_gerant) || 0
      const charges_sociales = remuneration * 0.22 // estimation SASU president
      const benefice_estime = Math.max(0, caAnnee * 0.30 - remuneration - charges_sociales)
      const is = benefice_estime <= t.seuil_is
        ? benefice_estime * t.is_taux_reduit
        : t.seuil_is * t.is_taux_reduit + (benefice_estime - t.seuil_is) * t.is_taux_normal
      const net_estime = benefice_estime - is
      return { is, charges_sociales, benefice_estime, net_estime, remuneration }
    }

    return {}
  }, [regime, caAnnee, versement_lib, remuneration_gerant])

  // ── ALERTES SEUILS ───────────────────────────────────
  const alertes = useMemo(() => {
    const list = []
    const t = TAUX[regime]
    if (!t) return list

    // Seuil TVA franchise
    if (t.seuil_tva) {
      const marge = t.seuil_tva - caTotal
      if (caTotal >= t.seuil_tva) {
        list.push({ type: 'danger', msg: `⚠️ Seuil TVA franchise dépassé (${formatMontant(t.seuil_tva)}). Vous devez facturer la TVA.` })
      } else if (marge < 3000) {
        list.push({ type: 'warning', msg: `Attention : il vous reste ${formatMontant(marge)} avant le seuil de franchise TVA (${formatMontant(t.seuil_tva)}).` })
      }
    }

    // Seuil CA micro
    if (t.seuil_ca) {
      const margeCA = t.seuil_ca - caAnnee
      if (caAnnee >= t.seuil_ca) {
        list.push({ type: 'danger', msg: `⚠️ Seuil CA micro-entrepreneur dépassé (${formatMontant(t.seuil_ca)}). Passez au régime réel.` })
      } else if (margeCA < 5000) {
        list.push({ type: 'warning', msg: `Vous approchez du plafond micro (${formatMontant(t.seuil_ca)}). Marge restante : ${formatMontant(margeCA)}.` })
      }
    }

    // Provision URSSAF
    if (calcul.urssaf) {
      const par_mois = calcul.urssaf / 12
      list.push({ type: 'info', msg: `Provisionnez ${formatMontant(par_mois)}/mois pour vos cotisations URSSAF.` })
    }

    return list
  }, [regime, caAnnee, caTotal, calcul])

  // Prochaines déclarations URSSAF (trimestrielles pour micro)
  const prochainesDeclarations = useMemo(() => {
    const dates = [
      { label: 'T1 (Jan–Mar)', date: `${annee}-04-30`, type: 'URSSAF' },
      { label: 'T2 (Avr–Jun)', date: `${annee}-07-31`, type: 'URSSAF' },
      { label: 'T3 (Jul–Sep)', date: `${annee}-10-31`, type: 'URSSAF' },
      { label: 'T4 (Oct–Déc)', date: `${annee + 1}-01-31`, type: 'URSSAF' },
      { label: 'Décl. TVA annuelle', date: `${annee + 1}-05-15`, type: 'TVA' },
    ]
    return dates
      .filter(d => new Date(d.date) >= new Date())
      .map(d => ({
        ...d,
        joursRestants: differenceInDays(new Date(d.date), new Date()),
        urgent: differenceInDays(new Date(d.date), new Date()) <= 30,
      }))
      .slice(0, 4)
  }, [annee])

  // ── SIMULATION "ET SI" ───────────────────────────────
  const simulationCalcul = useMemo(() => {
    const t = TAUX[regime]
    if (!t) return {}
    const caSimule = caAnnee + caSupplementaire
    if (regime === 'micro_bic' || regime === 'micro_bnc') {
      const urssaf = caSimule * t.urssaf
      const revenu_imposable = caSimule * (1 - t.abattement)
      const ir = versement_lib ? caSimule * t.versement_lib : calculerIR(revenu_imposable)
      return {
        ca: caSimule,
        urssaf,
        ir,
        net: caSimule - urssaf - ir,
        delta_urssaf: urssaf - (caAnnee * t.urssaf),
        delta_ir: ir - (versement_lib ? caAnnee * t.versement_lib : calculerIR(caAnnee * (1 - t.abattement))),
        plafond_ok: caSimule < t.seuil_ca,
        tva_ok: caSimule < (t.seuil_tva || Infinity),
      }
    }
    return {}
  }, [regime, caAnnee, caSupplementaire, versement_lib])

  const t = TAUX[regime]

  return (
    <PageTransition>
      <div className="p-4 md:p-6 max-w-5xl mx-auto pb-24 md:pb-6">
        {/* En-tête */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">Prévisionnel Fiscal {annee}</h1>
          <p className="text-slate-400 text-sm mt-1">
            Estimations indicatives — consultez votre expert-comptable pour validation officielle
          </p>
        </div>

        {/* Rappels déclarations urgents — en priorité */}
        {prochainesDeclarations.filter(d => d.urgent).length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 bg-amber-900/20 border border-amber-800 rounded-2xl p-4"
          >
            <h2 className="text-amber-300 font-semibold mb-3 flex items-center gap-2 text-sm">
              <Bell size={14} />
              Déclarations dans moins de 30 jours
            </h2>
            <div className="space-y-2">
              {prochainesDeclarations.filter(d => d.urgent).map((d, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="text-amber-200">{d.type} — {d.label}</span>
                  <span className="text-amber-400 font-bold">J-{d.joursRestants}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Alertes seuils */}
        {alertes.filter(a => a.type === 'danger' || a.type === 'warning').map((a, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className={`flex items-start gap-3 p-4 rounded-2xl mb-4 border ${
              a.type === 'danger'
                ? 'bg-red-900/20 border-red-800 text-red-300'
                : 'bg-amber-900/20 border-amber-800 text-amber-300'
            }`}
          >
            <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
            <p className="text-sm">{a.msg}</p>
          </motion.div>
        ))}

        <div className="grid md:grid-cols-3 gap-6">
          {/* Colonne gauche — Config */}
          <div className="space-y-5">
            {/* Régime fiscal */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-slate-800 rounded-2xl border border-slate-700 p-5"
            >
              <h2 className="text-white font-semibold mb-4">Régime fiscal</h2>
              <div className="space-y-2">
                {Object.entries(TAUX).map(([key, val]) => (
                  <button
                    key={key}
                    onClick={() => setFiscal('regime', key)}
                    className={`w-full text-left px-3 py-2.5 rounded-xl text-sm transition-colors border ${
                      regime === key
                        ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                        : 'border-slate-700 text-slate-400 hover:text-white hover:border-slate-600'
                    }`}
                  >
                    {val.label}
                  </button>
                ))}
              </div>

              {t?.info && (
                <div className="mt-4 flex items-start gap-2 text-xs text-slate-400 bg-slate-700/50 rounded-xl p-3">
                  <Info size={12} className="flex-shrink-0 mt-0.5 text-blue-400" />
                  {t.info}
                </div>
              )}

              {/* Option versement libératoire */}
              {(regime === 'micro_bic' || regime === 'micro_bnc') && (
                <div className="mt-4 flex items-center justify-between">
                  <label className="text-sm text-slate-300">Versement libératoire IR</label>
                  <button
                    onClick={() => setFiscal('versement_liberatoire', !versement_lib)}
                    className={`w-10 h-5 rounded-full transition-colors relative ${versement_lib ? 'bg-amber-500' : 'bg-slate-600'}`}
                  >
                    <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${versement_lib ? 'left-6' : 'left-0.5'}`} />
                  </button>
                </div>
              )}

              {/* Rémunération gérant (IS) */}
              {regime === 'reel_is' && (
                <div className="mt-4">
                  <label className="text-sm text-slate-300 block mb-1">Rémunération annuelle gérant</label>
                  <input
                    type="number"
                    value={remuneration_gerant}
                    onChange={e => setFiscal('remuneration_gerant', parseFloat(e.target.value) || 0)}
                    placeholder="Ex : 30000"
                    className="w-full bg-slate-900 border border-slate-600 rounded-xl text-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none"
                  />
                </div>
              )}
            </motion.div>

            {/* Prochaines déclarations */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-slate-800 rounded-2xl border border-slate-700 p-5"
            >
              <h2 className="text-white font-semibold mb-4 text-sm flex items-center gap-2">
                <Calculator size={14} className="text-amber-400" />
                Prochaines déclarations
              </h2>
              {(regime === 'micro_bic' || regime === 'micro_bnc') ? (
                <div className="space-y-2">
                  {prochainesDeclarations.map((d, i) => {
                    const jours = Math.floor((new Date(d.date) - new Date()) / 86400000)
                    return (
                      <div key={i} className="flex justify-between items-center text-sm">
                        <div>
                          <p className="text-white">{d.label}</p>
                          <p className="text-slate-500 text-xs">URSSAF · avant le {format(new Date(d.date), 'd MMM yyyy', { locale: fr })}</p>
                        </div>
                        <span className={`text-xs font-medium ${jours < 30 ? 'text-amber-400' : 'text-slate-400'}`}>
                          J-{jours}
                        </span>
                      </div>
                    )
                  })}
                  <div className="pt-2 border-t border-slate-700 mt-2">
                    <p className="text-slate-400 text-xs">Déclaration TVA : mensuelle ou trimestrielle selon votre CA</p>
                  </div>
                </div>
              ) : (
                <p className="text-slate-400 text-sm">Dates variables selon votre expert-comptable</p>
              )}
            </motion.div>
          </div>

          {/* Colonne droite — Calculs */}
          <div className="md:col-span-2 space-y-5">
            {/* CA de l'année */}
            <div className="grid grid-cols-2 gap-4">
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-slate-800 border border-slate-700 rounded-2xl p-5"
              >
                <p className="text-slate-400 text-xs mb-2">CA HT encaissé {annee}</p>
                <p className="text-2xl font-bold text-white">{formatMontant(caAnnee)}</p>
                {t?.seuil_ca && (
                  <>
                    <div className="mt-3 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, (caAnnee / t.seuil_ca) * 100)}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                        className={`h-full rounded-full ${
                          caAnnee / t.seuil_ca > 0.9 ? 'bg-red-500' :
                          caAnnee / t.seuil_ca > 0.7 ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}
                      />
                    </div>
                    <p className="text-slate-500 text-xs mt-1">
                      {Math.round((caAnnee / t.seuil_ca) * 100)}% du plafond ({formatMontant(t.seuil_ca)})
                    </p>
                  </>
                )}
              </motion.div>

              {t?.seuil_tva && (
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 }}
                  className={`border rounded-2xl p-5 ${
                    caTotal >= t.seuil_tva
                      ? 'bg-red-900/20 border-red-800'
                      : caTotal > t.seuil_tva * 0.9
                      ? 'bg-amber-900/20 border-amber-800'
                      : 'bg-slate-800 border-slate-700'
                  }`}
                >
                  <p className="text-slate-400 text-xs mb-2">Franchise TVA</p>
                  <p className={`text-2xl font-bold ${caTotal >= t.seuil_tva ? 'text-red-400' : 'text-white'}`}>
                    {formatMontant(Math.max(0, t.seuil_tva - caTotal))}
                  </p>
                  <p className="text-slate-500 text-xs mt-1">
                    {caTotal >= t.seuil_tva ? '🚨 Seuil dépassé' : `restants avant ${formatMontant(t.seuil_tva)}`}
                  </p>
                </motion.div>
              )}
            </div>

            {/* Estimations fiscales */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-slate-800 rounded-2xl border border-slate-700 p-5"
            >
              <h2 className="text-white font-semibold mb-4">Estimations {annee}</h2>

              {(regime === 'micro_bic' || regime === 'micro_bnc') && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-700/50 rounded-xl p-4">
                      <p className="text-slate-400 text-xs mb-1">CA HT</p>
                      <p className="text-white font-bold text-lg">{formatMontant(caAnnee)}</p>
                    </div>
                    <div className="bg-red-900/20 border border-red-800/30 rounded-xl p-4">
                      <p className="text-slate-400 text-xs mb-1">Cotisations URSSAF ({(t.urssaf * 100).toFixed(0)}%)</p>
                      <p className="text-red-400 font-bold text-lg">-{formatMontant(calcul.urssaf)}</p>
                      <p className="text-slate-500 text-xs mt-0.5">≈ {formatMontant((calcul.urssaf || 0) / 4)}/trimestre</p>
                    </div>
                    <div className="bg-orange-900/20 border border-orange-800/30 rounded-xl p-4">
                      <p className="text-slate-400 text-xs mb-1">
                        {versement_lib ? `Versement libératoire IR (${(t.versement_lib * 100).toFixed(1)}%)` : 'Impôt sur le revenu (estimé)'}
                      </p>
                      <p className="text-orange-400 font-bold text-lg">-{formatMontant(calcul.ir)}</p>
                      {!versement_lib && (
                        <p className="text-slate-500 text-xs mt-0.5">Base imposable : {formatMontant(calcul.revenu_imposable)}</p>
                      )}
                    </div>
                    <div className="bg-emerald-900/20 border border-emerald-800/30 rounded-xl p-4">
                      <p className="text-slate-400 text-xs mb-1">Net estimé après prélèvements</p>
                      <p className="text-emerald-400 font-bold text-lg">{formatMontant(calcul.net_estime)}</p>
                      <p className="text-slate-500 text-xs mt-0.5">
                        {caAnnee > 0 ? `${Math.round((calcul.net_estime / caAnnee) * 100)}% du CA` : '—'}
                      </p>
                    </div>
                  </div>

                  {/* Provision mensuelle recommandée */}
                  <div className="bg-blue-900/20 border border-blue-800/30 rounded-xl p-4 flex items-start gap-3">
                    <Info size={15} className="text-blue-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-blue-300 font-medium text-sm">Provision mensuelle recommandée</p>
                      <p className="text-blue-400 text-xl font-bold mt-1">
                        {formatMontant((calcul.total_prelevements || 0) / 12)}
                        <span className="text-sm font-normal text-blue-300/70"> / mois</span>
                      </p>
                      <p className="text-slate-400 text-xs mt-1">
                        À mettre de côté sur un compte épargne dédié
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {regime === 'reel_ir' && (
                <div className="space-y-3">
                  <div className="bg-amber-900/20 border border-amber-800/30 rounded-xl p-4">
                    <p className="text-slate-400 text-xs mb-1">Estimation basée sur une marge de 30%</p>
                    <p className="text-amber-300 text-sm">Bénéfice estimé : {formatMontant(calcul.benefice_estime)}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-red-900/20 border border-red-800/30 rounded-xl p-4">
                      <p className="text-slate-400 text-xs mb-1">Cotisations TNS (~45%)</p>
                      <p className="text-red-400 font-bold text-lg">-{formatMontant(calcul.urssaf)}</p>
                    </div>
                    <div className="bg-orange-900/20 border border-orange-800/30 rounded-xl p-4">
                      <p className="text-slate-400 text-xs mb-1">IR estimé</p>
                      <p className="text-orange-400 font-bold text-lg">-{formatMontant(calcul.ir)}</p>
                    </div>
                  </div>
                  <div className="bg-emerald-900/20 border border-emerald-800/30 rounded-xl p-4">
                    <p className="text-slate-400 text-xs mb-1">Net estimé</p>
                    <p className="text-emerald-400 font-bold text-xl">{formatMontant(calcul.net_estime)}</p>
                  </div>
                  <p className="text-slate-500 text-xs">⚠️ Estimation très approximative. Le régime réel nécessite un bilan comptable précis.</p>
                </div>
              )}

              {regime === 'reel_is' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-700/50 rounded-xl p-4">
                      <p className="text-slate-400 text-xs mb-1">Bénéfice estimé</p>
                      <p className="text-white font-bold text-lg">{formatMontant(calcul.benefice_estime)}</p>
                    </div>
                    <div className="bg-red-900/20 border border-red-800/30 rounded-xl p-4">
                      <p className="text-slate-400 text-xs mb-1">IS (15% / 25%)</p>
                      <p className="text-red-400 font-bold text-lg">-{formatMontant(calcul.is)}</p>
                    </div>
                    <div className="bg-orange-900/20 border border-orange-800/30 rounded-xl p-4">
                      <p className="text-slate-400 text-xs mb-1">Charges sociales gérant</p>
                      <p className="text-orange-400 font-bold text-lg">-{formatMontant(calcul.charges_sociales)}</p>
                    </div>
                    <div className="bg-emerald-900/20 border border-emerald-800/30 rounded-xl p-4">
                      <p className="text-slate-400 text-xs mb-1">Résultat net</p>
                      <p className="text-emerald-400 font-bold text-lg">{formatMontant(calcul.net_estime)}</p>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>

            {/* Graphique CA mensuel */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="bg-slate-800 rounded-2xl border border-slate-700 p-5"
            >
              <h2 className="text-white font-semibold mb-4">CA mensuel {annee}</h2>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={caMensuel} margin={{ top: 0, right: 0, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                  <XAxis dataKey="mois" tick={{ fill: '#94A3B8', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#94A3B8', fontSize: 10 }} axisLine={false} tickLine={false}
                    tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
                  <Tooltip
                    formatter={v => formatMontant(v)}
                    contentStyle={{ background: '#1E293B', border: '1px solid #334155', borderRadius: '12px', color: '#F8FAFC' }}
                  />
                  <Bar dataKey="ca" radius={[4, 4, 0, 0]} maxBarSize={32}>
                    {caMensuel.map((m, i) => (
                      <Cell key={i} fill={m.current ? '#F59E0B' : '#334155'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </motion.div>

            {/* Infos alerte seuil TVA */}
            {alertes.filter(a => a.type === 'info').map((a, i) => (
              <div key={i} className="bg-blue-900/20 border border-blue-800/30 rounded-2xl p-4 flex items-start gap-3 text-sm text-blue-300">
                <Info size={15} className="flex-shrink-0 mt-0.5" />
                {a.msg}
              </div>
            ))}
          </div>
        </div>

        {/* Simulation "et si" */}
        {(regime === 'micro_bic' || regime === 'micro_bnc') && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="mt-6 bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden"
          >
            {/* Header cliquable */}
            <button
              onClick={() => setShowSimulation(v => !v)}
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-700/30 transition-colors"
            >
              <h2 className="text-white font-semibold flex items-center gap-2">
                <Sliders size={16} className="text-amber-400" />
                Simulation "et si je gagne X de plus ?"
              </h2>
              <span className="text-slate-400 text-sm">{showSimulation ? '▲ Masquer' : '▼ Afficher'}</span>
            </button>

            {showSimulation && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="px-5 pb-5"
              >
                {/* Slider */}
                <div className="mb-5">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-slate-400">CA supplémentaire simulé</span>
                    <span className="text-amber-400 font-bold">{formatMontant(caSupplementaire)}</span>
                  </div>
                  <input
                    type="range"
                    min="0" max="50000" step="500"
                    value={caSupplementaire}
                    onChange={e => setCaSupplementaire(parseInt(e.target.value))}
                    className="w-full accent-amber-500"
                  />
                  <div className="flex justify-between text-xs text-slate-600 mt-1">
                    <span>0€</span><span>10k€</span><span>25k€</span><span>50k€</span>
                  </div>
                </div>

                {/* Résultats simulation */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-slate-700/50 rounded-xl p-3">
                    <p className="text-slate-400 text-xs mb-1">CA simulé total</p>
                    <p className="text-white font-bold">{formatMontant(simulationCalcul.ca)}</p>
                  </div>
                  <div className="bg-red-900/20 border border-red-800/30 rounded-xl p-3">
                    <p className="text-slate-400 text-xs mb-1">URSSAF (+delta)</p>
                    <p className="text-red-400 font-bold">{formatMontant(simulationCalcul.urssaf)}</p>
                    <p className="text-red-500 text-xs">+{formatMontant(simulationCalcul.delta_urssaf)}</p>
                  </div>
                  <div className="bg-orange-900/20 border border-orange-800/30 rounded-xl p-3">
                    <p className="text-slate-400 text-xs mb-1">IR estimé (+delta)</p>
                    <p className="text-orange-400 font-bold">{formatMontant(simulationCalcul.ir)}</p>
                    <p className="text-orange-500 text-xs">+{formatMontant(simulationCalcul.delta_ir)}</p>
                  </div>
                  <div className="bg-emerald-900/20 border border-emerald-800/30 rounded-xl p-3">
                    <p className="text-slate-400 text-xs mb-1">Net estimé</p>
                    <p className="text-emerald-400 font-bold">{formatMontant(simulationCalcul.net)}</p>
                  </div>
                </div>

                {/* Alertes simulation */}
                {simulationCalcul.ca > 0 && (
                  <div className="mt-3 space-y-2">
                    {!simulationCalcul.plafond_ok && (
                      <div className="flex items-center gap-2 text-xs text-red-400 bg-red-900/10 rounded-xl p-3">
                        <AlertCircle size={13} />
                        ⚠️ Ce CA dépasserait le plafond micro ({formatMontant(t?.seuil_ca)}). Vous devrez passer au régime réel.
                      </div>
                    )}
                    {!simulationCalcul.tva_ok && (
                      <div className="flex items-center gap-2 text-xs text-amber-400 bg-amber-900/10 rounded-xl p-3">
                        <AlertCircle size={13} />
                        ⚠️ Ce CA dépasserait le seuil franchise TVA ({formatMontant(t?.seuil_tva)}). Vous devrez facturer la TVA.
                      </div>
                    )}
                    {simulationCalcul.plafond_ok && simulationCalcul.tva_ok && (
                      <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-900/10 rounded-xl p-3">
                        ✅ Ce CA resterait dans les limites du régime micro.
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            )}
          </motion.div>
        )}

        {/* Disclaimer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-6 bg-slate-800/50 border border-slate-700 rounded-2xl p-4 text-xs text-slate-500 leading-relaxed"
        >
          <strong className="text-slate-400">⚠️ Avertissement légal :</strong> Ces estimations sont fournies à titre indicatif, basées sur les taux légaux {annee} et vos données ElecPro. Elles ne constituent pas un conseil fiscal. Les taux URSSAF, tranches IR et seuils peuvent évoluer. Consultez votre expert-comptable ou le site urssaf.fr pour vos déclarations officielles.
        </motion.div>
      </div>
    </PageTransition>
  )
}
