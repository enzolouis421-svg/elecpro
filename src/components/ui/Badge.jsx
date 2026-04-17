// Badge statut réutilisable
export default function Badge({ statut, type = 'devis', className = '' }) {
  const DEVIS = {
    brouillon: 'bg-slate-600 text-slate-200',
    envoye: 'bg-blue-600 text-white',
    accepte: 'bg-emerald-600 text-white',
    refuse: 'bg-red-600 text-white',
    expire: 'bg-orange-600 text-white',
  }
  const FACTURE = {
    brouillon: 'bg-slate-600 text-slate-200',
    envoyee: 'bg-blue-600 text-white',
    payee: 'bg-emerald-700 text-white',
    en_retard: 'bg-red-700 text-white',
  }
  const CHANTIER = {
    preparation: 'bg-blue-600 text-white',
    en_cours: 'bg-amber-500 text-black',
    termine: 'bg-emerald-600 text-white',
    pause: 'bg-orange-600 text-white',
  }

  const LABELS = {
    brouillon: 'Brouillon',
    envoye: 'Envoyé',
    accepte: 'Accepté',
    refuse: 'Refusé',
    expire: 'Expiré',
    envoyee: 'Envoyée',
    payee: 'Payée',
    en_retard: 'En retard',
    preparation: 'Préparation',
    en_cours: 'En cours',
    termine: 'Terminé',
    pause: 'En pause',
  }

  const map = type === 'facture' ? FACTURE : type === 'chantier' ? CHANTIER : DEVIS
  const classes = map[statut] || 'bg-slate-600 text-slate-200'

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${classes} ${className}`}>
      {LABELS[statut] || statut}
    </span>
  )
}
