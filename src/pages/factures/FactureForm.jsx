// Formulaire facture — identique à DevisForm adapté pour les factures
import { useState } from 'react'
import { useNavigate, useParams, useSearchParams, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Save, Plus, Trash2, BookOpen } from 'lucide-react'
import toast from 'react-hot-toast'
import { useApp } from '../../context/AppContext'
import { calculerTotaux, formatMontant, today, addDays } from '../../lib/utils'
import { genId } from '../../lib/storage'
import { PRESTATIONS } from '../../data/prestations'
import PageTransition from '../../components/layout/PageTransition'
import Button from '../../components/ui/Button'
import CataloguePicker from '../../components/devis/CataloguePicker'

const UNITES = ['u', 'h', 'm', 'm²', 'm³', 'forfait', 'jour']
const TVA_OPTIONS = [0, 5.5, 10, 20]

function nouvelleLigne() {
  return { id: genId(), type: 'prestation', description: '', quantite: 1, unite: 'u', prix_ht: '', tva: 10, total_ht: 0 }
}

export default function FactureForm() {
  const navigate = useNavigate()
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const location = useLocation()
  const { factures, clients, chantiers, settings, addFacture, updateFacture } = useApp()

  const existant = id && id !== 'nouveau' ? factures.find(f => f.id === id) : null
  const clientIdParam = searchParams.get('client') || ''
  const prefillIA = location.state?.prefill || {}

  const prefillLignes = prefillIA.lignes?.map(l => ({ ...nouvelleLigne(), ...l, id: genId() }))

  const [form, setForm] = useState(() => ({
    client_id: clientIdParam,
    chantier_id: '',
    objet: '',
    date_emission: today(),
    date_echeance: addDays(today(), settings?.facturation?.delai_paiement || 30),
    lignes: [nouvelleLigne()],
    remise_type: 'pourcentage',
    remise_valeur: 0,
    acompte_verse: 0,
    conditions_paiement: '',
    moyen_paiement: 'virement',
    mentions_legales: settings?.facturation?.mentions_legales || '',
    notes_internes: '',
    ...prefillIA,
    ...(prefillLignes ? { lignes: prefillLignes } : {}),
    ...(existant || {}),
  }))

  const [autocomplete, setAutocomplete] = useState({ lineId: null, results: [] })
  const [showCatalogue, setShowCatalogue] = useState(false)

  function set(key, val) { setForm(f => ({ ...f, [key]: val })) }

  function ajouterLigne(type = 'prestation') {
    set('lignes', [...form.lignes, { ...nouvelleLigne(), type }])
  }

  function updateLigne(lineId, key, val) {
    const lignes = form.lignes.map(l => {
      if (l.id !== lineId) return l
      const u = { ...l, [key]: val }
      if (key === 'quantite' || key === 'prix_ht') u.total_ht = (parseFloat(u.quantite) || 0) * (parseFloat(u.prix_ht) || 0)
      return u
    })
    set('lignes', lignes)
    if (key === 'description' && val.length >= 2) {
      setAutocomplete({ lineId, results: PRESTATIONS.filter(p => p.description.toLowerCase().includes(val.toLowerCase())).slice(0, 5) })
    } else {
      setAutocomplete({ lineId: null, results: [] })
    }
  }

  function appliquerPrestation(lineId, p) {
    const lignes = form.lignes.map(l => l.id !== lineId ? l : {
      ...l, description: p.description, unite: p.unite, prix_ht: p.prix_ht, tva: p.tva,
      total_ht: (parseFloat(l.quantite) || 1) * p.prix_ht,
    })
    set('lignes', lignes)
    setAutocomplete({ lineId: null, results: [] })
  }

  function supprimerLigne(lineId) { set('lignes', form.lignes.filter(l => l.id !== lineId)) }

  function ajouterDepuisCatalogue(prestation) {
    const ligne = {
      ...nouvelleLigne(),
      description: prestation.description,
      unite: prestation.unite,
      prix_ht: prestation.prix_ht,
      tva: prestation.tva,
      quantite: 1,
      total_ht: prestation.prix_ht,
    }
    set('lignes', [...form.lignes, ligne])
  }

  const totaux = calculerTotaux(form.lignes, form.remise_type, form.remise_valeur)
  const chantiersClient = chantiers.filter(c => c.client_id === form.client_id)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.client_id) { toast.error('Sélectionnez un client'); return }
    if (existant) {
      await updateFacture(existant.id, form)
      toast.success('Facture mise à jour')
      navigate(`/factures/${existant.id}`)
    } else {
      const f = await addFacture(form)
      toast.success('Facture créée')
      navigate(`/factures/${f.id}`)
    }
  }

  return (
    <PageTransition>
      <div className="p-4 md:p-6 max-w-4xl mx-auto pb-8">
        <div className="flex items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="text-slate-400 hover:text-white transition-colors">
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-xl font-bold text-white">{existant ? 'Modifier la facture' : 'Nouvelle facture'}</h1>
          </div>
          <Button variant="secondary" size="sm" onClick={() => setShowCatalogue(true)}>
            <BookOpen size={14} />
            <span className="hidden sm:inline">Catalogue</span>
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Infos */}
          <div className="bg-slate-800 rounded-2xl border border-slate-700 p-5 space-y-4">
            <h2 className="text-white font-semibold">Informations</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-300 block mb-1">Client *</label>
                <select value={form.client_id} onChange={e => { set('client_id', e.target.value); set('chantier_id', '') }}
                  className="w-full bg-slate-900 border border-slate-600 rounded-xl text-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none">
                  <option value="">— Sélectionner —</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.societe || `${c.prenom} ${c.nom}`}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-300 block mb-1">Chantier</label>
                <select value={form.chantier_id} onChange={e => set('chantier_id', e.target.value)} disabled={!form.client_id}
                  className="w-full bg-slate-900 border border-slate-600 rounded-xl text-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none disabled:opacity-50">
                  <option value="">— Aucun —</option>
                  {chantiersClient.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
                </select>
              </div>
            </div>
            <input value={form.objet} onChange={e => set('objet', e.target.value)} placeholder="Objet de la facture"
              className="w-full bg-slate-900 border border-slate-600 rounded-xl text-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none placeholder-slate-500" />
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Date d'émission</label>
                <input type="date" value={form.date_emission} onChange={e => set('date_emission', e.target.value)}
                  className="w-full bg-slate-900 border border-slate-600 rounded-xl text-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none" />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Date d'échéance</label>
                <input type="date" value={form.date_echeance} onChange={e => set('date_echeance', e.target.value)}
                  className="w-full bg-slate-900 border border-slate-600 rounded-xl text-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none" />
              </div>
            </div>
          </div>

          {/* Lignes */}
          <div className="bg-slate-800 rounded-2xl border border-slate-700 p-5">
            <h2 className="text-white font-semibold mb-4">Prestations</h2>
            <AnimatePresence>
              {form.lignes.map((ligne) => (
                <motion.div key={ligne.id} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mb-2">
                  <div className="grid grid-cols-12 gap-2 items-start p-1">
                    <div className="col-span-12 sm:col-span-1">
                      <select value={ligne.type} onChange={e => updateLigne(ligne.id, 'type', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-600 rounded-lg text-white px-1 py-1.5 text-xs focus:border-amber-500 focus:outline-none">
                        <option value="prestation">Presta</option>
                        <option value="titre">Titre</option>
                        <option value="commentaire">Note</option>
                      </select>
                    </div>
                    <div className="col-span-12 sm:col-span-4 relative">
                      <input value={ligne.description} onChange={e => updateLigne(ligne.id, 'description', e.target.value)}
                        placeholder={ligne.type === 'titre' ? 'Titre' : 'Description'}
                        className={`w-full bg-slate-900 border border-slate-600 rounded-lg text-white px-2 py-1.5 text-xs focus:border-amber-500 focus:outline-none placeholder-slate-500 ${ligne.type === 'titre' ? 'font-bold' : ''}`} />
                      {autocomplete.lineId === ligne.id && autocomplete.results.length > 0 && (
                        <div className="absolute top-full left-0 right-0 z-10 bg-slate-900 border border-slate-600 rounded-xl overflow-hidden shadow-xl mt-1">
                          {autocomplete.results.map(p => (
                            <button key={p.id} type="button" onClick={() => appliquerPrestation(ligne.id, p)}
                              className="w-full text-left px-3 py-2 text-xs hover:bg-slate-700 transition-colors border-b border-slate-800 last:border-0">
                              <p className="text-white truncate">{p.description}</p>
                              <p className="text-slate-400">{p.prix_ht}€/{p.unite}</p>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    {ligne.type === 'prestation' ? (
                      <>
                        <div className="col-span-3 sm:col-span-1">
                          <input type="number" value={ligne.quantite} onChange={e => updateLigne(ligne.id, 'quantite', e.target.value)} min="0" step="any"
                            className="w-full bg-slate-900 border border-slate-600 rounded-lg text-white px-2 py-1.5 text-xs text-center focus:border-amber-500 focus:outline-none" />
                        </div>
                        <div className="col-span-3 sm:col-span-1">
                          <select value={ligne.unite} onChange={e => updateLigne(ligne.id, 'unite', e.target.value)}
                            className="w-full bg-slate-900 border border-slate-600 rounded-lg text-white px-1 py-1.5 text-xs focus:border-amber-500 focus:outline-none">
                            {UNITES.map(u => <option key={u} value={u}>{u}</option>)}
                          </select>
                        </div>
                        <div className="col-span-3 sm:col-span-2">
                          <input type="number" value={ligne.prix_ht} onChange={e => updateLigne(ligne.id, 'prix_ht', e.target.value)} min="0" step="any" placeholder="0.00"
                            className="w-full bg-slate-900 border border-slate-600 rounded-lg text-white px-2 py-1.5 text-xs text-right focus:border-amber-500 focus:outline-none" />
                        </div>
                        <div className="col-span-2 sm:col-span-1">
                          <select value={ligne.tva} onChange={e => updateLigne(ligne.id, 'tva', parseFloat(e.target.value))}
                            className="w-full bg-slate-900 border border-slate-600 rounded-lg text-white px-1 py-1.5 text-xs focus:border-amber-500 focus:outline-none">
                            {TVA_OPTIONS.map(t => <option key={t} value={t}>{t}%</option>)}
                          </select>
                        </div>
                        <div className="col-span-1 flex items-center justify-end">
                          <span className="text-amber-400 text-xs">{formatMontant((parseFloat(ligne.quantite) || 0) * (parseFloat(ligne.prix_ht) || 0))}</span>
                        </div>
                      </>
                    ) : <div className="col-span-7 sm:col-span-6" />}
                    <div className="col-span-1 flex items-center justify-end">
                      <button type="button" onClick={() => supprimerLigne(ligne.id)} className="text-slate-600 hover:text-red-400 p-1 transition-colors">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            <div className="flex gap-2 mt-3">
              <Button type="button" variant="secondary" size="sm" onClick={() => ajouterLigne()}><Plus size={13} /> Prestation</Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => ajouterLigne('titre')}><Plus size={13} /> Titre</Button>
            </div>
          </div>

          {/* Totaux + Acompte */}
          <div className="bg-slate-800 rounded-2xl border border-slate-700 p-5">
            <h2 className="text-white font-semibold mb-4">Récapitulatif</h2>
            <div className="grid sm:grid-cols-2 gap-5 mb-4">
              <div>
                <label className="text-sm text-slate-300 block mb-2">Remise</label>
                <div className="flex gap-2">
                  <select value={form.remise_type} onChange={e => set('remise_type', e.target.value)}
                    className="bg-slate-900 border border-slate-600 rounded-xl text-white px-2 py-2 text-sm focus:border-amber-500 focus:outline-none">
                    <option value="pourcentage">%</option>
                    <option value="montant">€</option>
                  </select>
                  <input type="number" value={form.remise_valeur} onChange={e => set('remise_valeur', parseFloat(e.target.value) || 0)} min="0"
                    className="flex-1 bg-slate-900 border border-slate-600 rounded-xl text-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none" />
                </div>
              </div>
              <div>
                <label className="text-sm text-slate-300 block mb-2">Acompte versé (€)</label>
                <input type="number" value={form.acompte_verse} onChange={e => set('acompte_verse', parseFloat(e.target.value) || 0)} min="0"
                  className="w-full bg-slate-900 border border-slate-600 rounded-xl text-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none" />
              </div>
            </div>
            <div className="space-y-2 text-sm border-t border-slate-700 pt-4">
              <div className="flex justify-between text-slate-300"><span>HT</span><span>{formatMontant(totaux.sous_total_ht)}</span></div>
              {Object.entries(totaux.tva_detail).map(([t, d]) => (
                <div key={t} className="flex justify-between text-slate-400 text-xs"><span>TVA {t}%</span><span>{formatMontant(d.montant)}</span></div>
              ))}
              <div className="flex justify-between text-white font-bold pt-2 border-t border-slate-700">
                <span>TOTAL TTC</span><span className="text-amber-400">{formatMontant(totaux.total_ttc)}</span>
              </div>
              {form.acompte_verse > 0 && (
                <div className="flex justify-between text-slate-300">
                  <span>Net à régler</span>
                  <span>{formatMontant(Math.max(0, totaux.total_ttc - form.acompte_verse))}</span>
                </div>
              )}
            </div>
          </div>

          {/* Moyen paiement */}
          <div className="bg-slate-800 rounded-2xl border border-slate-700 p-5 space-y-4">
            <h2 className="text-white font-semibold">Paiement</h2>
            <div>
              <label className="text-sm text-slate-300 block mb-1">Moyen de paiement accepté</label>
              <select value={form.moyen_paiement} onChange={e => set('moyen_paiement', e.target.value)}
                className="w-full bg-slate-900 border border-slate-600 rounded-xl text-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none">
                <option value="virement">Virement bancaire</option>
                <option value="cheque">Chèque</option>
                <option value="especes">Espèces</option>
                <option value="cb">Carte bancaire</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-slate-300 block mb-1">Conditions de paiement</label>
              <input value={form.conditions_paiement} onChange={e => set('conditions_paiement', e.target.value)}
                placeholder="Ex : Paiement à 30 jours"
                className="w-full bg-slate-900 border border-slate-600 rounded-xl text-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none placeholder-slate-500" />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button type="button" variant="secondary" onClick={() => navigate(-1)} className="flex-1">Annuler</Button>
            <Button type="submit" className="flex-1">
              <Save size={16} /> {existant ? 'Mettre à jour' : 'Créer la facture'}
            </Button>
          </div>
        </form>

        <CataloguePicker
          open={showCatalogue}
          onClose={() => setShowCatalogue(false)}
          onAjouter={ajouterDepuisCatalogue}
        />
      </div>
    </PageTransition>
  )
}
