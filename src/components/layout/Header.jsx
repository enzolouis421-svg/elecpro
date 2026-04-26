// Header mobile — titre de page + menu hamburger
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { NavLink, useLocation } from 'react-router-dom'
import {
  Zap, Menu, X,
  LayoutDashboard, Users, HardHat, FileText, Receipt, Settings,
} from 'lucide-react'
import { useApp } from '../../context/AppContext'

const TITLES = {
  '/': 'Tableau de bord',
  '/clients': 'Clients',
  '/chantiers': 'Chantiers',
  '/devis': 'Devis',
  '/factures': 'Factures',
  '/parametres': 'Paramètres',
  '/comptabilite': 'Export compta',
  '/planning': 'Planning',
  '/tresorerie': 'Trésorerie',
  '/fiscal': 'Prévisionnel fiscal',
}

const NAV_ITEMS = [
  { to: '/', label: 'Tableau de bord', icon: LayoutDashboard, exact: true },
  { to: '/clients', label: 'Clients', icon: Users },
  { to: '/chantiers', label: 'Chantiers', icon: HardHat },
  { to: '/devis', label: 'Devis', icon: FileText },
  { to: '/factures', label: 'Factures', icon: Receipt },
]

function getTitle(pathname) {
  if (pathname === '/') return TITLES['/']
  const key = Object.keys(TITLES).find(k => k !== '/' && pathname.startsWith(k))
  return key ? TITLES[key] : 'ElecPro'
}

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()
  const { factures } = useApp()
  const nbImpayes = factures.filter(f => f.statut === 'en_retard').length

  function close() { setMenuOpen(false) }

  return (
    <>
      <header className="md:hidden flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-700 sticky top-0 z-40">
        {/* Logo + titre */}
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

        {/* Bouton hamburger */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => setMenuOpen(o => !o)}
          className="w-9 h-9 flex items-center justify-center text-slate-400 hover:text-white transition-colors rounded-xl hover:bg-slate-800"
          aria-label="Menu"
        >
          <AnimatePresence mode="wait" initial={false}>
            {menuOpen
              ? <motion.span key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}><X size={20} /></motion.span>
              : <motion.span key="open" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}><Menu size={20} /></motion.span>
            }
          </AnimatePresence>
        </motion.button>
      </header>

      {/* Overlay backdrop */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            onClick={close}
          />
        )}
      </AnimatePresence>

      {/* Panel slide-in depuis la droite */}
      <AnimatePresence>
        {menuOpen && (
          <motion.nav
            key="menu"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            className="md:hidden fixed top-0 right-0 h-full w-72 bg-slate-900 border-l border-slate-700 z-50 flex flex-col shadow-2xl"
          >
            {/* Header du panel */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-amber-500 rounded-xl flex items-center justify-center">
                  <Zap size={16} className="text-black" />
                </div>
                <div>
                  <p className="text-white font-bold text-sm leading-none">ElecPro</p>
                  <p className="text-slate-500 text-xs mt-0.5">Gestion électricien</p>
                </div>
              </div>
              <button onClick={close} className="text-slate-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-slate-800">
                <X size={18} />
              </button>
            </div>

            {/* Liens navigation */}
            <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
              {NAV_ITEMS.map(({ to, label, icon: Icon, exact }) => {
                const isActive = exact ? location.pathname === to : location.pathname.startsWith(to)
                return (
                  <NavLink key={to} to={to} end={exact} onClick={close}>
                    <motion.div
                      whileTap={{ scale: 0.97 }}
                      className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-colors relative ${
                        isActive
                          ? 'bg-amber-500/15 text-amber-400'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      <Icon size={18} className="flex-shrink-0" />
                      <span className="text-sm font-medium">{label}</span>
                      {/* Badge impayés sur Factures */}
                      {to === '/factures' && nbImpayes > 0 && (
                        <motion.span
                          animate={{ scale: [1, 1.15, 1] }}
                          transition={{ repeat: Infinity, duration: 2 }}
                          className="ml-auto bg-red-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center"
                        >
                          {nbImpayes}
                        </motion.span>
                      )}
                    </motion.div>
                  </NavLink>
                )
              })}
            </div>

            {/* Paramètres en bas */}
            <div className="px-3 py-4 border-t border-slate-700">
              <NavLink to="/parametres" onClick={close}>
                <motion.div
                  whileTap={{ scale: 0.97 }}
                  className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-colors ${
                    location.pathname.startsWith('/parametres')
                      ? 'bg-amber-500/15 text-amber-400'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Settings size={18} className="flex-shrink-0" />
                  <span className="text-sm font-medium">Paramètres</span>
                </motion.div>
              </NavLink>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </>
  )
}
