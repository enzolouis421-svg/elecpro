// Détail chantier — étapes, notes, photos, coûts (devis + dépenses)
import { useState, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowLeft, Edit, Trash2, Plus, CheckCircle2, Circle,
  StickyNote, Camera, MapPin, Calendar, Euro, Receipt, ExternalLink, ImagePlus,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useApp } from '../../context/AppContext'
import { formatDate, today, formatMontant, calculerTotaux } from '../../lib/utils'
import { genId } from '../../lib/storage'
import PageTransition from '../../components/layout/PageTransition'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'

const CATEGORIES_DEPENSE = [
  { id: 'essence', label: 'Essence' },
  { id: 'peage', label: 'Péage' },
  { id: 'parking', label: 'Parking' },
  { id: 'fournitures', label: 'Fournitures' },
  { id: 'location', label: 'Location matériel' },
  { id: 'autre', label: 'Autre' },
]

function labelCategorie(id) {
  return CATEGORIES_DEPENSE.find(c => c.id === id)?.label || id
}

export default function ChantierDetail() {
  const navigate = useNavigate()
  const { id } = useParams()
  const { chantiers, clients, devis, updateChantier, deleteChantier } = useApp()
  const [showDelete, setShowDelete] = useState(false)
  const [nouvelleEtape, setNouvelleEtape] = useState('')
  const [nouvelleNote, setNouvelleNote] = useState('')
  const [onglet, setOnglet] = useState('etapes')
  const [formDepense, setFormDepense] = useState({
    libelle: '',
    montant: '',
    categorie: 'essence',
    date: today(),
    photos: [],
  })
  const [dragCout, setDragCout] = useState(false)

  const chantier = chantiers.find(c => c.id === id)

  const devisDuChantier = useMemo(() => {
    if (!chantier) return []
    return devis.filter(d => d.chantier_id === chantier.id).sort((a, b) =>
      new Date(b.created_at || b.date_emission || 0) - new Date(a.created_at || a.date_emission || 0)
    )
  }, [devis, chantier])

  const totalPrevuDevisTTC = useMemo(() => {
    let sum = 0
    for (const d of devisDuChantier) {
      const t = calculerTotaux(d.lignes || [], d.remise_type, d.remise_valeur, d.acompte_type, d.acompte_valeur)
      sum += t.total_ttc || 0
    }
    return sum
  }, [devisDuChantier])

  const depensesChantier = chantier?.depenses_chantier || []
  const totalDepensesSupp = useMemo(
    () => depensesChantier.reduce((s, x) => s + (parseFloat(x.montant_ttc) || 0), 0),
    [depensesChantier]
  )

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

  // ── COÛTS / DÉPENSES SUPPLÉMENTAIRES ─────────────────────
  function appendPhotosToFormDepense(files) {
    const imgs = [...files].filter(f => f.type.startsWith('image/'))
    if (!imgs.length) return
    Promise.all(
      imgs.map(
        f =>
          new Promise(resolve => {
            const r = new FileReader()
            r.onload = () => resolve({ id: genId(), base64: r.result, legende: f.name })
            r.readAsDataURL(f)
          })
      )
    ).then(newPhotos => {
      setFormDepense(f => ({ ...f, photos: [...f.photos, ...newPhotos] }))
      toast.success(newPhotos.length > 1 ? `${newPhotos.length} images ajoutées` : 'Image ajoutée')
    })
  }

  function retirerPhotoFormDepense(photoId) {
    setFormDepense(f => ({ ...f, photos: f.photos.filter(p => p.id !== photoId) }))
  }

  function ajouterDepense() {
    const montant = parseFloat(String(formDepense.montant).replace(',', '.')) || 0
    if (montant <= 0) {
      toast.error('Indiquez un montant supérieur à 0')
      return
    }
    const lib = formDepense.libelle.trim() || (formDepense.photos.length ? 'Ticket' : '')
    if (!lib) {
      toast.error('Ajoutez un libellé ou une photo de ticket')
      return
    }
    const row = {
      id: genId(),
      date: formDepense.date || today(),
      categorie: formDepense.categorie,
      libelle: lib,
      montant_ttc: montant,
      photos: formDepense.photos,
    }
    const next = [...depensesChantier, row]
    updateChantier(id, { depenses_chantier: next })
    setFormDepense({ libelle: '', montant: '', categorie: 'essence', date: today(), photos: [] })
    toast.success('Coût enregistré')
  }

  function supprimerDepense(depId) {
    updateChantier(id, { depenses_chantier: depensesChantier.filter(d => d.id !== depId) })
    toast.success('Coût supprimé')
  }

  function handleDropCout(e) {
    e.preventDefault()
    setDragCout(false)
    appendPhotosToFormDepense(e.dataTransfer.files)
  }

  function handleDragOverCout(e) {
    e.preventDefault()
    setDragCout(true)
  }

  function handleDragLeaveCout(e) {
    e.preventDefault()
    setDragCout(false)
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
      <div className="p-4 md:p-6 max-w-4xl mx-auto pb-8">
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
        <div className="flex gap-1 bg-slate-800/50 rounded-xl p-1 mb-5 flex-wrap sm:flex-nowrap">
          {[
            { id: 'etapes', label: 'Étapes', count: chantier.etapes?.length },
            { id: 'notes', label: 'Notes', count: chantier.notes?.length },
            { id: 'photos', label: 'Photos', count: chantier.photos?.length },
            { id: 'couts', label: 'Coûts', count: depensesChantier.length, icon: Euro },
          ].map(tab => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setOnglet(tab.id)}
                className={`flex-1 min-w-[calc(50%-4px)] sm:min-w-0 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${
                  onglet === tab.id ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                {Icon && <Icon size={14} className="opacity-80" />}
                {tab.label}
                {tab.count > 0 && (
                  <span className="bg-slate-600 text-xs rounded-full px-1.5">{tab.count}</span>
                )}
              </button>
            )
          })}
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

        {/* Coûts — prévu (devis) + dépenses supplémentaires */}
        {onglet === 'couts' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            {/* Synthèse */}
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
                <p className="text-slate-500 text-xs uppercase tracking-wide mb-1">Chiffrage devis (TTC)</p>
                <p className="text-2xl font-bold text-white">{formatMontant(totalPrevuDevisTTC)}</p>
                <p className="text-slate-500 text-xs mt-1">
                  {devisDuChantier.length} devis lié{devisDuChantier.length > 1 ? 's' : ''} à ce chantier
                </p>
              </div>
              <div className="bg-slate-800 border border-amber-500/30 rounded-xl p-4">
                <p className="text-slate-500 text-xs uppercase tracking-wide mb-1">Coûts terrain (tickets & saisies)</p>
                <p className="text-2xl font-bold text-amber-400">{formatMontant(totalDepensesSupp)}</p>
                <p className="text-slate-500 text-xs mt-1">{depensesChantier.length} ligne{depensesChantier.length > 1 ? 's' : ''}</p>
              </div>
            </div>

            {/* Détail devis */}
            <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Receipt size={18} className="text-amber-400" />
                <h2 className="text-white font-semibold">Matériel & prestations (devis)</h2>
              </div>
              {devisDuChantier.length === 0 ? (
                <p className="text-slate-400 text-sm">
                  Aucun devis n’est lié à ce chantier. Ouvrez un devis, choisissez ce chantier dans le formulaire, puis enregistrez — les lignes apparaîtront ici automatiquement.
                </p>
              ) : (
                <div className="space-y-5">
                  {devisDuChantier.map(d => {
                    const tot = calculerTotaux(d.lignes || [], d.remise_type, d.remise_valeur, d.acompte_type, d.acompte_valeur)
                    return (
                      <div key={d.id} className="border border-slate-600 rounded-xl overflow-hidden">
                        <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-900/80 px-3 py-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-white font-mono text-sm font-semibold">{d.numero}</span>
                            <Badge statut={d.statut} type="devis" />
                            <span className="text-slate-400 text-xs">{d.objet || 'Sans objet'}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-amber-400 font-bold text-sm">{formatMontant(tot.total_ttc)} TTC</span>
                            <button
                              type="button"
                              onClick={() => navigate(`/devis/${d.id}`)}
                              className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
                              title="Voir le devis"
                            >
                              <ExternalLink size={16} />
                            </button>
                          </div>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="text-slate-500 border-b border-slate-700">
                                <th className="text-left py-2 px-3 font-medium">Description</th>
                                <th className="text-center py-2 px-2 font-medium w-12">Qté</th>
                                <th className="text-right py-2 px-2 font-medium">PU HT</th>
                                <th className="text-center py-2 px-2 font-medium w-10">TVA</th>
                                <th className="text-right py-2 px-3 font-medium">Total HT</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(d.lignes || []).map((ligne, idx) => {
                                if (ligne.type === 'titre') {
                                  return (
                                    <tr key={idx} className="bg-slate-700/40">
                                      <td colSpan={5} className="py-2 px-3 font-semibold text-slate-200">{ligne.description}</td>
                                    </tr>
                                  )
                                }
                                if (ligne.type === 'commentaire') {
                                  return (
                                    <tr key={idx}>
                                      <td colSpan={5} className="py-1 px-3 text-slate-500 italic">{ligne.description}</td>
                                    </tr>
                                  )
                                }
                                const ht = (parseFloat(ligne.quantite) || 0) * (parseFloat(ligne.prix_ht) || 0)
                                return (
                                  <tr key={idx} className="border-b border-slate-700/50 text-slate-300">
                                    <td className="py-2 px-3">{ligne.description}</td>
                                    <td className="text-center py-2 px-2">{ligne.quantite}</td>
                                    <td className="text-right py-2 px-2">{formatMontant(ligne.prix_ht)}</td>
                                    <td className="text-center py-2 px-2 text-slate-500">{ligne.tva}%</td>
                                    <td className="text-right py-2 px-3 text-white">{formatMontant(ht)}</td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Ajouter coût */}
            <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5">
              <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
                <ImagePlus size={18} className="text-amber-400" />
                Ajouter un coût (essence, péage, fournitures…)
              </h2>
              <div
                onDragOver={handleDragOverCout}
                onDragLeave={handleDragLeaveCout}
                onDrop={handleDropCout}
                className={`mb-4 rounded-xl border-2 border-dashed p-6 text-center transition-colors ${
                  dragCout ? 'border-amber-500 bg-amber-500/10' : 'border-slate-600 bg-slate-900/50'
                }`}
              >
                <p className="text-slate-400 text-sm mb-2">Glissez-déposez des photos de tickets ici</p>
                <label className="inline-flex items-center gap-2 text-amber-400 text-sm cursor-pointer hover:underline">
                  <span>ou parcourir les fichiers</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={e => {
                      appendPhotosToFormDepense(e.target.files)
                      e.target.value = ''
                    }}
                  />
                </label>
              </div>

              {formDepense.photos.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {formDepense.photos.map(p => (
                    <div key={p.id} className="relative w-16 h-16 rounded-lg overflow-hidden border border-slate-600">
                      <img src={p.base64} alt="" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => retirerPhotoFormDepense(p.id)}
                        className="absolute top-0 right-0 bg-black/60 text-white text-xs px-1 rounded-bl"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="grid sm:grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="text-slate-400 text-xs block mb-1">Catégorie</label>
                  <select
                    value={formDepense.categorie}
                    onChange={e => setFormDepense(f => ({ ...f, categorie: e.target.value }))}
                    className="w-full bg-slate-900 border border-slate-600 rounded-xl text-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none"
                  >
                    {CATEGORIES_DEPENSE.map(c => (
                      <option key={c.id} value={c.id}>{c.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 text-xs block mb-1">Date</label>
                  <input
                    type="date"
                    value={formDepense.date}
                    onChange={e => setFormDepense(f => ({ ...f, date: e.target.value }))}
                    className="w-full bg-slate-900 border border-slate-600 rounded-xl text-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-3 mb-4">
                <div className="sm:col-span-2">
                  <label className="text-slate-400 text-xs block mb-1">Libellé (optionnel si ticket photo)</label>
                  <input
                    value={formDepense.libelle}
                    onChange={e => setFormDepense(f => ({ ...f, libelle: e.target.value }))}
                    placeholder="Ex. Plein autoroute A6, Péage Lyon…"
                    className="w-full bg-slate-900 border border-slate-600 rounded-xl text-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none placeholder-slate-500"
                  />
                </div>
                <div>
                  <label className="text-slate-400 text-xs block mb-1">Montant TTC (€)</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={formDepense.montant}
                    onChange={e => setFormDepense(f => ({ ...f, montant: e.target.value }))}
                    placeholder="0,00"
                    className="w-full bg-slate-900 border border-slate-600 rounded-xl text-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none placeholder-slate-500"
                  />
                </div>
              </div>
              <Button onClick={ajouterDepense}><Plus size={16} /> Enregistrer ce coût</Button>
            </div>

            {/* Liste dépenses */}
            {depensesChantier.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-slate-400 text-sm font-medium uppercase tracking-wide">Dépenses enregistrées</h3>
                {depensesChantier.map(dep => (
                  <div
                    key={dep.id}
                    className="flex flex-wrap items-start gap-3 bg-slate-800 border border-slate-700 rounded-xl p-4"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-slate-500 bg-slate-700 px-2 py-0.5 rounded">{labelCategorie(dep.categorie)}</span>
                        <span className="text-slate-500 text-xs">{formatDate(dep.date)}</span>
                      </div>
                      <p className="text-white font-medium mt-1">{dep.libelle}</p>
                      <p className="text-amber-400 font-bold text-lg mt-1">{formatMontant(dep.montant_ttc)}</p>
                      {dep.photos?.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {dep.photos.map(ph => (
                            <a key={ph.id} href={ph.base64} target="_blank" rel="noopener noreferrer" className="block w-14 h-14 rounded-lg overflow-hidden border border-slate-600">
                              <img src={ph.base64} alt="" className="w-full h-full object-cover" />
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => supprimerDepense(dep.id)}
                      className="text-slate-500 hover:text-red-400 p-1"
                      title="Supprimer"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
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
