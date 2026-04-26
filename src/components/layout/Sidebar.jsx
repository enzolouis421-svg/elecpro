// Sidebar desktop — navigation principale
import { useState, useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  LayoutDashboard, Users, HardHat, FileText, Receipt, Settings, Zap,
  BookOpen, CalendarDays, Wallet, Calculator, LogOut, User,
} from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { isSupabaseConfigured, sbSignOut, sbGetUser } from '../../lib/supabase'
import toast from 'react-hot-toast'

const NAV_GROUPS = [
  {
    label: 'GESTION',
    items: [
      { to: '/', label: 'Tableau de bord', icon: LayoutDashboard, exact: true },
      { to: '/clients', label: 'Clients', icon: Users },
      { to: '/chantiers', label: 'Chantiers', icon: HardHat },
      { to: '/devis', label: 'Devis', icon: FileText },
      { to: '/factures', label: 'Factures', icon: Receipt },
    ],
  },
  {
    label: 'FINANCES',
    items: [
      { to: '/tresorerie', label: 'Trésorerie', icon: Wallet },
      { to: '/fiscal', label: 'Prévisionnel fiscal', icon: Calculator },
      { to: '/comptabilite', label: 'Export compta', icon: BookOpen },
    ],
  },
  {
    label: 'OUTILS',
    items: [
      { to: '/planning', label: 'Planning', icon: CalendarDays },
    ],
  },
]

export default function Sidebar() {
  const location = useLocation()
  const { factures } = useApp()
  const nbImpayes = factures.filter(f => f.statut === 'en_retard').length
  const [userEmail, setUserEmail] = useState('')

  useEffect(() => {
    if (isSupabaseConfigured) {
      sbGetUser().then(u => setUserEmail(u?.email || '')).catch(() => {})
    }
  }, [])

  async function handleLogout() {
    try {
      await sbSignOut()
      toast.success('Déconnecté')
    } catch (err) {
      toast.error('Erreur lors de la déconnexion')
    }
  }

  return (
    <aside className="hidden md:flex flex-col w-60 bg-slate-900 border-r border-slate-700 min-h-screen">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-6 border-b border-slate-700">
        <div className="w-9 h-9 bg-amber-500 rounded-xl flex items-center justify-center shadow-lg">
          <Zap size={20} className="text-black" />
        </div>
        <div>
          <p className="text-white font-bold text-lg leading-none">ElecPro</p>
          <p className="text-slate-400 text-xs mt-0.5">Gestion électricien</p>
        </div>
      </div>

      {/* Navigation avec groupes */}
      <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto">
        {NAV_GROUPS.map(group => (
          <div key={group.label}>
            <p className="text-slate-600 text-[10px] font-semibold tracking-widest px-3 mb-1.5">{group.label}</p>
            <div className="space-y-0.5">
              {group.items.map(({ to, label, icon: Icon, exact }) => {
                const isActive = exact ? location.pathname === to : location.pathname.startsWith(to)
                return (
                  <NavLink key={to} to={to} end={exact}>
                    <motion.div
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-colors relative ${
                        isActive
                          ? 'bg-amber-500/15 text-amber-400'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800'
                      }`}
                      whileHover={{ x: 2 }}
                      transition={{ duration: 0.15 }}
                    >
                      {isActive && (
                        <motion.div
                          layoutId="sidebar-active"
                          className="absolute inset-0 bg-amber-500/10 rounded-xl border border-amber-500/20"
                          transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
                        />
                      )}
                      <Icon size={18} className="relative z-10 flex-shrink-0" />
                      <span className="text-sm font-medium relative z-10">{label}</span>

                      {/* Badge impayés sur Factures */}
                      {to === '/factures' && nbImpayes > 0 && (
                        <motion.span
                          animate={{ scale: [1, 1.15, 1] }}
                          transition={{ repeat: Infinity, duration: 2 }}
                          className="ml-auto bg-red-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center relative z-10"
                        >
                          {nbImpayes}
                        </motion.span>
                      )}
                    </motion.div>
                  </NavLink>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bas de sidebar : user + paramètres + déconnexion */}
      <div className="px-3 py-4 border-t border-slate-700 space-y-1">
        {/* Info utilisateur (si connecté à Supabase) */}
        {isSupabaseConfigured && userEmail && (
          <div className="flex items-center gap-2 px-3 py-2 mb-1">
            <div className="w-7 h-7 bg-amber-500/20 rounded-full flex items-center justify-center flex-shrink-0">
              <User size={13} className="text-amber-400" />
            </div>
            <p className="text-slate-400 text-xs truncate flex-1">{userEmail}</p>
          </div>
        )}

        <NavLink to="/parametres">
          <motion.div
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-colors ${
              location.pathname.startsWith('/parametres')
                ? 'bg-amber-500/15 text-amber-400'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
            whileHover={{ x: 2 }}
          >
            <Settings size={18} />
            <span className="text-sm font-medium">Paramètres</span>
          </motion.div>
        </NavLink>

        {/* Déconnexion (visible uniquement si Supabase configuré) */}
        {isSupabaseConfigured && (
          <motion.button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-500 hover:text-red-400 hover:bg-red-900/10 transition-colors"
            whileHover={{ x: 2 }}
          >
            <LogOut size={17} />
            <span className="text-sm font-medium">Déconnexion</span>
          </motion.button>
        )}
      </div>
    </aside>
  )
}
