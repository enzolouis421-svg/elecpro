// AuthGuard — protège les routes et gère la session Supabase
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Zap } from 'lucide-react'
import { isSupabaseConfigured, sbOnAuthChange, sbGetSession } from '../../lib/supabase'
import Login from '../../pages/auth/Login'

export default function AuthGuard({ children }) {
  const [status, setStatus] = useState('loading') // 'loading' | 'authenticated' | 'unauthenticated'

  useEffect(() => {
    // Si Supabase n'est pas configuré : accès direct sans auth
    if (!isSupabaseConfigured) {
      setStatus('authenticated')
      return
    }

    // Vérifie la session existante au démarrage
    sbGetSession().then(session => {
      setStatus(session ? 'authenticated' : 'unauthenticated')
    }).catch(() => {
      setStatus('unauthenticated')
    })

    // Écoute les changements d'état (login / logout)
    const unsubscribe = sbOnAuthChange(user => {
      setStatus(user ? 'authenticated' : 'unauthenticated')
    })

    return unsubscribe
  }, [])

  // Splash screen de chargement
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <motion.div
          animate={{ scale: [1, 1.1, 1], opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          className="flex flex-col items-center gap-4"
        >
          <div className="w-14 h-14 bg-amber-500 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/40">
            <Zap size={28} className="text-black" />
          </div>
          <p className="text-slate-400 text-sm">Chargement…</p>
        </motion.div>
      </div>
    )
  }

  if (status === 'unauthenticated') {
    return <Login onSuccess={() => setStatus('authenticated')} />
  }

  return children
}
