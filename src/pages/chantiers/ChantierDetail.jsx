// Détail chantier — étapes, notes, photos
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowLeft, Edit, Trash2, Plus, CheckCircle2, Circle,
  StickyNote, Camera, MapPin, Calendar,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useApp } from '../../context/AppContext'
import { formatDate, today } from '../../lib/utils'
import { genId } from '../../lib/storage'
import PageTransition from '../../components/layout/PageTransition'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'

export default function ChantierDetail() {
  const navigate = useNavigate()
  const { id } = useParams()
  const { chantiers, clients, updateChantier, deleteChantier } = useApp()
  const [showDelete, setShowDelete] = useState(false)
  const [nouvelleEtape, setNouvelleEtape] = useState('')
  const [nouvelleNote, setNouvelleNote] = useState('')
  const [onglet, setOnglet] = useState('etapes')

  const chantier = chantiers.find(c => c.id === id)
  if (!chantier) {
    return (
      <div className="p-6 text-center text-slate-400">
        Chantier introuvable. <button onClick={() => navigate('/chantiers')} className="text-amber-400 underline">Retour</button>
      </div>
    )
  }

  const client = clients.find(c => c.id === chantier.client_id)

  // ── ÉTAPES ──────────────────────────────────────────────
  function ajouterEtape() {
    if (!nouvelleEtape.trim()) return
    const etapes = [...(chantier.etapes || []), {
      id: genId(), titre: nouvelleEtape.trim(), fait: false, date: null, commentaire: '',
    }]
    updateChantier(id, { etapes })
    setNouvelleEtape('')
    toast.success('Étape ajoutée')
  }

  function toggleEtape(etapeId) {
    const etapes = chantier.etapes.map(e =>
      e.id === etapeId ? { ...e, fait: !e.fait, date: !e.fait ? today() : null } : e
    )
    updateChantier(id, { etapes })
  }

  function supprimerEtape(etapeId) {
    const etapes = chantier.etapes.filter(e => e.id !== etapeId)
    updateChantier(id, { etapes })
  }

  // ── NOTES ───────────────────────────────────────────────
  function ajouterNote() {
    if (!nouvelleNote.trim()) return
    const notes = [...(chantier.notes || []), {
      id: genId(), texte: nouvelleNote.trim(), date: new Date().toISOString(),
    }]
    updateChantier(id, { notes })
    setNouvelleNote('')
    toast.success('Note ajoutée')
  }

  function supprimerNote(noteId) {
    const notes = chantier.notes.filter(n => n.id !== noteId)
    updateChantier(id, { notes })
  }

  // ── PHOTOS ──────────────────────────────────────────────
  function ajouterPhoto(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const photos = [...(chantier.photos || []), {
        id: genId(), base64: ev.target.result, date: new Date().toISOString(), legende: file.name,
      }]
      updateChantier(id, { photos })
      toast.success('Photo ajoutée')
    }
    reader.readAsDataURL(file)
  }

  function supprimerPhoto(photoId) {
    const photos = chantier.photos.filter(p => p.id !== photoId)
    updateChantier(id, { photos })
  }

  function handleDelete() {
    deleteChantier(id)
    toast.success('Chantier supprimé')
    navigate('/chantiers')
  }

  const progressEtapes = chantier.etapes?.length > 0
    ? Math.round((chantier.etapes.filter(e => e.fait).length / chantier.etapes.length) * 100)
    : 0

  return (
    <PageTransition>
      <div className="p-4 md:p-6 max-w-4xl mx-auto pb-24 md:pb-6">
        {/* En-tête */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/chantiers')} className="text-slate-400 hover:text-white transition-colors">
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-xl font-bold text-white">{chantier.nom}</h1>
              {client && <p className="text-slate-400 text-sm">{client.societe || `${client.prenom} ${client.nom}`}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge statut={chantier.statut} type="chantier" />
            <Button variant="secondary" size="sm" onClick={() => navigate(`/chantiers/${id}/modifier`)}>
              <Edit size={14} />
            </Button>
            <Button variant="danger" size="sm" onClick={() => setShowDelete(true)}>
              <Trash2 size={14} />
            </Button>
          </div>
        </div>

        {/* Infos */}
        <div className="bg-slate-800 rounded-2xl border border-slate-700 p-5 mb-6">
          <div className="grid sm:grid-cols-2 gap-4 text-sm">
            {(chantier.adresse || chantier.ville) && (
              <div className="flex items-start gap-2 text-slate-300">
                <MapPin size={14} className="text-slate-500 mt-0.5" />
                <span>{chantier.adresse && `${chantier.adresse}, `}{chantier.cp} {chantier.ville}</span>
              </div>
            )}
            {chantier.date_debut && (
              <div className="flex items-center gap-2 text-slate-300">
                <Calendar size={14} className="text-slate-500" />
                <span>Début : {formatDate(chantier.date_debut)}</span>
                {chantier.date_fin_prevue && <span className="text-slate-500">— Fin prévue : {formatDate(chantier.date_fin_prevue)}</span>}
              </div>
            )}
          </div>
          {chantier.description && (
            <p className="text-slate-300 text-sm mt-3">{chantier.description}</p>
          )}
          {/* Barre de progression */}
          {chantier.etapes?.length > 0 && (
            <div className="mt-4">
              <div className="flex justify-between text-xs text-slate-400 mb-1">
                <span>Avancement</span>
                <span>{progressEtapes}%</span>
              </div>
              <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progressEtapes}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  className="h-full bg-amber-500 rounded-full"
                />
              </div>
            </div>
          )}
        </div>

        {/* Onglets */}
        <div className="flex gap-1 bg-slate-800/50 rounded-xl p-1 mb-5">
          {[
            { id: 'etapes', label: 'Étapes', count: chantier.etapes?.length },
            { id: 'notes', label: 'Notes', count: chantier.notes?.length },
            { id: 'photos', label: 'Photos', count: chantier.photos?.length },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setOnglet(tab.id)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${
                onglet === tab.id ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className="bg-slate-600 text-xs rounded-full px-1.5">{tab.count}</span>
              )}
            </button>
          ))}
        </div>

        {/* Étapes */}
        {onglet === 'etapes' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
            {chantier.etapes?.map(etape => (
              <div key={etape.id} className="flex items-center gap-3 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3">
                <button onClick={() => toggleEtape(etape.id)} className="flex-shrink-0">
                  {etape.fait
                    ? <CheckCircle2 size={20} className="text-emerald-400" />
                    : <Circle size={20} className="text-slate-500 hover:text-slate-300" />
                  }
                </button>
                <span className={`flex-1 text-sm ${etape.fait ? 'line-through text-slate-500' : 'text-white'}`}>
                  {etape.titre}
                </span>
                {etape.date && <span className="text-xs text-slate-500">{formatDate(etape.date)}</span>}
                <button onClick={() => supprimerEtape(etape.id)} className="text-slate-600 hover:text-red-400 transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            <div className="flex gap-2 mt-3">
              <input
                value={nouvelleEtape}
                onChange={e => setNouvelleEtape(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && ajouterEtape()}
                placeholder="Nouvelle étape..."
                className="flex-1 bg-slate-900 border border-slate-600 rounded-xl text-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none placeholder-slate-500"
              />
              <Button onClick={ajouterEtape} size="sm"><Plus size={15} /> Ajouter</Button>
            </div>
          </motion.div>
        )}

        {/* Notes */}
        {onglet === 'notes' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
            {chantier.notes?.map(note => (
              <div key={note.id} className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 flex items-start gap-3">
                <StickyNote size={15} className="text-amber-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-white text-sm">{note.texte}</p>
                  <p className="text-slate-500 text-xs mt-1">{formatDate(note.date)}</p>
                </div>
                <button onClick={() => supprimerNote(note.id)} className="text-slate-600 hover:text-red-400 transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            <div className="flex gap-2">
              <input
                value={nouvelleNote}
                onChange={e => setNouvelleNote(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && ajouterNote()}
                placeholder="Ajouter une note..."
                className="flex-1 bg-slate-900 border border-slate-600 rounded-xl text-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none placeholder-slate-500"
              />
              <Button onClick={ajouterNote} size="sm"><Plus size={15} /> Ajouter</Button>
            </div>
          </motion.div>
        )}

        {/* Photos */}
        {onglet === 'photos' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
              {chantier.photos?.map(photo => (
                <div key={photo.id} className="relative group rounded-xl overflow-hidden bg-slate-700 aspect-square">
                  <img src={photo.base64} alt={photo.legende} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                    <p className="text-white text-xs truncate flex-1">{photo.legende}</p>
                    <button onClick={() => supprimerPhoto(photo.id)} className="text-red-400 ml-1">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
              <label className="border-2 border-dashed border-slate-600 hover:border-amber-500 rounded-xl aspect-square flex flex-col items-center justify-center cursor-pointer transition-colors">
                <Camera size={24} className="text-slate-500 mb-2" />
                <span className="text-slate-400 text-xs">Ajouter photo</span>
                <input type="file" accept="image/*" onChange={ajouterPhoto} className="hidden" />
              </label>
            </div>
          </motion.div>
        )}

        {/* Modal suppression */}
        <Modal isOpen={showDelete} onClose={() => setShowDelete(false)} title="Supprimer ce chantier">
          <p className="text-slate-300 mb-6">Êtes-vous sûr de vouloir supprimer <strong>{chantier.nom}</strong> ? Cette action est irréversible.</p>
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setShowDelete(false)}>Annuler</Button>
            <Button variant="danger" className="flex-1" onClick={handleDelete}>Supprimer</Button>
          </div>
        </Modal>
      </div>
    </PageTransition>
  )
}
