// Header mobile — titre de page + actions
import { motion } from 'framer-motion'
import { useLocation } from 'react-router-dom'
import { Zap } from 'lucide-react'

const TITLES = {
  '/': 'Tableau de bord',
  '/clients': 'Clients',
  '/chantiers': 'Chantiers',
  '/devis': 'Devis',
  '/factures': 'Factures',
  '/parametres': 'Paramètres',
}

function getTitle(pathname) {
  if (pathname === '/') return TITLES['/']
  const key = Object.keys(TITLES).find(k => k !== '/' && pathname.startsWith(k))
  return key ? TITLES[key] : 'ElecPro'
}

export default function Header() {
  const location = useLocation()

  return (
    <header className="md:hidden flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-700 sticky top-0 z-30">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 bg-amber-500 rounded-lg flex items-center justify-center">
          <Zap size={14} className="text-black" />
        </div>
        <motion.h1
          key={location.pathname}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-white font-semibold text-base"
        >
          {getTitle(location.pathname)}
        </motion.h1>
      </div>
    </header>
  )
}
