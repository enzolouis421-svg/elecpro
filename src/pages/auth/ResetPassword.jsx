// Page de réinitialisation du mot de passe — accessible depuis le lien email Supabase
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Zap, Lock, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'

export default function ResetPassword() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [sessionReady, setSessionReady] = useState(false)

  // Supabase envoie le token via le fragment d'URL (#access_token=...)
  // ou via les paramètres de query (?token_hash=...&type=recovery)
  // Le SDK Supabase détecte automatiquement ces tokens au chargement
  useEffect(() => {
    if (!supabase) {
      setError('Supabase non configuré')
      return
    }

    // Vérifie si on a une session active (Supabase l'a restaurée depuis l'URL)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSessionReady(true)
      } else {
        // Écoute le changement de session (PKCE flow)
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
          if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
            setSessionReady(true)
            subscription.unsubscribe()
          }
        })
        return () => subscription.unsubscribe()
      }
    })
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (password !== confirm) {
      setError('Les mots de passe ne correspondent pas')
      return
    }
    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères')
      return
    }

    setLoading(true)
    try {
      const { error: err } = await supabase.auth.updateUser({ password })
      if (err) throw err
      setSuccess(true)
      toast.success('Mot de passe mis à jour !')
      setTimeout(() => navigate('/'), 2500)
    } catch (err) {
      setError(err.message || 'Une erreur est survenue')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-12 h-12 bg-amber-500 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/30">
            <Zap size={24} className="text-black" />
          </div>
          <div>
            <p className="text-white font-bold text-2xl leading-none">ElecPro</p>
            <p className="text-slate-400 text-sm mt-0.5">Gestion électricien artisan</p>
          </div>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-3xl p-8 shadow-2xl">
          <div className="mb-6">
            <h1 className="text-white font-bold text-xl">Nouveau mot de passe</h1>
            <p className="text-slate-400 text-sm mt-1">Choisissez un mot de passe sécurisé</p>
          </div>

          {/* Succès */}
          {success && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 bg-emerald-900/30 border border-emerald-700 rounded-xl p-4 mb-4"
            >
              <CheckCircle size={16} className="text-emerald-400 flex-shrink-0" />
              <p className="text-emerald-300 text-sm">
                Mot de passe mis à jour ! Redirection en cours…
              </p>
            </motion.div>
          )}

          {/* Erreur */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-3 bg-red-900/30 border border-red-700 rounded-xl p-4 mb-4"
              >
                <AlertCircle size={16} className="text-red-400 flex-shrink-0" />
                <p className="text-red-300 text-sm">{error}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {!success && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-slate-300 text-sm block mb-1.5">Nouveau mot de passe</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                    placeholder="••••••••"
                    disabled={!sessionReady}
                    className="w-full bg-slate-900 border border-slate-600 rounded-xl text-white pl-10 pr-10 py-3 text-sm focus:border-amber-500 focus:outline-none placeholder-slate-500 transition-colors disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-slate-300 text-sm block mb-1.5">Confirmer le mot de passe</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    required
                    autoComplete="new-password"
                    placeholder="••••••••"
                    disabled={!sessionReady}
                    className="w-full bg-slate-900 border border-slate-600 rounded-xl text-white pl-10 pr-4 py-3 text-sm focus:border-amber-500 focus:outline-none placeholder-slate-500 transition-colors disabled:opacity-50"
                  />
                </div>
              </div>

              {!sessionReady && !error && (
                <p className="text-slate-500 text-xs text-center">Vérification du lien en cours…</p>
              )}

              <motion.button
                type="submit"
                disabled={loading || !sessionReady}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-black font-bold py-3 rounded-xl transition-colors mt-2"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full"
                    />
                    Mise à jour…
                  </span>
                ) : (
                  'Enregistrer le nouveau mot de passe'
                )}
              </motion.button>
            </form>
          )}

          <div className="mt-6 text-center">
            <button
              onClick={() => navigate('/')}
              className="text-slate-400 hover:text-white text-sm transition-colors"
            >
              ← Retour à la connexion
            </button>
          </div>
        </div>

        <p className="text-center text-slate-600 text-xs mt-6">
          ElecPro · Données chiffrées et sécurisées · RGPD
        </p>
      </motion.div>
    </div>
  )
}
