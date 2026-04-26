// Navigation mobile — bottom nav
import { NavLink, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { LayoutDashboard, HardHat, FileText, Receipt, CalendarDays, Wallet } from 'lucide-react'

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { to: '/devis', label: 'Devis', icon: FileText },
  { to: '/factures', label: 'Factures', icon: Receipt },
  { to: '/planning', label: 'Planning', icon: CalendarDays },
  { to: '/tresorerie', label: 'Tréso', icon: Wallet },
]

export default function BottomNav() {
  const location = useLocation()

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-700 z-40">
      <div className="flex items-center">
        {NAV_ITEMS.map(({ to, label, icon: Icon, exact }) => {
          const isActive = exact ? location.pathname === to : location.pathname.startsWith(to)
          return (
            <NavLink key={to} to={to} end={exact} className="flex-1">
              <motion.div
                className={`flex flex-col items-center gap-1 py-2 ${
                  isActive ? 'text-amber-400' : 'text-slate-500'
                }`}
                whileTap={{ scale: 0.9 }}
              >
                {isActive && (
                  <motion.div
                    layoutId="bottom-active"
                    className="absolute top-0 h-0.5 w-8 bg-amber-500 rounded-b-full"
                  />
                )}
                <Icon size={20} />
                <span className="text-xs font-medium">{label}</span>
              </motion.div>
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}
