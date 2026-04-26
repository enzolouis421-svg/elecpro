// Liste des clients — recherche, filtres, tri, compteur
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Plus, Search, Users, Building2, User } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { formatDate } from '../../lib/utils'
import PageTransition from '../../components/layout/PageTransition'
import EmptyState from '../../components/ui/EmptyState'
import Button from '../../components/ui/Button'

export default function ClientsList() {
  const navigate = useNavigate()
  const { clients, devis, factures } = useApp()
  const [search, setSearch] = useState('')
  const [filtre, setFiltre] = useState('tous')
  const [tri, setTri] = useState('recent')

  const filtered = clients
    .filter(c => {
      const q = search.toLowerCase()
      const match = [c.nom, c.prenom, c.societe, c.email, c.ville, c.telephone]
        .filter(Boolean).join(' ').toLowerCase().includes(q)
      if (!match) return false
      if (filtre === 'particulier') return c.type === 'particulier'
      if (filtre === 'professionnel') return c.type === 'professionnel'
      return true
    })
    .sort((a, b) => {
      if (tri === 'nom') return `${a.nom} ${a.prenom}`.localeCompare(`${b.nom} ${b.prenom}`)
      if (tri === 'ville') return (a.ville || '').localeCompare(b.ville || '')
      return new Date(b.created_at) - new Date(a.created_at)
    })

  function getStats(client) {
    const nbDevis = devis.filter(d => d.client_id === client.id).length
    const nbFactures = factures.filter(f => f.client_id === client.id).length
    return { nbDevis, nbFactures }
  }

  return (
    <PageTransition>
      <div className="p-4 md:p-6 max-w-5xl mx-auto pb-8">
        {/* En-tête */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Clients</h1>
            <p className="text-slate-400 text-sm mt-1">{clients.length} client{clients.length > 1 ? 's' : ''}</p>
          </div>
          <Button onClick={() => navigate('/clients/nouveau')}>
            <Plus size={16} /> Nouveau client
          </Button>
        </div>

        {/* Barre recherche + filtres */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher nom, email, ville..."
              className="w-full bg-slate-900 border border-slate-600 rounded-xl text-white pl-9 pr-3 py-2 text-sm focus:border-amber-500 focus:outline-none placeholder-slate-500"
            />
          </div>
          <div className="flex gap-2">
            {[
              { id: 'tous', label: 'Tous' },
              { id: 'particulier', label: 'Particuliers' },
              { id: 'professionnel', label: 'Pro' },
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setFiltre(f.id)}
                className={`px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                  filtre === f.id ? 'bg-amber-500 text-black' : 'bg-slate-700 text-slate-300 hover:text-white'
                }`}
              >
                {f.label}
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
            <option value="ville">Ville</option>
          </select>
        </div>

        {/* Compteur */}
        {search && (
          <p className="text-slate-400 text-sm mb-4">{filtered.length} résultat{filtered.length > 1 ? 's' : ''}</p>
        )}

        {/* Liste */}
        {clients.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Aucun client"
            description="Ajoutez votre premier client pour commencer à créer des devis et factures."
            action={() => navigate('/clients/nouveau')}
            actionLabel="Ajouter un client"
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Search}
            title="Aucun résultat"
            description="Modifiez votre recherche ou vos filtres."
          />
        ) : (
          <motion.div className="space-y-3">
            {filtered.map((client, i) => {
              const { nbDevis, nbFactures } = getStats(client)
              return (
                <motion.div
                  key={client.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05, type: 'spring', stiffness: 300, damping: 28 }}
                  whileHover={{ y: -3, scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => navigate(`/clients/${client.id}`)}
                  className="bg-slate-800 border border-slate-700 rounded-2xl p-4 cursor-pointer hover:border-amber-500/40 hover:shadow-lg hover:shadow-amber-500/5 transition-colors group"
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      client.type === 'professionnel' ? 'bg-blue-500/20' : 'bg-amber-500/20'
                    }`}>
                      {client.type === 'professionnel'
                        ? <Building2 size={18} className="text-blue-400" />
                        : <User size={18} className="text-amber-400" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-white font-semibold group-hover:text-amber-400 transition-colors">
                            {client.societe || `${client.prenom} ${client.nom}`}
                          </p>
                          {client.societe && (
                            <p className="text-slate-400 text-sm">{client.prenom} {client.nom}</p>
                          )}
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${
                          client.type === 'professionnel' ? 'bg-blue-600/20 text-blue-400' : 'bg-amber-500/20 text-amber-400'
                        }`}>
                          {client.type === 'professionnel' ? 'Pro' : 'Particulier'}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-slate-400">
                        {client.email && <span>{client.email}</span>}
                        {client.telephone && <span>{client.telephone}</span>}
                        {client.ville && <span>{client.cp} {client.ville}</span>}
                      </div>
                      <div className="flex gap-3 mt-2 text-xs text-slate-500">
                        <span>{nbDevis} devis</span>
                        <span>{nbFactures} factures</span>
                        <span>Depuis le {formatDate(client.created_at)}</span>
                      </div>
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
