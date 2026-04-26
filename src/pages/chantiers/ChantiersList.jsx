// Liste des chantiers
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Plus, Search, HardHat, MapPin, Calendar } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { formatDate } from '../../lib/utils'
import PageTransition from '../../components/layout/PageTransition'
import Badge from '../../components/ui/Badge'
import EmptyState from '../../components/ui/EmptyState'
import Button from '../../components/ui/Button'

const STATUTS = ['tous', 'preparation', 'en_cours', 'pause', 'termine']
const STATUTS_LABELS = { tous: 'Tous', preparation: 'Préparation', en_cours: 'En cours', pause: 'En pause', termine: 'Terminés' }

export default function ChantiersList() {
  const navigate = useNavigate()
  const { chantiers, clients } = useApp()
  const [search, setSearch] = useState('')
  const [filtre, setFiltre] = useState('tous')
  const [tri, setTri] = useState('recent')

  const filtered = chantiers
    .filter(c => {
      const q = search.toLowerCase()
      const client = clients.find(x => x.id === c.client_id)
      const clientNom = client ? `${client.prenom} ${client.nom} ${client.societe || ''}` : ''
      const match = [c.nom, c.adresse, c.ville, clientNom].filter(Boolean).join(' ').toLowerCase().includes(q)
      if (!match) return false
      if (filtre !== 'tous') return c.statut === filtre
      return true
    })
    .sort((a, b) => {
      if (tri === 'nom') return a.nom.localeCompare(b.nom)
      if (tri === 'date_debut') return new Date(b.date_debut || 0) - new Date(a.date_debut || 0)
      return new Date(b.created_at) - new Date(a.created_at)
    })

  return (
    <PageTransition>
      <div className="p-4 md:p-6 max-w-5xl mx-auto pb-8">
        {/* En-tête */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Chantiers</h1>
            <p className="text-slate-400 text-sm mt-1">{chantiers.length} chantier{chantiers.length > 1 ? 's' : ''}</p>
          </div>
          <Button onClick={() => navigate('/chantiers/nouveau')}>
            <Plus size={16} /> Nouveau chantier
          </Button>
        </div>

        {/* Filtres */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher nom, ville, client..."
              className="w-full bg-slate-900 border border-slate-600 rounded-xl text-white pl-9 pr-3 py-2 text-sm focus:border-amber-500 focus:outline-none placeholder-slate-500"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {STATUTS.map(s => (
              <button
                key={s}
                onClick={() => setFiltre(s)}
                className={`px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
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
            <option value="nom">Nom A→Z</option>
            <option value="date_debut">Date début</option>
          </select>
        </div>

        {search && <p className="text-slate-400 text-sm mb-4">{filtered.length} résultat{filtered.length > 1 ? 's' : ''}</p>}

        {chantiers.length === 0 ? (
          <EmptyState
            icon={HardHat}
            title="Aucun chantier"
            description="Créez votre premier chantier pour organiser vos interventions."
            action={() => navigate('/chantiers/nouveau')}
            actionLabel="Créer un chantier"
          />
        ) : filtered.length === 0 ? (
          <EmptyState icon={Search} title="Aucun résultat" description="Modifiez votre recherche." />
        ) : (
          <motion.div className="space-y-3">
            {filtered.map((chantier, i) => {
              const client = clients.find(c => c.id === chantier.client_id)
              return (
                <motion.div
                  key={chantier.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05, type: 'spring', stiffness: 300, damping: 28 }}
                  whileHover={{ y: -3, scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => navigate(`/chantiers/${chantier.id}`)}
                  className="bg-slate-800 border border-slate-700 rounded-2xl p-4 cursor-pointer hover:border-amber-500/40 hover:shadow-lg hover:shadow-amber-500/5 transition-colors group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-semibold group-hover:text-amber-400 transition-colors">{chantier.nom}</p>
                      {client && (
                        <p className="text-slate-400 text-sm mt-0.5">
                          {client.societe || `${client.prenom} ${client.nom}`}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-slate-500">
                        {(chantier.adresse || chantier.ville) && (
                          <span className="flex items-center gap-1">
                            <MapPin size={11} />
                            {chantier.adresse ? `${chantier.adresse}, ` : ''}{chantier.ville}
                          </span>
                        )}
                        {chantier.date_debut && (
                          <span className="flex items-center gap-1">
                            <Calendar size={11} />
                            Début : {formatDate(chantier.date_debut)}
                          </span>
                        )}
                        {chantier.etapes?.length > 0 && (
                          <span>
                            {chantier.etapes.filter(e => e.fait).length}/{chantier.etapes.length} étapes
                          </span>
                        )}
                      </div>
                    </div>
                    <Badge statut={chantier.statut} type="chantier" />
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
