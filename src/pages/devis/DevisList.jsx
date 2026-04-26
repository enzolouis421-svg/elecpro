// Liste des devis
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Plus, Search, FileText } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { formatDate, formatMontant, calculerTotaux } from '../../lib/utils'
import PageTransition from '../../components/layout/PageTransition'
import Badge from '../../components/ui/Badge'
import EmptyState from '../../components/ui/EmptyState'
import Button from '../../components/ui/Button'

const STATUTS_DEVIS = ['tous', 'brouillon', 'envoye', 'accepte', 'refuse', 'expire']
const STATUTS_LABELS = { tous: 'Tous', brouillon: 'Brouillon', envoye: 'Envoyés', accepte: 'Acceptés', refuse: 'Refusés', expire: 'Expirés' }

export default function DevisList() {
  const navigate = useNavigate()
  const { devis, clients } = useApp()
  const [search, setSearch] = useState('')
  const [filtre, setFiltre] = useState('tous')
  const [tri, setTri] = useState('recent')

  const filtered = devis
    .filter(d => {
      const client = clients.find(c => c.id === d.client_id)
      const nom = client ? `${client.prenom} ${client.nom} ${client.societe || ''}` : ''
      const q = search.toLowerCase()
      const match = [d.numero, d.objet, nom].filter(Boolean).join(' ').toLowerCase().includes(q)
      if (!match) return false
      if (filtre !== 'tous') return d.statut === filtre
      return true
    })
    .sort((a, b) => {
      if (tri === 'numero') return b.numero.localeCompare(a.numero)
      if (tri === 'montant') {
        const ma = calculerTotaux(a.lignes, a.remise_type, a.remise_valeur).total_ttc
        const mb = calculerTotaux(b.lignes, b.remise_type, b.remise_valeur).total_ttc
        return mb - ma
      }
      return new Date(b.created_at) - new Date(a.created_at)
    })

  return (
    <PageTransition>
      <div className="p-4 md:p-6 max-w-5xl mx-auto pb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Devis</h1>
            <p className="text-slate-400 text-sm mt-1">{devis.length} devis</p>
          </div>
          <Button onClick={() => navigate('/devis/nouveau')}>
            <Plus size={16} /> Nouveau devis
          </Button>
        </div>

        {/* Filtres */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher numéro, client, objet..."
              className="w-full bg-slate-900 border border-slate-600 rounded-xl text-white pl-9 pr-3 py-2 text-sm focus:border-amber-500 focus:outline-none placeholder-slate-500"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {STATUTS_DEVIS.map(s => (
              <button
                key={s}
                onClick={() => setFiltre(s)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                  filtre === s ? 'bg-amber-500 text-black' : 'bg-slate-700 text-slate-300 hover:text-white'
                }`}
              >
                {STATUTS_LABELS[s]}
              </button>
            ))}
          </div>
          <select
            value={tri}
            onChange={e => setTri(e.target.value)}
            className="bg-slate-900 border border-slate-600 rounded-xl text-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none"
          >
            <option value="recent">Plus récents</option>
            <option value="numero">N° desc</option>
            <option value="montant">Montant</option>
          </select>
        </div>

        {search && <p className="text-slate-400 text-sm mb-4">{filtered.length} résultat{filtered.length > 1 ? 's' : ''}</p>}

        {devis.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="Aucun devis"
            description="Créez votre premier devis pour commencer à travailler."
            action={() => navigate('/devis/nouveau')}
            actionLabel="Créer un devis"
          />
        ) : filtered.length === 0 ? (
          <EmptyState icon={Search} title="Aucun résultat" description="Modifiez votre recherche." />
        ) : (
          <motion.div className="space-y-3">
            {filtered.map((d, i) => {
              const client = clients.find(c => c.id === d.client_id)
              const totaux = calculerTotaux(d.lignes, d.remise_type, d.remise_valeur)
              return (
                <motion.div
                  key={d.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05, type: 'spring', stiffness: 300, damping: 28 }}
                  whileHover={{ y: -3, scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => navigate(`/devis/${d.id}`)}
                  className="bg-slate-800 border border-slate-700 rounded-2xl p-4 cursor-pointer hover:border-amber-500/40 hover:shadow-lg hover:shadow-amber-500/5 transition-colors group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-white font-semibold group-hover:text-amber-400 transition-colors">{d.numero}</p>
                        <Badge statut={d.statut} type="devis" />
                      </div>
                      <p className="text-slate-300 text-sm mt-0.5">{d.objet || 'Sans objet'}</p>
                      <div className="flex gap-4 mt-2 text-xs text-slate-500">
                        <span>{client ? (client.societe || `${client.prenom} ${client.nom}`) : '—'}</span>
                        <span>Émis le {formatDate(d.date_emission)}</span>
                        {d.date_validite && <span>Valide jusqu'au {formatDate(d.date_validite)}</span>}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-white font-bold">{formatMontant(totaux.total_ttc)}</p>
                      <p className="text-slate-500 text-xs">TTC</p>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </motion.div>
        )}
      </div>
    </PageTransition>
  )
}
