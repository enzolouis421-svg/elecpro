// Page de connexion / inscription ElecPro
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Zap, Eye, EyeOff, Mail, Lock, AlertCircle, CheckCircle } from 'lucide-react'
import { sbSignIn, sbSignUp, sbResetPassword, isSupabaseConfigured } from '../../lib/supabase'
import toast from 'react-hot-toast'

export default function Login({ onSuccess }) {
  const [mode, setMode] = useState('login') // 'login' | 'register' | 'reset'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [resetSent, setResetSent] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (mode === 'login') {
        await sbSignIn(email, password)
        toast.success('Connexion réussie')
        onSuccess?.()
      } else if (mode === 'register') {
        if (password !== confirm) {
          setError('Les mots de passe ne correspondent pas')
          setLoading(false)
          return
        }
        if (password.length < 8) {
          setError('Le mot de passe doit contenir au moins 8 caractères')
          setLoading(false)
          return
        }
        await sbSignUp(email, password)
        toast.success('Compte créé ! Vérifiez votre email pour confirmer.')
        setMode('login')
      } else if (mode === 'reset') {
        await sbResetPassword(email)
        setResetSent(true)
      }
    } catch (err) {
      // Traduit les erreurs Supabase en français
      const msg = err.message || ''
      if (msg.includes('Invalid login credentials')) {
        setError('Email ou mot de passe incorrect')
      } else if (msg.includes('Email not confirmed')) {
        setError('Confirmez votre email avant de vous connecter')
      } else if (msg.includes('User already registered')) {
        setError('Un compte existe déjà avec cet email')
      } else if (msg.includes('Password should be')) {
        setError('Le mot de passe doit contenir au moins 8 caractères')
      } else {
        setError(msg || 'Une erreur est survenue')
      }
    } finally {
      setLoading(false)
    }
  }

  // Mode sans Supabase : accès direct
  function handleLocalAccess() {
    onSuccess?.()
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

        {/* Carte */}
        <div className="bg-slate-800 border border-slate-700 rounded-3xl p-8 shadow-2xl">

          {/* Titre */}
          <div className="mb-6">
            <h1 className="text-white font-bold text-xl">
              {mode === 'login' && 'Connexion'}
              {mode === 'register' && 'Créer un compte'}
              {mode === 'reset' && 'Réinitialiser le mot de passe'}
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              {mode === 'login' && 'Accédez à votre espace ElecPro'}
              {mode === 'register' && 'Créez votre compte gratuit'}
              {mode === 'reset' && 'Recevez un lien par email'}
            </p>
          </div>

          {/* Succès reset */}
          {resetSent && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 bg-emerald-900/30 border border-emerald-700 rounded-xl p-4 mb-4"
            >
              <CheckCircle size={16} className="text-emerald-400 flex-shrink-0" />
              <p className="text-emerald-300 text-sm">
                Email envoyé ! Vérifiez votre boîte mail pour réinitialiser votre mot de passe.
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

          {/* Formulaire */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="text-slate-300 text-sm block mb-1.5">Email</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="votre@email.com"
                  className="w-full bg-slate-900 border border-slate-600 rounded-xl text-white pl-10 pr-4 py-3 text-sm focus:border-amber-500 focus:outline-none placeholder-slate-500 transition-colors"
                />
              </div>
            </div>

            {/* Mot de passe */}
            {mode !== 'reset' && (
              <div>
                <label className="text-slate-300 text-sm block mb-1.5">Mot de passe</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    placeholder="••••••••"
                    className="w-full bg-slate-900 border border-slate-600 rounded-xl text-white pl-10 pr-10 py-3 text-sm focus:border-amber-500 focus:outline-none placeholder-slate-500 transition-colors"
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
            )}

            {/* Confirmation mot de passe (inscription) */}
            {mode === 'register' && (
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
                    className="w-full bg-slate-900 border border-slate-600 rounded-xl text-white pl-10 pr-4 py-3 text-sm focus:border-amber-500 focus:outline-none placeholder-slate-500 transition-colors"
                  />
                </div>
              </div>
            )}

            {/* Lien mot de passe oublié */}
            {mode === 'login' && (
              <div className="text-right">
                <button
                  type="button"
                  onClick={() => { setMode('reset'); setError('') }}
                  className="text-slate-400 hover:text-amber-400 text-xs transition-colors"
                >
                  Mot de passe oublié ?
                </button>
              </div>
            )}

            {/* Bouton submit */}
            <motion.button
              type="submit"
              disabled={loading}
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
                  {mode === 'login' ? 'Connexion…' : mode === 'register' ? 'Création…' : 'Envoi…'}
                </span>
              ) : (
                mode === 'login' ? 'Se connecter' : mode === 'register' ? 'Créer mon compte' : 'Envoyer le lien'
              )}
            </motion.button>
          </form>

          {/* Liens secondaires */}
          <div className="mt-6 text-center space-y-2">
            {mode === 'login' && (
              <p className="text-slate-400 text-sm">
                Pas encore de compte ?{' '}
                <button onClick={() => { setMode('register'); setError('') }} className="text-amber-400 hover:text-amber-300 font-medium transition-colors">
                  Créer un compte
                </button>
              </p>
            )}
            {mode === 'register' && (
              <p className="text-slate-400 text-sm">
                Déjà un compte ?{' '}
                <button onClick={() => { setMode('login'); setError('') }} className="text-amber-400 hover:text-amber-300 font-medium transition-colors">
                  Se connecter
                </button>
              </p>
            )}
            {mode === 'reset' && (
              <button onClick={() => { setMode('login'); setError(''); setResetSent(false) }} className="text-slate-400 hover:text-white text-sm transition-colors">
                ← Retour à la connexion
              </button>
            )}
          </div>

          {/* Séparateur + accès sans compte (si Supabase non configuré) */}
          {!isSupabaseConfigured && (
            <>
              <div className="flex items-center gap-3 my-5">
                <div className="flex-1 h-px bg-slate-700" />
                <span className="text-slate-500 text-xs">ou</span>
                <div className="flex-1 h-px bg-slate-700" />
              </div>
              <button
                onClick={handleLocalAccess}
                className="w-full border border-slate-600 hover:border-slate-500 text-slate-300 hover:text-white py-3 rounded-xl text-sm transition-colors"
              >
                Continuer sans compte (données locales)
              </button>
              <p className="text-slate-600 text-xs text-center mt-2">
                Sans Supabase configuré — données stockées sur cet appareil uniquement
              </p>
            </>
          )}
        </div>

        <p className="text-center text-slate-600 text-xs mt-6">
          ElecPro · Données chiffrées et sécurisées · RGPD
        </p>
      </motion.div>
    </div>
  )
}
