// Formulaire de création/modification de devis — tableau de lignes complet
import { useState, useRef } from 'react'
import { useNavigate, useParams, useSearchParams, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Save, Plus, Trash2, GripVertical, Eye, EyeOff, BookOpen,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useApp } from '../../context/AppContext'
import { calculerTotaux, formatMontant, today, addDays } from '../../lib/utils'
import { genId } from '../../lib/storage'
import { PRESTATIONS } from '../../data/prestations'
import PageTransition from '../../components/layout/PageTransition'
import Button from '../../components/ui/Button'
import DocumentPreview from '../../components/documents/DocumentPreview'
import CataloguePicker from '../../components/devis/CataloguePicker'

const UNITES = ['u', 'h', 'm', 'm²', 'm³', 'forfait', 'jour']
const TVA_OPTIONS = [0, 5.5, 10, 20]
const TYPES_LIGNE = ['prestation', 'titre', 'commentaire']

function nouvelleLigne(type = 'prestation') {
  return {
    id: genId(),
    type,
    description: '',
    quantite: type === 'prestation' ? 1 : '',
    unite: 'u',
    prix_ht: '',
    tva: 10,
    total_ht: 0,
  }
}

export default function DevisForm() {
  const navigate = useNavigate()
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const location = useLocation()
  const { devis: allDevis, clients, chantiers, settings, addDevis, updateDevis } = useApp()

  const existant = id && id !== 'nouveau' ? allDevis.find(d => d.id === id) : null
  const clientIdParam = searchParams.get('client') || ''
  const prefillIA = location.state?.prefill || {}

  // Ajoute un id à chaque ligne venant de l'IA
  const prefillLignes = prefillIA.lignes?.map(l => ({ ...nouvelleLigne(), ...l, id: genId() }))

  const [form, setForm] = useState(() => ({
    client_id: clientIdParam,
    chantier_id: '',
    objet: '',
    date_emission: today(),
    date_validite: addDays(today(), settings?.facturation?.validite_devis || 30),
    lignes: [nouvelleLigne()],
    remise_type: 'pourcentage',
    remise_valeur: 0,
    acompte_type: 'pourcentage',
    acompte_valeur: 0,
    conditions_paiement: settings?.facturation?.conditions_paiement || '',
    delai_execution: '',
    mentions_legales: settings?.facturation?.mentions_legales || '',
    notes_internes: '',
    ...prefillIA,
    ...(prefillLignes ? { lignes: prefillLignes } : {}),
    ...(existant || {}),
  }))

  const [showPreview, setShowPreview] = useState(false)
  const [showCatalogue, setShowCatalogue] = useState(false)
  const [autocomplete, setAutocomplete] = useState({ lineId: null, results: [] })
  const previewRef = useRef(null)

  function set(key, val) {
    setForm(f => ({ ...f, [key]: val }))
  }

  // ── LIGNES ───────────────────────────────────────────────
  function ajouterLigne(type = 'prestation') {
    const ligne = nouvelleLigne(type)
    set('lignes', [...form.lignes, ligne])
  }

  function updateLigne(lineId, key, val) {
    const lignes = form.lignes.map(l => {
      if (l.id !== lineId) return l
      const updated = { ...l, [key]: val }
      if (key === 'quantite' || key === 'prix_ht') {
        updated.total_ht = (parseFloat(updated.quantite) || 0) * (parseFloat(updated.prix_ht) || 0)
      }
      return updated
    })
    set('lignes', lignes)

    // Autocomplete description
    if (key === 'description' && val.length >= 2) {
      const results = PRESTATIONS.filter(p =>
        p.description.toLowerCase().includes(val.toLowerCase())
      ).slice(0, 5)
      setAutocomplete({ lineId, results })
    } else {
      setAutocomplete({ lineId: null, results: [] })
    }
  }

  function appliquerPrestation(lineId, prestation) {
    const lignes = form.lignes.map(l => {
      if (l.id !== lineId) return l
      const q = parseFloat(l.quantite) || 1
      return {
        ...l,
        description: prestation.description,
        unite: prestation.unite,
        prix_ht: prestation.prix_ht,
        tva: prestation.tva,
        total_ht: q * prestation.prix_ht,
      }
    })
    set('lignes', lignes)
    setAutocomplete({ lineId: null, results: [] })
  }

  function supprimerLigne(lineId) {
    set('lignes', form.lignes.filter(l => l.id !== lineId))
  }

  function ajouterDepuisCatalogue(prestation) {
    const ligne = {
      ...nouvelleLigne('prestation'),
      description: prestation.description,
      unite: prestation.unite,
      prix_ht: prestation.prix_ht,
      tva: prestation.tva,
      quantite: 1,
      total_ht: prestation.prix_ht,
    }
    set('lignes', [...form.lignes, ligne])
  }

  // ── TOTAUX ──────────────────────────────────────────────
  const totaux = calculerTotaux(form.lignes, form.remise_type, form.remise_valeur, form.acompte_type, form.acompte_valeur)

  // ── CLIENTS / CHANTIERS FILTRÉS ──────────────────────────
  const chantiersClient = chantiers.filter(c => c.client_id === form.client_id)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.client_id) { toast.error('Sélectionnez un client'); return }
    if (form.lignes.filter(l => l.type === 'prestation').length === 0) {
      toast.error('Ajoutez au moins une ligne de prestation')
      return
    }

    if (existant) {
      await updateDevis(existant.id, form)
      toast.success('Devis mis à jour')
      navigate(`/devis/${existant.id}`)
    } else {
      const d = await addDevis(form)
      toast.success('Devis créé')
      navigate(`/devis/${d.id}`)
    }
  }

  // Données mock pour la prévisualisation en temps réel
  const devisMock = {
    ...form,
    id: existant?.id || 'preview',
    numero: existant?.numero || 'DEV-2024-001',
  }

  return (
    <PageTransition>
      <div className="p-4 md:p-6 pb-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="text-slate-400 hover:text-white transition-colors">
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-xl font-bold text-white">
              {existant ? `Modifier ${existant.numero}` : 'Nouveau devis'}
            </h1>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowCatalogue(true)}>
              <BookOpen size={14} />
              <span className="hidden sm:inline">Catalogue</span>
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setShowPreview(v => !v)}>
              {showPreview ? <EyeOff size={14} /> : <Eye size={14} />}
              <span className="hidden sm:inline">{showPreview ? 'Masquer' : 'Aperçu'}</span>
            </Button>
          </div>
        </div>

        <div className={`flex gap-6 ${showPreview ? 'flex-col lg:flex-row' : ''}`}>
          {/* Formulaire */}
          <form onSubmit={handleSubmit} className={`space-y-5 ${showPreview ? 'lg:w-1/2' : 'max-w-4xl'}`}>
            {/* Infos générales */}
            <div className="bg-slate-800 rounded-2xl border border-slate-700 p-5 space-y-4">
              <h2 className="text-white font-semibold">Informations</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-300 block mb-1">Client *</label>
                  <select
                    value={form.client_id}
                    onChange={e => { set('client_id', e.target.value); set('chantier_id', '') }}
                    className="w-full bg-slate-900 border border-slate-600 rounded-xl text-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none"
                  >
                    <option value="">— Sélectionner —</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.societe || `${c.prenom} ${c.nom}`}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-300 block mb-1">Chantier</label>
                  <select
                    value={form.chantier_id}
                    onChange={e => set('chantier_id', e.target.value)}
                    disabled={!form.client_id}
                    className="w-full bg-slate-900 border border-slate-600 rounded-xl text-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none disabled:opacity-50"
                  >
                    <option value="">— Aucun chantier —</option>
                    {chantiersClient.map(c => (
                      <option key={c.id} value={c.id}>{c.nom}</option>
                    ))}
                  </select>
                </div>
              </div>
              <input
                value={form.objet}
                onChange={e => set('objet', e.target.value)}
                placeholder="Objet du devis"
                className="w-full bg-slate-900 border border-slate-600 rounded-xl text-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none placeholder-slate-500"
              />
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Date d'émission</label>
                  <input type="date" value={form.date_emission} onChange={e => set('date_emission', e.target.value)}
                    className="w-full bg-slate-900 border border-slate-600 rounded-xl text-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none" />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Date de validité</label>
                  <input type="date" value={form.date_validite} onChange={e => set('date_validite', e.target.value)}
                    className="w-full bg-slate-900 border border-slate-600 rounded-xl text-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none" />
                </div>
              </div>
            </div>

            {/* Tableau des lignes */}
            <div className="bg-slate-800 rounded-2xl border border-slate-700 p-5">
              <h2 className="text-white font-semibold mb-4">Prestations</h2>

              {/* Header tableau */}
              <div className="hidden sm:grid grid-cols-12 gap-2 text-xs text-slate-400 font-medium mb-2 px-1">
                <div className="col-span-1">Type</div>
                <div className="col-span-4">Description</div>
                <div className="col-span-1 text-center">Qté</div>
                <div className="col-span-1 text-center">Unité</div>
                <div className="col-span-2 text-right">PU HT</div>
                <div className="col-span-1 text-center">TVA</div>
                <div className="col-span-1 text-right">Total HT</div>
                <div className="col-span-1" />
              </div>

              <AnimatePresence>
                {form.lignes.map((ligne, idx) => (
                  <motion.div
                    key={ligne.id}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className={`relative mb-2 ${
                      ligne.type === 'titre' ? 'bg-slate-700/50 rounded-xl' : ''
                    }`}
                  >
                    <div className="grid grid-cols-12 gap-2 items-start p-1">
                      {/* Type */}
                      <div className="col-span-12 sm:col-span-1">
                        <select
                          value={ligne.type}
                          onChange={e => updateLigne(ligne.id, 'type', e.target.value)}
                          className="w-full bg-slate-900 border border-slate-600 rounded-lg text-white px-2 py-1.5 text-xs focus:border-amber-500 focus:outline-none"
                        >
                          <option value="prestation">Presta</option>
                          <option value="titre">Titre</option>
                          <option value="commentaire">Note</option>
                        </select>
                      </div>

                      {/* Description avec autocomplete */}
                      <div className="col-span-12 sm:col-span-4 relative">
                        <input
                          value={ligne.description}
                          onChange={e => updateLigne(ligne.id, 'description', e.target.value)}
                          placeholder={ligne.type === 'titre' ? 'Titre de section' : ligne.type === 'commentaire' ? 'Note ou commentaire' : 'Description de la prestation'}
                          className={`w-full bg-slate-900 border border-slate-600 rounded-lg text-white px-2 py-1.5 text-xs focus:border-amber-500 focus:outline-none placeholder-slate-500 ${
                            ligne.type === 'titre' ? 'font-bold' : ligne.type === 'commentaire' ? 'italic text-slate-400' : ''
                          }`}
                        />
                        {/* Dropdown autocomplete */}
                        {autocomplete.lineId === ligne.id && autocomplete.results.length > 0 && (
                          <div className="absolute top-full left-0 right-0 z-10 bg-slate-900 border border-slate-600 rounded-xl overflow-hidden shadow-xl mt-1">
                            {autocomplete.results.map(p => (
                              <button
                                key={p.id}
                                type="button"
                                onClick={() => appliquerPrestation(ligne.id, p)}
                                className="w-full text-left px-3 py-2 text-xs hover:bg-slate-700 transition-colors border-b border-slate-800 last:border-0"
                              >
                                <p className="text-white font-medium truncate">{p.description}</p>
                                <p className="text-slate-400 mt-0.5">{p.prix_ht}€ / {p.unite} · TVA {p.tva}%</p>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Qté + Unité + PU + TVA + Total (masqués pour titre/commentaire) */}
                      {ligne.type === 'prestation' ? (
                        <>
                          <div className="col-span-4 sm:col-span-1">
                            <input
                              type="number"
                              value={ligne.quantite}
                              onChange={e => updateLigne(ligne.id, 'quantite', e.target.value)}
                              min="0"
                              step="any"
                              className="w-full bg-slate-900 border border-slate-600 rounded-lg text-white px-2 py-1.5 text-xs text-center focus:border-amber-500 focus:outline-none"
                            />
                          </div>
                          <div className="col-span-4 sm:col-span-1">
                            <select
                              value={ligne.unite}
                              onChange={e => updateLigne(ligne.id, 'unite', e.target.value)}
                              className="w-full bg-slate-900 border border-slate-600 rounded-lg text-white px-1 py-1.5 text-xs focus:border-amber-500 focus:outline-none"
                            >
                              {UNITES.map(u => <option key={u} value={u}>{u}</option>)}
                            </select>
                          </div>
                          <div className="col-span-4 sm:col-span-2">
                            <input
                              type="number"
                              value={ligne.prix_ht}
                              onChange={e => updateLigne(ligne.id, 'prix_ht', e.target.value)}
                              min="0"
                              step="any"
                              placeholder="0.00"
                              className="w-full bg-slate-900 border border-slate-600 rounded-lg text-white px-2 py-1.5 text-xs text-right focus:border-amber-500 focus:outline-none"
                            />
                          </div>
                          <div className="col-span-4 sm:col-span-1">
                            <select
                              value={ligne.tva}
                              onChange={e => updateLigne(ligne.id, 'tva', parseFloat(e.target.value))}
                              className="w-full bg-slate-900 border border-slate-600 rounded-lg text-white px-1 py-1.5 text-xs focus:border-amber-500 focus:outline-none"
                            >
                              {TVA_OPTIONS.map(t => <option key={t} value={t}>{t}%</option>)}
                            </select>
                          </div>
                          <div className="col-span-3 sm:col-span-1 flex items-center justify-end">
                            <span className="text-amber-400 text-xs font-medium">
                              {formatMontant((parseFloat(ligne.quantite) || 0) * (parseFloat(ligne.prix_ht) || 0))}
                            </span>
                          </div>
                        </>
                      ) : (
                        <div className="col-span-7 sm:col-span-6" />
                      )}

                      {/* Supprimer */}
                      <div className="col-span-1 flex items-center justify-end">
                        <button
                          type="button"
                          onClick={() => supprimerLigne(ligne.id)}
                          className="text-slate-600 hover:text-red-400 transition-colors p-1"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* Boutons ajout */}
              <div className="flex gap-2 mt-3 flex-wrap">
                <Button type="button" variant="secondary" size="sm" onClick={() => ajouterLigne('prestation')}>
                  <Plus size={13} /> Prestation
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => ajouterLigne('titre')}>
                  <Plus size={13} /> Titre
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => ajouterLigne('commentaire')}>
                  <Plus size={13} /> Note
                </Button>
              </div>
            </div>

            {/* Remise + Acompte */}
            <div className="bg-slate-800 rounded-2xl border border-slate-700 p-5">
              <h2 className="text-white font-semibold mb-4">Remise & Acompte</h2>
              <div className="grid sm:grid-cols-2 gap-5">
                <div>
                  <label className="text-sm text-slate-300 block mb-2">Remise</label>
                  <div className="flex gap-2 items-center">
                    <select
                      value={form.remise_type}
                      onChange={e => set('remise_type', e.target.value)}
                      className="bg-slate-900 border border-slate-600 rounded-xl text-white px-2 py-2 text-sm focus:border-amber-500 focus:outline-none"
                    >
                      <option value="pourcentage">%</option>
                      <option value="montant">€</option>
                    </select>
                    <input
                      type="number"
                      value={form.remise_valeur}
                      onChange={e => set('remise_valeur', parseFloat(e.target.value) || 0)}
                      min="0"
                      className="flex-1 bg-slate-900 border border-slate-600 rounded-xl text-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm text-slate-300 block mb-2">Acompte demandé</label>
                  <div className="flex gap-2 items-center">
                    <select
                      value={form.acompte_type}
                      onChange={e => set('acompte_type', e.target.value)}
                      className="bg-slate-900 border border-slate-600 rounded-xl text-white px-2 py-2 text-sm focus:border-amber-500 focus:outline-none"
                    >
                      <option value="pourcentage">%</option>
                      <option value="montant">€</option>
                    </select>
                    <input
                      type="number"
                      value={form.acompte_valeur}
                      onChange={e => set('acompte_valeur', parseFloat(e.target.value) || 0)}
                      min="0"
                      className="flex-1 bg-slate-900 border border-slate-600 rounded-xl text-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Récapitulatif */}
            <div className="bg-slate-800 rounded-2xl border border-slate-700 p-5">
              <h2 className="text-white font-semibold mb-4">Récapitulatif</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-slate-300">
                  <span>Sous-total HT</span>
                  <span>{formatMontant(totaux.sous_total_ht)}</span>
                </div>
                {totaux.montant_remise > 0 && (
                  <div className="flex justify-between text-red-400">
                    <span>Remise</span>
                    <span>- {formatMontant(totaux.montant_remise)}</span>
                  </div>
                )}
                {Object.entries(totaux.tva_detail).map(([taux, d]) => (
                  <div key={taux} className="flex justify-between text-slate-400 text-xs">
                    <span>TVA {taux}%</span>
                    <span>{formatMontant(d.montant)}</span>
                  </div>
                ))}
                <div className="flex justify-between text-white font-bold pt-2 border-t border-slate-700">
                  <span>TOTAL TTC</span>
                  <span className="text-amber-400">{formatMontant(totaux.total_ttc)}</span>
                </div>
                {totaux.montant_acompte > 0 && (
                  <>
                    <div className="flex justify-between text-slate-400">
                      <span>Acompte</span>
                      <span>- {formatMontant(totaux.montant_acompte)}</span>
                    </div>
                    <div className="flex justify-between text-white font-semibold">
                      <span>Net à régler</span>
                      <span>{formatMontant(totaux.net_a_regler)}</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Conditions */}
            <div className="bg-slate-800 rounded-2xl border border-slate-700 p-5 space-y-4">
              <h2 className="text-white font-semibold">Conditions</h2>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Délai d'exécution</label>
                <input
                  value={form.delai_execution}
                  onChange={e => set('delai_execution', e.target.value)}
                  placeholder="Ex : 2 semaines après acceptation"
                  className="w-full bg-slate-900 border border-slate-600 rounded-xl text-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none placeholder-slate-500"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Conditions de paiement</label>
                <input
                  value={form.conditions_paiement}
                  onChange={e => set('conditions_paiement', e.target.value)}
                  placeholder="Ex : 30% à la commande, solde à la livraison"
                  className="w-full bg-slate-900 border border-slate-600 rounded-xl text-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none placeholder-slate-500"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Notes internes (non imprimées)</label>
                <textarea
                  value={form.notes_internes}
                  onChange={e => set('notes_internes', e.target.value)}
                  rows={2}
                  className="w-full bg-slate-900 border border-slate-600 rounded-xl text-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none placeholder-slate-500 resize-none"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button type="button" variant="secondary" onClick={() => navigate(-1)} className="flex-1">Annuler</Button>
              <Button type="submit" className="flex-1">
                <Save size={16} /> {existant ? 'Mettre à jour' : 'Créer le devis'}
              </Button>
            </div>
          </form>

          {/* Aperçu PDF */}
          {showPreview && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="lg:w-1/2 bg-white rounded-2xl overflow-auto"
              style={{ maxHeight: '80vh' }}
              ref={previewRef}
            >
              <DocumentPreview doc={devisMock} type="devis" />
            </motion.div>
          )}
        </div>
      </div>
      <CataloguePicker
        open={showCatalogue}
        onClose={() => setShowCatalogue(false)}
        onAjouter={ajouterDepuisCatalogue}
      />
    </PageTransition>
  )
}
