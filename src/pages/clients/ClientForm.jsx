// Formulaire client — création et modification
import { useState } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Save } from 'lucide-react'
import toast from 'react-hot-toast'
import { useApp } from '../../context/AppContext'
import PageTransition from '../../components/layout/PageTransition'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'

export default function ClientForm() {
  const navigate = useNavigate()
  const { id } = useParams()
  const location = useLocation()
  const { clients, addClient, updateClient } = useApp()

  const clientExistant = id && id !== 'nouveau' ? clients.find(c => c.id === id) : null
  const prefillIA = location.state?.prefill || {}

  const [form, setForm] = useState({
    type: 'particulier',
    nom: '',
    prenom: '',
    societe: '',
    adresse: '',
    cp: '',
    ville: '',
    telephone: '',
    email: '',
    siret: '',
    notes: '',
    ...prefillIA,
    ...(clientExistant || {}),
  })

  const [errors, setErrors] = useState({})

  function set(key, val) {
    setForm(f => ({ ...f, [key]: val }))
    if (errors[key]) setErrors(e => ({ ...e, [key]: null }))
  }

  function valider() {
    const errs = {}
    if (!form.nom.trim()) errs.nom = 'Nom requis'
    if (form.type === 'professionnel' && !form.societe.trim()) errs.societe = 'Société requise'
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Email invalide'
    return errs
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const errs = valider()
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      toast.error('Veuillez corriger les erreurs')
      return
    }

    if (clientExistant) {
      await updateClient(clientExistant.id, form)
      toast.success('Client mis à jour')
      navigate(`/clients/${clientExistant.id}`)
    } else {
      const c = await addClient(form)
      toast.success('Client créé')
      navigate(`/clients/${c.id}`)
    }
  }

  return (
    <PageTransition>
      <div className="p-4 md:p-6 max-w-2xl mx-auto pb-24 md:pb-6">
        {/* En-tête */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)} className="text-slate-400 hover:text-white transition-colors">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-bold text-white">
            {clientExistant ? 'Modifier le client' : 'Nouveau client'}
          </h1>
        </div>

        <motion.form
          onSubmit={handleSubmit}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Type */}
          <div className="bg-slate-800 rounded-2xl border border-slate-700 p-5">
            <h2 className="text-white font-semibold mb-4">Type de client</h2>
            <div className="flex gap-3">
              {[
                { id: 'particulier', label: 'Particulier' },
                { id: 'professionnel', label: 'Professionnel' },
              ].map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => set('type', t.id)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors border ${
                    form.type === t.id
                      ? 'bg-amber-500 text-black border-amber-500'
                      : 'bg-slate-700 text-slate-300 border-slate-600 hover:text-white'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Informations personnelles */}
          <div className="bg-slate-800 rounded-2xl border border-slate-700 p-5 space-y-4">
            <h2 className="text-white font-semibold">Informations</h2>
            {form.type === 'professionnel' && (
              <Input
                label="Société *"
                value={form.societe}
                onChange={e => set('societe', e.target.value)}
                placeholder="Nom de la société"
                error={errors.societe}
              />
            )}
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Nom *"
                value={form.nom}
                onChange={e => set('nom', e.target.value)}
                placeholder="Dupont"
                error={errors.nom}
              />
              <Input
                label="Prénom"
                value={form.prenom}
                onChange={e => set('prenom', e.target.value)}
                placeholder="Jean"
              />
            </div>
            <Input
              label="Email"
              type="email"
              value={form.email}
              onChange={e => set('email', e.target.value)}
              placeholder="jean.dupont@email.fr"
              error={errors.email}
            />
            <Input
              label="Téléphone"
              type="tel"
              value={form.telephone}
              onChange={e => set('telephone', e.target.value)}
              placeholder="06 00 00 00 00"
            />
          </div>

          {/* Adresse */}
          <div className="bg-slate-800 rounded-2xl border border-slate-700 p-5 space-y-4">
            <h2 className="text-white font-semibold">Adresse</h2>
            <Input
              label="Adresse"
              value={form.adresse}
              onChange={e => set('adresse', e.target.value)}
              placeholder="1 rue de la Paix"
            />
            <div className="grid grid-cols-3 gap-4">
              <Input
                label="Code postal"
                value={form.cp}
                onChange={e => set('cp', e.target.value)}
                placeholder="75001"
              />
              <div className="col-span-2">
                <Input
                  label="Ville"
                  value={form.ville}
                  onChange={e => set('ville', e.target.value)}
                  placeholder="Paris"
                />
              </div>
            </div>
          </div>

          {/* Infos pro */}
          {form.type === 'professionnel' && (
            <div className="bg-slate-800 rounded-2xl border border-slate-700 p-5 space-y-4">
              <h2 className="text-white font-semibold">Informations professionnelles</h2>
              <Input
                label="SIRET"
                value={form.siret}
                onChange={e => set('siret', e.target.value)}
                placeholder="000 000 000 00000"
              />
            </div>
          )}

          {/* Notes */}
          <div className="bg-slate-800 rounded-2xl border border-slate-700 p-5">
            <h2 className="text-white font-semibold mb-3">Notes internes</h2>
            <textarea
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              placeholder="Notes ou remarques sur ce client..."
              rows={3}
              className="w-full bg-slate-900 border border-slate-600 rounded-xl text-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none placeholder-slate-500 resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button type="button" variant="secondary" onClick={() => navigate(-1)} className="flex-1">
              Annuler
            </Button>
            <Button type="submit" className="flex-1">
              <Save size={16} /> {clientExistant ? 'Mettre à jour' : 'Créer le client'}
            </Button>
          </div>
        </motion.form>
      </div>
    </PageTransition>
  )
}
