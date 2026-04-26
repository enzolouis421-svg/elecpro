// Tableau de bord — KPIs, graphique CA, activités récentes, conseils IA
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import { TrendingUp, Clock, AlertCircle, Target, RefreshCw, Zap } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { formatMontant, formatDate, STATUTS_DEVIS, STATUTS_FACTURE } from '../lib/utils'
import { callGroq, promptConseilsDashboard } from '../lib/groq'
import KPICard from '../components/ui/KPICard'
import PageTransition from '../components/layout/PageTransition'
import { format, subMonths, startOfMonth, endOfMonth, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'

// Tooltip personnalisé pour recharts
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 shadow-xl">
      <p className="text-slate-400 text-xs mb-1">{label}</p>
      <p className="text-amber-400 font-bold text-sm">{formatMontant(payload[0]?.value || 0)}</p>
    </div>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { clients, chantiers, devis, factures, settings, getKpis } = useApp()
  const [periode, setPeriode] = useState('6')
  const [conseils, setConseils] = useState([])
  const [loadingConseils, setLoadingConseils] = useState(false)

  const kpis = getKpis()

  // Données graphique CA
  function getCAData() {
    const n = parseInt(periode)
    const data = []
    for (let i = n - 1; i >= 0; i--) {
      const mois = subMonths(new Date(), i)
      const debut = startOfMonth(mois)
      const fin = endOfMonth(mois)
      const label = format(mois, 'MMM', { locale: fr })
      const ca = factures
        .filter(f => {
          if (f.statut !== 'payee' || !f.paiement?.date) return false
          const d = parseISO(f.paiement.date)
          return d >= debut && d <= fin
        })
        .reduce((sum, f) => {
          let ht = 0
          for (const l of f.lignes || []) {
            if (l.type !== 'titre' && l.type !== 'commentaire') {
              ht += (parseFloat(l.quantite) || 0) * (parseFloat(l.prix_ht) || 0)
            }
          }
          return sum + ht
        }, 0)
      data.push({ mois: label, ca })
    }
    return data
  }

  // Activités récentes
  function getActivites() {
    const items = []
    devis.slice(0, 5).forEach(d => {
      const c = clients.find(x => x.id === d.client_id)
      items.push({
        id: d.id,
        type: 'devis',
        label: `Devis ${d.numero}`,
        sous: c ? `${c.prenom} ${c.nom}` : '—',
        statut: d.statut,
        date: d.created_at,
        path: `/devis/${d.id}`,
      })
    })
    factures.slice(0, 5).forEach(f => {
      const c = clients.find(x => x.id === f.client_id)
      items.push({
        id: f.id,
        type: 'facture',
        label: `Facture ${f.numero}`,
        sous: c ? `${c.prenom} ${c.nom}` : '—',
        statut: f.statut,
        date: f.created_at,
        path: `/factures/${f.id}`,
      })
    })
    return items
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 10)
  }

  // Conseils IA
  async function chargerConseils() {
    const apiKey = settings?.ia?.groq_key
    if (!apiKey) return
    setLoadingConseils(true)
    try {
      const prompt = promptConseilsDashboard({
        ca_mois: Math.round(kpis.ca_mois),
        devis_attente: kpis.devis_attente,
        montant_attente: Math.round(kpis.montant_attente),
        impayes: Math.round(kpis.impayes),
        taux_conversion: kpis.taux_conversion,
      })
      const reply = await callGroq(
        [{ role: 'user', content: prompt }],
        apiKey,
        settings.ia.modele,
      )
      // Parser les bullet points
      const lines = reply.split('\n').filter(l => l.trim().match(/^[•\-\*]|^\d+[.)]/))
      setConseils(lines.length > 0 ? lines : [reply])
    } catch {
      setConseils(['Impossible de charger les conseils IA. Vérifiez votre clé API dans Paramètres.'])
    } finally {
      setLoadingConseils(false)
    }
  }

  useEffect(() => {
    if (settings?.ia?.groq_key && settings?.ia?.suggestions_auto) {
      chargerConseils()
    }
  }, [settings?.ia?.groq_key]) // eslint-disable-line react-hooks/exhaustive-deps

  const caData = getCAData()
  const activites = getActivites()

  const containerVariants = {
    hidden: {},
    show: { transition: { staggerChildren: 0.05 } },
  }
  const itemVariants = {
    hidden: { opacity: 0, y: 16 },
    show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  }

  return (
    <PageTransition>
      <div className="p-4 md:p-6 max-w-7xl mx-auto pb-8">
        {/* Titre */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">Tableau de bord</h1>
          <p className="text-slate-400 text-sm mt-1">
            {new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        {/* KPI Cards */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6"
        >
          <motion.div variants={itemVariants}>
            <KPICard
              title="CA du mois"
              value={kpis.ca_mois}
              icon={TrendingUp}
              color="amber"
              subtitle="Factures payées ce mois"
            />
          </motion.div>
          <motion.div variants={itemVariants}>
            <KPICard
              title="En attente"
              value={kpis.montant_attente}
              icon={Clock}
              color="blue"
              subtitle={`${kpis.devis_attente} devis envoyé${kpis.devis_attente > 1 ? 's' : ''}`}
            />
          </motion.div>
          <motion.div variants={itemVariants}>
            <KPICard
              title="Impayés"
              value={kpis.impayes}
              icon={AlertCircle}
              color="red"
              subtitle={`${kpis.factures_retard} facture${kpis.factures_retard > 1 ? 's' : ''} en retard`}
              pulse={kpis.impayes > 0}
            />
          </motion.div>
          <motion.div variants={itemVariants}>
            <KPICard
              title="Taux de conversion"
              value={kpis.taux_conversion}
              icon={Target}
              color="green"
              format="percent"
              subtitle="Devis acceptés / envoyés"
            />
          </motion.div>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Graphique CA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-2 bg-slate-800 rounded-2xl border border-slate-700 p-5"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white font-semibold">Chiffre d'affaires</h2>
              <div className="flex gap-1">
                {['1', '6', '12'].map(p => (
                  <button
                    key={p}
                    onClick={() => setPeriode(p)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                      periode === p ? 'bg-amber-500 text-black' : 'bg-slate-700 text-slate-400 hover:text-white'
                    }`}
                  >
                    {p} mois
                  </button>
                ))}
              </div>
            </div>
            {caData.every(d => d.ca === 0) ? (
              <div className="flex items-center justify-center h-48 text-slate-500 text-sm">
                Aucune facture payée sur cette période
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={caData} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                  <XAxis dataKey="mois" tick={{ fill: '#94A3B8', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#94A3B8', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => v >= 1000 ? `${v / 1000}k€` : `${v}€`} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(245,158,11,0.08)' }} />
                  <Bar dataKey="ca" fill="#F59E0B" radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </motion.div>

          {/* Conseils IA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="bg-slate-800 rounded-2xl border border-slate-700 p-5"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-amber-500/20 rounded-lg flex items-center justify-center">
                  <Zap size={13} className="text-amber-400" />
                </div>
                <h2 className="text-white font-semibold text-sm">Conseils IA</h2>
              </div>
              <button
                onClick={chargerConseils}
                disabled={loadingConseils}
                className="text-slate-500 hover:text-slate-300 transition-colors"
              >
                <RefreshCw size={14} className={loadingConseils ? 'animate-spin' : ''} />
              </button>
            </div>

            {!settings?.ia?.groq_key ? (
              <div className="text-center py-6">
                <p className="text-slate-400 text-sm">Configurez votre clé Groq dans</p>
                <button
                  onClick={() => navigate('/parametres')}
                  className="text-amber-400 text-sm hover:text-amber-300 mt-1 underline"
                >
                  Paramètres → IA
                </button>
              </div>
            ) : loadingConseils ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="space-y-1.5">
                    <div className="h-2.5 bg-slate-700 rounded animate-pulse w-full" />
                    <div className="h-2.5 bg-slate-700 rounded animate-pulse w-3/4" />
                  </div>
                ))}
              </div>
            ) : conseils.length > 0 ? (
              <ul className="space-y-3">
                {conseils.map((c, i) => (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="flex gap-2 text-slate-300 text-sm leading-snug"
                  >
                    <span className="text-amber-500 mt-0.5 flex-shrink-0">•</span>
                    <span>{c.replace(/^[•\-\*]\s*/, '').replace(/^\d+[.)]\s*/, '')}</span>
                  </motion.li>
                ))}
              </ul>
            ) : (
              <button
                onClick={chargerConseils}
                className="w-full py-8 text-slate-400 text-sm hover:text-slate-300 transition-colors"
              >
                Cliquez pour obtenir des conseils
              </button>
            )}
          </motion.div>
        </div>

        {/* Activités récentes */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-6 bg-slate-800 rounded-2xl border border-slate-700 p-5"
        >
          <h2 className="text-white font-semibold mb-4">Activités récentes</h2>
          {activites.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-8">Aucune activité pour l'instant</p>
          ) : (
            <div className="space-y-2">
              {activites.map((a, i) => {
                const statutInfo = a.type === 'facture'
                  ? STATUTS_FACTURE[a.statut]
                  : STATUTS_DEVIS[a.statut]
                return (
                  <motion.div
                    key={a.id}
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04, type: 'spring', stiffness: 300, damping: 28 }}
                    whileHover={{ x: 4 }}
                    onClick={() => navigate(a.path)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-700/80 cursor-pointer transition-colors"
                  >
                    <div className={`w-2 h-2 rounded-full flex-shrink-0`} style={{ background: statutInfo?.color || '#475569' }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">{a.label}</p>
                      <p className="text-slate-400 text-xs truncate">{a.sous}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full text-white`} style={{ background: statutInfo?.color || '#475569' }}>
                        {statutInfo?.label || a.statut}
                      </span>
                      <p className="text-slate-500 text-xs mt-0.5">{formatDate(a.date)}</p>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}
        </motion.div>

        {/* Résumé rapide */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="grid grid-cols-3 gap-4 mt-6"
        >
          {[
            { label: 'Clients', value: clients.length, path: '/clients', color: 'text-blue-400', shadow: 'hover:shadow-blue-500/10' },
            { label: 'Chantiers actifs', value: chantiers.filter(c => c.statut === 'en_cours').length, path: '/chantiers', color: 'text-amber-400', shadow: 'hover:shadow-amber-500/10' },
            { label: 'Devis ce mois', value: devis.filter(d => new Date(d.created_at) >= startOfMonth(new Date())).length, path: '/devis', color: 'text-emerald-400', shadow: 'hover:shadow-emerald-500/10' },
          ].map((item, i) => (
            <motion.button
              key={item.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 + i * 0.06, type: 'spring', stiffness: 300, damping: 28 }}
              whileHover={{ y: -4, scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate(item.path)}
              className={`bg-slate-800 border border-slate-700 rounded-2xl p-4 text-center hover:border-slate-600 hover:shadow-lg ${item.shadow} transition-colors`}
            >
              <p className={`text-2xl font-bold ${item.color}`}>{item.value}</p>
              <p className="text-slate-400 text-xs mt-1">{item.label}</p>
            </motion.button>
          ))}
        </motion.div>
      </div>
    </PageTransition>
  )
}
