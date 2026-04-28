// Paramètres — 5 onglets : Entreprise, Facturation, Paiement, IA, Compte
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Building2, FileText, CreditCard, Zap, User, Save, Upload, Eye, EyeOff, BookOpen, Plus, Pencil, Trash2, Check, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { useApp } from '../../context/AppContext'
import PageTransition from '../../components/layout/PageTransition'
import Button from '../../components/ui/Button'

const ONGLETS = [
  { id: 'entreprise', label: 'Entreprise', icon: Building2 },
  { id: 'facturation', label: 'Facturation', icon: FileText },
  { id: 'paiement', label: 'Paiement', icon: CreditCard },
  { id: 'catalogue', label: 'Catalogue', icon: BookOpen },
  { id: 'ia', label: 'IA', icon: Zap },
  { id: 'compte', label: 'Compte', icon: User },
]

const UNITES = ['u', 'h', 'm', 'm²', 'm³', 'forfait', 'jour']
const TVA_OPTIONS = [0, 5.5, 10, 20]

function PrestationRow({ p, onSave, onDelete }) {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState(p)

  function set(key, val) { setForm(f => ({ ...f, [key]: val })) }

  function handleSave() {
    onSave(p.id, form)
    setEditing(false)
    toast.success('Prestation mise à jour')
  }

  if (editing) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-slate-700/50 border border-amber-500/30 rounded-xl p-3 space-y-2"
      >
        <div className="grid grid-cols-2 gap-2">
          <input
            value={form.description}
            onChange={e => set('description', e.target.value)}
            placeholder="Description"
            className="col-span-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm px-2 py-1.5 focus:border-amber-500 focus:outline-none"
          />
          <input
            value={form.categorie || ''}
            onChange={e => set('categorie', e.target.value)}
            placeholder="Catégorie"
            className="bg-slate-900 border border-slate-600 rounded-lg text-white text-sm px-2 py-1.5 focus:border-amber-500 focus:outline-none"
          />
          <div className="flex gap-1">
            <input
              type="number"
              value={form.prix_ht}
              onChange={e => set('prix_ht', parseFloat(e.target.value) || 0)}
              placeholder="Prix HT"
              className="flex-1 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm px-2 py-1.5 focus:border-amber-500 focus:outline-none"
            />
            <select
              value={form.unite}
              onChange={e => set('unite', e.target.value)}
              className="bg-slate-900 border border-slate-600 rounded-lg text-white text-xs px-1 py-1.5 focus:border-amber-500 focus:outline-none"
            >
              {UNITES.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
            <select
              value={form.tva}
              onChange={e => set('tva', parseFloat(e.target.value))}
              className="bg-slate-900 border border-slate-600 rounded-lg text-white text-xs px-1 py-1.5 focus:border-amber-500 focus:outline-none"
            >
              {TVA_OPTIONS.map(t => <option key={t} value={t}>{t}%</option>)}
            </select>
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <button onClick={() => setEditing(false)} className="text-slate-400 hover:text-white text-xs px-2 py-1 flex items-center gap-1">
            <X size={12} /> Annuler
          </button>
          <button onClick={handleSave} className="bg-amber-500 hover:bg-amber-400 text-black text-xs px-3 py-1 rounded-lg flex items-center gap-1 font-medium">
            <Check size={12} /> Enregistrer
          </button>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      layout
      className="flex items-center gap-3 px-3 py-2.5 bg-slate-800/50 hover:bg-slate-700/50 rounded-xl group transition-colors"
    >
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm truncate">{p.description}</p>
        <p className="text-slate-500 text-xs">
          <span className="text-amber-400 font-medium">{p.prix_ht}€</span> HT / {p.unite} · TVA {p.tva}%
          {p.categorie && <span className="ml-2 text-slate-600">• {p.categorie}</span>}
        </p>
      </div>
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => setEditing(true)}
          className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
        >
          <Pencil size={12} />
        </button>
        <button
          onClick={() => onDelete(p.id)}
          className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
        >
          <Trash2 size={12} />
        </button>
      </div>
    </motion.div>
  )
}

