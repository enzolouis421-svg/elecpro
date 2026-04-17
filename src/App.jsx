// Layout principal — sidebar + contenu + nav mobile + assistant IA
import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import Sidebar from './components/layout/Sidebar'
import BottomNav from './components/layout/BottomNav'
import Header from './components/layout/Header'
import AIAssistant from './components/ai/AIAssistant'
import { useApp } from './context/AppContext'

export default function App() {
  const location = useLocation()
  const { loading } = useApp()

  // Scroll en haut à chaque changement de route
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [location.pathname])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center">
            <span className="text-black font-bold text-xl">⚡</span>
          </div>
          <p className="text-slate-400 text-sm">Chargement d'ElecPro…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-slate-900">
      {/* Sidebar desktop */}
      <Sidebar />

      {/* Contenu principal */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header mobile */}
        <Header />

        {/* Zone de contenu avec animations de transition */}
        <main className="flex-1 overflow-auto">
          <AnimatePresence mode="wait" initial={false}>
            <Outlet key={location.pathname} />
          </AnimatePresence>
        </main>
      </div>

      {/* Navigation mobile */}
      <BottomNav />

      {/* Assistant IA flottant */}
      <AIAssistant />
    </div>
  )
}
