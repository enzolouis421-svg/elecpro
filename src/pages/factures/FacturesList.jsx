// Liste des factures
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Plus, Search, Receipt, AlertCircle } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { formatDate, formatMontant, calculerTotaux, joursDepuis } from '../../lib/utils'
import PageTransition from '../../components/layout/PageTransition'
import Badge from '../../components/ui/Badge'
import EmptyState from '../../components/ui/EmptyState'
import Button from '../../components/ui/Button'

const STATUTS_F = ['tous', 'brouillon', 'envoyee', 'payee', 'en_retard']
const STATUTS_LABELS = { tous: 'Toutes', brouillon: 'Brouillon', envoyee: 'Envoyées', payee: 'Payées', en_retard: 'En retard' }

export default function FacturesList() {
  const navigate = useNavigate()
  const { factures, clients } = useApp()
  const [search, setSearch] = useState('')
  const [filtre, setFiltre] = useState('tous')
  const [tri, setTri] = useState('recent')

  const filtered = factures
    .filter(f => {
      const client = clients.find(c => c.id === f.client_id)
      const nom = client ? `${client.prenom} ${client.nom} ${client.societe || ''}` : ''
      const q = search.toLowerCase()
      const match = [f.numero, f.objet, nom].filter(Boolean).join(' ').toLowerCase().includes(q)
      if (!match) return false
      if (filtre !== 'tous') return f.statut === filtre
      return true
    })
    .sort((a, b) => {
      if (tri === 'numero') return b.numero.localeCompare(a.numero)
      if (tri === 'montant') {
        const ma = calculerTotaux(a.lignes).total_ttc
        const mb = calculerTotaux(b.lignes).total_ttc
        return mb - ma
      }
      if (tri === 'echeance') return new Date(a.date_echeance || 0) - new Date(b.date_echeance || 0)
      return new Date(b.created_at) - new Date(a.created_at)
    })

  const nbRetard = factures.filter(f => f.statut === 'en_retard').length

  return (
    <PageTransition>
      <div className="p-4 md:p-6 max-w-5xl mx-auto pb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Factures</h1>
            <p className="text-slate-400 text-sm mt-1">
              {factures.length} facture{factures.length > 1 ? 's' : ''}
              {nbRetard > 0 && (
                <span className="ml-2 text-red-400 font-medium">
                  · {nbRetard} en retard
                </span>
              )}
            </p>
          </div>
          <Button onClick={() => navigate('/factures/nouveau')}>
            <Plus size={16} /> Nouvelle facture
          </Button>
        </div>

        {/* Alerte impayés */}
        {nbRetard > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-900/20 border border-red-800 rounded-2xl p-4 mb-5 flex items-center gap-3"
          >
            <AlertCircle size={18} className="text-red-400 flex-shrink-0" />
            <div>
              <p className="text-red-300 font-medium text-sm">
                {nbRetard} facture{nbRetard > 1 ? 's' : ''} en retard de paiement
              </p>
              <p className="text-red-400 text-xs mt-0.5">Cliquez sur une facture pour envoyer une relance</p>
            </div>
          </motion.div>
        )}

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
            {STATUTS_F.map(s => (
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
            <option value="recent">Plus récentes</option>
            <option value="numero">N° desc</option>
            <option value="montant">Montant</option>
            <option value="echeance">Échéance</option>
          </select>
        </div>

        {search && <p className="text-slate-400 text-sm mb-4">{filtered.length} résultat{filtered.length > 1 ? 's' : ''}</p>}

        {factures.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="Aucune facture"
            description="Créez une facture ou convertissez un devis accepté."
            action={() => navigate('/factures/nouveau')}
            actionLabel="Créer une facture"
          />
        ) : filtered.length === 0 ? (
          <EmptyState icon={Search} title="Aucun résultat" description="Modifiez votre recherche." />
        ) : (
          <motion.div className="space-y-3">
            {filtered.map((f, i) => {
              const client = clients.find(c => c.id === f.client_id)
              const totaux = calculerTotaux(f.lignes, f.remise_type, f.remise_valeur)
              const jours = f.statut === 'en_retard' && f.date_echeance ? joursDepuis(f.date_echeance) : 0
              return (
                <motion.div
                  key={f.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05, type: 'spring', stiffness: 300, damping: 28 }}
                  whileHover={{ y: -3, scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => navigate(`/factures/${f.id}`)}
                  className={`bg-slate-800 border rounded-2xl p-4 cursor-pointer transition-colors group ${
                    f.statut === 'en_retard'
                      ? 'border-red-800/50 hover:border-red-500/50 hover:shadow-lg hover:shadow-red-500/5'
                      : 'border-slate-700 hover:border-amber-500/40 hover:shadow-lg hover:shadow-amber-500/5'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-white font-semibold group-hover:text-amber-400 transition-colors">{f.numero}</p>
                        <Badge statut={f.statut} type="facture" />
                        {jours > 0 && (
                          <span className="text-xs text-red-400 font-medium">{jours} j de retard</span>
                        )}
                      </div>
                      <p className="text-slate-300 text-sm mt-0.5">{f.objet || 'Sans objet'}</p>
                      <div className="flex gap-4 mt-2 text-xs text-slate-500 flex-wrap">
                        <span>{client ? (client.societe || `${client.prenom} ${client.nom}`) : '—'}</span>
                        <span>Émise le {formatDate(f.date_emission)}</span>
                        <span>Échéance {formatDate(f.date_echeance)}</span>
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
