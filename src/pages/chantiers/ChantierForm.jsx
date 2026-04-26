// Formulaire chantier — création et modification
import { useState } from 'react'
import { useNavigate, useParams, useSearchParams, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Save } from 'lucide-react'
import toast from 'react-hot-toast'
import { useApp } from '../../context/AppContext'
import { today } from '../../lib/utils'
import PageTransition from '../../components/layout/PageTransition'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'

export default function ChantierForm() {
  const navigate = useNavigate()
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const location = useLocation()
  const { chantiers, clients, addChantier, updateChantier } = useApp()

  const existant = id && id !== 'nouveau' ? chantiers.find(c => c.id === id) : null
  const clientIdParam = searchParams.get('client') || ''
  const prefillIA = location.state?.prefill || {}

  const [form, setForm] = useState({
    nom: '',
    client_id: clientIdParam,
    adresse: '',
    cp: '',
    ville: '',
    description: '',
    statut: 'preparation',
    date_debut: today(),
    date_fin_prevue: '',
    ...prefillIA,
    ...(existant || {}),
  })

  function set(key, val) {
    setForm(f => ({ ...f, [key]: val }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.nom.trim()) { toast.error('Nom du chantier requis'); return }

    if (existant) {
      await updateChantier(existant.id, form)
      toast.success('Chantier mis à jour')
      navigate(`/chantiers/${existant.id}`)
    } else {
      const c = await addChantier(form)
      toast.success('Chantier créé')
      navigate(`/chantiers/${c.id}`)
    }
  }

  return (
    <PageTransition>
      <div className="p-4 md:p-6 max-w-2xl mx-auto pb-8">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)} className="text-slate-400 hover:text-white transition-colors">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-bold text-white">
            {existant ? 'Modifier le chantier' : 'Nouveau chantier'}
          </h1>
        </div>

        <motion.form
          onSubmit={handleSubmit}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Infos principales */}
          <div className="bg-slate-800 rounded-2xl border border-slate-700 p-5 space-y-4">
            <h2 className="text-white font-semibold">Informations</h2>
            <Input
              label="Nom du chantier *"
              value={form.nom}
              onChange={e => set('nom', e.target.value)}
              placeholder="Rénovation électrique appartement"
            />
            <div>
              <label className="text-sm font-medium text-slate-300 block mb-1">Client</label>
              <select
                value={form.client_id}
                onChange={e => set('client_id', e.target.value)}
                className="w-full bg-slate-900 border border-slate-600 rounded-xl text-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none"
              >
                <option value="">— Sélectionner un client —</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.societe || `${c.prenom} ${c.nom}`}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-300 block mb-1">Statut</label>
              <select
                value={form.statut}
                onChange={e => set('statut', e.target.value)}
                className="w-full bg-slate-900 border border-slate-600 rounded-xl text-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none"
              >
                <option value="preparation">Préparation</option>
                <option value="en_cours">En cours</option>
                <option value="pause">En pause</option>
                <option value="termine">Terminé</option>
              </select>
            </div>
            <textarea
              value={form.description}
              onChange={e => set('description', e.target.value)}
              placeholder="Description du chantier..."
              rows={3}
              className="w-full bg-slate-900 border border-slate-600 rounded-xl text-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none placeholder-slate-500 resize-none"
            />
          </div>

          {/* Adresse */}
          <div className="bg-slate-800 rounded-2xl border border-slate-700 p-5 space-y-4">
            <h2 className="text-white font-semibold">Adresse du chantier</h2>
            <Input label="Adresse" value={form.adresse} onChange={e => set('adresse', e.target.value)} placeholder="1 rue de la Paix" />
            <div className="grid grid-cols-3 gap-4">
              <Input label="Code postal" value={form.cp} onChange={e => set('cp', e.target.value)} placeholder="75001" />
              <div className="col-span-2">
                <Input label="Ville" value={form.ville} onChange={e => set('ville', e.target.value)} placeholder="Paris" />
              </div>
            </div>
          </div>

          {/* Dates */}
          <div className="bg-slate-800 rounded-2xl border border-slate-700 p-5">
            <h2 className="text-white font-semibold mb-4">Planification</h2>
            <div className="grid grid-cols-2 gap-4">
              <Input type="date" label="Date de début" value={form.date_debut} onChange={e => set('date_debut', e.target.value)} />
              <Input type="date" label="Fin prévue" value={form.date_fin_prevue} onChange={e => set('date_fin_prevue', e.target.value)} />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button type="button" variant="secondary" onClick={() => navigate(-1)} className="flex-1">Annuler</Button>
            <Button type="submit" className="flex-1">
              <Save size={16} /> {existant ? 'Mettre à jour' : 'Créer le chantier'}
            </Button>
          </div>
        </motion.form>
      </div>
    </PageTransition>
  )
}
