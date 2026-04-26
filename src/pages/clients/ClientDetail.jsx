// Détail client — infos, devis, factures, chantiers liés
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowLeft, Edit, Trash2, Phone, Mail, MapPin, Building2, User,
  FileText, Receipt, HardHat, Plus,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useApp } from '../../context/AppContext'
import { formatDate, formatMontant } from '../../lib/utils'
import PageTransition from '../../components/layout/PageTransition'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'

export default function ClientDetail() {
  const navigate = useNavigate()
  const { id } = useParams()
  const { clients, deleteClient, devis, factures, chantiers } = useApp()
  const [showDelete, setShowDelete] = useState(false)

  const client = clients.find(c => c.id === id)
  if (!client) {
    return (
      <div className="p-6 text-center text-slate-400">
        Client introuvable. <button onClick={() => navigate('/clients')} className="text-amber-400 underline">Retour</button>
      </div>
    )
  }

  const clientDevis = devis.filter(d => d.client_id === id).sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  const clientFactures = factures.filter(f => f.client_id === id).sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  const clientChantiers = chantiers.filter(c => c.client_id === id).sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

  function handleDelete() {
    deleteClient(id)
    toast.success('Client supprimé')
    navigate('/clients')
  }

  return (
    <PageTransition>
      <div className="p-4 md:p-6 max-w-4xl mx-auto pb-8">
        {/* En-tête */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/clients')} className="text-slate-400 hover:text-white transition-colors">
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-xl font-bold text-white">
              {client.societe || `${client.prenom} ${client.nom}`}
            </h1>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => navigate(`/clients/${id}/modifier`)}>
              <Edit size={14} /> Modifier
            </Button>
            <Button variant="danger" size="sm" onClick={() => setShowDelete(true)}>
              <Trash2 size={14} />
            </Button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Fiche client */}
          <div className="md:col-span-1 space-y-4">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-slate-800 rounded-2xl border border-slate-700 p-5"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  client.type === 'professionnel' ? 'bg-blue-500/20' : 'bg-amber-500/20'
                }`}>
                  {client.type === 'professionnel'
                    ? <Building2 size={22} className="text-blue-400" />
                    : <User size={22} className="text-amber-400" />
                  }
                </div>
                <div>
                  <p className="text-white font-bold">{client.societe || `${client.prenom} ${client.nom}`}</p>
                  {client.societe && <p className="text-slate-400 text-sm">{client.prenom} {client.nom}</p>}
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    client.type === 'professionnel' ? 'bg-blue-600/20 text-blue-400' : 'bg-amber-500/20 text-amber-400'
                  }`}>
                    {client.type === 'professionnel' ? 'Professionnel' : 'Particulier'}
                  </span>
                </div>
              </div>

              <div className="space-y-3 text-sm">
                {client.email && (
                  <div className="flex items-center gap-2 text-slate-300">
                    <Mail size={14} className="text-slate-500" />
                    <a href={`mailto:${client.email}`} className="hover:text-amber-400 transition-colors">{client.email}</a>
                  </div>
                )}
                {client.telephone && (
                  <div className="flex items-center gap-2 text-slate-300">
                    <Phone size={14} className="text-slate-500" />
                    <a href={`tel:${client.telephone}`} className="hover:text-amber-400 transition-colors">{client.telephone}</a>
                  </div>
                )}
                {(client.adresse || client.ville) && (
                  <div className="flex items-start gap-2 text-slate-300">
                    <MapPin size={14} className="text-slate-500 mt-0.5" />
                    <span>{client.adresse && `${client.adresse}, `}{client.cp} {client.ville}</span>
                  </div>
                )}
                {client.siret && (
                  <div className="text-slate-500 text-xs">SIRET : {client.siret}</div>
                )}
              </div>

              {client.notes && (
                <div className="mt-4 pt-4 border-t border-slate-700">
                  <p className="text-slate-400 text-xs mb-1">Notes</p>
                  <p className="text-slate-300 text-sm">{client.notes}</p>
                </div>
              )}

              <p className="text-slate-600 text-xs mt-4">Client depuis le {formatDate(client.created_at)}</p>
            </motion.div>

            {/* Stats rapides */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Devis', value: clientDevis.length, color: 'text-blue-400' },
                { label: 'Factures', value: clientFactures.length, color: 'text-amber-400' },
                { label: 'Chantiers', value: clientChantiers.length, color: 'text-emerald-400' },
              ].map(s => (
                <div key={s.label} className="bg-slate-800 border border-slate-700 rounded-xl p-3 text-center">
                  <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-slate-500 text-xs">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Activité */}
          <div className="md:col-span-2 space-y-5">
            {/* Devis */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-slate-800 rounded-2xl border border-slate-700 p-5"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <FileText size={16} className="text-blue-400" />
                  <h2 className="text-white font-semibold">Devis</h2>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => navigate(`/devis/nouveau?client=${id}`)}
                >
                  <Plus size={13} /> Nouveau
                </Button>
              </div>
              {clientDevis.length === 0 ? (
                <p className="text-slate-400 text-sm">Aucun devis</p>
              ) : (
                <div className="space-y-2">
                  {clientDevis.map(d => (
                    <div
                      key={d.id}
                      onClick={() => navigate(`/devis/${d.id}`)}
                      className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-slate-700 cursor-pointer transition-colors"
                    >
                      <div>
                        <p className="text-white text-sm font-medium">{d.numero}</p>
                        <p className="text-slate-500 text-xs">{d.objet || '—'} · {formatDate(d.date_emission)}</p>
                      </div>
                      <Badge statut={d.statut} type="devis" />
                    </div>
                  ))}
                </div>
              )}
            </motion.div>

            {/* Factures */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="bg-slate-800 rounded-2xl border border-slate-700 p-5"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Receipt size={16} className="text-amber-400" />
                  <h2 className="text-white font-semibold">Factures</h2>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => navigate(`/factures/nouveau?client=${id}`)}
                >
                  <Plus size={13} /> Nouvelle
                </Button>
              </div>
              {clientFactures.length === 0 ? (
                <p className="text-slate-400 text-sm">Aucune facture</p>
              ) : (
                <div className="space-y-2">
                  {clientFactures.map(f => (
                    <div
                      key={f.id}
                      onClick={() => navigate(`/factures/${f.id}`)}
                      className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-slate-700 cursor-pointer transition-colors"
                    >
                      <div>
                        <p className="text-white text-sm font-medium">{f.numero}</p>
                        <p className="text-slate-500 text-xs">{f.objet || '—'} · {formatDate(f.date_emission)}</p>
                      </div>
                      <Badge statut={f.statut} type="facture" />
                    </div>
                  ))}
                </div>
              )}
            </motion.div>

            {/* Chantiers */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-slate-800 rounded-2xl border border-slate-700 p-5"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <HardHat size={16} className="text-emerald-400" />
                  <h2 className="text-white font-semibold">Chantiers</h2>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => navigate(`/chantiers/nouveau?client=${id}`)}
                >
                  <Plus size={13} /> Nouveau
                </Button>
              </div>
              {clientChantiers.length === 0 ? (
                <p className="text-slate-400 text-sm">Aucun chantier</p>
              ) : (
                <div className="space-y-2">
                  {clientChantiers.map(c => (
                    <div
                      key={c.id}
                      onClick={() => navigate(`/chantiers/${c.id}`)}
                      className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-slate-700 cursor-pointer transition-colors"
                    >
                      <div>
                        <p className="text-white text-sm font-medium">{c.nom}</p>
                        <p className="text-slate-500 text-xs">{c.ville || c.adresse || '—'}</p>
                      </div>
                      <Badge statut={c.statut} type="chantier" />
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </div>
        </div>

        {/* Modal suppression */}
        <Modal isOpen={showDelete} onClose={() => setShowDelete(false)} title="Supprimer ce client">
          <p className="text-slate-300 mb-6">
            Êtes-vous sûr de vouloir supprimer <strong>{client.societe || `${client.prenom} ${client.nom}`}</strong> ?
            Cette action est irréversible.
          </p>
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setShowDelete(false)}>Annuler</Button>
            <Button variant="danger" className="flex-1" onClick={handleDelete}>Supprimer</Button>
          </div>
        </Modal>
      </div>
    </PageTransition>
  )
}
