// Bouton réutilisable avec animations Framer Motion
import { motion } from 'framer-motion'

const VARIANTS = {
  primary: 'bg-amber-500 hover:bg-amber-400 text-black font-semibold',
  secondary: 'bg-slate-700 hover:bg-slate-600 text-white',
  danger: 'bg-red-600 hover:bg-red-500 text-white',
  ghost: 'bg-transparent hover:bg-slate-800 text-slate-300',
  outline: 'border border-slate-600 hover:border-slate-500 bg-transparent text-white',
}

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  disabled = false,
  loading = false,
  onClick,
  type = 'button',
  ...props
}) {
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  }

  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      whileHover={disabled || loading ? {} : { scale: 1.02 }}
      whileTap={disabled || loading ? {} : { scale: 0.98 }}
      className={`
        inline-flex items-center justify-center gap-2 rounded-xl font-medium
        transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-amber-500/50
        disabled:opacity-50 disabled:cursor-not-allowed
        ${VARIANTS[variant]} ${sizeClasses[size]} ${className}
      `}
      {...props}
    >
      {loading && (
        <span className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
      )}
      {children}
    </motion.button>
  )
}