export default function Parametres() {
  const { settings, updateSettings, prestations, addPrestation, updatePrestation, deletePrestation } = useApp()
  const [onglet, setOnglet] = useState('entreprise')
  const [showKey, setShowKey] = useState(false)
  const [form, setForm] = useState(() => settings)
  const [newPresta, setNewPresta] = useState({ description: '', categorie: '', prix_ht: '', unite: 'u', tva: 10 })
  const [showNewForm, setShowNewForm] = useState(false)
  const [searchCat, setSearchCat] = useState('')

  const categories = [...new Set(prestations.map(p => p.categorie).filter(Boolean).sort())]
  const filteredPrestations = prestations.filter(p =>
    !searchCat || p.description.toLowerCase().includes(searchCat.toLowerCase()) || (p.categorie || '').toLowerCase().includes(searchCat.toLowerCase())
  )

  async function handleAddPresta() {
    if (!newPresta.description.trim()) { toast.error('Description requise'); return }
    await addPrestation({ ...newPresta, prix_ht: parseFloat(newPresta.prix_ht) || 0 })
    setNewPresta({ description: '', categorie: '', prix_ht: '', unite: 'u', tva: 10 })
    setShowNewForm(false)
    toast.success('Prestation ajoutée')
  }

  async function handleDeletePresta(id) {
    if (!confirm('Supprimer cette prestation ?')) return
    await deletePrestation(id)
    toast.success('Prestation supprimée')
  }

  function setSection(section, key, val) {
    setForm(f => ({ ...f, [section]: { ...f[section], [key]: val } }))
  }

  function handleSauvegarder() {
    updateSettings(form)
    toast.success('Paramètres sauvegardés')
  }

  function handleLogo(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setSection('entreprise', 'logo_base64', ev.target.result)
    reader.readAsDataURL(file)
  }

  function toggleMoyen(moyen) {
    const actuel = form.paiement.moyens_acceptes || []
    const nouveau = actuel.includes(moyen)
      ? actuel.filter(m => m !== moyen)
      : [...actuel, moyen]
    setSection('paiement', 'moyens_acceptes', nouveau)
  }

  if (!settings || !form) return null

  return (
    <PageTransition>
      <div className="p-4 md:p-6 max-w-4xl mx-auto pb-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-white">Paramètres</h1>
          <Button onClick={handleSauvegarder}>
            <Save size={16} /> Sauvegarder
          </Button>
        </div>

        {/* Onglets */}
        <div className="flex gap-1 bg-slate-800/50 rounded-xl p-1 mb-6 overflow-x-auto">
          {ONGLETS.map(o => {
            const Icon = o.icon
            return (
              <button
                key={o.id}
                onClick={() => setOnglet(o.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  onglet === o.id ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Icon size={15} />
                {o.label}
              </button>
            )
          })}
        </div>

        <motion.div
          key={onglet}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-5"
        >
          {/* ── ENTREPRISE ──────────────────────────────────────── */}
          {onglet === 'entreprise' && (
            <>
              <div className="bg-slate-800 rounded-2xl border border-slate-700 p-5 space-y-4">
                <h2 className="text-white font-semibold">Logo</h2>
                <div className="flex items-center gap-4">
                  {form.entreprise.logo_base64 ? (
                    <img src={form.entreprise.logo_base64} alt="Logo" className="h-16 w-auto object-contain bg-white rounded-xl p-2" />
                  ) : (
                    <div className="h-16 w-24 bg-slate-700 rounded-xl flex items-center justify-center text-slate-500 text-xs">
                      Pas de logo
                    </div>
                  )}
                  <label className="cursor-pointer">
                    <Button type="button" variant="secondary" size="sm" as="span">
                      <Upload size={14} /> Téléverser
                    </Button>
                    <input type="file" accept="image/*" onChange={handleLogo} className="hidden" />
                  </label>
                  {form.entreprise.logo_base64 && (
                    <button onClick={() => setSection('entreprise', 'logo_base64', '')}
                      className="text-slate-500 hover:text-red-400 text-xs transition-colors">
                      Supprimer
                    </button>
                  )}
                </div>
              </div>

              <div className="bg-slate-800 rounded-2xl border border-slate-700 p-5 space-y-4">
                <h2 className="text-white font-semibold">Informations légales</h2>
                {[
                  { key: 'nom', label: 'Nom de l\'entreprise', placeholder: 'Mon Entreprise Électrique' },
                  { key: 'forme_juridique', label: 'Forme juridique', placeholder: 'Auto-entrepreneur, SARL...' },
                  { key: 'siret', label: 'SIRET', placeholder: '000 000 000 00000' },
                  { key: 'tva_intra', label: 'N° TVA intracommunautaire', placeholder: 'FR00000000000' },
                  { key: 'assurance', label: 'Assurance décennale', placeholder: 'Compagnie n°XXXXX' },
                ].map(({ key, label, placeholder }) => (
                  <div key={key}>
                    <label className="text-sm text-slate-300 block mb-1">{label}</label>
                    <input
                      value={form.entreprise[key] || ''}
                      onChange={e => setSection('entreprise', key, e.target.value)}
                      placeholder={placeholder}
                      className="w-full bg-slate-900 border border-slate-600 rounded-xl text-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none placeholder-slate-500"
                    />
                  </div>
                ))}
              </div>

              <div className="bg-slate-800 rounded-2xl border border-slate-700 p-5 space-y-4">
                <h2 className="text-white font-semibold">Coordonnées</h2>
                {[
                  { key: 'adresse', label: 'Adresse', placeholder: '1 rue de la Paix' },
                  { key: 'cp', label: 'Code postal', placeholder: '75001' },
                  { key: 'ville', label: 'Ville', placeholder: 'Paris' },
                  { key: 'tel', label: 'Téléphone', placeholder: '06 00 00 00 00' },
                  { key: 'email', label: 'Email', placeholder: 'contact@monentreprise.fr' },
                  { key: 'site', label: 'Site web', placeholder: 'www.monentreprise.fr' },
                ].map(({ key, label, placeholder }) => (
                  <div key={key}>
                    <label className="text-sm text-slate-300 block mb-1">{label}</label>
                    <input
                      value={form.entreprise[key] || ''}
                      onChange={e => setSection('entreprise', key, e.target.value)}
                      placeholder={placeholder}
                      className="w-full bg-slate-900 border border-slate-600 rounded-xl text-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none placeholder-slate-500"
                    />
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ── FACTURATION ─────────────────────────────────────── */}
          {onglet === 'facturation' && (
            <>
              <div className="bg-slate-800 rounded-2xl border border-slate-700 p-5 space-y-5">
                <div>
                  <h2 className="text-white font-semibold">Numérotation</h2>
                  <p className="text-slate-500 text-xs mt-1">
                    Configurez les préfixes et le numéro de départ — utile si vous commencez à utiliser ElecPro en cours d'activité.
                  </p>
                </div>

                {/* Devis */}
                <div className="bg-slate-700/30 rounded-xl p-4 space-y-3">
                  <p className="text-slate-300 text-sm font-medium">Devis</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">Préfixe</label>
                      <input
                        value={form.facturation.prefixe_devis || ''}
                        onChange={e => setSection('facturation', 'prefixe_devis', e.target.value)}
                        placeholder="DEV"
                        className="w-full bg-slate-900 border border-slate-600 rounded-xl text-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none placeholder-slate-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">Prochain numéro</label>
                      <input
                        type="number"
                        min="1"
                        value={form.facturation.compteur_devis || 1}
                        onChange={e => setSection('facturation', 'compteur_devis', parseInt(e.target.value) || 1)}
                        className="w-full bg-slate-900 border border-slate-600 rounded-xl text-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 bg-slate-800 rounded-lg px-3 py-2">
                    <span className="text-slate-500 text-xs">Prochain devis :</span>
                    <span className="text-amber-400 text-xs font-mono font-bold">
                      {form.facturation.prefixe_devis || 'DEV'}-{new Date().getFullYear()}-{String(form.facturation.compteur_devis || 1).padStart(3, '0')}
                    </span>
                  </div>
                </div>

                {/* Factures */}
                <div className="bg-slate-700/30 rounded-xl p-4 space-y-3">
                  <p className="text-slate-300 text-sm font-medium">Factures</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">Préfixe</label>
                      <input
                        value={form.facturation.prefixe_facture || ''}
                        onChange={e => setSection('facturation', 'prefixe_facture', e.target.value)}
                        placeholder="FAC"
                        className="w-full bg-slate-900 border border-slate-600 rounded-xl text-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none placeholder-slate-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">Prochain numéro</label>
                      <input
                        type="number"
                        min="1"
                        value={form.facturation.compteur_facture || 1}
                        onChange={e => setSection('facturation', 'compteur_facture', parseInt(e.target.value) || 1)}
                        className="w-full bg-slate-900 border border-slate-600 rounded-xl text-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 bg-slate-800 rounded-lg px-3 py-2">
                    <span className="text-slate-500 text-xs">Prochaine facture :</span>
                    <span className="text-amber-400 text-xs font-mono font-bold">
                      {form.facturation.prefixe_facture || 'FAC'}-{new Date().getFullYear()}-{String(form.facturation.compteur_facture || 1).padStart(3, '0')}
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-2 bg-blue-900/20 border border-blue-800/30 rounded-xl p-3 text-xs text-blue-300">
                  <span className="flex-shrink-0 mt-0.5">ℹ️</span>
                  <span>Exemple : si vous avez déjà émis 23 factures cette année, mettez <strong>24</strong> pour que la prochaine soit <strong className="font-mono">{form.facturation.prefixe_facture || 'FAC'}-{new Date().getFullYear()}-024</strong></span>
                </div>

                <div className="grid sm:grid-cols-3 gap-4 pt-2 border-t border-slate-700">
                  {[
                    { key: 'tva_defaut', label: 'TVA par défaut (%)', type: 'number' },
                    { key: 'validite_devis', label: 'Validité devis (jours)', type: 'number' },
                    { key: 'delai_paiement', label: 'Délai paiement (jours)', type: 'number' },
                  ].map(({ key, label, type }) => (
                    <div key={key}>
                      <label className="text-sm text-slate-300 block mb-1">{label}</label>
                      <input type={type} value={form.facturation[key] || ''} onChange={e => setSection('facturation', key, parseFloat(e.target.value) || 0)}
                        className="w-full bg-slate-900 border border-slate-600 rounded-xl text-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none" />
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-slate-800 rounded-2xl border border-slate-700 p-5 space-y-4">
                <h2 className="text-white font-semibold">Couleur des documents</h2>
                <div className="flex items-center gap-4">
                  <input
                    type="color"
                    value={form.facturation.couleur_document || '#F59E0B'}
                    onChange={e => setSection('facturation', 'couleur_document', e.target.value)}
                    className="w-12 h-10 rounded-xl cursor-pointer border border-slate-600 bg-slate-900"
                  />
                  <span className="text-slate-300 text-sm">{form.facturation.couleur_document || '#F59E0B'}</span>
                  <button onClick={() => setSection('facturation', 'couleur_document', '#F59E0B')}
                    className="text-slate-500 hover:text-white text-xs transition-colors">
                    Réinitialiser
                  </button>
                </div>
              </div>

              <div className="bg-slate-800 rounded-2xl border border-slate-700 p-5 space-y-4">
                <h2 className="text-white font-semibold">Conformité légale</h2>

                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm text-slate-300 font-medium">Franchise en base de TVA</p>
                    <p className="text-xs text-slate-500 mt-0.5">Ajoute automatiquement « TVA non applicable — art. 293 B du CGI » sur chaque document et masque les colonnes TVA. Obligatoire pour les auto-entrepreneurs sous les seuils de franchise.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSection('facturation', 'franchise_tva', !form.facturation.franchise_tva)}
                    className={`flex-shrink-0 w-12 h-6 rounded-full transition-colors relative ${form.facturation.franchise_tva ? 'bg-amber-500' : 'bg-slate-600'}`}
                  >
                    <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${form.facturation.franchise_tva ? 'left-7' : 'left-1'}`} />
                  </button>
                </div>

                <div className="flex items-start justify-between gap-4 pt-3 border-t border-slate-700">
                  <div>
                    <p className="text-sm text-slate-300 font-medium">Pénalités de retard automatiques</p>
                    <p className="text-xs text-slate-500 mt-0.5">Affiche en bas de chaque facture la mention légale : pénalité égale à 3× le taux d'intérêt légal + indemnité forfaitaire de 40 € (art. L441-10 du Code de Commerce). Obligatoire pour les factures B2B.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSection('facturation', 'penalites_retard', !form.facturation.penalites_retard)}
                    className={`flex-shrink-0 w-12 h-6 rounded-full transition-colors relative ${form.facturation.penalites_retard ? 'bg-amber-500' : 'bg-slate-600'}`}
                  >
                    <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${form.facturation.penalites_retard ? 'left-7' : 'left-1'}`} />
                  </button>
                </div>
              </div>

              <div className="bg-slate-800 rounded-2xl border border-slate-700 p-5 space-y-4">
                <h2 className="text-white font-semibold">Mentions légales personnalisées</h2>
                <p className="text-xs text-slate-500">Texte libre ajouté en pied de document (en plus des mentions automatiques ci-dessus).</p>
                <textarea
                  value={form.facturation.mentions_legales || ''}
                  onChange={e => setSection('facturation', 'mentions_legales', e.target.value)}
                  rows={3}
                  className="w-full bg-slate-900 border border-slate-600 rounded-xl text-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none resize-none"
                />
              </div>
            </>
          )}

          {/* ── PAIEMENT ────────────────────────────────────────── */}
          {onglet === 'paiement' && (
            <div className="bg-slate-800 rounded-2xl border border-slate-700 p-5 space-y-4">
              <h2 className="text-white font-semibold">Coordonnées bancaires</h2>
              {[
                { key: 'banque', label: 'Banque', placeholder: 'Ma Banque' },
                { key: 'iban', label: 'IBAN', placeholder: 'FR76 0000 0000 0000 0000 0000 000' },
                { key: 'bic', label: 'BIC / SWIFT', placeholder: 'XXXXFRXX' },
              ].map(({ key, label, placeholder }) => (
                <div key={key}>
                  <label className="text-sm text-slate-300 block mb-1">{label}</label>
                  <input value={form.paiement[key] || ''} onChange={e => setSection('paiement', key, e.target.value)}
                    placeholder={placeholder}
                    className="w-full bg-slate-900 border border-slate-600 rounded-xl text-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none placeholder-slate-500" />
                </div>
              ))}

              <div>
                <label className="text-sm text-slate-300 block mb-2">Moyens de paiement acceptés</label>
                <div className="flex gap-3 flex-wrap">
                  {[
                    { id: 'virement', label: 'Virement' },
                    { id: 'cheque', label: 'Chèque' },
                    { id: 'especes', label: 'Espèces' },
                    { id: 'cb', label: 'CB' },
                  ].map(m => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => toggleMoyen(m.id)}
                      className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors border ${
                        (form.paiement.moyens_acceptes || []).includes(m.id)
                          ? 'bg-amber-500 text-black border-amber-500'
                          : 'bg-slate-700 text-slate-300 border-slate-600 hover:text-white'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── CATALOGUE ───────────────────────────────────────── */}
          {onglet === 'catalogue' && (
            <div className="space-y-4">
              {/* Header + bouton ajouter */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-semibold">{prestations.length} prestation{prestations.length > 1 ? 's' : ''}</p>
                  <p className="text-slate-500 text-xs mt-0.5">Disponibles dans le catalogue lors de la création de devis</p>
                </div>
                <Button size="sm" onClick={() => setShowNewForm(v => !v)}>
                  <Plus size={14} /> Nouvelle
                </Button>
              </div>

              {/* Formulaire nouvelle prestation */}
              <AnimatePresence>
                {showNewForm && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-slate-800 border border-amber-500/30 rounded-2xl p-4 space-y-3 overflow-hidden"
                  >
                    <p className="text-white font-medium text-sm">Nouvelle prestation</p>
                    <input
                      value={newPresta.description}
                      onChange={e => setNewPresta(f => ({ ...f, description: e.target.value }))}
                      placeholder="Description de la prestation *"
                      className="w-full bg-slate-900 border border-slate-600 rounded-xl text-white text-sm px-3 py-2 focus:border-amber-500 focus:outline-none placeholder-slate-500"
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        value={newPresta.categorie}
                        onChange={e => setNewPresta(f => ({ ...f, categorie: e.target.value }))}
                        placeholder="Catégorie (ex: Tableau, Prises…)"
                        list="categories-list"
                        className="bg-slate-900 border border-slate-600 rounded-xl text-white text-sm px-3 py-2 focus:border-amber-500 focus:outline-none placeholder-slate-500"
                      />
                      <datalist id="categories-list">
                        {categories.map(c => <option key={c} value={c} />)}
                      </datalist>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          value={newPresta.prix_ht}
                          onChange={e => setNewPresta(f => ({ ...f, prix_ht: e.target.value }))}
                          placeholder="Prix HT (€)"
                          className="flex-1 bg-slate-900 border border-slate-600 rounded-xl text-white text-sm px-3 py-2 focus:border-amber-500 focus:outline-none placeholder-slate-500"
                        />
                      </div>
                      <div className="flex gap-2">
                        <select
                          value={newPresta.unite}
                          onChange={e => setNewPresta(f => ({ ...f, unite: e.target.value }))}
                          className="flex-1 bg-slate-900 border border-slate-600 rounded-xl text-white text-sm px-2 py-2 focus:border-amber-500 focus:outline-none"
                        >
                          {UNITES.map(u => <option key={u} value={u}>{u}</option>)}
                        </select>
                        <select
                          value={newPresta.tva}
                          onChange={e => setNewPresta(f => ({ ...f, tva: parseFloat(e.target.value) }))}
                          className="flex-1 bg-slate-900 border border-slate-600 rounded-xl text-white text-sm px-2 py-2 focus:border-amber-500 focus:outline-none"
                        >
                          {TVA_OPTIONS.map(t => <option key={t} value={t}>TVA {t}%</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button variant="secondary" size="sm" onClick={() => setShowNewForm(false)}>Annuler</Button>
                      <Button size="sm" onClick={handleAddPresta}><Check size={14} /> Ajouter</Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Recherche */}
              <div className="relative">
                <input
                  value={searchCat}
                  onChange={e => setSearchCat(e.target.value)}
                  placeholder="Rechercher dans le catalogue…"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl text-white text-sm px-3 py-2 focus:border-amber-500 focus:outline-none placeholder-slate-500"
                />
              </div>

              {/* Liste groupée par catégorie */}
              <div className="space-y-4">
                {categories
                  .filter(cat => filteredPrestations.some(p => p.categorie === cat))
                  .map(cat => (
                    <div key={cat} className="bg-slate-800 border border-slate-700 rounded-2xl p-3">
                      <p className="text-amber-400 text-xs font-semibold uppercase tracking-wide mb-2 px-1">{cat}</p>
                      <div className="space-y-1">
                        {filteredPrestations
                          .filter(p => p.categorie === cat)
                          .map(p => (
                            <PrestationRow
                              key={p.id}
                              p={p}
                              onSave={updatePrestation}
                              onDelete={handleDeletePresta}
                            />
                          ))}
                      </div>
                    </div>
                  ))
                }
                {/* Sans catégorie */}
                {filteredPrestations.filter(p => !p.categorie).length > 0 && (
                  <div className="bg-slate-800 border border-slate-700 rounded-2xl p-3">
                    <p className="text-slate-500 text-xs font-semibold uppercase tracking-wide mb-2 px-1">Sans catégorie</p>
                    <div className="space-y-1">
                      {filteredPrestations.filter(p => !p.categorie).map(p => (
                        <PrestationRow key={p.id} p={p} onSave={updatePrestation} onDelete={handleDeletePresta} />
                      ))}
                    </div>
                  </div>
                )}
                {filteredPrestations.length === 0 && (
                  <p className="text-slate-500 text-sm text-center py-8">Aucune prestation trouvée</p>
                )}
              </div>
            </div>
          )}

          {/* ── IA ──────────────────────────────────────────────── */}
          {onglet === 'ia' && (
            <div className="space-y-5">
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 text-sm">
                <div className="flex items-start gap-2">
                  <Zap size={16} className="text-amber-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-amber-300 font-medium">Assistant IA propulsé par Groq</p>
                    <p className="text-amber-400/80 text-xs mt-1">
                      Obtenez votre clé gratuite sur <a href="https://console.groq.com" target="_blank" rel="noopener noreferrer" className="underline">console.groq.com</a>.
                      Votre clé est sauvegardée dans Supabase et synchronisée sur tous vos appareils.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-slate-800 rounded-2xl border border-slate-700 p-5 space-y-4">
                <h2 className="text-white font-semibold">Configuration Groq</h2>

                <div>
                  <label className="text-sm text-slate-300 block mb-1">Clé API Groq</label>
                  <div className="relative">
                    <input
                      type={showKey ? 'text' : 'password'}
                      value={form.ia.groq_key || ''}
                      onChange={e => setSection('ia', 'groq_key', e.target.value)}
                      placeholder="gsk_xxxxxxxxxxxxxxxxxxxx"
                      className="w-full bg-slate-900 border border-slate-600 rounded-xl text-white px-3 py-2 pr-10 text-sm focus:border-amber-500 focus:outline-none placeholder-slate-500"
                    />
                    <button onClick={() => setShowKey(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors">
                      {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-sm text-slate-300 block mb-1">Modèle</label>
                  <select value={form.ia.modele || 'llama-3.1-8b-instant'} onChange={e => setSection('ia', 'modele', e.target.value)}
                    className="w-full bg-slate-900 border border-slate-600 rounded-xl text-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none">
                    <option value="llama-3.1-8b-instant">LLaMA 3.1 8B — Rapide (recommandé)</option>
                    <option value="llama-3.3-70b-versatile">LLaMA 3.3 70B — Puissant</option>
                    <option value="llama3-8b-8192">LLaMA 3 8B</option>
                    <option value="mixtral-8x7b-32768">Mixtral 8x7B</option>
                    <option value="gemma2-9b-it">Gemma 2 9B</option>
                  </select>
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-sm text-slate-300">Suggestions automatiques au démarrage</label>
                  <button
                    onClick={() => setSection('ia', 'suggestions_auto', !form.ia.suggestions_auto)}
                    className={`w-12 h-6 rounded-full transition-colors relative ${form.ia.suggestions_auto ? 'bg-amber-500' : 'bg-slate-600'}`}
                  >
                    <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${form.ia.suggestions_auto ? 'left-7' : 'left-1'}`} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── COMPTE ──────────────────────────────────────────── */}
          {onglet === 'compte' && (
            <div className="bg-slate-800 rounded-2xl border border-slate-700 p-5 space-y-4">
              <h2 className="text-white font-semibold">Mon compte</h2>
              {[
                { key: 'nom', label: 'Nom', placeholder: 'Prénom Nom' },
                { key: 'email', label: 'Email', placeholder: 'email@exemple.fr' },
              ].map(({ key, label, placeholder }) => (
                <div key={key}>
                  <label className="text-sm text-slate-300 block mb-1">{label}</label>
                  <input value={form.compte[key] || ''} onChange={e => setSection('compte', key, e.target.value)}
                    placeholder={placeholder}
                    className="w-full bg-slate-900 border border-slate-600 rounded-xl text-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none placeholder-slate-500" />
                </div>
              ))}
              <div className="pt-4 border-t border-slate-700">
                <p className="text-slate-400 text-xs">
                  Données sauvegardées dans Supabase et synchronisées en temps réel.
                </p>
              </div>
            </div>
          )}
        </motion.div>

        {/* Sauvegarder sticky mobile */}
        <div className="mt-6">
          <Button onClick={handleSauvegarder} className="w-full md:w-auto">
            <Save size={16} /> Sauvegarder les paramètres
          </Button>
        </div>
      </div>
    </PageTransition>
  )
}
